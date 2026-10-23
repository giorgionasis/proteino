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
