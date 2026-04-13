# Navigation System

How gamepad and keyboard navigation works across the app.

## Architecture

The navigation system uses [`@noriginmedia/norigin-spatial-navigation`](https://github.com/nickersk/norigin-spatial-navigation) (v3) for focus management, with a thin adapter layer on top for gamepad input and tab switching.

### Layers

1. **norigin-spatial-navigation** — handles directional focus movement, focus tree hierarchy, and keyboard arrow keys / Enter natively.
2. **Input detection** (`src/hooks/useGamepad.ts`) — polls gamepads via `requestAnimationFrame`, maps buttons/stick to actions. Also handles a small set of keyboard shortcuts (Q, E, Escape, R) that the library does not cover.
3. **Action dispatch** (`src/hooks/useSpatialNav.ts`) — receives actions and either delegates to the library (`navigateByDirection`, `setFocus`) or performs app-level behavior (tab switching, refresh, confirm/cancel).

### Focus tree

The library maintains a tree of focusable containers and leaf elements. Each container is created by calling `useFocusable()` and wrapping children in `<FocusContext.Provider>`. The root is set up in `App.tsx`.

```
App (root)
├── TabBar (focusKey: "tab-bar", boundary: up)
│   ├── TabButton "tab-launch"
│   ├── TabButton "tab-modding"
│   ├── TabButton "tab-compat"
│   ├── TabButton "tab-profiles"
│   └── TabButton "tab-settings"
├── GameLaunchView (focusKey: "tab-launch")
│   ├── FocusButton, FocusInput, GamepadSelect ...
│   └── EnvVarEditor (focusKey: "env-var-editor")
├── ModdingView (focusKey: "tab-modding")
├── CompatToolsView (focusKey: "tab-compat")
│   ├── SidebarNav (focusKey: "compat-sidebar", saveLastFocusedChild)
│   │   └── CategoryButton ...
│   └── VersionPanel (focusKey: "compat-versions", saveLastFocusedChild)
│       └── VersionRow ...
├── ProfilesView (focusKey: "tab-profiles")
│   └── ProfileRow ...
└── SettingsView (focusKey: "tab-settings")
    └── SourceRow ...
```

Key options:
- `saveLastFocusedChild: true` — remembers the last focused child when navigating away, so returning to the container resumes at the same position (used for compat tool sidebar and version panel).
- `isFocusBoundary: true` — prevents navigation from escaping the container in certain directions (used by TabBar to block upward navigation).
- `trackChildren: true` — enables `hasFocusedChild` tracking.

### Initialization

In `src/main.tsx`, before React renders:

```ts
import { init } from "@noriginmedia/norigin-spatial-navigation";
init({ shouldFocusDOMNode: true });
```

`shouldFocusDOMNode: true` means the library calls native `.focus()` on DOM nodes, so existing Tailwind `focus:ring-*` CSS classes work without modification.

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

Only keys that the norigin library does **not** handle are mapped here:

| Key | Action |
|---|---|
| Q | TAB_LEFT |
| E | TAB_RIGHT |
| Escape | CANCEL |
| R | REFRESH |

Arrow keys and Enter are handled natively by the norigin library's built-in keydown listener.

Keyboard shortcuts are suppressed when focus is inside an `<input>` or `<textarea>`.

### Glyph display (`src/lib/glyphs.ts`)

`ButtonGlyph` and `ButtonPrompt` components render controller-appropriate labels. `getGlyph(inputMode, controllerType, action)` resolves the label. Controller type is auto-detected from the gamepad ID string.

## Action Handling

In `useSpatialNav.ts`, function `handleAction`:

| Action | Behavior |
|---|---|
| `TAB_LEFT` / `TAB_RIGHT` | Cycles through tabs, then calls `setFocus("tab-<name>")` to focus the new tab button |
| `REFRESH` | On compat tab: calls `fetchReleases()` + `fetchInstalled()` |
| `UP` / `DOWN` / `LEFT` / `RIGHT` | Dispatches a cancelable `gamepad-action` CustomEvent on the focused element. If not cancelled, calls `navigateByDirection()` |
| `CONFIRM` | Dispatches a cancelable `gamepad-action` CustomEvent. If not cancelled, clicks the focused element |
| `CANCEL` | Dispatches a cancelable `gamepad-action` CustomEvent. If not cancelled, blurs the focused element |

### Cancelable events

For directional, confirm, and cancel actions, `useSpatialNav` dispatches a `"gamepad-action"` CustomEvent with `cancelable: true` on `document.activeElement`. If a component calls `event.preventDefault()`, the default behavior is skipped. This lets components like `GamepadSelect` intercept gamepad input when a dropdown is open.

## Component Wrappers

### `FocusButton` / `FocusInput` / `FocusDiv` (`src/components/FocusElements.tsx`)

Thin wrappers around `<button>`, `<input>`, and `<div>` that call `useFocusable()` internally. Drop-in replacements for elements that previously used `data-focusable`.

- `FocusButton` passes `onEnterPress` that clicks the button ref.
- `FocusInput` registers with the focus tree so it can be reached via directional navigation.
- `FocusDiv` is a generic focusable container.

### `GamepadSelect` (`src/components/GamepadSelect.tsx`)

Custom dropdown that calls `pause()` when opened and `resume()` when closed. This suspends the library's keyboard handling so arrow keys can navigate dropdown options. Gamepad input is intercepted via the cancelable `gamepad-action` event pattern.

## Tab System

- Tabs are defined in `useSpatialNav.ts` as `["launch", "modding", "compat", "profiles", "settings"]`.
- `TabPanel` (`src/components/TabPanel.tsx`) wraps each tab's content and sets `data-tab-active` and the `inert` attribute on inactive tabs.
- On tab switch, `setFocus("tab-<name>")` focuses the corresponding tab button in the TabBar.

## Adding New Focusable Elements

1. Use `FocusButton` or `FocusInput` from `src/components/FocusElements.tsx` instead of raw `<button>` or `<input>` elements.
2. If elements are rendered in a `.map()` loop, extract them into a sub-component so each gets its own `useFocusable()` call (React hooks cannot be called inside loops).
3. If you need a focusable container that groups children, call `useFocusable()` and wrap children in `<FocusContext.Provider value={focusKey}>`.

## Adding New Actions

1. Add the action name to `GamepadAction` in `src/types/input.ts`.
2. Map a gamepad button in `src/lib/gamepad.ts` (`BUTTON_MAP`).
3. Map a keyboard key in `src/hooks/useGamepad.ts` (`KEY_MAP`) — only if the library doesn't already handle it.
4. Add glyph labels for all controller types + keyboard in `src/lib/glyphs.ts`.
5. Handle the action in `useSpatialNav.ts` `handleAction`.

## Key Files

| File | Purpose |
|---|---|
| `src/types/input.ts` | `GamepadAction`, `InputMode`, `ControllerType` types |
| `src/lib/gamepad.ts` | Button map, stick deadzone, controller detection |
| `src/lib/glyphs.ts` | Per-controller glyph labels |
| `src/hooks/useGamepad.ts` | Input polling loop + keyboard shortcut handler |
| `src/hooks/useSpatialNav.ts` | Action dispatch (tab switching, directional navigation, confirm/cancel) |
| `src/stores/inputStore.ts` | Input mode, controller type state |
| `src/components/FocusElements.tsx` | `FocusButton`, `FocusInput`, `FocusDiv` wrappers |
| `src/components/GamepadSelect.tsx` | Custom dropdown with pause/resume |
| `src/components/ButtonGlyph.tsx` | Renders a single button glyph |
| `src/components/ButtonPrompt.tsx` | Renders glyph + label text |
| `src/components/TabBar.tsx` | Tab buttons with glyph hints |
| `src/components/TabPanel.tsx` | Tab content wrapper with `data-tab-active` / `inert` |
