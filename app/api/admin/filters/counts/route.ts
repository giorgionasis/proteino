import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/filters/counts?category=movies
 *
 * Powers the Filters Explorer view in the admin panel — admin filters by
 * attributes, sees how many items exist per facet, and decides Card-vs-
 * Carousel format based on threshold (>10 → Card, 4–10 → Carousel).
 *
 * Returns:
 *   {
 *     total: number,
 *     subcategories: Array<{ id, slug, name, count }>,
 *     regions: Array<{ id, name, count }>  // venues only
 *   }
 *
 * Subcategories come from the canonical taxonomy joined to a count of
 * published items. Regions are looked up via the venue extension table
 * (item_food / item_bars / item_hotels / item_theater / item_events) since
 * region_id lives there, not on items.
 */

const VENUE_CATEGORIES = new Set(["food", "bars", "hotels", "theater", "events"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const admin = createAdminClient();

  // Total published items in this category
  const { count: total } = await admin
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("category", category)
    .eq("is_published", true);

  // Subcategory counts — pull all subcategories for the category, then for
  // each grab the item count. N+1 is fine here (≤12 subs per category).
  const { data: subs } = await admin
    .from("subcategories")
    .select("id, slug, name")
    .eq("category", category)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  const subcategoryCounts = await Promise.all(
    (subs ?? []).map(async (s: any) => {
      const { count } = await admin
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("category", category)
        .eq("subcategory_id", s.id)
        .eq("is_published", true);
      return { id: s.id, slug: s.slug, name: s.name, count: count ?? 0 };
    }),
  );

  // Region counts — only meaningful for venues
  let regionCounts: Array<{ id: string; name: string; count: number }> = [];
  if (VENUE_CATEGORIES.has(category)) {
    const extTable = `item_${category}`;
    const { data: regionRows } = await (admin.from(extTable) as any)
      .select("region_id");
    const counts = new Map<string, number>();
    for (const r of regionRows ?? []) {
      if (r.region_id) counts.set(r.region_id, (counts.get(r.region_id) ?? 0) + 1);
    }
    if (counts.size > 0) {
      const { data: regions } = await admin
        .from("regions")
        .select("id, name")
        .in("id", Array.from(counts.keys()));
      regionCounts = (regions ?? [])
        .map((r: any) => ({ id: r.id, name: r.name, count: counts.get(r.id) ?? 0 }))
        .sort((a, b) => b.count - a.count);
    }
  }

  return NextResponse.json({
    total: total ?? 0,
    subcategories: subcategoryCounts.sort((a, b) => b.count - a.count),
    regions: regionCounts,
  });
}
