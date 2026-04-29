"use client";

import { useState, useRef, useCallback } from "react";
import type { Item, SearchAnalysis, SearchPill } from "@/types";

export type SearchState = "empty" | "typing" | "analyzing" | "results" | "no_match";

interface UseSearchReturn {
  state: SearchState;
  query: string;
  pills: SearchPill[];
  analysis: SearchAnalysis | null;
  results: Item[];
  setQuery: (value: string) => void;
  clear: () => void;
}

export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<SearchState>("empty");
  const [query, setQuery_] = useState("");
  const [pills, setPills] = useState<SearchPill[]>([]);
  const [analysis, setAnalysis] = useState<SearchAnalysis | null>(null);
  const [results, setResults] = useState<Item[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const setQuery = useCallback((value: string) => {
    setQuery_(value);

    if (!value.trim()) {
      setState("empty");
      setPills([]);
      setAnalysis(null);
      setResults([]);
      return;
    }

    setState("typing");

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Debounced analysis
    setTimeout(async () => {
      if (controller.signal.aborted) return;
      setState("analyzing");

      try {
        const { getAIService } = await import("@/lib/ai");
        const a = await getAIService().analyzeSearch(value);
        if (controller.signal.aborted) return;

        setAnalysis(a);

        const newPills: SearchPill[] = [];
        if (a.vibe)     newPills.push({ type: "VIBE", value: a.vibe });
        if (a.type)     newPills.push({ type: "TYPE", value: a.type });
        if (a.location) newPills.push({ type: "LOC",  value: a.location });
        setPills(newPills);

        // Fetch results in parallel with analysis
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(value)}&categories=${a.categories.join(",")}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.items ?? []);
        setState(data.items?.length > 0 ? "results" : "no_match");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setState("no_match");
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setQuery_("");
    setPills([]);
    setAnalysis(null);
    setResults([]);
    setState("empty");
  }, []);

  return { state, query, pills, analysis, results, setQuery, clear };
}
