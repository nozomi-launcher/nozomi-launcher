import { beforeEach, describe, expect, it } from "vitest";
import { useInputStore } from "./inputStore";

describe("inputStore", () => {
  beforeEach(() => {
    useInputStore.setState({
      inputMode: "keyboard",
      controllerType: null,
    });
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

  it("defaults controllerType to null", () => {
    expect(useInputStore.getState().controllerType).toBeNull();
  });

  it("sets controller type", () => {
    useInputStore.getState().setControllerType("xbox");
    expect(useInputStore.getState().controllerType).toBe("xbox");
  });

  it("clears controller type", () => {
    useInputStore.getState().setControllerType("playstation");
    useInputStore.getState().setControllerType(null);
    expect(useInputStore.getState().controllerType).toBeNull();
  });
});
