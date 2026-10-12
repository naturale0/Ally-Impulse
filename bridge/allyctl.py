#!/usr/bin/env python3
"""Temporary InputPlumber profile and isolated Ally motor probe. Python stdlib only."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import platform
import re
import select
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
BUS = "org.shadowblip.InputPlumber"
IFACE = "org.shadowblip.Input.CompositeDevice"
KERNEL = "6.18.50-valve2-1-neptune-618-gc7289a96b14d"
SERVICES = ("plugin_loader.service", "inputplumber.service")


def run(argv, check=True):
    if argv and argv[0]=='systemctl':
        argv=[argv[0],'--system',*argv[1:]]
    env=os.environ.copy()
    # Decky is frozen with PyInstaller. Its bundled libraries must not leak
    # into host tools such as systemctl (which require host OpenSSL).
    for key in ('LD_LIBRARY_PATH','LD_LIBRARY_PATH_ORIG','LD_PRELOAD','LD_AUDIT','PYTHONHOME','PYTHONPATH'):
        env.pop(key,None)
    result=subprocess.run(argv, text=True, capture_output=True, check=False, timeout=20,env=env)
    if check and result.returncode:
        raise RuntimeError(' '.join(argv)+': '+(result.stderr.strip() or result.stdout.strip() or str(result.returncode)))
    return result


def read(path):
    try:
        return Path(path).read_text().strip()
    except OSError:
        return None


def board():
    return read("/sys/class/dmi/id/board_name")


def bus(op, path, *args):
    result = run(["busctl", "--system", "--json=short", op, BUS, path, *args])
    return json.loads(result.stdout) if result.stdout.strip() else None


def prop(path, interface, name):
    result = bus("get-property", path, interface, name)
    return result["data"][0]


def set_prop(path, interface, name, signature, value):
    # zbus(property) setters use Properties.Set, not a Set<Name> method.
    bus("set-property", path, interface, name, signature, str(value))


def call(path, method, signature=None, *values):
    args = [IFACE, method]
    if signature is not None:
        args.extend([signature, *map(str, values)])
    result = bus("call", path, *args)
    return result["data"][0] if result and result.get("data") else None


def target_types(path):
    return [prop(p, "org.shadowblip.Input.Target", "DeviceType")
            for p in prop(path, IFACE, "TargetDevices")]


def set_targets(path, types):
    call(path, "SetTargetDevices", "as", len(types), *types)
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if sorted(target_types(path)) == sorted(types):
            return
        time.sleep(0.2)
    raise RuntimeError("Target devices did not reach the requested state")


def hid_owner(path):
    resolved = path.resolve()
    for parent in [resolved, *resolved.parents]:
        uevent = read(parent / "uevent") or ""
        if "HID_ID=" in uevent:
            return parent
    return None


def inventory():
    events = []
    for entry in sorted(Path("/sys/class/input").glob("event*")):
        dev = entry / "device"
        owner = hid_owner(dev)
        events.append({"node": "/dev/input/" + entry.name,
                       "name": read(dev / "name"),
                       "vendor": read(dev / "id/vendor"),
                       "product": read(dev / "id/product"),
                       "ff_sysfs_bitmap": read(dev / "capabilities/ff"),
                       "hid_parent": str(owner) if owner else None})
    nodes = []
    for entry in sorted(Path("/sys/class/hidraw").glob("hidraw*")):
        owner = (entry / "device").resolve()
        uevent = read(owner / "uevent") or ""
        if re.search(r"HID_ID=0003:00000B05:00001B4C", uevent, re.I):
            nodes.append({"node": "/dev/" + entry.name,
                          "hid_parent": str(owner),
                          "gamepad_events": [e["node"] for e in events
                              if e["hid_parent"] == str(owner)
                              and e["name"] == "ASUS ROG Ally X Gamepad"],
                          "uevent": uevent})
    return {"kernel": platform.release(), "board": board(),
            "inputplumber_version": command_output(["inputplumber", "--version"]),
            "composite_devices": command_output(["inputplumber", "devices", "list"]),
            "hidraw": nodes, "events": events}


def command_output(argv):
    try:
        p = run(argv, check=False)
        return {"returncode": p.returncode, "stdout": p.stdout.strip(), "stderr": p.stderr.strip()}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"error": str(exc)}


def save_state(path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    # O_EXCL prevents overwriting a snapshot from an interrupted session.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(state, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def restore(path):
    state = json.loads(path.read_text())
    dev = state["device_path"]
    if prop(dev, IFACE, "PersistentId") != state["persistent_id"]:
        raise RuntimeError("Composite ID now belongs to a different source; inspect devices list first")
    call(dev, "LoadProfileFromYaml", "s", state["profile_yaml"])
    # Profiles may asynchronously request their own target types. Let that queued
    # command finish before restoring the actual types captured from D-Bus.
    time.sleep(1)
    set_targets(dev, state["targets"])
    set_prop(dev, IFACE, "InterceptMode", "u", state["intercept"])
    path.unlink()
    print("Original profile content, targets and intercept mode restored.")


def interrupted(signum, frame):
    raise KeyboardInterrupt


def session(args):
    if board() != "RC73XA":
        raise RuntimeError("This session is restricted to Xbox Ally X board RC73XA")
    version = run(["inputplumber", "--version"]).stdout.strip()
    if not re.search(r"\b0\.78\.0\b", version):
        raise RuntimeError("Expected InputPlumber 0.78.0; got " + version)
    dev = f"/org/shadowblip/InputPlumber/CompositeDevice{args.device}"
    name = prop(dev, IFACE, "Name")
    if "Ally" not in name:
        raise RuntimeError("Selected composite device is not an Ally: " + name)
    profile = call(dev, "GetProfileYaml")
    if not profile or profile.strip() in ("null", "~"):
        raise RuntimeError("No active profile can be saved; load the stock default profile first")
    state = {"device_path": dev, "persistent_id": prop(dev, IFACE, "PersistentId"),
             "name": name, "profile_yaml": profile,
             "profile_path": prop(dev, IFACE, "ProfilePath"),
             "targets": target_types(dev), "intercept": prop(dev, IFACE, "InterceptMode")}
    save_state(args.state, state)
    for sig in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
        signal.signal(sig, interrupted)
    try:
        call(dev, "LoadProfileFromYaml", "s", (ROOT / "series-stick-clicks.json").read_text())
        set_targets(dev, ["xbox-series", "mouse", "keyboard"])
        set_prop(dev, IFACE, "InterceptMode", "u", 0)
        print(f"Temporary Xbox Series profile active for {args.seconds}s. M1=L3, M2=R3.", flush=True)
        print("Press Enter or Ctrl+C to restore. Keep this terminal open.", flush=True)
        deadline = time.monotonic() + args.seconds
        next_check = time.monotonic() + 1
        while time.monotonic() < deadline:
            if time.monotonic() >= next_check:
                if sorted(target_types(dev)) != sorted(["xbox-series", "mouse", "keyboard"]) or prop(dev, IFACE, "InterceptMode") != 0:
                    raise RuntimeError("Another component changed targets or interception; ending the session")
                next_check = time.monotonic() + 1
            if sys.stdin.isatty():
                ready, _, _ = select.select([sys.stdin], [], [], 0.25)
                if ready:
                    sys.stdin.readline()
                    break
            else:
                time.sleep(0.25)
    except KeyboardInterrupt:
        pass
    finally:
        # Avoid a second Ctrl+C interrupting the recovery operation.
        for sig in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
            signal.signal(sig, signal.SIG_IGN)
        restore(args.state)


def packet(channel, strength, milliseconds):
    values = {"lt": (strength, 0, 0, 0), "rt": (0, strength, 0, 0),
              "left-grip": (0, 0, strength, 0), "right-grip": (0, 0, 0, strength),
              "stop": (0, 0, 0, 0)}[channel]
    # Firmware timing is a hypothesis for this probe; the host also sends STOP.
    return bytes([0x0d, 0x0f, *values, (milliseconds + 9) // 10, 0, 0])


def feature(fd, data):
    # _IOWR('H', 0x06, len): same feature-report transport as hid_asus_ally.
    result = fcntl.ioctl(fd, 0xC0004806 | (len(data) << 16), bytearray(data))
    if result != len(data):
        raise OSError(f"Short HID feature transfer: {result}/{len(data)}")


def steam_running():
    for proc in Path("/proc").glob("[0-9]*/comm"):
        if read(proc) in ("steam", "steamwebhelper"):
            return True
    return False


def motors(args):
    data = packet(args.channel, args.strength, args.ms)
    print("Feature packet:", data.hex(" "), flush=True)
    if not args.execute:
        print("Dry run: no devices opened and no services changed. Use --execute on the Ally to send.")
        return
    if os.geteuid() != 0:
        raise RuntimeError("Use sudo for the hardware probe")
    if board() != "RC73XA" or platform.release() != KERNEL:
        raise RuntimeError("Hardware probe requires board RC73XA and the specified 6.18.50 kernel")
    if steam_running():
        raise RuntimeError("Exit Steam fully before the isolated motor probe")
    if not args.node:
        raise RuntimeError("Choose --node /dev/hidrawN from inventory: it must own the ASUS gamepad event node")
    entries = [x for x in inventory()["hidraw"] if x["node"] == args.node and x["gamepad_events"]]
    if len(entries) != 1:
        raise RuntimeError("Selected hidraw node does not own the physical ASUS gamepad event node")
    active = [s for s in SERVICES if run(["systemctl", "is-active", "--quiet", s], check=False).returncode == 0]
    if active and not args.pause_services:
        raise RuntimeError("Use --pause-services to temporarily stop and restore: " + ", ".join(active))
    stopped = []
    fd = None
    validated = False
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, interrupted)
    try:
        for service in active:
            # Record before the stop so recovery is attempted even if stop times out.
            stopped.append(service)
            print("Temporarily stopping " + service, flush=True)
            run(["systemctl", "stop", service])
        fd = os.open(args.node, os.O_RDWR | os.O_CLOEXEC)
        stat = os.fstat(fd)
        owner = hid_owner(Path(f"/sys/dev/char/{os.major(stat.st_rdev)}:{os.minor(stat.st_rdev)}"))
        if str(owner) != entries[0]["hid_parent"]:
            raise RuntimeError("Opened device no longer belongs to the selected gamepad interface")
        info = bytearray(8)
        fcntl.ioctl(fd, 0x80084803, info)  # HIDIOCGRAWINFO
        import struct
        if struct.unpack("=IHH", info) != (3, 0x0b05, 0x1b4c):
            raise RuntimeError("Opened device identity changed; refusing output")
        validated = True
        feature(fd, packet("stop", 0, 0))
        feature(fd, data)
        print("HID ioctl accepted. Physical motor response is still unverified.", flush=True)
        time.sleep(args.ms / 1000)
    finally:
        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
            signal.signal(sig, signal.SIG_IGN)
        try:
            if fd is not None:
                try:
                    if validated:
                        feature(fd, packet("stop", 0, 0))
                        print("All-zero stop packet accepted.", flush=True)
                finally:
                    os.close(fd)
        finally:
            errors = []
            for service in reversed(stopped):
                try:
                    run(["systemctl", "start", service])
                except Exception as exc:
                    errors.append(f"{service}: {exc}")
            if errors:
                raise RuntimeError("Service recovery needed: " + "; ".join(errors))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("inventory", help="Read-only hardware and version inventory")
    p = sub.add_parser("session", help="Temporarily load Series + stick-click profile; restore on exit")
    p.add_argument("--device", type=int, required=True)
    p.add_argument("--seconds", type=int, choices=range(1, 3601), metavar="1..3600", default=300)
    p.add_argument("--state", type=Path, default=ROOT / "state/session.json")
    p = sub.add_parser("restore", help="Recover an interrupted profile session")
    p.add_argument("--state", type=Path, default=ROOT / "state/session.json")
    p = sub.add_parser("motors", help="One independent actuator pulse; defaults to dry run")
    p.add_argument("--channel", choices=["lt", "rt", "left-grip", "right-grip", "stop"], required=True)
    p.add_argument("--strength", type=int, choices=range(0, 51), metavar="0..50", default=15)
    p.add_argument("--ms", type=int, choices=range(10, 1001), metavar="10..1000", default=300)
    p.add_argument("--node", help="Physical gamepad hidraw node selected from inventory")
    p.add_argument("--execute", action="store_true")
    p.add_argument("--pause-services", action="store_true")
    args = parser.parse_args()
    if args.command == "inventory":
        print(json.dumps(inventory(), indent=2))
    elif args.command == "session":
        session(args)
    elif args.command == "restore":
        restore(args.state)
    else:
        motors(args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as exc:
        print("Error:", exc, file=sys.stderr)
        sys.exit(1)
