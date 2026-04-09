# Developing

## Setup

```bash
pnpm install
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
| `src/hooks/` | Custom React hooks (useGamepad, useSpatialNav, useGamepadAction) |
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

- **Gamepad navigation**: All interactive elements must have a `data-focusable` attribute. The spatial navigation system (`useSpatialNav`) queries these to determine focus targets.
- **Navigation lock**: Components that capture D-pad input (e.g., `GamepadSelect`) use `inputStore.setNavigationLock(true)` to prevent spatial navigation while open. The `useSpatialNav` hook dispatches `gamepad-action` custom events instead when locked.
- **Controller detection**: `detectControllerType()` in `gamepad.ts` identifies Xbox/PlayStation/Nintendo controllers from the Gamepad API `id` string. The detected type is stored in `inputStore.controllerType`.
- **Button glyphs**: `ButtonGlyph` and `ButtonPrompt` components render input-device-aware labels (e.g., "A" for Xbox, "Cross" for PlayStation, "Enter" for keyboard).
- **Tab transitions**: Views are wrapped in `TabPanel` which uses CSS opacity transitions. Inactive panels get `data-tab-active="false"` to exclude their elements from spatial navigation.
