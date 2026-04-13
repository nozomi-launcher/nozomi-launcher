import type { ControllerType, GamepadAction } from "../types/input";

// Standard gamepad button mapping (Xbox layout)
// https://w3c.github.io/gamepad/#remapping
export const BUTTON_MAP: Record<number, GamepadAction> = {
  0: "CONFIRM", // A
  1: "CANCEL", // B
  3: "REFRESH", // Y (Xbox) / Triangle (PS) / X (Nintendo)
  4: "TAB_LEFT", // LB
  5: "TAB_RIGHT", // RB
  12: "UP", // D-pad up
  13: "DOWN", // D-pad down
  14: "LEFT", // D-pad left
  15: "RIGHT", // D-pad right
};

// Left stick axis thresholds
export const STICK_THRESHOLD = 0.5;
export const STICK_AXIS_X = 0;
export const STICK_AXIS_Y = 1;

export function detectControllerType(id: string): ControllerType {
  const lower = id.toLowerCase();
  if (lower.includes("xbox") || lower.includes("xinput") || lower.includes("045e")) {
    return "xbox";
  }
  if (
    lower.includes("dualshock") ||
    lower.includes("dualsense") ||
    lower.includes("054c") ||
    lower.includes("playstation") ||
    lower.includes("sony")
  ) {
    return "playstation";
  }
  if (
    lower.includes("pro controller") ||
    lower.includes("joy-con") ||
    lower.includes("057e") ||
    lower.includes("nintendo")
  ) {
    return "nintendo";
  }
  return "generic";
}

export function getStickAction(gamepad: Gamepad): GamepadAction | null {
  const x = gamepad.axes[STICK_AXIS_X];
  const y = gamepad.axes[STICK_AXIS_Y];

  if (x !== undefined && Math.abs(x) > STICK_THRESHOLD) {
    return x > 0 ? "RIGHT" : "LEFT";
  }
  if (y !== undefined && Math.abs(y) > STICK_THRESHOLD) {
    return y > 0 ? "DOWN" : "UP";
  }

  return null;
}
