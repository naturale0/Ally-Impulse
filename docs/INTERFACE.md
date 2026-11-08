# Expected Decky interface

This wireframe shows the current control order with an example running game and saved profile. It is an illustration, not a screenshot or a proposed UI change. The complete panel is shown; on-device it scrolls.

![Annotated Ally Impulse panel with approximate control sizes](images/decky-interface-wireframe.png)

## Control order

1. **Trigger Haptics** toggle, without a helper description. Turning it off invokes the existing backend stop-and-restore command.
2. **Haptics stength** slider, without a preview/silent description. Strength preview behavior is retained.
3. **Active profile:** followed by the game name on the same line, with its profile description below.
4. **Use default for this game**, when applicable, with its description below the button.
5. Connection/feedback status and button mappings. The duplicated Steam Input/launch-option hint is omitted.
6. **Copy launch option**, immediately followed by the exact launch command in a read-only, selectable, horizontally scrollable text box. Paste/Steam Input instructions follow the box; copy feedback appears afterward when applicable.

There is no separate **Stop controller bridge** button. The Python backend is unchanged.

## Sizing

- The drawing assumes an approximately 320 CSS-pixel-wide panel, with 16-pixel side padding.
- Profile and status text are explicitly set to **13 px** with **19.5 px** line height in the source.
- The launch-command field is always visible below the copy button: **52 px** high, full available width, **12 px** monospace text and **18 px** line height. It does not wrap and supports horizontal scrolling and text selection without editing. Copy feedback is also **12 px** and appears only after a copy attempt.
- Button sizes (approximately **288 × 38 px**), switch size (approximately **44 × 24 px**) and slider width (approximately **280 px**) are illustrative. Decky supplies their native styling, fonts and spacing; actual rendering may differ across Steam/Decky versions and display scaling.
- Native Decky components also determine description placement and wrapping within each control group.

## Conditional content

- **Use default for this game** appears only when the running game has a saved override.
- Controller feedback status appears while the virtual controller is ready.
- Errors appear after the status/mappings block when present.
- Copy feedback appears after the setup instructions following a copy attempt. The launch-command box is always visible directly below the copy button.
