#!/bin/sh
# Steam launch option: /absolute/path/game-env.sh %command%
export SDL_JOYSTICK_HIDAPI=1
export SDL_JOYSTICK_HIDAPI_XBOX=1
export SDL_JOYSTICK_HIDAPI_XBOX_ONE=1
export SDL_GAMECONTROLLER_IGNORE_DEVICES_EXCEPT=0x045e/0x0b13
# Source-verified for the pinned Proton Wine revision in README.
# This selects Wine's SDL path rather than its raw-HID gamepad implementation.
export PROTON_USE_SDL=1
export PROTON_NO_STEAMINPUT=1
export PROTON_DISABLE_HIDRAW=1
exec "$@"
