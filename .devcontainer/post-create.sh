#!/usr/bin/env bash
set -euo pipefail

# Source display/env detection
source /workspace/.devcontainer/env-setup.sh

# Fix ownership on Docker-created volumes (they default to root:root)
echo "==> Fixing volume mount permissions..."
sudo chown -R "$(id -u):$(id -g)" \
  /workspace/node_modules \
  /workspace/src-tauri/target \
  "$HOME/.cargo/registry" \
  "$HOME/.cargo/git" \
  "$HOME/.local" \
  "$HOME/.local/share/pnpm/store"

echo "==> Installing pnpm dependencies..."
pnpm install

echo "==> Ensuring Rust toolchain is up to date..."
rustup update stable

echo "==> Post-create setup complete."
echo ""
echo "GUI forwarding notes:"
echo "  DISPLAY is set to: ${DISPLAY:-<unset>}"
echo "  Linux host:  Should work out of the box (X11 socket forwarded, DISPLAY=:0)."
echo "  macOS host:  Install XQuartz, run 'xhost +localhost' on the HOST,"
echo "               container auto-detects DISPLAY=host.docker.internal:0."
