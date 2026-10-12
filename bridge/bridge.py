#!/usr/bin/env python3
"""Experimental Xbox Series Bluetooth UHID -> Xbox Ally X four-motor bridge."""
import argparse, errno, fcntl, json, os, select, signal, stat, struct, sys, tempfile, time
from pathlib import Path
import allyctl as hw
ROOT = Path(__file__).resolve().parent
STOP = bytes([13,15,0,0,0,0,0,0,0])
EVENT = struct.Struct('@llHHi')  # native input_event, this package targets x86_64

def holders(node):
    """List processes with this device open; an open FD does not prove a grab."""
    found=[]
    try: target=os.stat(node).st_rdev
    except OSError: return found
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            for fd in (proc/'fd').iterdir():
                try:
                    st=fd.stat()
                    if stat.S_ISCHR(st.st_mode) and st.st_rdev==target:
                        found.append(proc.name+':'+(hw.read(proc/'comm') or '?')); break
                except OSError: pass
        except OSError: pass
    return found

def feature(fd, packet):
    try: hw.feature(fd,packet)
    except OSError as exc:
        if exc.errno==errno.EBUSY:
            node=os.readlink(f'/proc/self/fd/{fd}')
            raise RuntimeError('Physical Ally feature-report transfer is busy on '+node+
                '. Processes with this device open (not proof of ownership): '+', '.join(holders(node))) from exc
        raise

def event(kind, payload=b''):
    return struct.pack('<I', kind) + payload

def translate(data, enabled=True, strength=100):
    if len(data) != 9 or data[0] != 3 or data[1] & 0xf0 or any(v > 100 for v in data[2:6]):
        raise ValueError('Not a valid Xbox Bluetooth rumble report')
    # Xbox enables: bit 3 LT, bit 2 RT, bit 1 left grip, bit 0 right grip.
    values = [v if data[1] & (8 >> i) else 0 for i,v in enumerate(data[2:6])]
    if type(enabled) is not bool or type(strength) is not int or not 0 <= strength <= 100:
        raise ValueError("Invalid trigger settings")
    values[:2]=[round(v*strength/100) if enabled else 0 for v in values[:2]]
    return bytes([13,15,*values,*data[6:9]])

class State:
    def __init__(self):
        self.axes = {0:32768,1:32768,3:32768,4:32768,2:0,5:0,16:0,17:0}
        self.keys = {}
    def report(self):
        def down(*codes):
            return any(v and c in codes for (node,c),v in self.keys.items())
        lo = sum(mask for code,mask in [(304,1),(305,2),(307,8),(308,16),(310,64),(311,128)] if down(code))
        hi = sum(mask for codes,mask in [((314,),4),((315,),8),((316,186),16),((317,184),32),((318,185),64)] if down(*codes))
        hat = {(0,-1):1,(1,-1):2,(1,0):3,(1,1):4,(0,1):5,(-1,1):6,(-1,0):7,(-1,-1):8}.get((self.axes[16],self.axes[17]),0)
        return struct.pack('<B6H4B',1,*(self.axes[c] for c in (0,1,3,4,2,5)),hat,lo,hi,0)

def absinfo(fd, code):
    buf = bytearray(24)
    fcntl.ioctl(fd, 0x80184540 + code, buf)
    return struct.unpack('=6i',buf)

def normal(value, low, high, maximum):
    if high <= low: raise ValueError('Invalid axis range')
    return max(0,min(maximum,round((value-low)*maximum/(high-low))))

def handle_uhid(raw, send, output):
    raw = raw.ljust(4380,b'\0')
    kind, = struct.unpack_from('<I',raw)
    if kind == 6:  # UHID_OUTPUT
        size = struct.unpack_from('<H',raw,4100)[0]
        if raw[4102] == 1 and size <= 4096:
            try: output(raw[4:4+size])
            except ValueError: pass
    elif kind == 13:  # UHID_SET_REPORT
        ident,rnum,rtype,size = struct.unpack_from('<IBBH',raw,4)
        err = errno.EOPNOTSUPP
        if rtype == 1 and rnum == 3 and size <= 4096:
            data = raw[12:12+size]
            if len(data)==8: data=bytes([rnum])+data
            try: output(data); err=0
            except ValueError: err=errno.EINVAL
        send(event(14,struct.pack('<IH',ident,err)))
    elif kind == 9:  # GET_REPORT unsupported by this Xbox endpoint
        ident, = struct.unpack_from('<I',raw,4)
        send(event(10,struct.pack('<IHH',ident,errno.EOPNOTSUPP,0)))
    elif kind in (3,5):  # STOP/CLOSE, no consumer remains
        output(bytes([3,15,0,0,0,0,0,0,0]))

