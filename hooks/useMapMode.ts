import { create } from "zustand";

interface MapModeStore {
  active: boolean;
  setActive: (v: boolean) => void;
}

/**
 * Tracks whether the user is currently on a category map view. Used by the
 * FAB (suggest button) to hide itself, and potentially other layout chrome
 * that doesn't make sense overlaid on a map.
 */
export const useMapMode = create<MapModeStore>((set) => ({
  active: false,
  setActive: (v) => set({ active: v }),
}));
