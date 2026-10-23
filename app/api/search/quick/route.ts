import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { fuzzyTitleSearch } from "@/lib/search/fuzzy";
import { hasCategoryTrigger, quickTitleScore, titleTokens, tokenOrFilter } from "@/lib/search/title-match";

/**
 * GET /api/search/quick?q=…
 *
 * Instant, AI-free title matches shown while the user is still typing
 * (principle #2 "results appear as you type"). The full /api/search
 * answer — AI interpretation, pills, venue/location logic — replaces
 * these when it lands. Same response shape as /api/search's `items`.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "search-quick", { max: 300, windowSec: 600 });
  if (limited) return limited;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const tokens = titleTokens(q);
  // A query that names a category ("παράσταση για παιδιά") needs the AI's
  // category detection; quick title hits would flash off-topic results.
  if (!tokens.length || hasCategoryTrigger(q)) return NextResponse.json({ items: [] });

  let query = (createAdminClient().from("items") as any)
    .select("id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at")
    .eq("is_published", true)
    .limit(12);
  for (const t of tokens) query = query.or(tokenOrFilter(t));

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [] });

  // Nothing exact → typo-tolerant fallback ("ανεμορδαμένα" → "ανεμοδαρμένα").
  const rows = (data ?? []).length ? (data as any[]) : await fuzzyTitleSearch(q, 12);

  const items = rows
    .map((it) => ({ it, s: quickTitleScore(q, it.title ?? "") + Math.min(10, it.suggestion_count ?? 0) }))
    .sort((a, b) => b.s - a.s)
    .map(({ it }) => it);

  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60" } });
}
