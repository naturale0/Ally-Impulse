# Decky interface guide

The illustration below shows Ally Impulse with a running game and a saved profile. **Example Game** is a placeholder. The full panel is shown; on the device, the content scrolls as needed.

![Ally Impulse interface showing an Example Game profile and annotated control sizes](images/decky-interface-wireframe.png)

## Controls, from top to bottom

1. **Trigger Haptics** — starts the controller bridge when enabled. Switching it off stops the bridge and restores the physical controller. Exit the game before switching it off.
2. **Haptics stength** — adjusts trigger intensity from 0–100%, in 5% steps. Changing the value while haptics are enabled plays a short preview.
3. **Active profile:** — shows the game whose settings are being edited, or **Default profile** when no game is selected. The description below explains whether the game uses saved or default settings.
4. **Use default for this game** — removes the game’s saved override. This button appears only for a game with customized settings; its explanation is below it.
5. **Controller status and mappings** — shows the connection state, whether trigger requests have been received, and the rear-button and Library mappings. Errors appear at the end of this block.
6. **Copy launch option** — copies the command displayed directly below the button. The command field is read-only, supports text selection and scrolls horizontally. Steam setup instructions follow it, with feedback after a copy attempt.

See [per-game profiles](../README.md#per-game-trigger-profiles) for automatic profile selection and [troubleshooting](DETAILS.md#troubleshooting) if the expected game or controller state is not shown.

## Layout and sizing

The illustration is a wireframe, not a screenshot. Decky supplies native control styling, so spacing, fonts and wrapping can vary with the Steam/Decky version and display scaling.

| Element | Size |
| --- | --- |
| Panel in the illustration | Approximately 320 CSS px wide, with 16 px side padding |
| Profile and status text | 13 px, with 19.5 px line height |
| Buttons in the illustration | Approximately 288 × 38 px |
| Toggle in the illustration | Approximately 44 × 24 px |
| Slider track in the illustration | Approximately 280 px wide |
| Launch-option field | Full available width; 52 px high; 12 px monospace text with 18 px line height |
| Copy feedback | 12 px text |

The launch-option field stays on one line. Scroll horizontally to view the complete command, or select and copy its text manually.

## Content that appears when needed

- A saved game profile adds the **Use default for this game** button and its description.
- A ready controller adds the trigger-feedback status line.
- Startup or runtime errors add an error message to the status block.
- A copy attempt adds a success or failure message below the setup instructions.

These additions, long game names and wrapped descriptions can change the panel’s total height.
