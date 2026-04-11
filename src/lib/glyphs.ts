import type { ControllerType, GamepadAction, InputMode } from "../types/input";

export interface GlyphInfo {
  label: string;
}

const GLYPH_MAP: Record<string, Record<GamepadAction, GlyphInfo>> = {
  xbox: {
    CONFIRM: { label: "A" },
    CANCEL: { label: "B" },
    TAB_LEFT: { label: "LB" },
    TAB_RIGHT: { label: "RB" },
    UP: { label: "D-Up" },
    DOWN: { label: "D-Down" },
    LEFT: { label: "D-Left" },
    RIGHT: { label: "D-Right" },
    REFRESH: { label: "Y" },
  },
  playstation: {
    CONFIRM: { label: "Cross" },
    CANCEL: { label: "Circle" },
    TAB_LEFT: { label: "L1" },
    TAB_RIGHT: { label: "R1" },
    UP: { label: "D-Up" },
    DOWN: { label: "D-Down" },
    LEFT: { label: "D-Left" },
    RIGHT: { label: "D-Right" },
    REFRESH: { label: "Triangle" },
  },
  nintendo: {
    CONFIRM: { label: "B" },
    CANCEL: { label: "A" },
    TAB_LEFT: { label: "L" },
    TAB_RIGHT: { label: "R" },
    UP: { label: "D-Up" },
    DOWN: { label: "D-Down" },
    LEFT: { label: "D-Left" },
    RIGHT: { label: "D-Right" },
    REFRESH: { label: "X" },
  },
  generic: {
    CONFIRM: { label: "A" },
    CANCEL: { label: "B" },
    TAB_LEFT: { label: "LB" },
    TAB_RIGHT: { label: "RB" },
    UP: { label: "D-Up" },
    DOWN: { label: "D-Down" },
    LEFT: { label: "D-Left" },
    RIGHT: { label: "D-Right" },
    REFRESH: { label: "Y" },
  },
  keyboard: {
    CONFIRM: { label: "Enter" },
    CANCEL: { label: "Esc" },
    TAB_LEFT: { label: "Q" },
    TAB_RIGHT: { label: "E" },
    UP: { label: "Up" },
    DOWN: { label: "Down" },
    LEFT: { label: "Left" },
    RIGHT: { label: "Right" },
    REFRESH: { label: "R" },
  },
};

export function getGlyph(
  inputMode: InputMode,
  controllerType: ControllerType | null,
  action: GamepadAction,
): GlyphInfo {
  const key = inputMode === "keyboard" ? "keyboard" : (controllerType ?? "generic");
  return GLYPH_MAP[key]?.[action] ?? { label: action };
}
