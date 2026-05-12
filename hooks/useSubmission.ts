"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { CategorySlug, QualityAssessment, SubmissionAnalysis } from "@/types";
import { assessQuality } from "@/lib/ai/quality";
import * as funnel from "@/lib/funnel/tracker";
import type { FunnelState } from "@/lib/funnel/types";

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

export type AchievementVariant = "progress" | "tier_unlock";
export type BadgeTier          = "verified" | "gold" | "expert" | "platinum";

/**
 * Achievement payload — now a fully-resolved moment from the
 * `moments` table. Copy is already interpolated server-side; the
 * client just renders the strings (with **bold** markdown parsed by
 * the modal). Variant + badge + target live under `display` so the
 * modal can branch its visual treatment.
 */
export interface AchievementData {
  id:      string;
  key:     string;
  surface: "achievement_modal";
  copy: {
    title:      string;
    subtitle:   string;
    body:       string;
    cta_label?: string;
    cta_href?:  string;
  };
  display: {
    delay_ms?:        number;
    auto_dismiss_ms?: number | null;
    variant?:         AchievementVariant;
    badge?:           BadgeTier;
    target?:          number;
    [extra: string]:  unknown;
  };
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
  /** Milestone-crossing payload from the server. Null when this publish
   *  did not cross a milestone threshold. Drives the achievement
   *  celebration modal on top of the Published screen. */
  achievement: AchievementData | null;
}

/** Key for the AI-rejection set. We dedupe matches the user explicitly
 *  said "no, that's not it" to so they don't reappear on every keystroke. */
function rejectionKey(category: string | null, title: string | null): string {
  return `${(category ?? "").toLowerCase()}:${(title ?? "").trim().toLowerCase()}`;
}

/** Defensive parser for the achievement payload — returns null on any
 *  shape mismatch so a server-side schema drift can never break the
 *  Published screen. */
