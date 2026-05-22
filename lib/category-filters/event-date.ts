/**
 * Shared event-date parser for theater + events `dates` jsonb.
 *
 * K2-format strings come in as `DD/MM/YYYY` or `DD/MM/YY`. Plain
 * `new Date(s)` mis-parses these (it interprets `02/03/2026` as
 * Feb 3 in US locale, which silently shifts every date by ~10
 * months for the European format we actually store). ISO 8601
 * strings (`YYYY-MM-DD`, full ISO timestamps) are accepted as-is.
 *
 * Single source of truth for both `lib/category-filters/match.ts`
 * (public + admin Explorer `when` filter) and the search route's
 * `eventMatchesWhen` / `eventMatchesPeriod` helpers.
 */
export function parseEventDate(s: unknown): Date | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? null : iso;
}
