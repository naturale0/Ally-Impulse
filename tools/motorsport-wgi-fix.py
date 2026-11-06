#!/usr/bin/env python3
"""Reversible, exact-build Motorsport controller-ID workaround. Dry run by default.
Source: https://github.com/volcmen/forza-motorsport-linux/blob/022fc3bdcfab4c73abc5ec518b04335fcd4299bd/manifests/supported-builds.toml
This is Wine's DLL, not a Microsoft DLL. No binaries are downloaded or executed.
"""
import argparse
import hashlib
import os
from pathlib import Path
import re
import stat
import tempfile

ORIGINAL='57538166ba052dc763232880f18a4b48a07ab735a61b5b8fbf5a8f56a05f2ca5'
PATCHED='f520d9b4d44d9cdc11e67396583a1ccc8c53eca60e0b3a69233f358556b59245'
SUFFIX='.ally-impulse-original'

def digest(data): return hashlib.sha256(data).hexdigest()

def discover():
    roots=[]
    for p in (Path.home()/'.steam/steam',Path.home()/'.local/share/Steam'):
        if p.exists() and p.resolve() not in roots: roots.append(p.resolve())
    libraries=list(roots)
    for root in roots:
        vdf=root/'steamapps/libraryfolders.vdf'
        if vdf.exists():
            for value in re.findall(r'"path"\s+"([^"\n]+)"',vdf.read_text()):
                p=Path(value.replace('\\\\','\\'))
                if p not in libraries: libraries.append(p)
    proton={p/'compatibilitytools.d/GE-Proton11-3-FM/files/lib/wine/x86_64-windows/windows.gaming.input.dll' for p in roots}
    prefix={p/'steamapps/compatdata/2440510/pfx/drive_c/windows/system32/windows.gaming.input.dll' for p in libraries}
    selected=[]
    for group in (proton,prefix):
        existing={p.parent.resolve()/p.name for p in group if p.is_file()}
        if len(existing)!=1: raise RuntimeError('Could not select exactly one Proton DLL and one Motorsport prefix DLL. Supply both with --file PATH --file PATH.')
        selected.extend(existing)
    return selected

def replace(path,data,mode):
    tmp=None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.ally-wgi-',delete=False) as f:
            tmp=Path(f.name); f.write(data); f.flush(); os.fsync(f.fileno())
            os.fchmod(f.fileno(),mode)
        os.replace(tmp,path) # break hard links rather than modifying shared DLLs
    finally:
        if tmp and tmp.exists(): tmp.unlink()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    action=p.add_mutually_exclusive_group()
    action.add_argument('--apply',action='store_true')
    action.add_argument('--restore',action='store_true')
    p.add_argument('--file',type=Path,action='append',help='Specify both the Proton and Motorsport-prefix x64 DLLs')
    args=p.parse_args()
    if os.geteuid()==0: raise RuntimeError('Run as the Steam user, without sudo')
    for proc in Path('/proc').glob('[0-9]*/cmdline'):
        try: running=b'forza_steamworks_release_final.exe' in proc.read_bytes().lower()
        except OSError: continue
        if running: raise RuntimeError('Exit Motorsport fully before continuing')
    files=args.file or discover()
    if len(files)!=2 or len({str(x.absolute()) for x in files})!=2:
        raise RuntimeError('Specify two distinct DLL paths')
    prepared=[]
    for path in files:
        data=path.read_bytes(); sha=digest(data)
        print(str(path)+'\n  SHA256 '+sha)
        if sha not in (ORIGINAL,PATCHED): raise RuntimeError('Unknown DLL build: refusing to change any file')
        backup=path.with_name(path.name+SUFFIX)
        if backup.exists() and digest(backup.read_bytes())!=ORIGINAL:
            raise RuntimeError('Existing backup does not match the known original')
        if args.restore:
            if sha==ORIGINAL: continue
            if not backup.exists(): raise RuntimeError('Original backup missing; refusing restoration')
            result=backup.read_bytes()
        else:
            if sha==PATCHED: continue
            result=bytearray(data)
            for offset,expected in ((0x14932,b'\x75\x3a'),(0x1493a,b'\x75\x32')):
                if result[offset:offset+2]!=expected: raise RuntimeError('Unexpected instruction bytes')
                result[offset:offset+2]=b'\x90\x90'
            result=bytes(result)
            if digest(result)!=PATCHED: raise RuntimeError('Unexpected patched hash')
        prepared.append((path,backup,data,result,stat.S_IMODE(path.stat().st_mode)))
    if not (args.apply or args.restore):
        print('Dry run: exact builds accepted; no files changed. Use --apply with Motorsport closed.'); return
    # Validate every target first; save originals before replacing either DLL.
    for path,backup,data,result,mode in prepared:
        if not args.restore and not backup.exists():
            fd=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(fd,'wb') as f: f.write(data); f.flush(); os.fsync(f.fileno())
    done=[]
    try:
        for path,backup,data,result,mode in prepared:
            if path.read_bytes()!=data: raise RuntimeError('DLL changed during operation')
            replace(path,result,mode); done.append((path,data,mode))
            if digest(path.read_bytes())!=digest(result): raise RuntimeError('Written DLL verification failed')
    except BaseException:
        for path,data,mode in reversed(done): replace(path,data,mode)
        raise
    print('Original DLLs restored.' if args.restore else 'Controller-ID workaround applied. Backups retained; use --restore to undo.')

if __name__=='__main__':
    try: main()
    except (OSError,RuntimeError,ValueError) as exc: raise SystemExit(str(exc))
