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
| `src/` | React frontend |
| `src-tauri/src/` | Rust backend (Tauri commands, models, Steam integration) |
| `compat/` | Steam compatibility tool VDF manifests and launcher script |
