/**
 * Shared scoring helpers for /api/ai/match enrichment paths
 * (TMDB, Google Books, future Google Places / Ticketmaster).
 *
 * Kept in lib/ so per-provider clients (lib/enrichment/google-books.ts
 * etc.) can score their own results without importing from the route.
 */

import { stripDiacritics } from "@/lib/utils/textSearch";

/**
 * How well does an external-API-returned title match what the user
 * typed? Higher is better. Lets the matcher prefer exact matches over
 * fuzzy ones — "Κονκλάβιο" → "Κονκλάβιο" (exact, 100) beats "Είδα" →
 * "Σε Είδα" (substring, 60).
 *
 * Case + accent insensitive (essential for Greek — "Ζορμπά" matches
 * "Ζορμπάς" inside "Βίος και πολιτεία του Αλέξη Ζορμπά" regardless
 * of tonal marks). NFD-folds combining marks before comparison.
 */
export function scoreTitleMatch(candidate: string, title: string): number {
  const c = stripDiacritics(candidate.trim().toLowerCase());
  const t = stripDiacritics(title.trim().toLowerCase());
  if (!c || !t) return 0;
  if (c === t) return 100;
  if (t.startsWith(c) || t.endsWith(c)) return 80;
  if (t.includes(c)) return 60;
  if (c.includes(t)) return 50;
  return 20;
}

/**
 * Confidence tier from a score + optional runner-up gap.
 *   high   → auto-lock as match.
 *   medium → lock + offer "Όχι αυτό;" escape hatch.
 *   low    → don't lock; surface alternatives.
 *
 * If runner-up is within 20 points of best, downgrade to low because
 * the choice is genuinely ambiguous (two API hits both scoring 100).
 */
export function computeTier(
  best: number,
  runnerUp: number | null,
): "high" | "medium" | "low" {
  if (runnerUp !== null && best - runnerUp < 20) return "low";
  if (best >= 100) return "high";
  if (best >= 60) return "medium";
  return "low";
}

/** "2014-11-04" → 2014, "" → null, "garbage" → null. */
export function parseYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
