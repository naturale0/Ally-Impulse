"""Decky backend. Fixed commands only; no shell or game injection."""
import asyncio
import json
import os
from pathlib import Path
import pwd
import time
import decky

ROOT=Path(__file__).resolve().parent

def host_environment():
    env=os.environ.copy()
    for key in ('LD_LIBRARY_PATH','LD_LIBRARY_PATH_ORIG','LD_PRELOAD','LD_AUDIT','PYTHONHOME','PYTHONPATH'):
        env.pop(key,None)
    return env

class Plugin:
    def __init__(self):
        self.lock=asyncio.Lock()
        self.process=None
        self.output=None
        self.error=''
        self.settings={'enabled':False,'strength':100}
        self.config=Path(decky.DECKY_PLUGIN_SETTINGS_DIR)/'settings.json'
        self.runtime=Path(decky.DECKY_PLUGIN_RUNTIME_DIR)
        self.status_path=self.runtime/'status.json'
        self.logdir=Path(decky.DECKY_PLUGIN_LOG_DIR)

    def _save(self, preview=False):
        self.config.parent.mkdir(parents=True,exist_ok=True)
        temp=self.config.with_suffix('.new')
        with open(temp,'w') as f:
            value=dict(self.settings)
            if preview: value.update(preview_id=time.time_ns(),preview_expires=time.time()+2)
            json.dump(value,f); f.flush(); os.fsync(f.fileno())
        temp.replace(self.config)

    def _tail(self):
        try:
            with open(self.logdir/'bridge.log','rb') as f:
                f.seek(0,2); size=f.tell(); f.seek(max(0,size-3000))
                return f.read().decode(errors='replace').strip()
        except OSError: return ''

    async def _start(self):
        if self.process and self.process.returncode is None: return
        if os.geteuid()!=0: raise RuntimeError('Decky must load Ally Impulse with its root flag')
        self.runtime.mkdir(parents=True,exist_ok=True)
        self.logdir.mkdir(parents=True,exist_ok=True)
        # A stale journal must be restored before a new controller session.
        state=Path('/run/ally-gamefeedback-state.json')
        if state.exists():
            p=await asyncio.create_subprocess_exec('/usr/bin/python3',str(ROOT/'bridge/bridge.py'),'--restore',stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT,env=host_environment())
            data,_=await asyncio.wait_for(p.communicate(),30)
            if p.returncode: raise RuntimeError(data.decode(errors='replace').strip())
        if not Path('/dev/uhid').exists():
            p=await asyncio.create_subprocess_exec('/usr/bin/modprobe','uhid',stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT,env=host_environment())
            data,_=await asyncio.wait_for(p.communicate(),15)
            if p.returncode: raise RuntimeError('Cannot load UHID: '+data.decode(errors='replace'))
        user=pwd.getpwnam(decky.DECKY_USER)
        env=host_environment(); env.update(SUDO_UID=str(user.pw_uid),SUDO_GID=str(user.pw_gid))
        self.status_path.unlink(missing_ok=True)
        if self.output: self.output.close()
        self.output=open(self.logdir/'bridge.log','wb',buffering=0)
        self.process=await asyncio.create_subprocess_exec('/usr/bin/python3',str(ROOT/'bridge/bridge.py'),
            '--execute','--decky-managed','--control',str(self.config),'--status',str(self.status_path),
            '--log',str(self.logdir/'reports.jsonl'),'--parent-pid',str(os.getpid()),
            stdin=asyncio.subprocess.DEVNULL,stdout=self.output,stderr=asyncio.subprocess.STDOUT,
            env=env,start_new_session=True)
        deadline=time.monotonic()+18
        while time.monotonic()<deadline:
            if self.process.returncode is not None:
                raise RuntimeError(self._tail() or 'Controller bridge exited')
            try:
                status=json.loads(self.status_path.read_text())
                if status.get('pid')==self.process.pid and status.get('ready'): return
            except (OSError,ValueError): pass
            await asyncio.sleep(0.2)
        await self._stop()
        raise RuntimeError('Controller startup timed out. '+self._tail())

    async def _stop(self):
        if self.process and self.process.returncode is None:
            self.process.terminate()
            try: await asyncio.wait_for(self.process.wait(),30)
            except asyncio.TimeoutError:
                self.process.kill(); await self.process.wait()
                self.error='Forced stop. Restart to attempt saved mapping recovery.'
        self.process=None
        self.status_path.unlink(missing_ok=True)
        if self.output: self.output.close(); self.output=None

    async def get_status(self):
        running=bool(self.process and self.process.returncode is None)
        status={}
        if running:
            try:
                raw=json.loads(self.status_path.read_text())
                if raw.get('pid')==self.process.pid and time.time()-raw.get('updated',0)<5: status=raw
            except (OSError,ValueError): pass
        elif self.process and not self.error:
            self.error=self._tail() or 'Controller bridge stopped'
        return {**self.settings,'running':running,'ready':bool(status.get('ready')),
            'trigger_requests':status.get('trigger_requests',0),'error':self.error}

    async def set_options(self, enabled: bool, strength: int, preview: bool=False):
        if type(preview) is not bool: raise ValueError('Invalid preview flag')
        if type(enabled) is not bool or type(strength) is not int or not 0<=strength<=100:
            raise ValueError('Strength must be an integer from 0 to 100')
        async with self.lock:
            self.settings={'enabled':enabled,'strength':strength}; self._save(); self.error=''
            if enabled:
                try: await self._start()
                except Exception as exc:
                    self.error=str(exc); self.settings['enabled']=False; self._save()
            if preview and self.settings['enabled'] and self.process and self.process.returncode is None:
                self._save(preview=True)
        return await self.get_status()

    async def get_launch_option(self):
        # Quote the installed path for Steam's shell launch command.
        import shlex
        return shlex.quote(str(ROOT/'game-env.sh'))+' %command%'

    async def stop_bridge(self):
        async with self.lock:
            self.settings['enabled']=False; self._save(); self.error=''
            await self._stop()
        return await self.get_status()

    async def _main(self):
        try:
            value=json.loads(self.config.read_text())
            if type(value.get('enabled')) is bool and type(value.get('strength')) is int and 0<=value['strength']<=100:
                self.settings={'enabled':value['enabled'],'strength':value['strength']}
        except (OSError,ValueError): pass
        self._save()
        if self.settings['enabled']:
            async with self.lock:
                try: await self._start()
                except Exception as exc: self.error=str(exc); decky.logger.error(self.error)

    async def _unload(self):
        async with self.lock: await self._stop()

    async def _uninstall(self):
        await self._unload()
