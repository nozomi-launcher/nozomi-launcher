import { describe, expect, it } from "vitest";
import { resolveCompatTool } from "./compatStore";

describe("resolveCompatTool", () => {
  it("returns global when no profile override", () => {
    expect(resolveCompatTool("GE-Proton10-34", null)).toBe("GE-Proton10-34");
  });

  it("returns profile override when set", () => {
    expect(resolveCompatTool("GE-Proton10-34", "GE-Proton9-27")).toBe("GE-Proton9-27");
  });

  it("returns null when neither is set", () => {
    expect(resolveCompatTool(null, null)).toBeNull();
  });

  it("returns profile override even when global is null", () => {
    expect(resolveCompatTool(null, "GE-Proton9-27")).toBe("GE-Proton9-27");
  });
});
