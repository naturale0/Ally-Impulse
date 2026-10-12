# Ally Impulse

A Decky Loader plugin for genuine, game-driven impulse-trigger vibration on the **Xbox Ally X**. It forwards independent LT/RT feedback to the built-in trigger motors—no vibration is synthesized from throttle, braking or grip rumble.

## Features

- Enable/disable trigger vibration and adjust its strength from 0–100%.
- Brief trigger preview when changing strength while enabled.
- M1 → right-stick click (R3); M2 → left-stick click (L3).
- Library → Steam Quick Access Menu through the kernel’s Xbox+A shortcut.
- Automatically finds the controller and provides a button to copy the reusable launch option.

## Tested configuration

Tested only with **Forza Horizon 5**, using **GE-Proton11-5** on **Xbox Ally X**:

- **OS:** SteamOS **3.8.28**, build **20260922.1**.
- **Kernel:** `6.18.50-valve2-1-neptune-618-gc7289a96b14d`.

Other games, OS versions, kernels and Proton versions have not been tested. Results are user-reported; the latest plugin’s Library/QAM mapping, clipboard behavior and sleep/wake recovery are not independently verified.

## Install

Requires SteamOS, Decky Loader and Python 3. The current bridge checks for Xbox Ally X board `RC73XA` and kernel `6.18.50-valve2-1-neptune-618-gc7289a96b14d`. InputPlumber is optional; if active, it is temporarily stopped and blocked from restarting while the bridge runs.

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
