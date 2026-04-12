import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/tauri";
import type { AppSettings, CompatToolSource } from "../types/settings";
import { useSettingsStore } from "./settingsStore";

vi.mock("../lib/tauri");

const mockedApi = vi.mocked(api);

function baseSettings(sources: CompatToolSource[] = []): AppSettings {
  return {
    activeCompatTool: null,
    compatToolSources: sources,
  };
}

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({ sources: [], initialized: false });
    mockedApi.getSettings.mockReset();
    mockedApi.updateSettings.mockReset();
    mockedApi.updateSettings.mockImplementation(async (patch) => ({
      ...baseSettings(),
      ...patch,
    }));
  });

  describe("loadSources", () => {
    it("loads sources from settings", async () => {
      const source: CompatToolSource = {
        id: "cachy",
        name: "CachyOS Proton",
        url: "https://example.com/cachy.json",
        enabled: true,
      };
      mockedApi.getSettings.mockResolvedValue(baseSettings([source]));

      await useSettingsStore.getState().loadSources();

      const state = useSettingsStore.getState();
      expect(state.sources).toEqual([source]);
      expect(state.initialized).toBe(true);
    });

    it("initializes with empty list when none configured", async () => {
      mockedApi.getSettings.mockResolvedValue(baseSettings());

      await useSettingsStore.getState().loadSources();

      expect(useSettingsStore.getState().sources).toEqual([]);
      expect(useSettingsStore.getState().initialized).toBe(true);
    });

    it("marks as initialized even if load fails", async () => {
      mockedApi.getSettings.mockRejectedValue(new Error("boom"));

      await useSettingsStore.getState().loadSources();

      expect(useSettingsStore.getState().initialized).toBe(true);
    });
  });

  describe("addSource", () => {
    it("appends a new source and persists", async () => {
      await useSettingsStore.getState().addSource("CachyOS", "https://example.com/cachy.json");

      const state = useSettingsStore.getState();
      expect(state.sources).toHaveLength(1);
      expect(state.sources[0]).toMatchObject({
        name: "CachyOS",
        url: "https://example.com/cachy.json",
        enabled: true,
      });
      expect(state.sources[0].id).toBeTruthy();
      expect(mockedApi.updateSettings).toHaveBeenCalledWith({
        compatToolSources: state.sources,
      });
    });

    it("ignores empty name or url", async () => {
      await useSettingsStore.getState().addSource("  ", "https://example.com/x.json");
      await useSettingsStore.getState().addSource("Name", "   ");

      expect(useSettingsStore.getState().sources).toEqual([]);
      expect(mockedApi.updateSettings).not.toHaveBeenCalled();
    });

    it("trims whitespace", async () => {
      await useSettingsStore.getState().addSource("  CachyOS  ", "  https://example.com  ");

      const [src] = useSettingsStore.getState().sources;
      expect(src.name).toBe("CachyOS");
      expect(src.url).toBe("https://example.com");
    });
  });

  describe("removeSource", () => {
    it("removes the matching source", async () => {
      useSettingsStore.setState({
        sources: [
          { id: "a", name: "A", url: "https://a", enabled: true },
          { id: "b", name: "B", url: "https://b", enabled: true },
        ],
        initialized: true,
      });

      await useSettingsStore.getState().removeSource("a");

      const state = useSettingsStore.getState();
      expect(state.sources).toHaveLength(1);
      expect(state.sources[0].id).toBe("b");
      expect(mockedApi.updateSettings).toHaveBeenCalledWith({
        compatToolSources: state.sources,
      });
    });
  });

  describe("toggleSource", () => {
    it("flips enabled", async () => {
      useSettingsStore.setState({
        sources: [{ id: "a", name: "A", url: "https://a", enabled: true }],
        initialized: true,
      });

      await useSettingsStore.getState().toggleSource("a");
      expect(useSettingsStore.getState().sources[0].enabled).toBe(false);

      await useSettingsStore.getState().toggleSource("a");
      expect(useSettingsStore.getState().sources[0].enabled).toBe(true);
    });
  });

  describe("updateSource", () => {
    it("patches the matching source and persists", async () => {
      useSettingsStore.setState({
        sources: [{ id: "a", name: "A", url: "https://a", enabled: true }],
        initialized: true,
      });

      await useSettingsStore.getState().updateSource("a", {
        name: "A renamed",
        url: "https://a2",
      });

      const [src] = useSettingsStore.getState().sources;
      expect(src.name).toBe("A renamed");
      expect(src.url).toBe("https://a2");
      expect(src.enabled).toBe(true);
      expect(mockedApi.updateSettings).toHaveBeenCalled();
    });
  });
});