def restore(path):
    data=json.loads(path.read_text())
    if data.get('pid')!=os.getpid():
        try: os.kill(data['pid'],0)
        except ProcessLookupError: pass
        else: raise RuntimeError('Bridge PID is still alive; stop that process before recovery')
    errors=[]
    config=data.get('config')
    if config:
        try:
            base=Path(config['base'])
            if not base.exists(): raise RuntimeError('Controller configuration interface disappeared; journal retained')
            if 'mappings' in config:
                (base/'gamepad_mode').write_text('1')
                for rel,value in config['mappings'].items(): (base/rel).write_text(value)
                (base/'apply_all').write_text('1')
            (base/'gamepad_mode').write_text(config['mode'])
        except Exception as exc: errors.append('Mapping restoration: '+str(exc))
    if data.get('qam'):
        try: Path(data['qam']['path']).write_text(data['qam']['value'])
        except Exception as exc: errors.append('QAM restoration: '+str(exc))
    if data.get('unmask_inputplumber'):
        try: hw.run(['systemctl','unmask','--runtime','inputplumber.service'])
        except Exception as exc: errors.append('InputPlumber unmask: '+str(exc))
    for s in reversed(data['services']):
        try: hw.run(['systemctl','start',s])
        except Exception as exc: errors.append(str(exc))
    if errors: raise RuntimeError('; '.join(errors))
    path.unlink()

