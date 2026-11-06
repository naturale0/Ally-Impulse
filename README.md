# Ally Impulse

A Decky Loader plugin for genuine, game-driven impulse-trigger vibration on the **Xbox Ally X**. It forwards independent LT/RT feedback to the built-in trigger motors—no vibration is synthesized from throttle, braking or grip rumble.

## Features

- Enable/disable trigger vibration and adjust its strength from 0–100%.
- Brief trigger preview when changing strength while enabled.
- M1 → right-stick click (R3); M2 → left-stick click (L3).
- Library → Steam Quick Access Menu through the kernel’s Xbox+A shortcut.
- Automatically finds the controller and provides a button to copy the reusable launch option.

## Tested configuration

User-tested on **Xbox Ally X**:

| Game | Proton | Additional requirement |
| --- | --- | --- |
| Forza Horizon 5 | GE-Proton11-5 | Standard Ally Impulse setup |
| Forza Motorsport (2023) | GE-Proton11-3-FM | FM Tools/Xodus setup and the controller-ID patch below |

Reported SteamOS/kernel baseline:

- **OS:** SteamOS **3.8.28**, build **20260922.1**.
- **Kernel:** `6.18.50-valve2-1-neptune-618-gc7289a96b14d`.

Other games and configurations have not been confirmed. There is no exact kernel-version restriction: compatible kernels may run, but passing the interface checks does not verify physical trigger behavior. Kernels without the required Ally driver interfaces are rejected with an explanation. Results are user-reported; the latest plugin’s Library/QAM mapping, clipboard behavior and sleep/wake recovery are not independently verified.

## Install

Requires SteamOS, Decky Loader and Python 3. The bridge requires Xbox Ally X board `RC73XA` and USB controller `0b05:1b4c`. Other kernel versions are allowed when they provide UHID, the expected gamepad axes/buttons and the Ally driver’s `gamepad_mode`, `apply_all` and rear-button remapping interfaces. InputPlumber is optional; if active, it is temporarily stopped and blocked from restarting while the bridge runs.

1. Exit games and stop any existing standalone bridge.
2. Copy this repository into your Decky plugins directory as `ally-impulse`, normally `/home/deck/homebrew/plugins/ally-impulse`. The compiled frontend is included in `dist/`.
3. Restart Decky:

   ```sh
   sudo systemctl restart plugin_loader.service
   ```

4. Open **Decky → Ally Impulse** and enable trigger vibration before starting a game.
5. Disable Steam Input for that game. Use **Copy launch option**, then paste into **Steam → game Properties → General → Launch Options**. Save any existing launch options before editing.

The launch option normally looks like:

```text
/home/deck/homebrew/plugins/ally-impulse/game-env.sh %command%
```

The wrapper selects the SDL input route checked against **GE-Proton11-5**. The bridge is not tied to that version or to Forza, but other games and Proton builds may need different configuration. Universal game compatibility is not guaranteed.

## Forza Motorsport (2023): required patch

Motorsport has also been user-tested successfully with **GE-Proton11-3-FM**, but this build needs a controller-ID workaround in Wine’s `windows.gaming.input.dll`. Without it, Motorsport may reject Ally Impulse’s virtual controller. The patch changes controller identification, not trigger-feedback processing.

Keep your working [FM Tools/Xodus setup](https://github.com/naturale0/fm-tools), Ally Impulse launch wrapper and Steam Input disabled. **Exit Motorsport completely**, then run from this repository’s directory as the Steam user, **without sudo**:

```sh
# Inspect both DLLs; no files are changed.
python3 tools/motorsport-wgi-fix.py

# Only after the inspection accepts the exact builds:
python3 tools/motorsport-wgi-fix.py --apply
```

The tool discovers the Proton installation and Motorsport prefix, verifies the exact DLL hashes, backs up originals and patches both copies. It refuses unknown builds. Relaunch the game afterward. If you previously added the unsuccessful `PROTON_EMULATE_STEAMINPUT=1` workaround, remove it; retain the working FM Tools options and Ally Impulse wrapper.

To undo, close Motorsport and run:

```sh
python3 tools/motorsport-wgi-fix.py --restore
```

This is specific to the checked **GE-Proton11-3-FM DLL build**, not every Proton version. Updates can replace it or make it unnecessary. If discovery fails or a hash is rejected, follow the [detailed patch instructions](docs/FORZA-MOTORSPORT.md); do not reuse the byte offsets on another build.

## How it works

```text
Game’s independent LT/RT requests → Proton/SDL → virtual Xbox Series HID
→ bridge → Ally’s physical trigger motors
```

The plugin creates a virtual Xbox Series Bluetooth HID controller using Linux UHID; no Bluetooth pairing is needed. It forwards physical controls, scales LT/RT independently and leaves grip amplitudes unchanged. Turning vibration off keeps the virtual controller connected. Use **Stop controller bridge** after exiting the game to restore the original controller configuration and any paused InputPlumber service.

The plugin needs root privileges for device access and temporary service management. It does not replace the kernel, install permanent udev rules or modify games’ launch options automatically. Explicit sleep/wake reconnection is not implemented.

The standalone bridge and plugin startup/controls have user-reported success. In-game behavior of the latest plugin, Library/QAM mapping, clipboard behavior and sleep recovery are not independently verified. See [details and recovery instructions](docs/DETAILS.md).

## Build

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
```

## Development and disclaimer

This project is **vibe coded**: it was developed with substantial AI assistance and iterative testing on the author's device.

There is no intentionally malicious code in this project. However, it is provided **as is**, without warranty. Use it at your own risk. I am not responsible for any malfunction, data loss or other damage resulting from its use. See the [MIT license](LICENSE) for the full warranty and liability terms.

## License

[MIT](LICENSE). Included third-party material retains its own notices: the Xbox HID descriptor is adapted from [LizardByte/libvirtualhid](bridge/reference/libvirtualhid-MIT.md), and Decky template/build configuration notices are in [licenses/](licenses/).
