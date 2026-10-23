import { create } from "zustand";

type OverlayType = "search" | "suggestion" | null;

interface OverlayStore {
  overlay: OverlayType;
  /** Optional pre-fill text consumed by SuggestionOverlay on mount.
   *  Used when opening the suggestion flow from the search "no match" chip
   *  ("Πρότεινέ το πρώτος") — carries the user's search query in. */
  suggestionPrefill: string | null;
  /** Optional query the SearchOverlay runs on mount (home example chips). */
  searchPrefill: string | null;
  openSearch:     (prefill?: string) => void;
  consumeSearchPrefill: () => string | null;
  openSuggestion: (prefill?: string) => void;
  consumeSuggestionPrefill: () => string | null;
  close:          () => void;
}

export const useOverlay = create<OverlayStore>((set, get) => ({
  overlay: null,
  suggestionPrefill: null,
  searchPrefill: null,

  openSearch: (prefill) => {
    document.body.style.overflow = "hidden";
    set({ overlay: "search", searchPrefill: prefill ?? null });
  },

  consumeSearchPrefill: () => {
    const v = get().searchPrefill;
    if (v !== null) set({ searchPrefill: null });
    return v;
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
