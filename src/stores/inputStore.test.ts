import { describe, it, expect, beforeEach } from "vitest";
import { useInputStore } from "./inputStore";

describe("inputStore", () => {
  beforeEach(() => {
    useInputStore.setState({ inputMode: "keyboard" });
  });

  it("defaults to keyboard mode", () => {
    expect(useInputStore.getState().inputMode).toBe("keyboard");
  });

  it("switches to gamepad mode", () => {
    useInputStore.getState().setInputMode("gamepad");
    expect(useInputStore.getState().inputMode).toBe("gamepad");
  });

  it("switches back to keyboard mode", () => {
    useInputStore.getState().setInputMode("gamepad");
    useInputStore.getState().setInputMode("keyboard");
    expect(useInputStore.getState().inputMode).toBe("keyboard");
  });
});
