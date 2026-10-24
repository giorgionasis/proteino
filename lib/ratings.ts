/**
 * Rating display rules (user decision, session 40):
 *   - Show an item's rating as soon as it has ONE review.
 *   - At zero reviews never render "0.00" / "0 αξιολογήσεις". Cards hide
 *     the rating row; detail pages show FIRST_REVIEW_INVITE as a quiet,
 *     muted line — never a banner or a loud CTA.
 */

export function hasRatings(count: number | null | undefined): count is number {
  return typeof count === "number" && count > 0;
}

/** "1 αξιολόγηση" / "12 αξιολογήσεις". */
export function ratingCountLabel(count: number): string {
  return count === 1 ? "1 αξιολόγηση" : `${count} αξιολογήσεις`;
}

export const FIRST_REVIEW_INVITE = "Γίνε ο πρώτος που θα το αξιολογήσει";

/**
 * The ratings that count for an item: every visible review, plus the
 * stars a suggester gave in their published suggestion — one per person,
 * the review wins when someone has both. Same rule as the SQL
 * recompute_item_rating() (migration 057) that maintains
 * items.avg_rating / rating_count for cards. Keep the two in sync.
 */
export function combineRatings(
  reviews: Array<{ userId: string; rating: number }>,
  suggestions: Array<{ userId: string; rating: number | null }>,
): number[] {
  const out = reviews.map((r) => r.rating);
  const counted = new Set(reviews.map((r) => r.userId));
  for (const s of suggestions) {
    if (s.rating === null || s.rating < 1 || !s.userId || counted.has(s.userId)) continue;
    counted.add(s.userId);
    out.push(s.rating);
  }
  return out;
}
