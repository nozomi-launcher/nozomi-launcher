import { create } from "zustand";
import * as api from "../lib/tauri";
import type { EnvVar, Profile } from "../types/profile";

interface ProfileStore {
  profiles: Profile[];
  activeProfile: Profile | null;
  envVars: EnvVar[];
  protonVersion: string | null;
  protonPath: string | null;
  fetchProfiles: () => Promise<void>;
  setActiveProfile: (profile: Profile | null) => void;
  applyProfile: (profile: Profile) => void;
  addEnvVar: () => void;
  updateEnvVar: (index: number, field: keyof EnvVar, value: string | boolean) => void;
  removeEnvVar: (index: number) => void;
  setProtonVersion: (version: string | null, path: string | null) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  activeProfile: null,
  envVars: [],
  protonVersion: null,
  protonPath: null,

  fetchProfiles: async () => {
    const profiles = await api.listProfiles();
    set({ profiles });
  },

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  applyProfile: (profile) => {
    set({
      activeProfile: profile,
      envVars: profile.envVars.map((ev) => ({ ...ev })),
      protonVersion: profile.protonVersion,
    });
  },

  addEnvVar: () => {
    const envVars = [...get().envVars, { key: "", value: "", enabled: true }];
    set({ envVars });
  },

  updateEnvVar: (index, field, value) => {
    const envVars = [...get().envVars];
    envVars[index] = { ...envVars[index], [field]: value };
    set({ envVars });
  },

  removeEnvVar: (index) => {
    const envVars = get().envVars.filter((_, i) => i !== index);
    set({ envVars });
  },

  setProtonVersion: (version, path) => {
    set({ protonVersion: version, protonPath: path });
  },
}));
