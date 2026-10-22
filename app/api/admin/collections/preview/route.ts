import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

// POST /api/admin/collections/preview
// Body: {
//   source_category?, tags?: string[], filters?: [{field, value}], item_limit?,
//   manual_item_ids?: string[],
// }
// Returns: { items, total }
//
// When `manual_item_ids` is non-empty, short-circuits — selects those
// items in declared order and ignores every other input. Mirrors the
// hydrator in lib/collections.ts.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json();
  const {
    source_category,
    tags = [],
    filters = [],
    item_limit = 20,
    manual_item_ids = [],
  } = body as {
    source_category?: string;
    tags?: string[];
    filters?: { field: string; value: string }[];
    item_limit?: number;
    manual_item_ids?: string[];
  };

  const supabase = createAdminClient();

  // Manual-list short-circuit.
  const manualIds = Array.isArray(manual_item_ids)
    ? manual_item_ids.filter((s) => typeof s === "string" && s.length > 0)
    : [];
  if (manualIds.length > 0) {
    const { data, error } = await supabase
      .from("items")
      .select("id, title, slug, cover_url, category, avg_rating, rating_count, metadata")
      .in("id", manualIds)
      .eq("is_published", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const byId = new Map<string, any>();
    for (const row of (data ?? []) as any[]) byId.set(row.id, row);
    const ordered: any[] = [];
    for (const id of manualIds) {
      const hit = byId.get(id);
      if (hit) ordered.push(hit);
    }
    return NextResponse.json({ items: ordered, total: ordered.length });
  }

  const cleanTags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string" && t.trim()) : [];
  const cleanFilters = Array.isArray(filters)
    ? filters.filter((f) => f && typeof f.field === "string" && typeof f.value === "string" && f.value)
    : [];

  const extTable = source_category ? EXT_TABLES[source_category] : undefined;
  const useExtJoin = cleanFilters.length > 0 && !!extTable;

  const select = useExtJoin
    ? `id, title, slug, cover_url, category, avg_rating, rating_count, metadata, ${extTable}!inner()`
    : "id, title, slug, cover_url, category, avg_rating, rating_count, metadata";

  let q: any = supabase
    .from("items")
    .select(select, { count: "exact" })
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(Math.min(Math.max(item_limit, 1), 100));

  if (source_category) q = q.eq("category", source_category);
  if (cleanTags.length > 0) q = q.contains("metadata->tags", cleanTags);

  if (useExtJoin) {
    for (const f of cleanFilters) {
      q = q.eq(`${extTable}.${f.field}`, f.value);
    }
  }

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0 });
}
