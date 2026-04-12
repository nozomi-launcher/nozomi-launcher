# Developing

## Setup

```bash
pnpm install
```

## Dev Container (recommended for Linux targeting)

The project includes a Podman-based dev container (Debian Bookworm) with all Tauri/Rust/Node dependencies pre-installed. This is the recommended way to develop since the app targets Linux as a Steam compatibility tool.

### Prerequisites

- [Podman](https://podman.io/) installed on your host
- VS Code with the **Dev Containers** extension
- Set `"dev.containers.dockerPath": "podman"` in VS Code settings

### Opening the container

1. Open the project in VS Code
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
3. The container will build and run `post-create.sh` automatically

### GUI forwarding

The container needs access to a display server to render the Tauri window.

**Linux host (X11):**
```bash
# Allow local connections (run on host)
xhost +local:
```
DISPLAY is forwarded automatically via `--network=host`.

**Linux host (Wayland):**
Add this mount to `devcontainer.json` `mounts` array:
```json
"source=${localEnv:XDG_RUNTIME_DIR}/wayland-0,target=/tmp/xdg-runtime/wayland-0,type=bind"
```

**macOS host:**
1. Install [XQuartz](https://www.xquartz.org/)
2. Open XQuartz → Preferences → Security → check "Allow connections from network clients"
3. Restart XQuartz, then run on the host:
   ```bash
   xhost +localhost
   ```
4. In the container terminal, set:
   ```bash
   export DISPLAY=host.containers.internal:0
   ```

## Running in development mode

```bash
pnpm tauri dev
```

This starts both the Vite dev server (frontend hot-reload) and the Rust backend.

## Running tests

```bash
pnpm test                       # Frontend tests (Vitest)
cd src-tauri && cargo test      # Rust tests
```

## Type checking

```bash
pnpm exec tsc --noEmit
```

## Project structure

| Directory | Purpose |
|---|---|
| `src/components/` | Shared UI components (GamepadSelect, TabPanel, ButtonGlyph, ButtonPrompt, TabBar, EnvVarEditor, Layout) |
| `src/views/` | Page-level views (GameLaunchView, ModdingView, ProtonView, ProfilesView) |
| `src/hooks/` | Custom React hooks (useGamepad, useSpatialNav) |
| `src/stores/` | Zustand state stores (appStore, compatStore, profileStore, protonGeStore, inputStore) |
| `src/lib/` | Utilities (tauri.ts invoke wrappers, gamepad.ts mappings, glyphs.ts glyph system) |
| `src/types/` | TypeScript type definitions (input.ts, profile.ts, protonGe.ts, settings.ts, steam.ts) |
| `src-tauri/src/` | Rust backend (Tauri commands, models, Steam integration) |
| `compat/` | Steam compatibility tool VDF manifests and launcher script |

## Testing conventions

- Test files live alongside source files with `.test.ts` / `.test.tsx` suffix
- Every new component, hook, or utility module should have a corresponding test file
- Use Vitest + React Testing Library for frontend tests
- Use `#[cfg(test)] mod tests` for Rust tests
- Run both `pnpm test` and `pnpm exec tsc --noEmit` before submitting changes

## Key patterns

- **Gamepad navigation**: The app uses [`@noriginmedia/norigin-spatial-navigation`](https://github.com/nickersk/norigin-spatial-navigation) for focus management. Use `FocusButton` and `FocusInput` from `src/components/FocusElements.tsx` for interactive elements. Never use raw `data-focusable` attributes. See `docs/navigation.md` for full details.
- **Dropdown pause/resume**: Components that capture D-pad input (e.g., `GamepadSelect`) call `pause()` / `resume()` from the norigin library to suspend its keyboard handling while open. Gamepad input is intercepted via cancelable `gamepad-action` CustomEvents.
- **Controller detection**: `detectControllerType()` in `gamepad.ts` identifies Xbox/PlayStation/Nintendo controllers from the Gamepad API `id` string. The detected type is stored in `inputStore.controllerType`.
- **Button glyphs**: `ButtonGlyph` and `ButtonPrompt` components render input-device-aware labels (e.g., "A" for Xbox, "Cross" for PlayStation, "Enter" for keyboard).
- **Tab transitions**: Views are wrapped in `TabPanel` which uses CSS opacity transitions. Inactive panels get `data-tab-active="false"` to exclude their elements from spatial navigation.
