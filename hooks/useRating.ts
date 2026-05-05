"use client";

/**
 * useRating — submit/persist a star rating for an item.
 *
 * Mirrors useBookmark's optimistic-update pattern. The detail page already
 * has local UI state for the star count (`userRating`); this hook handles
 * the persistence + the post-write aggregate update so the page can show
 * the new avg_rating immediately.
 *
 * Usage:
 *   const { save, busy, savedScore } = useRating(itemId);
 *   await save(4);  // Persists score=4. Returns { avg_rating, rating_count } on success.
 */

import { useState, useCallback } from "react";

interface RatingResult {
  avg_rating: number;
  rating_count: number;
}

export function useRating(itemId: string, initialScore: number | null = null) {
  const [busy, setBusy] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(initialScore);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (score: number): Promise<RatingResult | null> => {
      if (busy) return null;
      if (score < 0 || score > 5) {
        setError("Η βαθμολογία πρέπει να είναι 0–5");
        return null;
      }

      setBusy(true);
      setError(null);

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId, score }),
        });

        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return null;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Αποτυχία (${res.status})`);
          return null;
        }

        const body = (await res.json()) as RatingResult;
        setSavedScore(score);
        return body;
      } catch {
        setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [itemId, busy]
  );

  return { save, busy, savedScore, error };
}
