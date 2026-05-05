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

export interface PublishResult {
  suggestionId: string;
  itemId: string;
  /** Format: "category/slug", e.g. "movies/anora". Used for share links. */
  itemSlug: string;
  /** New value of users.suggestion_count after this publish. */
  newSuggestionCount: number;
  /** HOOKS.md §2B — total suggestions across all users in the last 7 days. */
  weeklyCount: number;
  /** Distinct users with a bookmark in this category. Soft proxy for
   *  "this many care about this category". */
  categoryAudienceCount: number;
  /** Followers of the current user. */
  myFollowersCount: number;
}

interface UseSubmissionReturn {
  state: SubmissionState;
  text: string;
  analysis: SubmissionAnalysis | null;
  /** User's star rating for the suggestion. 0 = unrated. Persisted on publish. */
  rating: number;
  /** True while POST /api/suggestions is in flight. Lets PreviewScreen show
   *  an inline busy state on the Share button instead of flashing the
   *  full-screen dark syncing takeover. */
  isPublishing: boolean;
  /** Full server response after a successful publish. Drives the Published
   *  screen's hook moments + share link. Null before/during publish. */
  publishResult: PublishResult | null;
  /** Set when publish() returns 409 OR the preflight check finds a duplicate. */
  duplicate: DuplicateInfo | null;
  /** Human-readable error message when state="error". */
  errorMessage: string | null;
  setText: (value: string) => void;
  setRating: (value: number) => void;
  /** Drop the current locked match → go back to "typing" so the AI can re-match. */
  unlock: () => void;
  verify: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
}

export function useSubmission(): UseSubmissionReturn {
  const [state, setState] = useState<SubmissionState>("empty");
  const [text, setText_] = useState("");
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const [rating, setRating_] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
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

    // If AI has already locked onto a match, stop re-analyzing. The user is
    // now adding their reflection ("γιατί το προτείνω") — extending the
    // description shouldn't risk re-matching to a different item or
    // bouncing the user back to the typing state. The locked match wins;
    // text grows freely as the user's reflection.
    if (state === "match_found") return;

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
  }, [state]);

  const setRating = useCallback((n: number) => {
    setRating_(Math.max(0, Math.min(5, n)));
  }, []);

  const unlock = useCallback(() => {
    // Drop the locked match → user can edit text, AI will re-analyze on next keystroke.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAnalysis(null);
    setState("typing");
  }, []);

  const verify = useCallback(async () => {
    if (state !== "match_found") return;
    if (!analysis?.matched || !analysis.title || !analysis.category) {
      setErrorMessage("Δεν υπάρχει αντιστοιχία AI για αποθήκευση.");
      setState("error");
      return;
    }

    setState("syncing");

    // Preflight duplicate check — saves the user from writing a 200-char
    // reflection that POST /api/suggestions would reject anyway. If the
    // matched item already has a suggestion, short-circuit straight to
    // the duplicate screen.
    try {
      const params = new URLSearchParams({
        title: analysis.title,
        category: analysis.category,
      });
      const res = await fetch(`/api/suggestions/check?${params}`);
      if (res.ok) {
        const body = await res.json();
        if (body.exists) {
          setDuplicate({
            kind: body.own ? "own" : "other",
            suggester: body.suggester ?? null,
            item_slug: body.item_slug ?? "",
            suggestion_id: body.suggestion_id ?? "",
          });
          setState("duplicate");
          return;
        }
      }
    } catch {
      // Network error — fall through to preview. publish() will catch any
      // duplicate that slips past the preflight (race-condition-safe).
    }

    // Simulate enrichment delay (real enrichment will happen here later — see AI.md §11)
    await new Promise((r) => setTimeout(r, 2000));
    setState("preview");
  }, [state, analysis]);

  const publish = useCallback(async () => {
    if (state !== "preview") return;
    if (!analysis?.matched || !analysis.title || !analysis.category) {
      setErrorMessage("Δεν υπάρχει αντιστοιχία AI για αποθήκευση.");
      setState("error");
      return;
    }

    // Stay on the Preview screen during the API call; just flip an inline
    // busy flag for the Share button. Avoids the dark syncing-screen flash
    // (we already used that takeover during Verify → Preview enrichment).
    setIsPublishing(true);

    // Pull poster_url out of matchData so the API can write items.cover_url
    // immediately (legacy reads), keeping the full match payload around in
    // ai_match_data for the API to spread into items + extension tables.
    const md = (analysis.matchData ?? {}) as Record<string, any>;
    const cover = typeof md.poster_url === "string"
      ? md.poster_url
      : typeof md.backdrop_url === "string"
        ? md.backdrop_url
        : null;

    const payload = {
      category: analysis.category as CategorySlug,
      title: analysis.title,
      reflection: text.trim() || null,
      rating: rating > 0 ? rating : null,
      cover_url: cover,
      // confidence is 0-1; AI.md §2 quality is 0-100. Scale to match.
      ai_quality_score: typeof analysis.confidence === "number"
        ? Math.round(analysis.confidence * 100)
        : null,
      ai_match_data: analysis.matchData ?? null,
    };

    try {
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
      setPublishResult({
        suggestionId: body.suggestion_id ?? "",
        itemId: body.item_id ?? "",
        itemSlug: body.item_slug ?? "",
        newSuggestionCount: typeof body.new_suggestion_count === "number" ? body.new_suggestion_count : 0,
        weeklyCount: typeof body.weekly_count === "number" ? body.weekly_count : 0,
        categoryAudienceCount: typeof body.category_audience_count === "number" ? body.category_audience_count : 0,
        myFollowersCount: typeof body.my_followers_count === "number" ? body.my_followers_count : 0,
      });
      setState("published");
    } finally {
      setIsPublishing(false);
    }
  }, [state, analysis, text, rating]);

  const reset = useCallback(() => {
    setText_("");
    setAnalysis(null);
    setRating_(0);
    setIsPublishing(false);
    setPublishResult(null);
    setDuplicate(null);
    setErrorMessage(null);
    setState("empty");
  }, []);

  return {
    state,
    text,
    analysis,
    rating,
    isPublishing,
    publishResult,
    duplicate,
    errorMessage,
    setText,
    setRating,
    unlock,
    verify,
    publish,
    reset,
  };
}