def run(args):
    inv=hw.inventory()
    if args.node is None:
        matches=[e['node'] for e in inv['hidraw'] if len(e['gamepad_events'])==1]
        if len(matches)==1: args.node=matches[0]
    if not args.execute:
        print(json.dumps(inv,indent=2)); print('Dry run. No devices opened or services changed.'); return
    if os.geteuid()!=0 or hw.board()!='RC73XA' or inv['kernel']!=hw.KERNEL:
        raise RuntimeError('Requires sudo, Xbox Ally X RC73XA and the specified kernel')
    entries=[x for x in inv['hidraw'] if x['node']==args.node and len(x['gamepad_events'])==1]
    if len(entries)!=1: raise RuntimeError('Select the physical gamepad hidraw node from inventory')
    if not Path('/dev/uhid').exists(): raise RuntimeError('Load the uhid module first')
    # The kernel sysfs interface provides the configuration directly; no daemon required.
    attrs=list(Path('/sys/bus/hid/devices').glob('0003:0B05:1B4C.*/btn_m1/remap'))
    if len(attrs)!=1: raise RuntimeError('Expected one Ally kernel configuration interface')
    base=attrs[0].parent.parent
    mode=hw.read(base/'gamepad_mode')
    if mode not in ('1','2','3') or not (base/'apply_all').exists():
        raise RuntimeError('Unsupported Ally kernel configuration interface')
    uid=int(os.environ.get('SUDO_UID','0')); gid=int(os.environ.get('SUDO_GID','0'))
    if not uid: raise RuntimeError('Run sudo from the Steam user account, not a root login')
    services=[s for s in hw.SERVICES if not (args.decky_managed and s=='plugin_loader.service') and hw.run(['systemctl','is-active','--quiet',s],check=False).returncode==0]
    unit=hw.run(['systemctl','show','inputplumber.service','--property=LoadState','--value']).stdout.strip()
    unit_file=hw.run(['systemctl','show','inputplumber.service','--property=UnitFileState','--value']).stdout.strip()
    mask_inputplumber=unit!='not-found' and unit_file not in ('masked','masked-runtime')
    snapshot={'services':services,'pid':os.getpid(),'unmask_inputplumber':mask_inputplumber,'config':{'base':str(base),'mode':mode}}
    qam_path=Path(entries[0]['hid_parent'])/'qam_mode'
    qam_value=hw.read(qam_path)
    if qam_value in ('0','1'): snapshot['qam']={'path':str(qam_path),'value':qam_value}
    hw.save_state(args.state,snapshot)
    rawfd=ufd=None; events={}; watchdog=None; validated=False
    def interrupted(*unused): raise KeyboardInterrupt
    for sig in (signal.SIGINT,signal.SIGTERM,signal.SIGHUP): signal.signal(sig,interrupted)
    try:
        if mask_inputplumber:
            hw.run(['systemctl','mask','--runtime','inputplumber.service'])
            print('InputPlumber restart blocked temporarily for this bridge session.',flush=True)
        for s in services: hw.run(['systemctl','stop',s])
        if unit!='not-found':
            # Stop explicitly even if the service activated between snapshot and masking.
            hw.run(['systemctl','stop','inputplumber.service'])
            state=hw.run(['systemctl','show','inputplumber.service','--property=ActiveState','--value']).stdout.strip()
            if state not in ('inactive','failed'): raise RuntimeError('InputPlumber did not stop: '+state)
        if snapshot.get('qam'):
            qam_path.write_text('1')
            print('Kernel QAM shortcut enabled: Xbox+A.',flush=True)
        else:
            print('Kernel qam_mode unavailable; Library shortcut not enabled.',flush=True)
        (base/'gamepad_mode').write_text('1')
        mappings={rel:hw.read(base/rel) for rel in ('btn_m1/remap','btn_m2/remap')}
        if any(v is None for v in mappings.values()): raise RuntimeError('Cannot save game-mode rear mappings')
        snapshot['config']['mappings']=mappings
        # Commit the restoration data before writing either new mapping.
        with tempfile.NamedTemporaryFile(mode='w',prefix='ally-state-',dir=args.state.parent,delete=False) as stream:
            json.dump(snapshot,stream); stream.flush(); os.fsync(stream.fileno())
            temp=stream.name
        os.replace(temp,args.state)
        (base/'btn_m1/remap').write_text('KB_F15')
        (base/'btn_m2/remap').write_text('KB_F14')
        (base/'apply_all').write_text('1')
        rawfd=os.open(args.node,os.O_RDWR|os.O_CLOEXEC)
        st=os.fstat(rawfd)
        if str(hw.hid_owner(Path(f'/sys/dev/char/{os.major(st.st_rdev)}:{os.minor(st.st_rdev)}')))!=entries[0]['hid_parent']:
            raise RuntimeError('Physical node identity changed')
        info=bytearray(8); fcntl.ioctl(rawfd,0x80084803,info)
        if struct.unpack('=IHH',info)!=(3,0x0b05,0x1b4c): raise RuntimeError('Wrong physical identity')
        validated=True; feature(rawfd,STOP)
        # Child holds only the physical FD, never UHID: parent death destroys virtual
        # controller and pipe EOF makes the child issue a final all-motor stop.
        pipe_r,watchdog=os.pipe(); child=os.fork()
        if child==0:
            os.close(watchdog)
            for sig in (signal.SIGINT,signal.SIGTERM,signal.SIGHUP): signal.signal(sig,signal.SIG_IGN)
            try:
                while os.read(pipe_r,1): pass
                feature(rawfd,STOP)
            finally: os._exit(0)
        os.close(pipe_r)
        state=State(); ranges={}; rear_codes=set()
        for e in inv['events']:
            if e['vendor']!='0b05' or e['product']!='1b4c': continue
            fd=os.open(e['node'],os.O_RDONLY|os.O_NONBLOCK|os.O_CLOEXEC)
            try:
                bits=bytearray(96); fcntl.ioctl(fd,0x80604521,bits) # EVIOCGBIT(EV_KEY,96)
                available={c for c in (184,185) if bits[c//8] & 1<<(c%8)}
                rear=bool(available)
                pad=e['node'] in entries[0]['gamepad_events']
                if not (rear or pad): os.close(fd); continue
                try:
                    fcntl.ioctl(fd,0x40044590,1) # EVIOCGRAB
                except OSError as exc:
                    if exc.errno==errno.EBUSY:
                        raise RuntimeError('Cannot exclusively grab '+e['node']+' ('+str(e['name'])+
                            '): another process has an exclusive input grab. Processes with this node open '+
                            '(not proof of grab ownership): '+', '.join(holders(e['node']))+
                            '. Stop the old bridge or conflicting controller mapper, then retry.') from exc
                    raise
                events[fd]=e['node']; rear_codes.update(available)
                pressed=bytearray(96); fcntl.ioctl(fd,0x80604518,pressed) # EVIOCGKEY
                for code in range(768):
                    if pressed[code//8] & 1<<(code%8): state.keys[(fd,code)]=True
                if pad:
                    for c in state.axes:
                        value,lo,hi,*_=absinfo(fd,c); ranges[c]=(lo,hi)
                        state.axes[c]=value if c in (16,17) else normal(value,lo,hi,1023 if c in (2,5) else 65535)
            except BaseException:
                if fd not in events: os.close(fd)
                raise
        if rear_codes!={184,185}: raise RuntimeError('Missing separate M1/M2 keyboard source; refusing incomplete mapping')
        ufd=os.open('/dev/uhid',os.O_RDWR|os.O_NONBLOCK|os.O_CLOEXEC)
        descriptor=(ROOT/'xbox-series.desc').read_bytes()
        uniq=f'ally-gamefeedback-{os.getpid()}'
        payload=struct.pack('<128s64s64sHHIIII',b'Xbox Wireless Controller',b'ally-gamefeedback',uniq.encode(),len(descriptor),5,0x045e,0x0b13,0x0513,0)+descriptor
        def send(data):
            if os.write(ufd,data)!=len(data): raise OSError('Short UHID write')
        send(event(11,payload))
        logfd=os.open(args.log,os.O_WRONLY|os.O_CREAT|os.O_APPEND|os.O_NOFOLLOW|os.O_CLOEXEC,0o600)
        st=os.fstat(logfd)
        allowed_owners={0,uid} if args.decky_managed else {0}
        if not stat.S_ISREG(st.st_mode) or st.st_uid not in allowed_owners or st.st_nlink!=1:
            os.close(logfd)
            raise RuntimeError('Log must be a regular file with one link, owned by root'+(' or the Decky user' if args.decky_managed else '')+f'; got uid={st.st_uid}, links={st.st_nlink}')
        os.fchmod(logfd,0o600)
        log=os.fdopen(logfd,'a',buffering=1)
        log.write(json.dumps({'session_start':time.time(),'pid':os.getpid()})+'\n')
        settings={'enabled':True,'strength':100}
        last_request=bytes([3,15,0,0,0,0,0,0,0])
        last_request_time=0.0
        preview_until=0.0
        preview_started=0.0
        preview_strength=0
        preview_id=None
        last_control_check=0.0
        next_status=0.0
        requests=0
        def output(data):
            nonlocal last_request,last_request_time,requests
            try: packet=translate(data,**settings)
            except ValueError:
                log.write(json.dumps({'time':time.time(),'rejected':data.hex()})+'\n'); raise
            last_request=data; last_request_time=time.monotonic()
            if preview_until>last_request_time:
                packet=bytes([*packet[:2],preview_strength,preview_strength,*packet[4:]])
            if data[2] or data[3]: requests+=1
            feature(rawfd,packet)
            if log.tell()>4*1024*1024:
                log.seek(0); log.truncate(); log.write(json.dumps({'session_start':time.time(),'pid':os.getpid()})+'\n')
            log.write(json.dumps({'time':time.time(),'source':'virtual-xbox-output','preview_active':preview_until>time.monotonic(),'xbox':data.hex(),'ally':packet.hex(),'lt':packet[2],'rt':packet[3],'left_grip':packet[4],'right_grip':packet[5]})+'\n')
        granted=False; started=False; deadline=time.monotonic()+10
        print('Bridge running under Decky.' if args.decky_managed else 'Bridge running. Keep this terminal open; Ctrl+C restores services.',flush=True)
        while True:
            now=time.monotonic()
            if args.parent_pid and os.getppid()!=args.parent_pid:
                raise KeyboardInterrupt
            if args.control and now-last_control_check>=0.1:
                last_control_check=now
                try:
                    control=json.loads(args.control.read_text())
                    updated={'enabled':control['enabled'],'strength':control['strength']}
                    translate(last_request,**updated) # validate before using
                except (OSError,ValueError,KeyError,TypeError):
                    control={}
                    updated={'enabled':False,'strength':0} # fail closed for triggers
                if updated!=settings:
                    settings=updated
                    preview_until=0.0
                    # Never resurrect an old trigger effect when enabling/increasing.
                    # Send trigger-zero and await the next real game output.
                    current=bytearray(last_request)
                    current[2:4]=b'\0\0'
                    # Preserve cached grip fields and firmware timing on the stop.
                    feature(rawfd,translate(bytes(current),**settings))
                token=control.get('preview_id')
                if token is not None and token!=preview_id:
                    preview_id=token
                    expires=control.get('preview_expires',0)
                    if settings['enabled'] and granted and started and isinstance(expires,(int,float)) and 0<expires-time.time()<=2:
                        preview_strength=settings['strength']
                        preview_started=now; preview_until=now+0.15
                        grips=translate(last_request,**settings)[4:6]
                        feature(rawfd,bytes([13,15,preview_strength,preview_strength,*grips,15,0,0]))
                        log.write(json.dumps({'time':time.time(),'source':'slider-preview','strength':preview_strength,'duration_ms':150})+'\n')
            if preview_until and now>=preview_until:
                preview_until=0.0
                current=bytearray(last_request)
                if last_request_time<preview_started or now-last_request_time>0.25:
                    current[2:4]=b'\0\0'
                feature(rawfd,translate(bytes(current),**settings))

            if args.status and now>=next_status:
                next_status=now+1
                status={'pid':os.getpid(),'ready':granted and started,'enabled':settings['enabled'],
                        'strength':settings['strength'],'trigger_requests':requests,'node':args.node,'updated':time.time()}
                tmp=args.status.with_suffix('.new')
                tmp.write_text(json.dumps(status)); tmp.replace(args.status)
            if not granted:
                for n in Path('/sys/class/hidraw').glob('hidraw*'):
                    metadata=dict(line.split('=',1) for line in (hw.read(n/'device/uevent') or '').splitlines() if '=' in line)
                    if metadata.get('HID_UNIQ')==uniq and metadata.get('HID_PHYS')=='ally-gamefeedback':
                        path='/dev/'+n.name
                        fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC)
                        try:
                            node_stat=os.fstat(fd)
                            owner=hw.hid_owner(Path(f'/sys/dev/char/{os.major(node_stat.st_rdev)}:{os.minor(node_stat.st_rdev)}'))
                            if owner!=(n/'device').resolve(): raise RuntimeError('Virtual node changed during discovery')
                            info=bytearray(8); fcntl.ioctl(fd,0x80084803,info)
                            if struct.unpack('=IHH',info)!=(5,0x045e,0x0b13): raise RuntimeError('Virtual identity mismatch')
                            os.fchown(fd,uid,gid); os.fchmod(fd,0o600)
                        finally: os.close(fd)
                        granted=True; print('Virtual Series HID ready for the Steam user.',flush=True)
                if not granted and time.monotonic()>deadline:
                    candidates=[{'node':n.name,'uevent':hw.read(n/'device/uevent')} for n in Path('/sys/class/hidraw').glob('hidraw*') if '045E' in (hw.read(n/'device/uevent') or '').upper()]
                    raise RuntimeError('Virtual hidraw discovery timed out; UHID_START='+str(started)+'; Microsoft HID nodes='+json.dumps(candidates))
            ready,_,_=select.select([ufd,*events],[],[],0.01)
            for fd in ready:
                if fd==ufd:
                    data=os.read(ufd,4380)
                    if not data: raise RuntimeError('UHID disconnected')
                    if struct.unpack_from('<I',data)[0]==2: started=True
                    handle_uhid(data,send,output)
                else:
                    data=os.read(fd,EVENT.size*64)
                    if not data: raise RuntimeError('Physical controller disconnected')
                    if len(data)%EVENT.size: raise RuntimeError('Partial evdev read')
                    for offset in range(0,len(data),EVENT.size):
                        _,_,kind,code,value=EVENT.unpack_from(data,offset)
                        if kind==0 and code==3: raise RuntimeError('Evdev overflow: restart to resynchronize')
                        if kind==1: state.keys[(fd,code)]=bool(value)
                        elif kind==3 and code in state.axes:
                            lo,hi=ranges[code]; state.axes[code]=value if code in (16,17) else normal(value,lo,hi,1023 if code in (2,5) else 65535)
            if started:
                report=state.report(); send(event(12,struct.pack('<H',len(report))+report))
    except KeyboardInterrupt: pass
    finally:
        for sig in (signal.SIGINT,signal.SIGTERM,signal.SIGHUP): signal.signal(sig,signal.SIG_IGN)
        try:
            if ufd is not None: os.close(ufd)
            for fd in events: os.close(fd)
            if watchdog is not None: os.close(watchdog); os.waitpid(child,0)
            if validated: feature(rawfd,STOP)
        finally:
            if rawfd is not None: os.close(rawfd)
            restore(args.state)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--node'); p.add_argument('--execute',action='store_true')
    p.add_argument('--state',type=Path,default=Path('/run/ally-gamefeedback-state.json'))
    p.add_argument('--log',type=Path,default=Path('/tmp/ally-gamefeedback.jsonl'))
    p.add_argument('--restore',action='store_true')
    p.add_argument('--decky-managed',action='store_true',help='Leave Decky running')
    p.add_argument('--control',type=Path,help='Live enabled/strength settings JSON')
    p.add_argument('--status',type=Path,help='Runtime status JSON')
    p.add_argument('--parent-pid',type=int,help='Exit cleanly if plugin backend exits')
    a=p.parse_args()
    if a.restore: restore(a.state)
    else: run(a)
if __name__=='__main__':
    try: main()
    except (OSError,RuntimeError,ValueError) as exc:
        import traceback
        traceback.print_exc()
        print(str(exc),file=sys.stderr)
        sys.exit(1)
