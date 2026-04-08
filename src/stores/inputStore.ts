import { create } from "zustand";
import type { InputMode } from "../types/input";

interface InputStore {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
}

export const useInputStore = create<InputStore>((set) => ({
  inputMode: "keyboard",
  setInputMode: (inputMode) => set({ inputMode }),
}));
