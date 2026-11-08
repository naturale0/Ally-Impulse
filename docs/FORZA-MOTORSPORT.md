# Forza Motorsport (2023)

## Reported working configuration

The user confirmed Motorsport controller input and Ally Impulse feedback working after the exact-build controller-ID patch, using GE-Proton11-3-FM and the existing [FM Tools](https://github.com/SoHiEarth/fm-tools) and [Xodus login/service setup](https://github.com/SoHiEarth/fm-tools#instructions). This is user-reported gameplay verification, not an independent hardware test by the code authoring assistant. Other Proton DLL builds are not covered by this patch.

The problem is Wine’s `IRawGameController2.NonRoamableId` implementation in this build: its controller-ID path rejects non-Steam VID/PID values. The workaround removes two conditional rejection branches so the existing ID formatter can run. It does not change controller input or four-channel haptic processing, and does not implement a general stable controller identity.

## Apply

Exit Motorsport completely. From the repository directory, as the normal Steam user (no sudo):

```sh
python3 tools/motorsport-wgi-fix.py
```

If the tool reports that the exact builds are accepted:

```sh
python3 tools/motorsport-wgi-fix.py --apply
```

Both copies must be handled:

- `GE-Proton11-3-FM/files/lib/wine/x86_64-windows/windows.gaming.input.dll`
- `steamapps/compatdata/2440510/pfx/drive_c/windows/system32/windows.gaming.input.dll`

The script discovers these under the standard Steam roots and configured Steam libraries. For a custom installation, supply **both** paths using repeated `--file` arguments, first inspecting and then adding `--apply`:

```sh
python3 tools/motorsport-wgi-fix.py \
  --file "/path/to/GE-Proton11-3-FM/files/lib/wine/x86_64-windows/windows.gaming.input.dll" \
  --file "/path/to/steamapps/compatdata/2440510/pfx/drive_c/windows/system32/windows.gaming.input.dll"
```

All target hashes are checked before writes begin. Originals are backed up beside each DLL as `windows.gaming.input.dll.ally-impulse-original`. Replacement is atomic per file, avoiding in-place edits to shared hard links. Completed replacements are rolled back if an ordinary operation fails; a process/system crash can still require explicit recovery. Backups are retained. No binaries are downloaded or executed by the tool.

## Launch

Keep the working FM Tools authentication/runtime settings and your existing Xodus startup script. Enable Ally Impulse before launching Motorsport, and disable Steam Input for the game. Example using the previously tested launch-script arrangement:

```text
PRESSURE_VESSEL_FILESYSTEMS_RW=/run/user/1000/xodus.sock WINEDLLOVERRIDES=xgameruntime=b PROTON_VKD3D_HEAP=1 VKD3D_CONFIG=skip_application_workarounds,descriptor_heap,avoid_image_buffer_aliasing "$HOME/homebrew/plugins/ally-impulse/game-env.sh" /bin/bash "$HOME/Documents/forza-launch.sh" %command%
```

Use your real socket, plugin and script paths. The `forza-launch.sh` file is part of your FM Tools setup, not supplied by Ally Impulse. Do not replace an existing working launch command with this example blindly. Remove the unsuccessful `PROTON_EMULATE_STEAMINPUT=1` identity-emulation setting if it was added during troubleshooting. No Ally Impulse code changes are needed for the DLL patch.

After relaunch, verify menu controls and actual independent LT/RT feedback while driving. The slider preview alone does not establish game feedback.

## Undo / updates

Close Motorsport and run from the repository directory:

```sh
python3 tools/motorsport-wgi-fix.py --restore
```

Repeat the same `--file` arguments if you used custom paths. Restore checks that the backups match the known original. A Proton update or prefix repair may replace either DLL. Re-run inspection; do not apply these offsets to an unknown version. A newer Proton may fix the issue and need no patch.

## Exact build and attribution

Original SHA-256:

```text
57538166ba052dc763232880f18a4b48a07ab735a61b5b8fbf5a8f56a05f2ca5
```

Patched SHA-256:

```text
f520d9b4d44d9cdc11e67396583a1ccc8c53eca60e0b3a69233f358556b59245
```

On this exact build only, offsets `0x14932` and `0x1493a` change `75 3a` and `75 32` respectively to `90 90`. Credit for the published exact-build workaround belongs to [volcmen/forza-motorsport-linux](https://github.com/volcmen/forza-motorsport-linux/blob/022fc3bdcfab4c73abc5ec518b04335fcd4299bd/manifests/supported-builds.toml). See also the [independent Motorsport investigation](https://github.com/frVasili/linux-impulse-triggers/blob/main/docs/forza-motorsport-2023.md). The helper script is provided under this repository’s MIT license. No Wine or Microsoft DLLs are distributed by this repository.
