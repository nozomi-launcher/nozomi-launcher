import { describe, expect, it } from "vitest";
import { getGlyph } from "./glyphs";

describe("getGlyph", () => {
  it("returns Xbox labels for xbox controller", () => {
    expect(getGlyph("gamepad", "xbox", "CONFIRM").label).toBe("A");
    expect(getGlyph("gamepad", "xbox", "CANCEL").label).toBe("B");
    expect(getGlyph("gamepad", "xbox", "TAB_LEFT").label).toBe("LB");
    expect(getGlyph("gamepad", "xbox", "TAB_RIGHT").label).toBe("RB");
  });

  it("returns PlayStation labels for playstation controller", () => {
    expect(getGlyph("gamepad", "playstation", "CONFIRM").label).toBe("Cross");
    expect(getGlyph("gamepad", "playstation", "CANCEL").label).toBe("Circle");
    expect(getGlyph("gamepad", "playstation", "TAB_LEFT").label).toBe("L1");
  });

  it("returns Nintendo labels for nintendo controller", () => {
    expect(getGlyph("gamepad", "nintendo", "CONFIRM").label).toBe("B");
    expect(getGlyph("gamepad", "nintendo", "CANCEL").label).toBe("A");
    expect(getGlyph("gamepad", "nintendo", "TAB_LEFT").label).toBe("L");
  });

  it("returns keyboard labels in keyboard mode", () => {
    expect(getGlyph("keyboard", null, "CONFIRM").label).toBe("Enter");
    expect(getGlyph("keyboard", null, "CANCEL").label).toBe("Esc");
    expect(getGlyph("keyboard", null, "TAB_LEFT").label).toBe("Q");
  });

  it("falls back to generic when controller type is null in gamepad mode", () => {
    expect(getGlyph("gamepad", null, "CONFIRM").label).toBe("A");
  });

  it("uses keyboard labels regardless of controller type when in keyboard mode", () => {
    expect(getGlyph("keyboard", "xbox", "CONFIRM").label).toBe("Enter");
  });
});
