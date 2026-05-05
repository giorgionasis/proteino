"use client";

import { useState, useRef, useCallback } from "react";
import type { CategorySlug, SubmissionAnalysis } from "@/types";

export type SubmissionState =
  | "empty"
  | "typing"
  | "match_found"
  | "syncing"
  | "preview"
  | "published"
  | "duplicate"
  | "error";

export interface DuplicateInfo {
  /** "own" → the current user already suggested this. "other" → someone else did. */
  kind: "own" | "other";
  /** Handle/display_name of the original suggester (only set when kind="other"). */
  suggester: { handle: string; display_name: string } | null;
  /** Slug of the existing item, so the UI can deeplink to it. */
  item_slug: string;
  /** Existing suggestion id, in case the UI wants to deeplink to "δες την πρότασή σου". */
  suggestion_id: string;
}

interface UseSubmissionReturn {
  state: SubmissionState;
  text: string;
  analysis: SubmissionAnalysis | null;
  /** Server-side authoritative count after a successful publish. Null until then. */
  newSuggestionCount: number | null;
  /** Set when publish() returns 409. UI uses this to render HOOKS.md §8 CTAs. */
  duplicate: DuplicateInfo | null;
  /** Human-readable error message when state="error". */
  errorMessage: string | null;
  setText: (value: string) => void;
  verify: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
}

export function useSubmission(): UseSubmissionReturn {
  const [state, setState] = useState<SubmissionState>("empty");
  const [text, setText_] = useState("");
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const [newSuggestionCount, setNewSuggestionCount] = useState<number | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

    // Simulate enrichment delay (real enrichment will happen here later — see AI.md §11)
    await new Promise((r) => setTimeout(r, 2000));
    setState("preview");
  }, [state]);

  const publish = useCallback(async () => {
    if (state !== "preview") return;
    if (!analysis?.matched || !analysis.title || !analysis.category) {
      setErrorMessage("Δεν υπάρχει αντιστοιχία AI για αποθήκευση.");
      setState("error");
      return;
    }

    setState("syncing");

    const payload = {
      category: analysis.category as CategorySlug,
      title: analysis.title,
      reflection: text.trim() || null,
      // confidence is 0-1; AI.md §2 quality is 0-100. Scale to match.
      ai_quality_score: typeof analysis.confidence === "number"
        ? Math.round(analysis.confidence * 100)
        : null,
      ai_match_data: analysis.matchData ?? null,
    };

    let res: Response;
    try {
      res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setErrorMessage("Δεν μπορώ να επικοινωνήσω με τον server. Δοκίμασε ξανά.");
      setState("error");
      return;
    }

    if (res.status === 401) {
      setErrorMessage("Πρέπει να συνδεθείς για να προτείνεις.");
      setState("error");
      return;
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      setDuplicate({
        kind: body.kind === "own" ? "own" : "other",
        suggester: body.suggester ?? null,
        item_slug: body.item_slug ?? "",
        suggestion_id: body.suggestion_id ?? "",
      });
      setState("duplicate");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMessage(body.error || `Αποτυχία αποθήκευσης (${res.status}).`);
      setState("error");
      return;
    }

    const body = await res.json();
    setNewSuggestionCount(typeof body.new_suggestion_count === "number" ? body.new_suggestion_count : null);
    setState("published");
  }, [state, analysis, text]);

  const reset = useCallback(() => {
    setText_("");
    setAnalysis(null);
    setNewSuggestionCount(null);
    setDuplicate(null);
    setErrorMessage(null);
    setState("empty");
  }, []);

  return {
    state,
    text,
    analysis,
    newSuggestionCount,
    duplicate,
    errorMessage,
    setText,
    verify,
    publish,
    reset,
  };
}
