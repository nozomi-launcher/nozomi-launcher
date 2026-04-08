import { create } from "zustand";

export type Tab = "launch" | "modding" | "profiles";

interface AppStore {
  activeTab: Tab;
  isLoading: boolean;
  setActiveTab: (tab: Tab) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: "launch",
  isLoading: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (isLoading) => set({ isLoading }),
}));
