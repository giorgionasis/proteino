"use client";

/**
 * useReview — submit/persist a (rating + optional reflection) for an item.
 *
 * Replaces the old useRating + comment flow. One row per (user, item) in
 * the `reviews` table; calling save again upserts.
 *
 * Usage:
 *   const { save, busy, savedRating, savedReflection } = useReview(itemId, initialReview);
 *   await save(4, "Πολύ καλό");  // rating mandatory, text optional
 */

import { useState, useRef, useEffect } from "react";

interface ReviewResult {
  review_id: string;
  avg_rating: number;
  rating_count: number;
}

interface InitialReview {
  rating: number | null;
  reflection: string | null;
}

interface Options {
  /** Fires after a successful save; receives the server result + the saved rating/reflection. */
  onSaved?: (result: ReviewResult, rating: number, reflection: string | null) => void;
}

export function useReview(
  itemId:   string,
  initial:  InitialReview = { rating: null, reflection: null },
  options:  Options        = {},
) {
  const [busy, setBusy] = useState(false);
  const [savedRating, setSavedRating] = useState<number | null>(initial.rating);
  const [savedReflection, setSavedReflection] = useState<string | null>(initial.reflection);
  const [error, setError] = useState<string | null>(null);

  // Stash the latest onSaved in a ref so callers can pass fresh
  // closures each render (e.g. one that reads from a bookmark store)
  // without re-creating the memoized `save` function.
  const onSavedRef = useRef<Options["onSaved"]>(options.onSaved);
  useEffect(() => { onSavedRef.current = options.onSaved; }, [options.onSaved]);

  const save = async (
    rating: number,
    reflection: string | null = null,
  ): Promise<ReviewResult | null> => {
    if (busy) return null;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Επίλεξε αστέρια 1–5");
      return null;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, rating, reflection }),
      });

      if (res.status === 401) {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return null;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        return null;
      }

      const body = (await res.json()) as ReviewResult;
      setSavedRating(rating);
      setSavedReflection(reflection);
      onSavedRef.current?.(body, rating, reflection);
      return body;
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { save, busy, savedRating, savedReflection, error };
}
