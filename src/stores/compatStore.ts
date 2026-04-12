import { create } from "zustand";
import * as api from "../lib/tauri";
import type { ProtonVersion } from "../types/steam";
import { compareVersions } from "./compatToolsStore";

interface CompatStore {
  /** The globally persisted active compat tool name */
  globalCompatTool: string | null;
  /** Whether settings have been loaded from disk */
  initialized: boolean;
  /** Load settings from disk */
  loadSettings: () => Promise<void>;
  /** Set and persist the global compat tool */
  setGlobalCompatTool: (name: string | null) => Promise<void>;
  /** Auto-select the latest installed version if none is set */
  autoSelectLatest: (installed: ProtonVersion[]) => Promise<void>;
}

export const useCompatStore = create<CompatStore>((set, get) => ({
  globalCompatTool: null,
  initialized: false,

  loadSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ globalCompatTool: settings.activeCompatTool, initialized: true });
    } catch (e) {
      console.error("Failed to load settings:", e);
      set({ initialized: true });
    }
  },

  setGlobalCompatTool: async (name) => {
    set({ globalCompatTool: name });
    await api.updateSettings({ activeCompatTool: name });
  },

  autoSelectLatest: async (installed) => {
    const { globalCompatTool, initialized } = get();
    if (!initialized) return;

    // If already set and the version is still installed, keep it
    if (globalCompatTool && installed.some((v) => v.name === globalCompatTool)) {
      return;
    }

    // Find the latest installed GE-Proton version
    const geVersions = installed
      .filter((v) => v.name.startsWith("GE-Proton"))
      .sort((a, b) => compareVersions(a.name, b.name));

    if (geVersions.length > 0) {
      const latest = geVersions[0].name;
      set({ globalCompatTool: latest });
      await api.updateSettings({ activeCompatTool: latest });
    }
  },
}));

/**
 * Resolve the effective compat tool: profile override takes precedence over global.
 * Returns null only when nothing is set at all.
 */
export function resolveCompatTool(
  globalCompatTool: string | null,
  profileOverride: string | null,
): string | null {
  return profileOverride ?? globalCompatTool;
}
