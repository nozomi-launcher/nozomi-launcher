# Navigation System

How gamepad and keyboard navigation works across the app.

## Architecture

Three layers:

1. **Input detection** (`src/hooks/useGamepad.ts`) — polls gamepads via `requestAnimationFrame`, maps buttons/stick to actions. Also handles keyboard shortcuts.
2. **Spatial navigation** (`src/hooks/useSpatialNav.ts`) — receives actions and either navigates between focusable elements or dispatches special behavior (tab switching, refresh, confirm/cancel).
3. **Focus targets** — any element with the `data-focusable` attribute participates in spatial navigation.

## Input Mapping

### Gamepad buttons (`src/lib/gamepad.ts` — `BUTTON_MAP`)

| Button index | Xbox | PlayStation | Nintendo | Action |
|---|---|---|---|---|
| 0 | A | Cross | B | `CONFIRM` |
| 1 | B | Circle | A | `CANCEL` |
| 3 | Y | Triangle | X | `REFRESH` |
| 4 | LB | L1 | L | `TAB_LEFT` |
| 5 | RB | R1 | R | `TAB_RIGHT` |
| 12 | D-Up | D-Up | D-Up | `UP` |
| 13 | D-Down | D-Down | D-Down | `DOWN` |
| 14 | D-Left | D-Left | D-Left | `LEFT` |
| 15 | D-Right | D-Right | D-Right | `RIGHT` |

Button 2 (X / Square / Y) and button 6+ are unmapped.

Left stick also maps to UP/DOWN/LEFT/RIGHT with a 0.5 deadzone threshold.

### Keyboard shortcuts (`src/hooks/useGamepad.ts` — `KEY_MAP`)

| Key | Action |
|---|---|
| Arrow keys | UP / DOWN / LEFT / RIGHT |
| Enter | CONFIRM |
| Escape | CANCEL |
| Q | TAB_LEFT |
| E | TAB_RIGHT |
| R | REFRESH |

Keyboard shortcuts are suppressed when focus is inside an `<input>` or `<textarea>`.

### Glyph display (`src/lib/glyphs.ts`)

`ButtonGlyph` and `ButtonPrompt` components render controller-appropriate labels. `getGlyph(inputMode, controllerType, action)` resolves the label. Controller type is auto-detected from the gamepad ID string.

## Spatial Navigation Algorithm

Located in `src/hooks/useSpatialNav.ts`, function `findNearest`.

### How it works

1. Collects all `[data-focusable]` elements not inside an inactive tab (`[data-tab-active="false"]`).
2. For each candidate, checks it's in the correct direction from the currently focused element (e.g. `to.y < from.y` for UP).
3. Applies a **cone filter**: `secondary > primary * 2.75` skips the element. "Primary" is the axis of movement (vertical for UP/DOWN, horizontal for LEFT/RIGHT). "Secondary" is the cross-axis. This prevents sideways jumps.
4. Scores remaining candidates: `score = primary + secondary * 0.1`. Lower score wins.
5. Focuses the winner and scrolls it into view.

### The cone filter (line 58)

The multiplier `2.75` corresponds to roughly a 70-degree cone. Increasing it widens the cone (allows more off-axis targets). Decreasing it narrows it.

**This is the main knob for tuning navigation feel.** If navigation skips over elements that are in the right direction but horizontally offset (e.g. a right-aligned button below a full-width dropdown), the cone is too narrow. If navigation jumps sideways to elements in an adjacent column, the cone is too wide.

### When nothing is focused

If the user presses a direction and no element has focus (or the focused element lacks `data-focusable`), the first focusable element in the active tab receives focus.

## Action Handling

In `useSpatialNav.ts`, function `handleAction`:

| Action | Behavior |
|---|---|
| `UP` / `DOWN` / `LEFT` / `RIGHT` | Spatial navigation to nearest element |
| `CONFIRM` | Clicks the focused element |
| `CANCEL` | Blurs the focused element |
| `TAB_LEFT` / `TAB_RIGHT` | Cycles through tabs, focuses first element in new tab |
| `REFRESH` | On compat tab: calls `fetchReleases()` + `fetchInstalled()` |

## Navigation Lock

Stored in `src/stores/inputStore.ts` as `navigationLock`. When true, spatial navigation is disabled. Instead, the action is dispatched as a `gamepad-action` custom event on the focused element. This is used by `GamepadSelect` to handle UP/DOWN for cycling dropdown options instead of moving focus away.

Components opt into this via the `useGamepadAction` hook (`src/hooks/useGamepadAction.ts`).

## Tab System

- Tabs are defined in `useSpatialNav.ts` as `["launch", "modding", "compat", "profiles"]`.
- `TabPanel` (`src/components/TabPanel.tsx`) wraps each tab's content and sets `data-tab-active` and the `inert` attribute on inactive tabs.
- Spatial navigation filters out elements inside `[data-tab-active="false"]`, so inactive tabs don't interfere.
- On tab switch, `requestAnimationFrame` is used to focus the first focusable element in the new tab after render.

## Adding New Actions

1. Add the action name to `GamepadAction` in `src/types/input.ts`.
2. Map a gamepad button in `src/lib/gamepad.ts` (`BUTTON_MAP`).
3. Map a keyboard key in `src/hooks/useGamepad.ts` (`KEY_MAP`).
4. Add glyph labels for all controller types + keyboard in `src/lib/glyphs.ts`.
5. Handle the action in `useSpatialNav.ts` `handleAction`.

## Key Files

| File | Purpose |
|---|---|
| `src/types/input.ts` | `GamepadAction`, `InputMode`, `ControllerType` types |
| `src/lib/gamepad.ts` | Button map, stick deadzone, controller detection |
| `src/lib/glyphs.ts` | Per-controller glyph labels |
| `src/hooks/useGamepad.ts` | Input polling loop + keyboard shortcut handler |
| `src/hooks/useSpatialNav.ts` | Spatial navigation algorithm + action dispatch |
| `src/hooks/useGamepadAction.ts` | Custom event listener for navigation-locked components |
| `src/stores/inputStore.ts` | Input mode, controller type, navigation lock state |
| `src/components/ButtonGlyph.tsx` | Renders a single button glyph |
| `src/components/ButtonPrompt.tsx` | Renders glyph + label text |
| `src/components/TabBar.tsx` | Tab buttons with glyph hints |
| `src/components/TabPanel.tsx` | Tab content wrapper with `data-tab-active` / `inert` |
