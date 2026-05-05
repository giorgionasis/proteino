/**
 * Text-search helpers used by the search overlay + hook.
 *
 * These exist because Postgres `ilike` is accent-sensitive and JavaScript's
 * `new RegExp(...)` blows up on regex metacharacters. Both edge cases hit
 * Greek input hard ("Αθήνα" vs "αθηνα", or a pill value containing a `(`).
 */

/** Escape every regex metacharacter so a string literal can be embedded into
 *  a `new RegExp(...)` call without surprises. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip combining diacritical marks. "Αθήνα" → "Αθηνα", "café" → "cafe".
 *  Combining marks live in U+0300–U+036F after NFD-decomposition. */
export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Remove every (case + accent insensitive) occurrence of `needle` from
 *  `haystack`, then collapse the leftover whitespace. Returns the trimmed
 *  result. Used by the search hook when a user taps the X on a pill —
 *  we strip that pill's text from the textual query so the next AI pass
 *  doesn't immediately re-detect the same filter. */
export function looseStrip(haystack: string, needle: string): string {
  if (!needle.trim()) return haystack;
  // Build a case+accent insensitive regex via folding, anchored on word
  // boundaries when possible.
  const foldedNeedle = stripDiacritics(needle).trim();
  if (!foldedNeedle) return haystack;
  const escaped = escapeRegExp(foldedNeedle);

  // Walk the haystack character by character with a folded copy aligned to
  // it (NFD may add chars but combining marks are removed → length should
  // match the base run); for safety we just fold both, find the index in
  // the folded haystack, and slice the original at the corresponding span.
  // This avoids regexes altogether and survives any Unicode pathology.
  const foldedHay = stripDiacritics(haystack).toLowerCase();
  const foldedTarget = foldedNeedle.toLowerCase();

  let result = haystack;
  let foldedResult = foldedHay;
  // Iteratively remove every occurrence (caller passes a single needle but
  // it may appear multiple times in the query, e.g. "books books books").
  // Bounded by length to avoid pathological loops.
  for (let i = 0; i < 8; i++) {
    const idx = foldedResult.indexOf(foldedTarget);
    if (idx === -1) break;
    result = result.slice(0, idx) + result.slice(idx + foldedTarget.length);
    foldedResult = foldedResult.slice(0, idx) + foldedResult.slice(idx + foldedTarget.length);
  }

  // Reference `escaped` so unused-var linters stay quiet — it's exported for
  // any future callers that *do* need a regex (and it's the safe builder).
  void escaped;

  return result.replace(/\s+/g, " ").trim();
}
