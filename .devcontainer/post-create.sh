#!/usr/bin/env bash
set -euo pipefail

# Ensure XDG_RUNTIME_DIR exists (needed by Wayland/DBus inside container)
if [ -n "${XDG_RUNTIME_DIR:-}" ]; then
  mkdir -p "$XDG_RUNTIME_DIR"
  chmod 700 "$XDG_RUNTIME_DIR"
fi

# Fix ownership on Docker-created volumes (they default to root:root)
echo "==> Fixing volume mount permissions..."
sudo chown -R "$(id -u):$(id -g)" \
  /workspace/node_modules \
  /workspace/src-tauri/target \
  "$HOME/.cargo/registry" \
  "$HOME/.cargo/git" \
  "$HOME/.local/share/pnpm/store"

echo "==> Installing pnpm dependencies..."
pnpm install

echo "==> Ensuring Rust toolchain is up to date..."
rustup update stable

echo "==> Post-create setup complete."
echo ""
echo "GUI forwarding notes:"
echo "  Linux host:  Should work out of the box with X11 (DISPLAY is forwarded)."
echo "               For Wayland, bind-mount \$XDG_RUNTIME_DIR/wayland-0 into the container."
echo "  macOS host:  Install XQuartz (https://www.xquartz.org/), run 'xhost +localhost',"
echo "               and set DISPLAY=host.docker.internal:0 in the container."
