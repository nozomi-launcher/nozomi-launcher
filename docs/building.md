# Building

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- Linux system dependencies:

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

## Build

```bash
pnpm install
pnpm tauri build
```

Build output is in `src-tauri/target/release/`. Bundled packages (.deb, .rpm, .AppImage) are in `src-tauri/target/release/bundle/`.

## Versioning

The app version is managed in `src-tauri/Cargo.toml` as the single source of truth. Tauri reads it from there automatically. The `package.json` version is not used for the app version.
