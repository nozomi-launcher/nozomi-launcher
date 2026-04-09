import { describe, it, expect } from "vitest";
import { BUTTON_MAP, getStickAction, detectControllerType } from "./gamepad";

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

describe("detectControllerType", () => {
  it("detects Xbox controllers", () => {
    expect(detectControllerType("Xbox 360 Controller")).toBe("xbox");
    expect(detectControllerType("Xbox One Controller")).toBe("xbox");
    expect(detectControllerType("xinput gamepad")).toBe("xbox");
    expect(detectControllerType("045e-028e")).toBe("xbox");
  });

  it("detects PlayStation controllers", () => {
    expect(detectControllerType("DualShock 4")).toBe("playstation");
    expect(detectControllerType("DualSense Wireless Controller")).toBe("playstation");
    expect(detectControllerType("Sony Interactive Entertainment")).toBe("playstation");
    expect(detectControllerType("054c-0ce6")).toBe("playstation");
  });

  it("detects Nintendo controllers", () => {
    expect(detectControllerType("Pro Controller")).toBe("nintendo");
    expect(detectControllerType("Joy-Con (L)")).toBe("nintendo");
    expect(detectControllerType("Nintendo Switch Pro")).toBe("nintendo");
    expect(detectControllerType("057e-2009")).toBe("nintendo");
  });

  it("returns generic for unknown controllers", () => {
    expect(detectControllerType("Generic Gamepad")).toBe("generic");
    expect(detectControllerType("Unknown Device 1234")).toBe("generic");
    expect(detectControllerType("")).toBe("generic");
  });

  it("is case-insensitive", () => {
    expect(detectControllerType("XBOX CONTROLLER")).toBe("xbox");
    expect(detectControllerType("dualshock")).toBe("playstation");
    expect(detectControllerType("NINTENDO PRO CONTROLLER")).toBe("nintendo");
  });
});
