#!/usr/bin/env bash
# Detect host OS and set display environment variables accordingly.
# Sourced from ~/.bashrc so every shell session picks up the right values.

# Skip if already sourced this session
[[ -n "${__NOZOMI_ENV_SETUP:-}" ]] && return
export __NOZOMI_ENV_SETUP=1

# ── DISPLAY ──────────────────────────────────────────────────────────────────
# macOS / Windows (Docker Desktop): host.docker.internal resolves to the host.
# Linux: The host's X11 socket is bind-mounted; use the forwarded DISPLAY.
if [[ -z "${DISPLAY:-}" ]]; then
  if getent hosts host.docker.internal &>/dev/null; then
    # Docker Desktop (macOS / Windows) – XQuartz or VcXsrv on the host
    export DISPLAY="host.docker.internal:0"
  else
    # Native Linux Docker – assume host forwarded :0
    export DISPLAY=":0"
  fi
fi

# ── XDG_RUNTIME_DIR ─────────────────────────────────────────────────────────
if [[ -z "${XDG_RUNTIME_DIR:-}" ]]; then
  export XDG_RUNTIME_DIR="/tmp/xdg-runtime"
fi
mkdir -p "$XDG_RUNTIME_DIR" 2>/dev/null
chmod 700 "$XDG_RUNTIME_DIR" 2>/dev/null

# ── GPU / rendering ──────────────────────────────────────────────────────────
# If /dev/dri exists the host GPU is passed through; prefer hardware rendering.
# Otherwise fall back to Mesa software renderers (llvmpipe / lavapipe).
if [[ -d /dev/dri ]]; then
  # Hardware GPU available — let Mesa pick the right driver
  export LIBGL_ALWAYS_INDIRECT=0
else
  # No GPU — force software rendering so WebKitGTK doesn't hang looking for HW
  export LIBGL_ALWAYS_SOFTWARE=1
  export GALLIUM_DRIVER=llvmpipe
fi
