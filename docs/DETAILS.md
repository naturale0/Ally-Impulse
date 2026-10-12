# Ally Impulse — Decky plugin

Xbox Ally X independent, game-driven LT/RT vibration with a Decky toggle and 0–100% strength slider. Includes M1→R3 and M2→L3. InputPlumber is not required.

## What is confirmed

You reported the standalone bridge working on your Ally. This plugin packages that corrected virtual Xbox Series Bluetooth HID path and adds management and live trigger scaling. The new Decky frontend/backend integration and strength controls have **not yet been confirmed on your device**. No device output or service changes were performed while building the plugin.

The bridge is not tied to FH5 or an AppID: any client that sends supported four-channel Xbox output can use it. **“All impulse-trigger games” cannot be guaranteed**: games use different Windows APIs, Proton versions and controller detection rules. Some select only two-motor XInput, even though their Windows version supports impulse triggers. The plugin cannot recover channels that the game/runtime never submits.

## Install

1. Exit games and stop the old terminal bridge with Ctrl+C. Its restoration must finish before enabling the plugin.
2. Extract `ally-impulse-decky.zip`. It contains an `ally-impulse` folder with the compiled frontend, Python backend and bridge. Copy that folder into your Decky plugin directory, normally `/home/deck/homebrew/plugins/`. Example from the directory containing the downloaded ZIP:

   ```sh
   unzip ally-impulse-decky.zip
   sudo cp -a ally-impulse /home/deck/homebrew/plugins/
   sudo chown -R root:root /home/deck/homebrew/plugins/ally-impulse
   sudo systemctl restart plugin_loader.service
   ```

   This is a local/manual plugin, not a Decky store listing. If the `ally-impulse` destination already exists, stop its bridge and move the old folder aside first instead of copying over it. Use your actual Decky home if different.
3. Open Decky → **Ally Impulse**. Enable **trigger vibration** before starting a game. The plugin discovers the physical pad automatically, loads UHID if needed and waits for the virtual controller to be ready. Decky remains running. Only an active InputPlumber service is paused if one is installed.
4. Keep an external keyboard or touch input available for this first plugin session. Existing bridge limitations remain: the built-in rear-key keyboard interface is grabbed, the Library/QAM shortcut uses the kernel driver’s Xbox+A sequence when qam_mode is available, and keys sharing the grabbed interface may be suppressed.

## Across games

For each game, disable Steam Input in Steam → Properties → Controller. Keep the virtual controller running before launching the game. Reuse this same Launch Option for compatible Proton games, adjusting the installation path if needed:

```text
/home/deck/homebrew/plugins/ally-impulse/game-env.sh %command%
```

The wrapper enables SDL Xbox HIDAPI and selects the SDL controller route with the source-verified GE-Proton11-5 `PROTON_USE_SDL=1` flag. It does not contain an FH5-specific switch. A Proton build that does not implement that flag may need different configuration. Native SDL games can use the wrapper too; Proton variables have no effect on a native executable. Other native input backends are not guaranteed to deliver four channels.

This plugin does not modify other games' launch options or inject DLLs. There is no reliable setting in Decky that forces every game engine to use a four-channel API. The virtual pad is available system-wide while the bridge is running; the wrapper is a reusable per-game runtime selection. It allows only virtual 045e:0b13 controllers in SDL, so other controllers are excluded in games launched through it. Unplug other actual Series Bluetooth controllers with that same VID/PID during initial validation.

FH5 on GE-Proton11-5 is the starting configuration from the working-bridge discussion; no independent gameplay capture was reviewed here. Other titles/builds should be confirmed individually by physical feedback and the plugin's **Trigger feedback received this session** indicator. That indicator counts incoming nonzero trigger requests, including while trigger output is disabled; it does not identify the sending process or prove physical vibration.

## Controls

- **Enable trigger vibration:** starts the bridge if necessary. Turning it off immediately zeros LT/RT output and keeps normal controls and grip rumble connected. It does not restart or replace the virtual controller mid-game.
- **Trigger strength:** scales each game's requested LT and RT magnitude independently from 0% to 100%. 100% passes the requested intensity through; it does not amplify or synthesize feedback. The grip channels are not scaled. Changes are applied to subsequent game output reports. On a change the bridge first zeros trigger output, so enabling/increasing strength cannot replay an old effect; the next genuine game report supplies the new intensity.
- **Stop controller bridge:** use after exiting the game to disconnect the virtual pad, release grabs and restore the saved physical mappings/mode and any paused InputPlumber service. This may cause games to lose their controller if used during gameplay.

Settings persist. If enabled when Decky loads, the bridge starts automatically. If disabled, no bridge is started on a fresh Decky load; after toggling off during a session it remains connected until stopped or Decky unloads. A Decky reload/uninstall stops the bridge and restores the controller. Reloading Decky during a game can disconnect the pad. A separate watchdog zeros all motors if the bridge is killed. The bridge also exits when its plugin backend parent disappears.

## Recovery / uninstall

Normally use **Stop controller bridge** first, then remove the plugin through Decky or delete its folder and restart Decky. Decky plugin settings/logs may remain for troubleshooting; remove those only if wanted.

After an interrupted session, the plugin attempts recovery from `/run/ally-gamefeedback-state.json` before starting again. It refuses to take over a live bridge. To recover manually after stopping the recorded process:

```sh
sudo python3 /home/deck/homebrew/plugins/ally-impulse/bridge/bridge.py --restore
```

A failure to restore leaves the journal for inspection. No boot service or permanent udev rule is installed. UHID may remain loaded until reboot; do not unload it while another application needs it.

## Diagnostics and development

Decky logs are normally in `/home/deck/homebrew/logs/ally-impulse/` (use the actual `DECKY_PLUGIN_LOG_DIR` for your installation):

