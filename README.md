# Ally Impulse

A Decky Loader plugin for genuine, game-driven impulse-trigger vibration on the **Xbox Ally X**. It forwards independent left- and right-trigger feedback to the built-in motors rather than deriving effects from throttle, braking or grip rumble.

## Features

- Toggle trigger haptics and adjust strength from 0–100%, with a short strength preview.
- Automatically save and load each game’s haptics settings, with a default profile for other games.
- Map **M1 → right-stick click (R3)** and **M2 → left-stick click (L3)**.
- Map **Library → Steam Quick Access Menu** through the kernel’s Xbox+A shortcut.
- Copy a reusable launch option, also displayed in a selectable, read-only field.

See the [interface guide](docs/INTERFACE.md) for control placement and approximate sizes.

## Tested configuration

The following configurations have user-reported success on **Xbox Ally X**:

| Game | Proton | Additional requirement |
| --- | --- | --- |
| Forza Horizon 5 | GE-Proton11-5 | Standard Ally Impulse setup |
| F1 23 | GE-Proton11-5 | Standard Ally Impulse setup |
| Forza Motorsport (2023) | GE-Proton11-3-FM | [FM Tools/Xodus setup](https://github.com/SoHiEarth/fm-tools#instructions) and the [controller-ID patch](#forza-motorsport-2023-required-patch) |

Reported working SteamOS/kernel combinations:

| Operating system | Build | Kernel version |
| --- | --- | --- |
| SteamOS 3.8.28 | 20260922.1 | `6.18.50-valve2-1-neptune-618-gc7289a96b14d` |
| SteamOS 3.9.5 | 20261023.100 | `7.2.7-valve2-2-neptune-72-g31504582a073` |

Other configurations are unconfirmed. There is no exact kernel-version restriction, but the required Ally driver interfaces must be available. Hardware checks currently require Xbox Ally X board `RC73XA` and controller USB ID `0b05:1b4c`.

## Install

Requires **SteamOS, Decky Loader and Python 3**. Exit games and stop any existing controller bridge before installing or updating.

### Option 1: Install through Decky (GUI)

1. Download the packaged **Ally Impulse plugin ZIP**. Use the installable plugin ZIP, not GitHub’s **Source code (zip)** archive.
2. In Gaming Mode, open **Decky → Settings** using the gear icon.
3. Under **General**, enable **Developer Mode** if the Developer section is not visible.
4. Open **Developer → Install Plugin from ZIP File**, select **Browse**, and choose the downloaded ZIP.
5. Confirm the installation or update prompt.

### Option 2: Install manually

1. Copy the repository into the Decky plugins directory as `ally-impulse`, normally `$HOME/homebrew/plugins/ally-impulse`. The compiled frontend is included in `dist/`.
2. Restart Decky:

   ```sh
   sudo systemctl restart plugin_loader.service
   ```

### Set up a game

1. Open **Decky → Ally Impulse** and turn on **Trigger Haptics**. Wait for **Controller connected** before launching the game.
2. In Steam, open the game’s **Properties → Controller** and disable Steam Input.
3. Select **Copy launch option** in Ally Impulse, then paste it into the game’s **Properties → General → Launch Options**. Preserve any existing options before editing them.

For a standard installation, the command is:

```text
"$HOME/homebrew/plugins/ally-impulse/game-env.sh" %command%
```

`$HOME` expands to the account running Steam. The plugin generates the command from its installed location, including a custom installation subdirectory when applicable.

**GE-Proton11-5 is the recommended starting point** for games without a separate compatibility requirement. The wrapper selects a Wine/SDL input path checked against that version. Other games can work if they recognize the virtual controller and send independent LT/RT requests through that path; using the same Proton version alone does not guarantee support. Ordinary two-motor rumble cannot supply genuine trigger feedback.

## Forza Motorsport (2023): required patch

The tested **GE-Proton11-3-FM** build needs a controller-ID workaround in Wine’s `windows.gaming.input.dll`. Without it, Motorsport may reject the virtual controller. The patch changes identification, not input or trigger-feedback processing.

Complete the runtime and authentication setup first:

- [FM Tools](https://github.com/SoHiEarth/fm-tools): GE-Proton11-3-FM and Motorsport’s Linux prerequisites.
- [Xodus login and service setup](https://github.com/SoHiEarth/fm-tools#instructions): sign in with `xodus-cli login` and keep `xodus-service` running before launching the game.

With Motorsport fully closed, run these commands from this repository’s directory as the Steam user, **without sudo**:

```sh
# Inspect the installed Proton and game-prefix DLLs without changing them.
python3 tools/motorsport-wgi-fix.py

# Apply only after inspection accepts the exact builds.
python3 tools/motorsport-wgi-fix.py --apply
```

The tool checks both DLL hashes, saves backups and patches both copies. Unknown builds are rejected. Relaunch Motorsport with the working FM Tools options, the Ally Impulse wrapper and Steam Input disabled. Remove `PROTON_EMULATE_STEAMINPUT=1` if it was added as an alternative identity workaround.

To undo, close Motorsport and run:

```sh
python3 tools/motorsport-wgi-fix.py --restore
```

The patch is specific to this DLL build. Proton updates or prefix repairs may replace it, and newer builds may not need it. For custom paths, hash details and recovery, see the [Motorsport patch guide](docs/FORZA-MOTORSPORT.md).

## How it works

```text
Game’s independent LT/RT requests → Proton/SDL → virtual Xbox Series HID
→ bridge → Ally’s physical trigger motors
```

The bridge uses Linux UHID to create a virtual Xbox Series Bluetooth HID controller; no Bluetooth pairing is needed. It forwards physical controls, scales LT/RT independently and preserves grip amplitudes. If InputPlumber is active, it is temporarily stopped and blocked from restarting while the bridge owns the controller.

Turn **Trigger Haptics** off after exiting the game to stop the bridge and restore saved controller settings and any paused InputPlumber service. Switching it off during gameplay can disconnect the game’s controller.

The plugin requires root privileges for device access and temporary service management. It does not replace the kernel, install permanent udev rules or automatically modify game launch options. See [details and recovery instructions](docs/DETAILS.md#restoring-the-original-controller) to revert the changes made by the plugin.

## Per-game trigger profiles

Launch a game through Steam and open Ally Impulse. **Active profile:** identifies the settings being edited. Changes to the haptics toggle or strength are saved automatically and loaded on future launches, even when the plugin panel is closed.

- **Default profile:** used when no game is selected and by games without saved settings.
- **Game profile:** created when a running game’s settings are customized.
- **Use default for this game:** removes that game’s override.
- **Game exit:** restores the default profile without recreating the controller or playing a preview.

Profiles are stored by Steam AppID and persist across Decky restarts and reboots. Steam-added non-Steam shortcuts are supported when Steam reports their lifecycle; recreating a shortcut may change its ID. During upgrades from the older settings format, existing settings become the default and a copy is retained as `settings-before-game-profiles.json`.

Automatic selection uses Steam’s game lifecycle and running-app state. When multiple apps run, the Steam-reported main app is preferred; the last reported running app is the fallback. If **Default profile** remains displayed while a game runs, edits affect the default rather than that game.

Switching **Trigger Haptics** off disables the current profile and the default, stops the bridge and restores the physical controller. Other saved profiles remain available and can start the bridge on a later game launch.

## Sleep/wake and system restarts

Reported testing has not required manually toggling the bridge after sleep/wake or a system restart. Settings are saved, allowing Decky to start the bridge again when the plugin loads and then select the running game’s profile. Behavior may vary across systems; see [restart behavior and recovery](docs/DETAILS.md#sleep-wake-and-restarts).

## Build

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
```

## Development and disclaimer

This project is **vibe coded**: it was developed with substantial AI assistance and iterative hardware testing.

There is no intentionally malicious code in this project. It is provided **as is**, without warranty. Use it at your own risk. The authors and contributors are not responsible for malfunction, data loss or other damage resulting from its use. See the [MIT license](LICENSE) for the full warranty and liability terms.

## License

[MIT](LICENSE). Third-party material retains its own notices: the [libvirtualhid-derived Xbox descriptor](bridge/reference/libvirtualhid-MIT.md) and [Decky template/build configuration](licenses/DECKY-TEMPLATE-BSD-3-Clause).
