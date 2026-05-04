import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

interface DraftRow {
  title: string;
  channel: string;
  air_date: string;
  air_time: string;
}

// POST /api/admin/movies-tonight/bulk
// Body: { rows: DraftRow[] }
// Resolves each row's title to an existing movie item by exact case-insensitive
// title match. Returns { matched: [...with item_id], unmatched: [...] }.
// Does NOT insert — preview-only. Caller commits via normal POST per row.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows as DraftRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Fetch all movie items in one round trip
  const titles = Array.from(new Set(rows.map((r) => r.title.trim()).filter(Boolean)));
  const { data: items, error } = await sb
    .from("items")
    .select("id, title, slug, cover_url")
    .eq("category", "movies")
    .eq("is_published", true)
    .in("title", titles);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build a case-insensitive title → item map
  const byTitle = new Map<string, any>();
  for (const it of (items ?? []) as any[]) {
    byTitle.set(it.title.toLowerCase(), it);
  }

  // Also do a contains-search fallback for titles that didn't exact-match
  const unmatchedTitles = titles.filter((t) => !byTitle.has(t.toLowerCase()));
  if (unmatchedTitles.length > 0) {
    const orFilter = unmatchedTitles
      .slice(0, 50)
      .map((t) => `title.ilike.%${t.replace(/[%,()]/g, "")}%`)
      .join(",");
    const { data: fuzzy } = await sb
      .from("items")
      .select("id, title, slug, cover_url")
      .eq("category", "movies")
      .eq("is_published", true)
      .or(orFilter)
      .limit(100);

    for (const it of (fuzzy ?? []) as any[]) {
      const lc = it.title.toLowerCase();
      if (!byTitle.has(lc)) byTitle.set(lc, it);
      // Also map by each unmatched title that this result fuzzy-matches, so the
      // outer loop below picks it up.
      for (const ut of unmatchedTitles) {
        if (lc.includes(ut.toLowerCase()) || ut.toLowerCase().includes(lc)) {
          byTitle.set(ut.toLowerCase(), it);
        }
      }
    }
  }

  const matched: any[] = [];
  const unmatched: DraftRow[] = [];

  for (const r of rows) {
    const item = byTitle.get(r.title.trim().toLowerCase());
    if (item) {
      matched.push({
        item_id: item.id,
        item_title: item.title,
        item_cover: item.cover_url,
        channel: r.channel,
        air_date: r.air_date,
        air_time: r.air_time,
      });
    } else {
      unmatched.push(r);
    }
  }

  return NextResponse.json({ matched, unmatched });
}

// PUT /api/admin/movies-tonight/bulk
// Body: { rows: { item_id, channel, air_date, air_time }[] }
// Inserts all rows, skipping duplicates (uses ON CONFLICT DO NOTHING via upsert).
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows as { item_id: string; channel: string; air_date: string; air_time: string }[];
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const insertRows = rows.map((r) => ({
    item_id: r.item_id,
    channel: r.channel,
    air_date: r.air_date,
    air_time: r.air_time,
    is_published: true,
  }));

  const { error, count } = await (sb.from("movies_tonight") as any)
    .upsert(insertRows, { onConflict: "item_id,channel,air_date,air_time", count: "exact", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: count ?? insertRows.length });
}
