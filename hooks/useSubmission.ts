"use client";

import { useState, useRef, useCallback } from "react";
import type { SubmissionAnalysis } from "@/types";

export type SubmissionState =
  | "empty"
  | "typing"
  | "match_found"
  | "syncing"
  | "preview"
  | "published";

interface UseSubmissionReturn {
  state: SubmissionState;
  text: string;
  analysis: SubmissionAnalysis | null;
  setText: (value: string) => void;
  verify: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
}

export function useSubmission(): UseSubmissionReturn {
  const [state, setState] = useState<SubmissionState>("empty");
  const [text, setText_] = useState("");
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setText = useCallback((value: string) => {
    setText_(value);

    if (!value.trim()) {
      setState("empty");
      setAnalysis(null);
      return;
    }

    setState("typing");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { getAIService } = await import("@/lib/ai");
        const result = await getAIService().analyzeSubmission(value);
        setAnalysis(result);
        if (result.matched) setState("match_found");
      } catch {
        // Non-blocking — keep typing state
      }
    }, 400);
  }, []);

  const verify = useCallback(async () => {
    if (state !== "match_found") return;
    setState("syncing");

    // Simulate enrichment delay
    await new Promise((r) => setTimeout(r, 2000));
    setState("preview");
  }, [state]);

  const publish = useCallback(async () => {
    if (state !== "preview") return;
    setState("syncing");

    // TODO: call API route to persist suggestion
    await new Promise((r) => setTimeout(r, 1000));
    setState("published");
  }, [state]);

  const reset = useCallback(() => {
    setText_("");
    setAnalysis(null);
    setState("empty");
  }, []);

  return { state, text, analysis, setText, verify, publish, reset };
}
