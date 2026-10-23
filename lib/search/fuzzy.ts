import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { foldGreek, titleTokens } from "@/lib/search/title-match";

/**
 * Typo-tolerant title search ("ανεμορδαμένα ύψη" → "Ανεμοδαρμένα ύψη").
 * Fallback for when exact word matching finds nothing. The catalogue is
 * small (~2k titles), so a cached in-memory index + optimal-string-
 * alignment distance per word is fast and independent of how the DB
 * locale treats Greek in pg_trgm.
 */

const ITEM_COLS =
  "id, title, original_title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at";

const getTitleIndex = unstable_cache(
  async () => {
    const sb = createAdminClient();
    const rows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await (sb.from("items") as any)
        .select(ITEM_COLS)
        .eq("is_published", true)
        .range(from, from + 999);
      if (error || !data) break;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows.map((r) => ({
      item: r,
      words: foldGreek(`${r.title ?? ""} ${r.original_title ?? ""}`)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w: string) => w.length >= 2),
    }));
  },
  ["search-title-index"],
  { revalidate: 600 },
);

/** Optimal string alignment distance (Levenshtein + adjacent swaps). */
function osa(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** 0–1 similarity of a query word to a title word (prefix counts — typing). */
function wordScore(q: string, w: string): number {
  if (w === q) return 1;
  if (q.length >= 4 && w.startsWith(q)) return 0.95;
  const maxEdits = q.length >= 8 ? 2 : q.length >= 5 ? 1 : 0;
  if (maxEdits === 0) return 0;
  // Compare against the same-length prefix too, so a typo inside a word
  // the user hasn't finished typing still matches.
  const cands = [w, w.slice(0, q.length + 1)];
  let best = 0;
  for (const c of cands) {
    const dist = osa(q, c);
    if (dist <= maxEdits) best = Math.max(best, 1 - dist / Math.max(q.length, c.length));
  }
  return best;
}

export async function fuzzyTitleSearch(q: string, limit = 10): Promise<any[]> {
  const tokens = titleTokens(q);
  if (!tokens.length) return [];
  const index = await getTitleIndex();

  const scored: { item: any; score: number }[] = [];
  for (const entry of index) {
    let total = 0;
    let ok = true;
    for (const t of tokens) {
      let best = 0;
      for (const w of entry.words) {
        const s = wordScore(t, w);
        if (s > best) best = s;
        if (best === 1) break;
      }
      if (best < 0.7) { ok = false; break; }
      total += best;
    }
    if (ok) scored.push({ item: entry.item, score: total / tokens.length });
  }
  return scored
    .sort((a, b) => b.score - a.score || (b.item.suggestion_count ?? 0) - (a.item.suggestion_count ?? 0))
    .slice(0, limit)
    .map((s) => s.item);
}
