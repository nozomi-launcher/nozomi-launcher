import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState({ activeTab: "launch", isLoading: false });
  });

  it("defaults to launch tab", () => {
    expect(useAppStore.getState().activeTab).toBe("launch");
  });

  it("switches tabs", () => {
    useAppStore.getState().setActiveTab("profiles");
    expect(useAppStore.getState().activeTab).toBe("profiles");
  });

  it("tracks loading state", () => {
    expect(useAppStore.getState().isLoading).toBe(false);
    useAppStore.getState().setLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);
  });
});
