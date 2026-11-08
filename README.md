# Ally Impulse

A Decky Loader plugin for genuine, game-driven impulse-trigger vibration on the **Xbox Ally X**. It forwards independent LT/RT feedback to the built-in trigger motors—no vibration is synthesized from throttle, braking or grip rumble.

## Features

- Enable/disable trigger vibration and adjust its strength from 0–100%.
- Automatically save and load each game’s enable/strength settings, with a default for other games.
- Brief trigger preview when changing strength while enabled.
- M1 → right-stick click (R3); M2 → left-stick click (L3).
- Library → Steam Quick Access Menu through the kernel’s Xbox+A shortcut.
- Automatically finds the controller and provides a button to copy the reusable launch option.

## Tested configuration

User-tested on **Xbox Ally X**:

| Game | Proton | Additional requirement |
| --- | --- | --- |
| Forza Horizon 5 | GE-Proton11-5 | Standard Ally Impulse setup |
| F1 23 | GE-Proton11-5 | Standard Ally Impulse setup |
| Forza Motorsport (2023) | GE-Proton11-3-FM | [FM Tools and Xodus setup](https://github.com/SoHiEarth/fm-tools#instructions), plus the controller-ID patch below |

Reported tested SteamOS/kernel combinations:

| Operating system | Build | Kernel version |
| --- | --- | --- |
| SteamOS 3.8.28 | 20260922.1 | `6.18.50-valve2-1-neptune-618-gc7289a96b14d` |
| SteamOS 3.9.5 | 20261023.100 | `7.2.7-valve2-2-neptune-72-g31504582a073` (64-bit) |

Everything continues to work well after my update to SteamOS 3.9.5 and the kernel listed above.

Other games and configurations have not been confirmed. There is no exact kernel-version restriction: compatible kernels may run, but passing the interface checks does not verify physical trigger behavior. Kernels without the required Ally driver interfaces are rejected with an explanation. Results are user-reported.

## Install

Requires SteamOS, Decky Loader and Python 3. The bridge requires Xbox Ally X board `RC73XA` and USB controller `0b05:1b4c`. Other kernel versions are allowed when they provide UHID, the expected gamepad axes/buttons and the Ally driver’s `gamepad_mode`, `apply_all` and rear-button remapping interfaces. InputPlumber is optional; if active, it is temporarily stopped and blocked from restarting while the bridge runs.

Exit games and stop any existing standalone bridge before installing or updating. Choose either installation method below.

### Option 1: Install the plugin ZIP through Decky (GUI)

1. Download the packaged **Ally Impulse plugin ZIP** to your Ally. Use the installable plugin ZIP, not GitHub’s **Source code (zip)** archive.
2. In Gaming Mode, open **Decky → Settings** (the gear icon).
3. Under **General**, enable **Developer Mode** if the Developer section is not already visible.
4. Open **Developer → Install Plugin from ZIP File**, choose **Browse**, and select the downloaded plugin ZIP.
5. Confirm the installation or update prompt. Ally Impulse should then appear in your Decky plugin list.

### Option 2: Copy the repository manually

1. Copy this repository into your Decky plugins directory as `ally-impulse`, normally `/home/deck/homebrew/plugins/ally-impulse`. The compiled frontend is included in `dist/`.
2. Restart Decky:

   ```sh
   sudo systemctl restart plugin_loader.service
   ```

### After either installation method

1. Open **Decky → Ally Impulse** and enable trigger vibration before starting a game.
2. Disable Steam Input for that game. Use **Copy launch option**, then paste into **Steam → game Properties → General → Launch Options**. Save any existing launch options before editing.

The launch option normally looks like:

```text
/home/deck/homebrew/plugins/ally-impulse/game-env.sh %command%
```

The wrapper selects the SDL input route checked against **GE-Proton11-5**. In principle, other games can work with this setup if they recognize the virtual Xbox controller and send independent LT/RT vibration through the Wine/SDL path. **Using GE-Proton11-5 alone does not guarantee impulse-trigger support.** Games that issue only ordinary two-motor rumble cannot provide genuine trigger feedback through this bridge; some games may need additional compatibility fixes. The bridge is not tied to Forza or a particular Proton version, but unlisted games and configurations remain unconfirmed.

## Forza Motorsport (2023): required patch

Motorsport has also been user-tested successfully with **GE-Proton11-3-FM**, but this build needs a controller-ID workaround in Wine’s `windows.gaming.input.dll`. Without it, Motorsport may reject Ally Impulse’s virtual controller. The patch changes controller identification, not trigger-feedback processing.

Set up Motorsport’s runtime and authentication first:

- [FM Tools](https://github.com/SoHiEarth/fm-tools): GE-Proton11-3-FM and the prerequisites for running Motorsport on Linux.
- [Xodus login and service setup](https://github.com/SoHiEarth/fm-tools#instructions): sign in with `xodus-cli login` and keep `xodus-service` running before launching the game. Follow the repository’s dependencies and complete setup instructions.

Keep that working setup, the Ally Impulse launch wrapper and Steam Input disabled. **Exit Motorsport completely**, then run from this repository’s directory as the Steam user, **without sudo**:

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

The plugin needs root privileges for device access and temporary service management. It does not replace the kernel, install permanent udev rules or modify games’ launch options automatically.

See [details and recovery instructions](docs/DETAILS.md) to revert the changes made by the plugin.

## Per-game trigger profiles

Launch a game through Steam and open **Decky → Ally Impulse**. The panel shows the running game’s name. Change the strength or enable toggle; those settings are saved automatically for that game and loaded on future launches, even while the plugin panel is closed.

- With no game running, the controls edit your **Default profile**.
- Games without saved settings inherit that default until you customize them.
- **Use default for this game** removes its saved override.
- Exiting a game restores the default. Profile switches keep the virtual controller connected and do not play preview pings.

Existing settings become your default on upgrade; a copy is kept as `settings-before-game-profiles.json` in the plugin’s Decky settings directory. Profiles persist across Decky restarts and reboots, keyed by Steam AppID. Steam-added non-Steam shortcuts are supported when Steam reports their lifecycle; recreating a shortcut can change its ID. No additional launch option is required for profile selection, though the existing controller wrapper may still be needed for game compatibility.

Automatic selection uses Steam game-lifetime notifications and its running-app state. If multiple apps are running, the Steam-reported main app is preferred; the last reported running app is the fallback. This feature requires confirmation on your Steam/Decky build. If the panel shows **Default profile** while your game is running, automatic detection has not selected it yet—do not assume edits are being saved for that game.

Turning vibration off keeps the bridge connected. **Stop controller bridge** disables the current profile and the default, then restores the physical controller; other saved game profiles remain intact and can start it on a later game launch.

## Sleep/wake and system restarts

In my experience, once the bridge is enabled, there is no need to manually disable and re-enable it after sleep/wake or even a system restart. The enabled setting is saved, and the plugin starts the bridge again when Decky loads after a restart.

This is my experience on the tested setup, not a guarantee for every system. The bridge process may not survive a reboot.

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
