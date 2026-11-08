# Ally Impulse: usage, troubleshooting and recovery

This guide explains how Ally Impulse manages the controller and how to restore the changes it makes. For installation, supported hardware and reported working configurations, start with the [README](../README.md#install).

## What the bridge does

Ally Impulse exposes a virtual Xbox Series controller and forwards the Xbox Ally X’s physical controls to it. Games send vibration requests to that virtual controller; the bridge forwards four separate motor values to the Ally:

- Left trigger (LT).
- Right trigger (RT).
- Left grip.
- Right grip.

The strength slider scales LT and RT independently. It does not scale grip amplitudes or generate game feedback from trigger position, throttle, braking or ordinary rumble. A game must actually submit independent trigger requests through a compatible input path.

A brief slider preview is an intentional exception: it sends a test pulse so the selected strength can be felt without launching a game. Preview pulses are labeled separately in the log.

## Starting and using the controller

1. Exit any older standalone bridge before enabling the plugin.
2. Open **Decky → Ally Impulse** and turn on **Trigger Haptics**. Wait for **Controller connected** before launching a game.
3. Disable Steam Input for the game.
4. Use **Copy launch option** and paste the command into **Steam → game Properties → General → Launch Options**. Preserve existing launch options before editing them.

The standard command is:

```text
/home/deck/homebrew/plugins/ally-impulse/game-env.sh %command%
```

The copy button uses the actual installed path if it differs. The wrapper selects SDL’s Xbox HIDAPI input path and sets the relevant Proton options. It does not start the bridge or change a game’s files. Some games require additional compatibility work; see the [Motorsport guide](FORZA-MOTORSPORT.md) for its separate controller-ID patch and FM Tools/Xodus prerequisites.

The wrapper allows only controllers with the virtual Xbox Series identity `045e:0b13` in SDL. Other controllers are excluded from that game’s SDL input path. A physical controller with the same identity may still appear, so disconnect additional controllers when diagnosing duplicate input.

## Controls and button mappings

| Control | Behavior |
| --- | --- |
| **Trigger Haptics** | Starts the bridge when turned on. Turning it off stops the bridge, disconnects the virtual controller and restores the physical controller. Exit the game before switching it off. |
| **Haptics stength** | Scales trigger requests from 0–100%. At 100%, the game’s requested intensity passes through; 0% is silent. |
| **Use default for this game** | Removes the running game’s saved override and applies the default profile. |
| **Copy launch option** | Copies the reusable wrapper command. The exact command is always displayed directly below the button in a read-only, selectable text box with horizontal scrolling. It can also be copied manually. |

Button mappings while the bridge runs:

- **M1 → right-stick click (R3).**
- **M2 → left-stick click (L3).**
- **Library → Quick Access Menu**, through the kernel driver’s timed Xbox+A shortcut when its `qam_mode` interface is available.

Physical stick clicks continue working alongside the rear-button aliases. Holding both an alias and its physical stick click does not release the virtual click until both are released.

The bridge takes exclusive access to the gamepad and rear-key keyboard interface. Other keys sharing that keyboard interface may be suppressed while it runs. Keep touch input or an external keyboard available during initial setup and troubleshooting.

### Strength preview

After slider movement pauses for approximately 250 ms, both triggers receive a 150 ms preview at the selected percentage, provided trigger vibration is enabled. No preview plays when disabled or at 0% strength.

Automatic profile changes do not play previews. During a preview, incoming game reports retain their grip amplitudes while trigger output uses the preview strength. When it ends, recent game feedback resumes; otherwise trigger output is zeroed rather than replaying an old effect.

## Per-game profiles

The panel displays the running game’s name. Adjusting its toggle or strength saves both values for that Steam AppID. Future launches load those values automatically, even when the Decky panel is closed.

- **No game running:** edits change the default profile.
- **Game without saved settings:** the default applies until a setting is customized.
- **Game with saved settings:** its profile applies on launch.
- **Game exits:** the default profile applies again.

Steam-added non-Steam shortcuts can have profiles when Steam reports their lifecycle. Recreating a shortcut may change its AppID and therefore require a new profile. When multiple apps run, the Steam-reported main app is preferred; the last reported running app is the fallback.

If the panel still shows **Default profile** while a game runs, game detection has not selected it. Changes made in that state edit the default, not a game-specific profile. The backend rejects a delayed edit if the selected game changes before the edit is saved.

Turning **Trigger Haptics** off disables the current profile and the default before stopping the bridge. Other saved game profiles remain intact and can start the bridge on a later launch.

### Settings storage and upgrades

The usual settings location is:

```text
/home/deck/homebrew/settings/ally-impulse/settings.json
```

The current format stores a default profile and game profiles keyed by AppID. The flat top-level enable/strength fields represent the active profile read by the bridge. Avoid editing this file while Decky is running, since the plugin may overwrite manual changes.

Older settings are migrated into the default profile. A pre-migration copy is retained as `settings-before-game-profiles.json` in the same directory. Settings persist across Decky restarts and system reboots.

## Temporary system changes

While active, the bridge:

1. Saves the physical controller’s mode and game-mode rear-button mappings.
2. Selects game mode and maps the rear keys for the virtual stick-click aliases.
3. Saves and enables the kernel’s QAM mode when that interface exists.
4. Temporarily stops InputPlumber if present and blocks service reactivation with a runtime mask, unless it was already masked.
5. Takes exclusive physical input access and creates the virtual controller through Linux UHID.
6. Grants the Steam user access to the newly created virtual HID node.

Decky remains running. On a normal stop, the bridge releases input access, removes the virtual controller, sends an all-motor stop report, restores the saved mappings/modes, and removes any InputPlumber runtime mask that it created. InputPlumber is restarted only if it was active in the initial snapshot.

The kernel’s `apply_all` operation also reapplies its cached button, deadzone and response-curve settings. The plugin does not replace kernel modules, install a permanent udev rule, create a separate boot service or automatically rewrite game launch options.

## Sleep, wake and restarts

Reported testing has not required manually toggling the bridge after sleep/wake or a system restart. Saved settings allow the plugin to start the bridge again when Decky loads; game detection then selects the appropriate profile.

Restarting Decky while a game runs can disconnect and recreate the virtual controller. Some games may need to be relaunched afterward. On backend startup, the default profile is selected before the running game is detected, so a brief default-profile interval is possible.

## Restoring the original controller

### Normal stop

1. Exit the game.
2. Open Ally Impulse and turn **Trigger Haptics** off.
3. Wait for **Controller bridge stopped**.

This restores the saved physical controller configuration and any InputPlumber service state managed by the bridge. The toggle uses the backend’s existing stop-and-restore command; there is no separate stop button.

### Recovery after an interruption

The bridge records restoration data in:

```text
/run/ally-gamefeedback-state.json
```

Before starting a new session, the plugin attempts to restore an interrupted session from that journal. It refuses to take over a bridge whose recorded PID is still alive.

If automatic recovery fails, exit games and stop any still-running bridge cleanly. Then run:

```sh
sudo python3 /home/deck/homebrew/plugins/ally-impulse/bridge/bridge.py --restore
```

Adjust the path if the plugin is installed elsewhere. Do not delete the journal to bypass an error: it contains the saved mappings and service state needed for restoration. A failed restore retains it for another attempt. If the controller’s old configuration interface has disappeared, restoration may require further diagnosis.

A watchdog attempts an all-motor stop if the bridge process dies. It cannot recover a disconnected USB device, kernel failure or power loss. Runtime masks disappear on reboot; UHID may remain loaded until reboot and should not be unloaded while another application needs it.

### Uninstall

Stop the bridge and complete any necessary recovery **before** removing the plugin files. Then uninstall through Decky, or remove the plugin directory and restart Decky. Remove Ally Impulse’s wrapper from game launch options while preserving other required options.

Decky settings and logs may remain after uninstall. They can be kept for reinstallation or removed separately when no longer needed. The Motorsport DLL workaround is independent of the plugin; follow its [undo instructions](FORZA-MOTORSPORT.md#undo--updates) if it should also be reverted.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| **Device or resource busy** | Check `bridge.log` for the named device and processes with it open. Stop an older bridge or conflicting mapper cleanly. An open file descriptor alone does not prove exclusive ownership; do not kill every listed process. |
| **Missing kernel/controller interface** | Check the reported missing axis, button or sysfs attribute. A different kernel version is allowed only when the required interfaces are present. See the README’s [tested configurations](../README.md#tested-configuration). |
| **No controller in a game** | Enable the bridge before launch, check Steam Input and launch options, and investigate game-specific input issues. For Motorsport, check its exact-build controller-ID patch. |
| **Buttons and grip rumble work, but trigger feedback is unclear** | Inspect incoming LT/RT values in `reports.jsonl`. Ordinary rumble does not establish impulse-trigger support. |
| **Default profile remains selected during a game** | Check whether Steam detects the running game. Reopen the panel after launch; Steam/Decky API differences can prevent automatic profile selection. |
| **Clipboard copy fails** | Copy the command displayed in the panel manually. |
| **Recovery refuses because the PID is alive** | Identify the recorded process and stop the actual bridge cleanly. Do not terminate unrelated processes or remove the journal. |

Startup errors are displayed in the panel. The plugin uses Decky’s `root` flag for device and service access. Host commands are launched without Decky’s bundled library overrides to avoid loading incompatible libraries from its temporary runtime directory. System-library replacement is not part of installation or recovery.

## Logs and feedback verification

Logs normally reside in:

```text
/home/deck/homebrew/logs/ally-impulse/
```

- **`bridge.log`:** startup, errors and restoration messages.
- **`reports.jsonl`:** incoming virtual Xbox reports and outgoing physical Ally reports, limited to approximately 4 MiB.

Read recent startup errors with:

```sh
sudo tail -n 80 /home/deck/homebrew/logs/ally-impulse/bridge.log
```

For feedback diagnosis, start a fresh bridge session and run only the game being investigated. Avoid changing the slider during capture. In the JSONL log:

- `source: "virtual-xbox-output"` records input from the virtual controller’s output interface. `xbox` contains the incoming report; `ally` contains the outgoing report.
- `lt`, `rt`, `left_grip` and `right_grip` are the outgoing motor magnitudes.
- `source: "slider-preview"` identifies an intentional preview pulse.
- `preview_active: true` marks game reports recorded while a preview is affecting output. Exclude these when checking game-driven trigger output.

An outgoing report is logged after the physical HID transfer succeeds. This establishes software delivery, not measured motor motion. UHID does not identify the submitting game or process. The panel’s **Trigger feedback received this session** indicator counts incoming nonzero trigger requests, including while output is disabled; it does not prove physical vibration. Rotated logs retain only a recent part of a session.

## Development and licenses

The frontend is in `src/`, the Decky backend is `main.py`, and the controller bridge is in `bridge/`. Build the frontend using the pinned dependencies:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
```

The frontend listens for Steam game lifecycle events and reconciles running-app state outside the panel’s React lifecycle. Profile selection updates the live settings file without recreating the controller. Game and option values are validated, and backend commands use fixed executable/argument lists rather than UI-supplied shell commands.

The project is [MIT-licensed](../LICENSE). Included third-party material retains its own notices: [Decky template/build configuration](../licenses/DECKY-TEMPLATE-BSD-3-Clause) and the [libvirtualhid-derived Xbox descriptor](../bridge/reference/libvirtualhid-MIT.md).
