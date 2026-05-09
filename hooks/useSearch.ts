"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { CategorySlug, Item, SearchAnalysis, SearchPill } from "@/types";
import { CATEGORIES } from "@/constants/categories";
import { looseStrip } from "@/lib/utils/textSearch";

export type SearchState = "empty" | "typing" | "analyzing" | "results" | "no_match" | "error";

export interface SearchUserHit {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

interface UseSearchReturn {
  state: SearchState;
  query: string;
  pills: SearchPill[];
  analysis: SearchAnalysis | null;
  /** Confidence tier from /api/search — drives FEATURED hero + chip-narrowing UX. */
  confidenceTier: "high" | "medium" | "low" | null;
  /** Top result for high-confidence single-item queries. Null otherwise. */
  featured: Item | null;
  /** Item list (excluding the featured hero). */
  results: Item[];
  /** User matches when the query looks like a handle/display name. */
  userHits: SearchUserHit[];
  /** Popular items in the inferred category for no-match fallback. */
  fallbackSuggestions: Item[];
  /** Optional Gemini-generated follow-up question shown on no-match.
   *  Null when LLM unavailable / no useful question. UI renders default
   *  chips when this is null. */
  conversationalPrompt: string | null;
  /** Set when state="error" — friendly Greek message the UI can render. */
  errorMessage: string | null;
  /** True when the route fell back to global-popular results because the
   *  region_id filter returned 0 hits. UI uses this to drop the LOC pill
   *  visual lie and label results as "δείχνω δημοφιλέστερα συνολικά". */
  regionFallbackUsed: boolean;
  /** True when the route narrowed via address text match (sub-regions). */
  addressMatchUsed: boolean;
  /** Re-run the most recent search. Used by the error state's retry button. */
  retry: () => void;
  setQuery: (value: string) => void;
  /** Drop a pill (VIBE / TYPE / LOC / CATEGORY) and re-run with the rest. */
  removePill: (index: number) => void;
  /** Explicitly pin search to a single category — used by the no-match
   *  category-picker chip. Re-runs the current query (or the last query if
   *  textarea is empty) scoped to this category. */
  pickCategory: (slug: CategorySlug) => void;
  clear: () => void;
}

interface SearchResponse {
  items: Item[];
  total: number;
  intent: {
    categories: CategorySlug[];
    vibe: string | null;
    type: string | null;
    location: string | null;
    intent: "lookup" | "discovery";
  } | null;
  confidence_tier: "high" | "medium" | "low" | null;
  featured: Item | null;
  users?: SearchUserHit[];
  suggestions?: Item[];
  region_fallback_used?: boolean;
  address_match_used?: boolean;
}

/** Map a CategorySlug → its Greek display label (e.g. "books" → "Βιβλία"). */
function categoryLabel(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.labelEl ?? slug;
}

export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<SearchState>("empty");
  const [query, setQuery_] = useState("");
  const [pills, setPills] = useState<SearchPill[]>([]);
  const [analysis, setAnalysis] = useState<SearchAnalysis | null>(null);
  const [confidenceTier, setConfidenceTier] = useState<"high" | "medium" | "low" | null>(null);
  const [featured, setFeatured] = useState<Item | null>(null);
  const [results, setResults] = useState<Item[]>([]);
  const [userHits, setUserHits] = useState<SearchUserHit[]>([]);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<Item[]>([]);
  const [conversationalPrompt, setConversationalPrompt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regionFallbackUsed, setRegionFallbackUsed] = useState(false);
  const [addressMatchUsed, setAddressMatchUsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When the user explicitly removes the CATEGORY pill, we suppress the
  // server's inferred-category filter on subsequent re-runs of the same
  // query session. Reset whenever the query becomes empty (fresh search).
  const noCategoryFilterRef = useRef(false);

  const clearState = useCallback(() => {
    setState("empty");
    setPills([]);
    setAnalysis(null);
    setConfidenceTier(null);
    setFeatured(null);
    setResults([]);
    setUserHits([]);
    setFallbackSuggestions([]);
    setErrorMessage(null);
    setRegionFallbackUsed(false);
    setAddressMatchUsed(false);
  }, []);

  const cancelInflight = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Cleanup on unmount: abort any in-flight request + clear pending debounce
  // so we don't setState on an unmounted component.
  useEffect(() => () => cancelInflight(), [cancelInflight]);

  const lastQueryRef = useRef<string | null>(null);

  const runSearch = useCallback(async (value: string, signal: AbortSignal) => {
    setState("analyzing");
    setErrorMessage(null);
    lastQueryRef.current = value;
    // 8-second hard timeout. Without this, a hung server leaves the UI
    // stuck on "analyzing" forever. AbortSignal.any combines the caller's
    // cancellation signal with our timeout signal — whichever fires first
    // aborts the fetch.
    const timeoutSignal = AbortSignal.timeout(8000);
    const combinedSignal = (AbortSignal as any).any
      ? (AbortSignal as any).any([signal, timeoutSignal])
      : signal;
    try {
      const params = new URLSearchParams({ q: value });
      if (noCategoryFilterRef.current) params.set("no_category_filter", "1");
      const res = await fetch(`/api/search?${params}`, { signal: combinedSignal });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as SearchResponse;
      if (signal.aborted) return;

      // Map the route's intent shape (intent: "lookup"|"discovery") onto the
      // typed SearchAnalysis so downstream consumers stay type-safe. The
      // route doesn't echo `query` back, so we fill it locally.
      const a: SearchAnalysis | null = data.intent
        ? {
            intent: data.intent.intent,
            vibe: data.intent.vibe,
            type: data.intent.type,
            location: data.intent.location,
            categories: data.intent.categories,
            query: value,
          }
        : null;

      setAnalysis(a);
      setConfidenceTier(data.confidence_tier);
      setFeatured(data.featured ?? null);
      setResults(data.items ?? []);
      setUserHits(data.users ?? []);
      setFallbackSuggestions(data.suggestions ?? []);
      setRegionFallbackUsed(!!data.region_fallback_used);
      setAddressMatchUsed(!!data.address_match_used);

      // Pills mirror the AI's structured intent so the user sees what the
      // backend understood. Each pill is removable; removing it re-runs
      // search with that signal stripped.
      const newPills: SearchPill[] = [];
      // CATEGORY pill — only show when (a) we have at least one detected
      // category AND (b) the user hasn't already chosen "no category filter"
      // by removing this same pill earlier.
      if (!noCategoryFilterRef.current && data.intent && data.intent.categories.length > 0) {
        newPills.push({ type: "CATEGORY", value: categoryLabel(data.intent.categories[0]) });
      }
      if (data.intent?.vibe) newPills.push({ type: "VIBE", value: data.intent.vibe });
      if (data.intent?.type) newPills.push({ type: "TYPE", value: data.intent.type });
      // LOC pill: only show when the location filter actually had teeth
      // (matched at least one venue). When region_fallback fired AND no
      // address match was found, we'd be lying about "showing X in Athens"
      // — so we drop the pill and let the UI explain via the panel banner.
      if (data.intent?.location && !(data.region_fallback_used && !data.address_match_used)) {
        newPills.push({ type: "LOC", value: data.intent.location });
      }
      setPills(newPills);

      const hasResults = (data.items?.length ?? 0) > 0 || (data.users?.length ?? 0) > 0;
      setState(hasResults ? "results" : "no_match");

      // Conversational fallback: when no results, ask Gemini for a
      // follow-up question. Fire-and-forget — the UI renders the
      // default chips immediately, then this fills in the question
      // shortly after if the model returns one.
      if (!hasResults) {
        void (async () => {
          try {
            const { getAIService } = await import("@/lib/ai");
            const ai = getAIService();
            if (!ai.conversationalSearchFallback) { setConversationalPrompt(null); return; }
            const hint = data.intent?.categories?.[0] ?? undefined;
            const prompt = await ai.conversationalSearchFallback(value, hint);
            setConversationalPrompt(prompt);
          } catch {
            setConversationalPrompt(null);
          }
        })();
      } else {
        setConversationalPrompt(null);
      }
    } catch (err) {
      // User-cancelled (new keystroke) — silent. Otherwise surface a real
      // error state with a friendly message + retry path. Timeouts and
      // network failures both land here.
      const e = err as Error;
      if (e.name === "AbortError" && !timeoutSignal.aborted) return;
      const isTimeout = e.name === "TimeoutError" || timeoutSignal.aborted;
      setErrorMessage(
        isTimeout
          ? "Καθυστερεί η σύνδεση. Δοκίμασε ξανά."
          : "Σφάλμα δικτύου. Έλεγξε τη σύνδεσή σου.",
      );
      setState("error");
    }
  }, []);

  const retry = useCallback(() => {
    const last = lastQueryRef.current;
    if (!last) return;
    cancelInflight();
    const controller = new AbortController();
    abortRef.current = controller;
    void runSearch(last, controller.signal);
  // cancelInflight is stable but include for hooks-rules conformance
  }, [runSearch]);  // eslint-disable-line react-hooks/exhaustive-deps

  const setQuery = useCallback((value: string) => {
    setQuery_(value);

    if (!value.trim()) {
      // Cancel any pending fetch + debounce so a stale fire doesn't flip
      // us back to "analyzing" after the user clears the textarea.
      cancelInflight();
      noCategoryFilterRef.current = false;
      clearState();
      return;
    }

    setState("typing");

    cancelInflight();
    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(() => {
      if (controller.signal.aborted) return;
      void runSearch(value, controller.signal);
    }, 350);
  }, [runSearch, cancelInflight, clearState]);

  const removePill = useCallback((index: number) => {
    const dropped = pills[index];
    if (!dropped) return;

    // CATEGORY pill is a special case — we don't try to strip a word from
    // the query (the user typed "βιβλίο", the pill says "Βιβλία" — they
    // don't match). Instead we set the no_category_filter flag and re-run.
    if (dropped.type === "CATEGORY") {
      noCategoryFilterRef.current = true;
      setPills((prev) => prev.filter((_, i) => i !== index));
      cancelInflight();
      const controller = new AbortController();
      abortRef.current = controller;
      void runSearch(query, controller.signal);
      return;
    }

    // Other pills (VIBE / TYPE / LOC): strip the pill text from the query
    // so the next AI pass doesn't immediately re-detect the same filter.
    // looseStrip is case + accent insensitive and metachar-safe.
    const next = looseStrip(query, dropped.value);
    setPills((prev) => prev.filter((_, i) => i !== index));

    if (!next) {
      cancelInflight();
      noCategoryFilterRef.current = false;
      setQuery_("");
      clearState();
      return;
    }

    setQuery_(next);
    cancelInflight();
    const controller = new AbortController();
    abortRef.current = controller;
    void runSearch(next, controller.signal);
  }, [pills, query, runSearch, cancelInflight, clearState]);

  const clear = useCallback(() => {
    cancelInflight();
    noCategoryFilterRef.current = false;
    setQuery_("");
    clearState();
  }, [cancelInflight, clearState]);

  const pickCategory = useCallback((slug: CategorySlug) => {
    // The user explicitly picked a category from the no-match chip picker.
    // Pin via the categories= URL param so the route uses this exact list
    // and skips its own keyword-based detection. Use the current query if
    // present, otherwise fall back to the last query (so picking a category
    // after a 0-result keyword query still works).
    const value = (query.trim() || lastQueryRef.current || "").trim();
    if (!value) return;
    cancelInflight();
    noCategoryFilterRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    // Inline mini-runSearch with the explicit category override.
    setState("analyzing");
    setErrorMessage(null);
    lastQueryRef.current = value;
    (async () => {
      const timeoutSignal = AbortSignal.timeout(8000);
      const combinedSignal = (AbortSignal as any).any
        ? (AbortSignal as any).any([controller.signal, timeoutSignal])
        : controller.signal;
      try {
        const params = new URLSearchParams({ q: value, categories: slug });
        const res = await fetch(`/api/search?${params}`, { signal: combinedSignal });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = (await res.json()) as SearchResponse;
        if (controller.signal.aborted) return;
        const a: SearchAnalysis | null = data.intent
          ? {
              intent: data.intent.intent,
              vibe: data.intent.vibe,
              type: data.intent.type,
              location: data.intent.location,
              categories: data.intent.categories,
              query: value,
            }
          : null;
        setAnalysis(a);
        setConfidenceTier(data.confidence_tier);
        setFeatured(data.featured ?? null);
        setResults(data.items ?? []);
        setUserHits(data.users ?? []);
        setFallbackSuggestions(data.suggestions ?? []);
        const newPills: SearchPill[] = [];
        newPills.push({ type: "CATEGORY", value: categoryLabel(slug) });
        if (data.intent?.vibe)     newPills.push({ type: "VIBE", value: data.intent.vibe });
        if (data.intent?.type)     newPills.push({ type: "TYPE", value: data.intent.type });
        if (data.intent?.location) newPills.push({ type: "LOC",  value: data.intent.location });
        setPills(newPills);
        const hasResults = (data.items?.length ?? 0) > 0;
        setState(hasResults ? "results" : "no_match");
      } catch (err) {
        const e = err as Error;
        if (e.name === "AbortError" && !timeoutSignal.aborted) return;
        setErrorMessage("Σφάλμα δικτύου. Δοκίμασε ξανά.");
        setState("error");
      }
    })();
  }, [query, cancelInflight]);

  return {
    state,
    query,
    pills,
    analysis,
    confidenceTier,
    featured,
    results,
    userHits,
    fallbackSuggestions,
    conversationalPrompt,
    errorMessage,
    regionFallbackUsed,
    addressMatchUsed,
    retry,
    setQuery,
    removePill,
    pickCategory,
    clear,
  };
}
