import { create } from "zustand";
import type { ControllerType, InputMode } from "../types/input";

interface InputStore {
  inputMode: InputMode;
  controllerType: ControllerType | null;
  setInputMode: (mode: InputMode) => void;
  setControllerType: (type: ControllerType | null) => void;
}

export const useInputStore = create<InputStore>((set) => ({
  inputMode: "keyboard",
  controllerType: null,
  setInputMode: (inputMode) => set({ inputMode }),
  setControllerType: (controllerType) => set({ controllerType }),
}));