- `bridge.log`: startup, errors and restoration output.
- `reports.jsonl`: incoming Xbox report and outgoing Ally report; bounded to approximately 4 MiB.

The UI displays startup errors instead of silently enabling a failed bridge. Strength and enable values are validated by the backend and bridge. Only fixed executable/argument lists are used; no command text is accepted from the UI.

Source lives in `main.py`, `src/index.tsx`, `bridge/`. Build using the pinned `package.json` / `pnpm-lock.yaml`:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
```

Build tooling is adapted from the official Decky template at `90d0780e882a17f5714fc6de044c645f22608290`. Its BSD license and the bridge/descriptor/Wine reference licenses are included. The bundled frontend uses Decky's current `@decky/api` callable API and `@decky/ui` controls.

## Version 0.1.1 permission fix

The plugin now declares `flags: ["root"]`, matching Decky’s loader privilege check. Version 0.1.0 incorrectly used `_root` from the template, causing the backend to run without required privileges. Restart Decky after replacing the metadata so it creates a new backend process with the corrected flag. Source: https://github.com/SteamDeckHomebrew/decky-loader/blob/main/backend/decky_loader/plugin/sandboxed_plugin.py

## Device busy diagnosis (0.1.2)

An exclusive evdev grab held by another process prevents the bridge from taking input ownership. The updated error names the event node and lists processes with it open; that list alone does not prove which process holds the grab. Physical feature-report EBUSY errors are labeled separately. Exit the old standalone bridge cleanly and stop any other controller mapper before retrying. Do not kill every process in the list: Steam and ordinary readers may have legitimate nonexclusive opens. Logs: `sudo tail -n 60 /home/deck/homebrew/logs/ally-impulse/bridge.log`.

## InputPlumber ownership fix (0.1.4)

All service operations explicitly address the system manager. Before grabbing input, the bridge temporarily runtime-masks InputPlumber (unless it was already masked), stops it, and checks that it stopped. The journal records whether this bridge created the mask. Restoration removes only that recorded runtime mask and starts InputPlumber only if it was active at the initial snapshot. Decky is left running. The mask blocks automatic service reactivation during bridge ownership and disappears on reboot. A crash requires journal recovery to remove the mask without rebooting. This new service-management behavior is source implemented and not yet confirmed on the user’s device.

## Decky bundled-library fix (0.1.5)

Decky’s PyInstaller library environment must not be inherited by host executables. Version 0.1.5 removes LD_LIBRARY_PATH and related library/Python overrides from the environment used to start the bridge, recovery Python, modprobe, and helper commands including systemctl. This fixes the identified incompatible `/tmp/_MEI.../libcrypto.so.3` selection without replacing system libraries or changing Decky’s own environment. It also explains how previous `is-active` checks could fail and incorrectly omit an active InputPlumber service. This code change is not yet confirmed in the user’s Decky session.

## Slider preview and launch-option copy (0.1.6)

Changing strength while enabled requests a 150 ms ping on both impulse triggers at the selected 0–100% magnitude after 250 ms without slider changes. 0% is silent; when disabled the strength is saved without playing a ping. Preview requests expire after two seconds, are not replayed on startup, and are marked `slider-preview` in the report log. Game output arriving during a preview preserves grip magnitudes and uses the preview trigger magnitudes until the preview ends; recent game output resumes afterward, otherwise triggers are zeroed. Preview output does not increment the game-trigger-request counter.

The **Copy launch option** button copies the reusable command using the actual installed wrapper path. Paste into Steam → game → Properties → General → Launch Options. Also disable Steam Input in Properties → Controller. Preserve any existing launch options before editing. The button uses browser clipboard writing with a selection-copy fallback for Steam CEF; if clipboard access is unavailable it displays the command for manual copying. Clipboard behavior and physical pings remain to be confirmed in the user’s session.

## Decky log ownership fix (0.1.7)

Decky-managed sessions accept a report log owned by root or the configured Decky user. The opened file must still be regular with one link; symlinks remain rejected, and permissions are set to 0600. Standalone sessions retain the root-owner requirement. This handles user-owned logs after Decky installation/update without recursively changing plugin/settings/log directory ownership. The original error did not print file ownership, so Decky ownership rewriting remains the likely explanation rather than a verified cause.

## Rear buttons and Library/QAM (0.1.8)

M1 (F15) now maps to right-stick click/R3; M2 (F14) maps to left-stick click/L3. Physical stick clicks continue working and overlapping aliases remain combined. The bridge saves the physical gamepad’s `qam_mode` and selects mode 1 while running. In the pinned kernel driver, right-side shortcut reports 0x38/0x93 generate a timed Guide-down, A-down, A-up, Guide-up sequence, which the bridge forwards as Xbox+A for Steam QAM. The previous qam_mode is restored on stop/recovery. If the attribute is unavailable, the bridge logs that the shortcut is unavailable and still supports normal controls. Firmware event identity and Steam QAM behavior require confirmation on-device; no extra F17/F18 mapping is assumed.

## Kernel compatibility (0.1.9)

The exact kernel release restriction is removed. Startup still requires Xbox Ally X board RC73XA and controller USB 0b05:1b4c. Before changing controller settings, the bridge checks the physical evdev identity, required stick/trigger/D-pad axes and ranges, required gamepad buttons, UHID availability, and the Ally driver configuration/remapping attributes. Existing opened-hidraw identity checks and transfer errors remain enforced. Optional qam_mode is used only when available. A different kernel produces a baseline warning rather than a rejection. These checks allow compatible Valve or other kernels with the required driver interfaces; they do not prove firmware motor-report compatibility or guarantee support for stock kernels lacking those interfaces. Only the README’s FH5/SteamOS/kernel baseline is user-tested.
