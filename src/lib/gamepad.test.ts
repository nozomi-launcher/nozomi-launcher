import { describe, it, expect } from "vitest";
import { BUTTON_MAP, getStickAction } from "./gamepad";

describe("gamepad button mapping", () => {
  it("maps A button to CONFIRM", () => {
    expect(BUTTON_MAP[0]).toBe("CONFIRM");
  });

  it("maps B button to CANCEL", () => {
    expect(BUTTON_MAP[1]).toBe("CANCEL");
  });

  it("maps LB to TAB_LEFT", () => {
    expect(BUTTON_MAP[4]).toBe("TAB_LEFT");
  });

  it("maps RB to TAB_RIGHT", () => {
    expect(BUTTON_MAP[5]).toBe("TAB_RIGHT");
  });

  it("maps d-pad directions", () => {
    expect(BUTTON_MAP[12]).toBe("UP");
    expect(BUTTON_MAP[13]).toBe("DOWN");
    expect(BUTTON_MAP[14]).toBe("LEFT");
    expect(BUTTON_MAP[15]).toBe("RIGHT");
  });
});

describe("getStickAction", () => {
  function makeGamepad(axes: number[]): Gamepad {
    return { axes } as unknown as Gamepad;
  }

  it("returns RIGHT for positive X axis", () => {
    expect(getStickAction(makeGamepad([0.8, 0]))).toBe("RIGHT");
  });

  it("returns LEFT for negative X axis", () => {
    expect(getStickAction(makeGamepad([-0.7, 0]))).toBe("LEFT");
  });

  it("returns DOWN for positive Y axis", () => {
    expect(getStickAction(makeGamepad([0, 0.9]))).toBe("DOWN");
  });

  it("returns UP for negative Y axis", () => {
    expect(getStickAction(makeGamepad([0, -0.6]))).toBe("UP");
  });

  it("returns null within deadzone", () => {
    expect(getStickAction(makeGamepad([0.2, -0.3]))).toBeNull();
  });

  it("returns null for centered stick", () => {
    expect(getStickAction(makeGamepad([0, 0]))).toBeNull();
  });

  it("X axis takes priority over Y axis when both are active", () => {
    // When both axes exceed threshold, X is checked first
    expect(getStickAction(makeGamepad([0.8, 0.8]))).toBe("RIGHT");
  });
});
