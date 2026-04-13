import { create } from "zustand";
import * as api from "../lib/tauri";
import type { CompatToolSource } from "../types/settings";

interface SettingsStore {
  sources: CompatToolSource[];
  compatToolsDir: string | null;
  initialized: boolean;
  loadSources: () => Promise<void>;
  setCompatToolsDir: (dir: string | null) => Promise<void>;
  addSource: (name: string, url: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  toggleSource: (id: string) => Promise<void>;
  updateSource: (id: string, updates: Partial<Omit<CompatToolSource, "id">>) => Promise<void>;
}

function newSourceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `src-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}`;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  sources: [],
  compatToolsDir: null,
  initialized: false,

  loadSources: async () => {
    try {
      const settings = await api.getSettings();
      set({
        sources: settings.compatToolSources ?? [],
        compatToolsDir: settings.compatToolsDir ?? null,
        initialized: true,
      });
    } catch (e) {
      console.error("Failed to load manifest sources:", e);
      set({ initialized: true });
    }
  },

  addSource: async (name, url) => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;

    const next: CompatToolSource[] = [
      ...get().sources,
      { id: newSourceId(), name: trimmedName, url: trimmedUrl, enabled: true },
    ];
    set({ sources: next });
    await api.updateSettings({ compatToolSources: next });
  },

  removeSource: async (id) => {
    const next = get().sources.filter((s) => s.id !== id);
    set({ sources: next });
    await api.updateSettings({ compatToolSources: next });
  },

  toggleSource: async (id) => {
    const next = get().sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    set({ sources: next });
    await api.updateSettings({ compatToolSources: next });
  },

  updateSource: async (id, updates) => {
    const next = get().sources.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ sources: next });
    await api.updateSettings({ compatToolSources: next });
  },

  setCompatToolsDir: async (dir) => {
    set({ compatToolsDir: dir });
    await api.updateSettings({ compatToolsDir: dir });
  },
}));
