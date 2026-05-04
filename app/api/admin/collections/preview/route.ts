import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

// POST /api/admin/collections/preview
// Body: { source_category?, tags?: string[], filters?: [{field, value}], item_limit? }
// Returns: { items, total }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { source_category, tags = [], filters = [], item_limit = 20 } = body as {
    source_category?: string;
    tags?: string[];
    filters?: { field: string; value: string }[];
    item_limit?: number;
  };

  const supabase = createAdminClient();

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
