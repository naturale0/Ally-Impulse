#!/bin/bash
# Start the locally installed Xodus service, then run Steam's game command.
# Override XODUS_DIR if FM Tools is installed elsewhere.
set -u
XODUS_DIR="${XODUS_DIR:-$HOME/Documents/fm-tools-main/xodus}"
XODUS="$XODUS_DIR/xodus-service"
SOCKET="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/xodus.sock"
LOG="$HOME/forza-launch.log"
XODUS_PID=""
GAME_PID=""
log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }
cleanup() {
    trap - EXIT INT TERM
    if [[ -n "$XODUS_PID" ]]; then
        log "Stopping Xodus started by this wrapper (PID $XODUS_PID)"
        kill "$XODUS_PID" 2>/dev/null || true
        wait "$XODUS_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
log '=== Forza launch started ==='
if [[ $# -eq 0 ]]; then
    log 'ERROR: No game command supplied; launch through Steam with %command%.'
    exit 1
fi
if [[ ! -x "$XODUS" ]]; then
    log "ERROR: Xodus executable not found: $XODUS; set XODUS_DIR to its directory."
    exit 1
fi
secret_ready() { busctl --user --no-pager list 2>/dev/null | grep -q 'org.freedesktop.secrets'; }
if ! secret_ready; then
    log 'Starting KDE Secret Service'
    /usr/bin/ksecretd >> "$LOG" 2>&1 &
    for ((i=0; i<100; i++)); do
        secret_ready && break
        sleep 0.1
    done
    if ! secret_ready; then
        log 'ERROR: KDE Secret Service failed to start'
        exit 1
    fi
fi
if pgrep -u "$(id -u)" -x xodus-service >/dev/null; then
    log 'Reusing existing Xodus service'
    if [[ ! -S "$SOCKET" ]]; then
        log 'ERROR: Xodus exists but its socket is missing'
        exit 1
    fi
else
    if [[ -S "$SOCKET" ]]; then
        if ss -xl | grep -Fq -- "$SOCKET"; then
            log 'ERROR: Socket is occupied but no Xodus process was found'
            exit 1
        fi
        log 'Removing stale Xodus socket'
        rm -f -- "$SOCKET" || exit 1
    fi
    log 'Starting Xodus'
    (cd "$XODUS_DIR" && exec env -u LD_PRELOAD ./xodus-service) >> "$LOG" 2>&1 &
    XODUS_PID=$!
fi
READY=0
for ((i=0; i<100; i++)); do
    if [[ -n "$XODUS_PID" ]] && ! kill -0 "$XODUS_PID" 2>/dev/null; then
        log 'ERROR: Xodus exited unexpectedly'
        exit 1
    fi
    if [[ -S "$SOCKET" ]]; then READY=1; break; fi
    sleep 0.1
 done
if [[ "$READY" -ne 1 ]]; then
    log 'ERROR: Xodus socket unavailable'
    exit 1
fi
sleep 2
if [[ -n "$XODUS_PID" ]] && ! kill -0 "$XODUS_PID" 2>/dev/null; then
    log 'ERROR: Xodus exited after socket creation'
    exit 1
fi
# game-env.sh is applied by the documented Steam launch option.
log 'Starting game command'
"$@" &
GAME_PID=$!
wait "$GAME_PID"
STATUS=$?
log "Game command exited with status $STATUS"
exit "$STATUS"
