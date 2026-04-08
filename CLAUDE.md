# Nozomi Launcher

## Project Overview

Steam compatibility tool (like luxtorpeda) built with Tauri v2 + React + TypeScript. Gamepad-first UI that also supports mouse/keyboard.

## Tech Stack

- **Backend:** Rust (Tauri v2)
- **Frontend:** React, TypeScript, Tailwind CSS, Zustand
- **Build:** Vite, pnpm
- **Testing:** Rust `#[cfg(test)]` modules, Vitest + React Testing Library (frontend)

## Project Structure

```
src/                  # React frontend
src-tauri/src/        # Rust backend
compat/               # Steam compatibility tool VDF manifests + launcher script
```

## Commands

```bash
pnpm tauri dev          # Run in development mode
pnpm tauri build        # Production build
pnpm test               # Run frontend tests (vitest)
cd src-tauri && cargo test  # Run Rust tests
pnpm exec tsc --noEmit  # TypeScript type check
```

## Conventions

### Rust
- All Tauri commands go in `src-tauri/src/commands/`
- Data models go in `src-tauri/src/models/` with `#[serde(rename_all = "camelCase")]`
- Steam integration logic goes in `src-tauri/src/steam/`
- Use `Result<T, String>` for Tauri command error types
- Write `#[cfg(test)] mod tests` in each module

### TypeScript/React
- Views (page-level components) go in `src/views/`
- Shared components go in `src/components/`
- Zustand stores go in `src/stores/`
- Tauri invoke wrappers go in `src/lib/tauri.ts`
- Types go in `src/types/`
- All interactive elements must have `data-focusable` attribute for gamepad navigation
- Use Tailwind CSS classes; include `focus:ring-2 focus:ring-blue-500` on focusable elements

### General
- Profiles are JSON files stored in `~/.config/nozomi-launcher/profiles/`
- camelCase on TypeScript side, snake_case on Rust side (serde handles conversion)
- No react-router; tab switching via Zustand `appStore.activeTab`
