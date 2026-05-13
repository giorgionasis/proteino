import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/items/search?q=…&category=…&limit=…
 *
 * Lightweight item autocomplete for admin pickers. Used by the
 * static_carousel item-source picker in /admin/layout's section
 * config drawer. Returns:
 *
 *   [{ id, title, slug, category, cover_url, avg_rating, rating_count }]
 *
 * - Search runs on `title_normalized` (Greek accent-folded) when present,
 *   falling back to plain `title` ilike on older databases.
 * - `category` filters to one of the 9 slugs; omit for cross-category search.
 * - Capped at 30; default 10.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category");
  const idsParam = url.searchParams.get("ids");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "10", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 10, 1), 30);

  const sb = createAdminClient();

  // Batch lookup by ID — used by the section-config picker to hydrate
  // the display info for items already saved on a section. Bypasses
  // search/limit semantics; returns matched rows in the order requested.
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 30);
    if (ids.length === 0) return NextResponse.json({ items: [] });

    const { data, error } = await (sb.from("items") as any)
      .select("id, title, slug, category, cover_url, avg_rating, rating_count")
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const byId = new Map<string, unknown>((data ?? []).map((r: { id: string }) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter((x): x is unknown => !!x);
    return NextResponse.json({ items: ordered });
  }

  let query: any = sb
    .from("items")
    .select("id, title, slug, category, cover_url, avg_rating, rating_count")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);

  if (q) {
    const folded = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    // Prefer accent-folded match via the generated column.
    query = query.or(`title_normalized.ilike.%${folded}%,title.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback if title_normalized column doesn't exist on this DB
    // (migration 014 not applied). Retry with plain title ilike.
    if (error.code === "42703") {
      let retry: any = sb
        .from("items")
        .select("id, title, slug, category, cover_url, avg_rating, rating_count")
        .eq("is_published", true)
        .order("avg_rating", { ascending: false })
        .limit(limit);
      if (category) retry = retry.eq("category", category);
      if (q) retry = retry.ilike("title", `%${q}%`);
      const { data: data2, error: err2 } = await retry;
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
      return NextResponse.json({ items: data2 ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
