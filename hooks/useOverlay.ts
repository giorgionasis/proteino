import { create } from "zustand";

type OverlayType = "search" | "suggestion" | null;

interface OverlayStore {
  overlay: OverlayType;
  /** Optional pre-fill text consumed by SuggestionOverlay on mount.
   *  Used when opening the suggestion flow from the search "no match" chip
   *  ("Πρότεινέ το πρώτος") — carries the user's search query in. */
  suggestionPrefill: string | null;
  openSearch:     () => void;
  openSuggestion: (prefill?: string) => void;
  consumeSuggestionPrefill: () => string | null;
  close:          () => void;
}

export const useOverlay = create<OverlayStore>((set, get) => ({
  overlay: null,
  suggestionPrefill: null,

  openSearch: () => {
    document.body.style.overflow = "hidden";
    set({ overlay: "search" });
  },

  openSuggestion: (prefill) => {
    document.body.style.overflow = "hidden";
    set({ overlay: "suggestion", suggestionPrefill: prefill ?? null });
  },

  consumeSuggestionPrefill: () => {
    const v = get().suggestionPrefill;
    if (v !== null) set({ suggestionPrefill: null });
    return v;
  },

  close: () => {
    document.body.style.overflow = "";
    set({ overlay: null });
  },
}));
