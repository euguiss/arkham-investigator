import { create } from "zustand";
import type { RollLogEntry } from "../domain/types";

interface PopupState {
  entry: RollLogEntry | null;
  show: (entry: RollLogEntry) => void;
  dismiss: () => void;
}

export const usePopup = create<PopupState>((set) => ({
  entry: null,
  show: (entry) => set({ entry }),
  dismiss: () => set({ entry: null }),
}));
