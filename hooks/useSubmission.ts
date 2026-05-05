"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { CategorySlug, QualityAssessment, SubmissionAnalysis } from "@/types";
import { assessQuality } from "@/lib/ai/quality";

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

/** Key for the AI-rejection set. We dedupe matches the user explicitly
 *  said "no, that's not it" to so they don't reappear on every keystroke. */
function rejectionKey(category: string | null, title: string | null): string {
  return `${(category ?? "").toLowerCase()}:${(title ?? "").trim().toLowerCase()}`;
}

interface UseSubmissionReturn {
  state: SubmissionState;
  text: string;
  analysis: SubmissionAnalysis | null;
  /** Real-time quality coaching. Recomputed on every keystroke from the
   *  raw text — independent of AI matching, so the panel keeps evolving
   *  even after the match is locked and AI has stopped re-firing. */
  quality: QualityAssessment | null;
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
  /** Medium-tier "Ναι, αυτό" — user confirms the AI's primary pick → lock. */
  confirmMatch: () => void;
  /** Medium-tier "Όχι, άλλο" — user rejects the AI's primary pick. We keep
   *  the alternatives but flip the tier to "low" so the alternatives panel
   *  becomes the primary UI. State stays "typing" so AI can keep re-firing. */
  rejectMatch: () => void;
  /** User picked one of matchData.alternatives[] → swap analysis to that
   *  candidate's payload and lock the overlay. No extra API call — the
   *  alternative carries its full match payload from the server. */
  chooseAlternative: (index: number) => void;
  /** "Όχι, διαφορετική" on the duplicate screen — drop lock + dup state,
   *  remember this match so AI won't immediately re-suggest it on the next
   *  keystroke. Preserves the textarea content so the user can keep
   *  refining their description. */
  dismissAndReject: () => void;
  verify: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
}

