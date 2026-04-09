import { create } from "zustand";
import type { InputMode, ControllerType } from "../types/input";

interface InputStore {
  inputMode: InputMode;
  controllerType: ControllerType | null;
  navigationLock: boolean;
  setInputMode: (mode: InputMode) => void;
  setControllerType: (type: ControllerType | null) => void;
  setNavigationLock: (locked: boolean) => void;
}

export const useInputStore = create<InputStore>((set) => ({
  inputMode: "keyboard",
  controllerType: null,
  navigationLock: false,
  setInputMode: (inputMode) => set({ inputMode }),
  setControllerType: (controllerType) => set({ controllerType }),
  setNavigationLock: (navigationLock) => set({ navigationLock }),
}));
