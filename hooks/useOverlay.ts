import { create } from "zustand";

type OverlayType = "search" | "suggestion" | null;

interface OverlayStore {
  overlay: OverlayType;
  openSearch:     () => void;
  openSuggestion: () => void;
  close:          () => void;
}

export const useOverlay = create<OverlayStore>((set) => ({
  overlay: null,

  openSearch: () => {
    document.body.style.overflow = "hidden";
    set({ overlay: "search" });
  },

  openSuggestion: () => {
    document.body.style.overflow = "hidden";
    set({ overlay: "suggestion" });
  },

  close: () => {
    document.body.style.overflow = "";
    set({ overlay: null });
  },
}));