export function useSubmission(): UseSubmissionReturn {
  const [state, setState] = useState<SubmissionState>("empty");
  const [text, setText_] = useState("");
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const [quality, setQuality] = useState<QualityAssessment | null>(null);
  const [rating, setRating_] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Matches the user explicitly rejected on the duplicate screen. AI won't
  // auto-lock on these again for the rest of this session — without this,
  // the same keystrokes would re-trigger the same match → same dup screen.
  const rejectedMatchesRef = useRef<Set<string>>(new Set());

  const setText = useCallback((value: string) => {
    setText_(value);

    // Quality coach runs locally on every keystroke — independent of AI.
    // The panel keeps evolving even after the match locks. Empty → null.
    setQuality(value.trim() ? assessQuality(value) : null);

    if (!value.trim()) {
      setState("empty");
      setAnalysis(null);
      return;
    }

    // If AI has already locked onto a match, normally we stop re-analyzing —
    // the user is adding their reflection. BUT if the user has removed the
    // matched title (and the candidate that produced it) from the text,
    // they're clearly typing about something else now. Release the lock so
    // AI re-analyzes the new content instead of staying frozen on a match
    // that no longer reflects what's in the textbox.
    if (state === "match_found" && analysis) {
      const lower = value.toLowerCase();
      const title = (analysis.title ?? "").toLowerCase().trim();
      const cand = ((analysis.matchData as Record<string, any> | null)?.tried_candidate ?? "")
        .toString()
        .toLowerCase()
        .trim();
      const titleStillThere = title.length > 0 && lower.includes(title);
      const candStillThere = cand.length > 0 && lower.includes(cand);
      if (titleStillThere || candStillThere) {
        // Lock holds — user is appending reflection to the matched title.
        return;
      }
      // Drop the lock; fall through to typing flow which will re-fire AI.
      setAnalysis(null);
      setState("typing");
    }

    setState("typing");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { getAIService } = await import("@/lib/ai");
        const result = await getAIService().analyzeSubmission(value);

        // Skip matches the user already rejected on the duplicate screen.
        // Without this, the same keystrokes would re-trigger the same
        // match → same duplicate screen → infinite loop.
        if (
          result.matched &&
          rejectedMatchesRef.current.has(rejectionKey(result.category, result.title))
        ) {
          setAnalysis({ ...result, matched: false, title: null });
          return;
        }

        setAnalysis(result);
        if (result.matched) {
          // Confidence tiers govern UX:
          //   high   → auto-lock immediately (we're sure)
          //   medium → DON'T lock; overlay asks "Νομίζω είναι X. Σωστό;"
          //            with Ναι/Όχι pills. User confirms → lock.
          //   low    → DON'T lock; overlay shows alternatives carousel.
          // Locking and asking are a contradiction — only one or the other.
          const tier = (result.matchData as Record<string, unknown> | null)?.confidence_tier;
          if (tier === "high") setState("match_found");
          else setState("typing");
        }
      } catch {
        // Non-blocking — keep typing state
      }
    }, 400);
  }, [state, analysis]);

  const setRating = useCallback((n: number) => {
    setRating_(Math.max(0, Math.min(5, n)));
  }, []);

  const unlock = useCallback(() => {
    // Drop the locked match → user can edit text, AI will re-analyze on next keystroke.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAnalysis(null);
    setState("typing");
  }, []);

  const confirmMatch = useCallback(() => {
    setAnalysis((prev) => {
      if (!prev?.matched) return prev;
      const md = (prev.matchData ?? {}) as Record<string, any>;
      // User confirmed — promote to high confidence, drop alternatives.
      return {
        ...prev,
        confidence: 0.95,
        matchData: { ...md, confidence_tier: "high", alternatives: [] },
      };
    });
    setState("match_found");
  }, []);

  const rejectMatch = useCallback(() => {
    setAnalysis((prev) => {
      if (!prev?.matched) return prev;
      const md = (prev.matchData ?? {}) as Record<string, any>;
      // User said "no" to the primary. Demote tier to low so the
      // alternatives carousel becomes the primary UI. We blank the title
      // so the confirm card disappears, keeping the alternatives intact
      // for the user to pick from. State stays "typing" so AI can keep
      // re-firing as the user refines their description.
      return {
        ...prev,
        title: null,
        matched: false,
        matchData: { ...md, confidence_tier: "low" },
      };
    });
  }, []);

  const dismissAndReject = useCallback(() => {
    setAnalysis((prev) => {
      if (prev?.title || prev?.category) {
        rejectedMatchesRef.current.add(rejectionKey(prev.category, prev.title));
      }
      return null;
    });
    setDuplicate(null);
    setState("typing");
  }, []);

  const chooseAlternative = useCallback((index: number) => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const md = (prev.matchData ?? {}) as Record<string, any>;
      const alt = Array.isArray(md.alternatives) ? md.alternatives[index] : null;
      if (!alt || !alt.match_data) return prev;
      // Move the picked alternative into the primary slot. We treat a
      // user-picked match as high confidence — they explicitly chose it
      // — so the overlay locks and the "Verify" button activates.
      return {
        ...prev,
        title: alt.title ?? prev.title,
        category: alt.category ?? prev.category,
        confidence: 0.95,
        message: `Βρήκα: ${alt.title ?? ""}${alt.year ? ` (${alt.year})` : ""}`,
        matchData: {
          ...alt.match_data,
          confidence_tier: "high",
          alternatives: [],
        },
      };
    });
    setState("match_found");
  }, []);

  // Preflight duplicate check: the moment we transition to match_found
  // (any path — auto-lock high tier, confirmMatch from medium, or
  // chooseAlternative from low), check if the matched item already exists
  // in the DB. If duplicate, jump straight to the duplicate screen so the
  // user doesn't waste effort writing a reflection that POST would reject
  // anyway. verify() keeps its own preflight as a race-safe net.
  const lockedTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (state !== "match_found") {
      lockedTitleRef.current = null;
      return;
    }
    const title = analysis?.title ?? null;
    const category = analysis?.category ?? null;
    if (!title || !category) return;
    // Avoid re-firing if title hasn't changed (e.g., re-render with same lock).
    const key = `${category}:${title}`;
    if (lockedTitleRef.current === key) return;
    lockedTitleRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ title, category });
        const res = await fetch(`/api/suggestions/check?${params}`);
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (cancelled) return;
        if (body.exists) {
          setDuplicate({
            kind: body.own ? "own" : "other",
            suggester: body.suggester ?? null,
            item_slug: body.item_slug ?? "",
            suggestion_id: body.suggestion_id ?? "",
          });
          setState("duplicate");
        }
      } catch {
        // Network blip — verify() will catch it as a fallback.
      }
    })();
    return () => { cancelled = true; };
  }, [state, analysis?.title, analysis?.category]);

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
    setQuality(null);
    setRating_(0);
    setIsPublishing(false);
    setPublishResult(null);
    setDuplicate(null);
    setErrorMessage(null);
    setState("empty");
    rejectedMatchesRef.current.clear();
  }, []);

  return {
    state,
    text,
    analysis,
    quality,
    rating,
    isPublishing,
    publishResult,
    duplicate,
    errorMessage,
    setText,
    setRating,
    unlock,
    confirmMatch,
    rejectMatch,
    chooseAlternative,
    dismissAndReject,
    verify,
    publish,
    reset,
  };
}
