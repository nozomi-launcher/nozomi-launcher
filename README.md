# Nozomi Launcher

A Steam compatibility tool with a modern UI, inspired by [luxtorpeda](https://github.com/luxtorpeda-dev/luxtorpeda). Configure game launch settings, manage environment variables, select Proton versions, and share configurations as reusable profiles.

## Features

- **Game Launch Configuration** — Set environment variables and Proton compatibility per-game
- **Profile System** — Save, load, and share launch configurations as JSON profiles
- **Gamepad Navigation** — Full gamepad support with spatial navigation (D-pad, sticks, shoulder buttons for tab switching)
- **Steam Integration** — Works as a Steam compatibility tool or standalone for testing
- **Proton Discovery** — Automatically detects installed Proton versions (official and GE-Proton)

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Backend  | Rust, Tauri v2                        |
| Frontend | React, TypeScript, Tailwind CSS       |
| State    | Zustand                               |
| Build    | Vite, pnpm                            |
| Testing  | Vitest + React Testing Library, `cargo test` |

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (20+)
- [pnpm](https://pnpm.io/) (10+)
- Tauri v2 system dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Production build
pnpm tauri build
```

## Testing

```bash
# Frontend tests
pnpm test

# Rust tests
cd src-tauri && cargo test

# TypeScript type check
pnpm exec tsc --noEmit
```

## Project Structure

```
src/                          React frontend
  components/                 Shared UI components (GamepadSelect, TabPanel, ButtonGlyph, etc.)
  views/                      Page-level views (Game Launch, Modding, Profiles)
  hooks/                      Custom hooks (gamepad polling, spatial nav, gamepad action events)
  stores/                     Zustand state stores (app, profile, input)
  lib/                        Utilities (Tauri invoke wrappers, gamepad mappings, glyph system)
  types/                      TypeScript type definitions
src-tauri/src/                Rust backend
  commands/                   Tauri command handlers
  models/                     Data models (Profile, LaunchContext)
  steam/                      Steam integration (env detection, compat tool parsing)
compat/                       Steam compatibility tool files (VDF manifests, launcher script)
```

## Steam Compatibility Tool Installation

To use as a Steam compatibility tool on Linux:

```bash
# Build the release binary
pnpm tauri build

# Copy to Steam's compatibility tools directory
mkdir -p ~/.steam/root/compatibilitytools.d/nozomi-launcher
cp compat/* ~/.steam/root/compatibilitytools.d/nozomi-launcher/
cp src-tauri/target/release/nozomi-launcher ~/.steam/root/compatibilitytools.d/nozomi-launcher/
```

Then restart Steam. Nozomi Launcher will appear as a compatibility tool option in game properties.

## Controls

### Gamepad

| Input          | Action                    |
|----------------|---------------------------|
| D-pad / Stick  | Navigate between elements |
| A              | Confirm / Click           |
| B              | Cancel / Unfocus          |
| LB             | Previous tab              |
| RB             | Next tab                  |

### Keyboard

| Input          | Action                    |
|----------------|---------------------------|
| Arrow keys     | Navigate between elements |
| Enter          | Confirm / Click           |
| Esc            | Cancel / Unfocus          |
| Q              | Previous tab              |
| E              | Next tab                  |

The UI automatically detects the input device. Cursor hides on gamepad input and reappears on mouse movement. Button glyphs update dynamically to match the connected controller (Xbox, PlayStation, Nintendo, or keyboard labels).

## Profiles

Profiles store environment variables and Proton version selection as JSON files in `~/.config/nozomi-launcher/profiles/`. They can be shared between users by copying the JSON files.

Example profile:

```json
{
  "id": "a1b2c3d4",
  "name": "Performance Mode",
  "envVars": [
    { "key": "DXVK_HUD", "value": "fps", "enabled": true },
    { "key": "MANGOHUD", "value": "1", "enabled": true }
  ],
  "protonVersion": "GE-Proton9-1",
  "createdAt": "2026-04-07T00:00:00Z",
  "updatedAt": "2026-04-07T00:00:00Z"
}
```

## Documentation

See the [docs/](docs/) folder for more detailed documentation:

- [Building](docs/building.md) — Prerequisites, build commands, versioning
- [Developing](docs/developing.md) — Dev setup, running tests, project structure
- [GitHub Actions](docs/github-actions.md) — CI workflows, release process, artifacts

## License

MIT