function parseAchievement(raw: unknown): AchievementData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.key !== "string") return null;
  if (r.surface !== "achievement_modal") return null;
  const copy = r.copy as Record<string, unknown> | undefined;
  const display = (r.display as Record<string, unknown>) ?? {};
  if (!copy || typeof copy.title !== "string") return null;
  return {
    id:      r.id,
    key:     r.key,
    surface: "achievement_modal",
    copy: {
      title:     copy.title,
      subtitle:  typeof copy.subtitle === "string" ? copy.subtitle : "",
      body:      typeof copy.body     === "string" ? copy.body     : "",
      cta_label: typeof copy.cta_label === "string" ? copy.cta_label : undefined,
      cta_href:  typeof copy.cta_href  === "string" ? copy.cta_href  : undefined,
    },
    display,
  };
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
  // Separate, longer debounce for the semantic quality tip — only fires
  // when the user has paused for ~1.5s AND text is substantive (>60
  // chars). Prevents one LLM call per keystroke while still feeling
  // alive when they pause to think.
  const semanticTipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Matches the user explicitly rejected on the duplicate screen. AI won't
  // auto-lock on these again for the rest of this session — without this,
  // the same keystrokes would re-trigger the same match → same dup screen.
  const rejectedMatchesRef = useRef<Set<string>>(new Set());

  // ── Funnel tracking ──────────────────────────────────────────────
  // Mirror state changes into the analytics tracker so SQL can answer
  // "where do users drop, what did they type, how long did each step
  // take". Start on mount, fire `state_enter` on every transition,
  // close on unmount via sendBeacon. See lib/funnel/tracker.ts.
  const stateRef     = useRef<SubmissionState>("empty");
  const prevStateRef = useRef<SubmissionState | null>(null);
  const lockedKeyRef = useRef<string | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  // One-shot start + cleanup-on-unmount close. Empty deps — overlay
  // mount = funnel session start. Cleanup snapshots the final text +
  // closes the session via beacon so the data survives tab close.
  useEffect(() => {
    funnel.start();
    return () => {
      const finalText = textRef.current;
      if (finalText.trim().length > 0) {
        funnel.snapshot(finalText, stateRef.current as FunnelState);
      }
      funnel.close(stateRef.current as FunnelState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every state transition fires `state_enter` + bumps the
  // text_length_max counter from the current textRef + snapshots the
  // sanitised text so SQL can read what the user was typing at the
  // moment they moved between states (or abandoned). The very first
  // render (state === "empty") is the implicit flow_started moment
  // already captured by funnel.start(), so we skip it.
  useEffect(() => {
    if (prevStateRef.current === null) { prevStateRef.current = state; return; }
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;
    funnel.track("state_enter", {
      state: state as FunnelState,
      counters: { text_length_max: textRef.current.length },
    });
    if (textRef.current.trim().length > 0) {
      funnel.snapshot(textRef.current, state as FunnelState);
    }
  }, [state]);

  // When state lands on `match_found` for a new (title, category)
  // pair, fire a dedicated `match_locked` event with the AI's match
  // metadata. Lets us measure rejection rate per category cleanly.
  useEffect(() => {
    if (state !== "match_found") return;
    if (!analysis?.matched) return;
    const key = `${analysis.category ?? ""}:${analysis.title ?? ""}`;
    if (lockedKeyRef.current === key) return;
    lockedKeyRef.current = key;
    const md = (analysis.matchData ?? {}) as Record<string, any>;
    funnel.track("match_locked", {
      state: "match_found",
      payload: {
        title:          analysis.title,
        category:       analysis.category,
        confidence:     analysis.confidence,
        confidence_tier: md.confidence_tier ?? null,
        source:         md.source ?? md.tmdb_id ? "tmdb" : null,
      },
      counters: {
        match_locked: true,
        category:     analysis.category ?? undefined,
      },
    });
  }, [state, analysis]);

  // Latest text mirrored in a ref so the unmount cleanup + the
  // state-transition snapshot effect can read it without forcing
  // a re-render dependency.
  const textRef = useRef("");

  const setText = useCallback((value: string) => {
    setText_(value);
    textRef.current = value;

    // Quality coach: regex runs locally on every keystroke (instant
    // feedback, free, no LLM round-trip). Then ~1.5s after the user
    // pauses, we ask Gemini for a semantic tip and replace the regex
    // tip if the LLM gave us something more specific. Empty → null.
    const localQuality = value.trim() ? assessQuality(value) : null;
    setQuality(localQuality);

    // Schedule the semantic tip request. Cancel any previous one.
    if (semanticTipDebounceRef.current) clearTimeout(semanticTipDebounceRef.current);
    if (value.trim().length >= 60) {
      semanticTipDebounceRef.current = setTimeout(async () => {
        try {
          const { getAIService } = await import("@/lib/ai");
          const ai = getAIService();
          if (!ai.getSemanticQualityTip) return;
          const tip = await ai.getSemanticQualityTip(value);
          if (!tip) return;
          // Replace the tip but preserve the local score/label/badge —
          // those drive the colored progress bar and shouldn't flicker.
          setQuality((prev) => prev ? { ...prev, tip } : prev);
        } catch {
          /* fail silently — regex tip stays */
        }
      }, 1500);
    }

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
    const clamped = Math.max(0, Math.min(5, n));
    setRating_(clamped);
    funnel.track("rating_set", { payload: { rating: clamped } });
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
      funnel.track("match_rejected", {
        payload: { title: prev.title, category: prev.category },
      });
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
      funnel.track("alternative_chosen", {
        payload: { index, title: alt.title, category: alt.category },
      });
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
    funnel.track("publish_attempted", {
      payload: { category: analysis.category, has_rating: rating > 0 },
    });

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
        funnel.track("publish_failed", { payload: { status: 0, network: true }, counters: { error_delta: 1 } });
        setErrorMessage("Δεν μπορώ να επικοινωνήσω με τον server. Δοκίμασε ξανά.");
        setState("error");
        return;
      }

      if (res.status === 401) {
        setErrorMessage("Πρέπει να συνδεθείς για να προτείνεις.");
        funnel.track("publish_failed", { payload: { status: 401 }, counters: { error_delta: 1 } });
        setState("error");
        return;
      }

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        funnel.track("publish_failed", {
          payload: { status: 409, kind: body.kind ?? "other" },
          counters: { duplicate_hit: true },
        });
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
        funnel.track("publish_failed", {
          payload: { status: res.status, error: body.error },
          counters: { error_delta: 1 },
        });
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
        achievement: parseAchievement(body.achievement),
      });
      funnel.track("publish_succeeded", {
        payload: {
          suggestion_id:    body.suggestion_id,
          item_slug:        body.item_slug,
          new_suggestion_count: body.new_suggestion_count,
        },
        counters: { published: true },
      });
      setState("published");
    } finally {
      setIsPublishing(false);
    }
  }, [state, analysis, text, rating]);

  const reset = useCallback(() => {
    funnel.track("flow_reset", {});
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
    lockedKeyRef.current = null;
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
