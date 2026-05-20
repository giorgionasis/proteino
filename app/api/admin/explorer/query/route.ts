import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchesFilter } from "@/lib/category-filters/match";
import { pickCoverUrl } from "@/lib/images/gallery";
import type { CategoryItem } from "@/components/category/CategoryCard";
import type { CategorySlug } from "@/types";

/**
 * POST /api/admin/explorer/query
 *
 * Body: { category: CategorySlug, filters: Record<string, string | string[]> }
 *
 * Reverse of the public category page: take a facet combination and
 * return how many published items match + a small sample. Powers the
 * admin Explorer so the team can pick a combination (e.g. movies ×
 * subcategory=drama × platform=netflix × rating ≥ 4.5) and decide
 * whether the count is meaningful for a Card / Carousel / Collection.
 *
 * Approach:
 *   1. Fetch every published item in the category + its extension
 *      row in a single Supabase query.
 *   2. Map to the same slim `CategoryItem` shape the public category
 *      page builds (only the filter-relevant fields — no suggester
 *      avatars, no carousel hydration).
 *   3. Apply matchesFilter from lib/category-filters/match to every
 *      row for every selected filter.
 *   4. Return { total, count, sample: top 12 by avg_rating × rating_count }.
 *
 * Region descendants are loaded once and threaded through so the
 * region picker behaves the same as on the public side (selecting
 * Αθήνα includes all its descendant neighbourhoods).
 */

const VALID_CATEGORIES: CategorySlug[] = [
  "movies", "series", "books", "recipes", "food", "bars", "hotels", "theater", "events",
];

const EXT_SELECT: Record<CategorySlug, string> = {
  books:   "item_books(writer, publication, publication_year, language, pages)",
  movies:  "item_movies(director, release_date, channel, duration_min, actors)",
  series:  "item_series(director, channel, seasons, actors)",
  food:    "item_food(cuisine, type, address, region_id, lat, lng, delivery_links)",
  recipes: "item_recipes(level, channel)",
  bars:    "item_bars(type, address, region_id, lat, lng)",
  hotels:  "item_hotels(type, address, region_id, lat, lng, price_range)",
  theater: "item_theater(type, address, region_id, lat, lng, name_place, director, writer, actors)",
  events:  "item_events(event_type, address, region_id, lat, lng, name_place, performers)",
};

const EXT_KEY: Record<CategorySlug, string> = {
  food: "item_food", movies: "item_movies", series: "item_series",
  books: "item_books", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

function stringifyActors(actors: any): string | undefined {
  if (!actors) return undefined;
  if (typeof actors === "string") return actors;
  if (Array.isArray(actors)) {
    return actors
      .map((a: any) => (typeof a === "string" ? a : a?.name ?? a?.label ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return undefined;
}

function extractArea(address: string | null | undefined): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

function mapItem(row: any, category: CategorySlug, subcategoryName: string | undefined): CategoryItem {
  const ext: any = Array.isArray(row[EXT_KEY[category]])
    ? row[EXT_KEY[category]][0]
    : row[EXT_KEY[category]];

  const meta = row.metadata ?? {};
  const tags: string[] = meta.tags ?? [];

  const result: CategoryItem = {
    id: row.id,
    slug: stripPrefix(row.slug ?? ""),
    title: row.title,
    subcategory: subcategoryName ?? tags[0] ?? "",
    avg_rating: row.avg_rating ?? 0,
    rating_count: row.rating_count ?? 0,
    cover_url: pickCoverUrl(row.images, row.cover_url) ?? row.cover_url ?? "",
    suggestedBy: { names: [], extra: 0 },
    tags,
    suggester: null,
  };

  if (typeof ext?.lat === "number" && typeof ext?.lng === "number") {
    result.lat = ext.lat;
    result.lng = ext.lng;
  }

  switch (category) {
    case "food":
      result.subcategory = ext?.type || ext?.cuisine || subcategoryName || tags[0] || "Εστιατόριο";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.foodType = ext?.type || undefined;
      result.cuisine = ext?.cuisine || undefined;
      if (ext?.delivery_links && typeof ext.delivery_links === "object") {
        result.delivery = Object.keys(ext.delivery_links).filter((k) => ext.delivery_links[k]);
      }
      break;
    case "bars":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Bar";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      break;
    case "hotels":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Ξενοδοχείο";
      result.hotelType = ext?.type || undefined;
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      break;
    case "theater":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Θέατρο";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.director = ext?.director || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "events":
      result.subcategory = ext?.event_type || subcategoryName || tags[0] || "Εκδήλωση";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.actors = stringifyActors(ext?.performers);
      break;
    case "movies":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.director = ext?.director || undefined;
      result.duration_min = ext?.duration_min || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "series":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "books":
      result.year = ext?.publication_year ?? undefined;
      result.writer = ext?.writer || undefined;
      result.publisher = ext?.publication || undefined;
      break;
    case "recipes":
      result.subcategory = subcategoryName || tags[0] || ext?.level || "Συνταγή";
      result.level = ext?.level || undefined;
      break;
  }

  return result;
}

interface ExplorerRequestBody {
  category?: unknown;
  filters?: unknown;
  /** When the admin has set min_rating in the picker. */
  minRating?: unknown;
  /** Sort key for the sample preview. Defaults to `rating_count desc`. */
  sample?: "rating" | "popular" | "newest";
}

interface RegionDescendantsMap { [parentId: string]: string[] }

async function buildRegionDescendants(sb: any, anchorIds: string[]): Promise<RegionDescendantsMap> {
  // Only need descendants for the anchors actually selected. Walks the
  // regions tree breadth-first per anchor — fine at ≤ N hundred regions.
  if (anchorIds.length === 0) return {};

  const { data: allRegions } = await sb
    .from("regions")
    .select("id, parent_id");
  const rows = (allRegions ?? []) as Array<{ id: string; parent_id: string | null }>;
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parent_id, arr);
  }

  const out: RegionDescendantsMap = {};
  for (const anchor of anchorIds) {
    const descendants: string[] = [];
    const stack = [...(childrenOf.get(anchor) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      descendants.push(id);
      const kids = childrenOf.get(id);
      if (kids) stack.push(...kids);
    }
    out[anchor] = descendants;
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: ExplorerRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category as CategorySlug;
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const filtersRaw = (body.filters ?? {}) as Record<string, unknown>;
  const filters: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(filtersRaw)) {
    if (typeof v === "string") filters[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) filters[k] = v as string[];
  }

  const minRating = typeof body.minRating === "number" && body.minRating > 0 ? body.minRating : null;
  const sampleSort = body.sample === "rating" ? "rating" : body.sample === "newest" ? "newest" : "popular";

  const sb = createAdminClient();

  // Region descendants for any selected region anchors — matches the
  // public category page behaviour (selecting Αθήνα includes its child
  // neighbourhoods).
  const regionSelections = filters["region"];
  const regionAnchorIds = Array.isArray(regionSelections) ? regionSelections : [];
  const regionDescendants = await buildRegionDescendants(sb, regionAnchorIds);

  // Fetch all published items + extension table + subcategory name.
  const select = `
    id, slug, title, cover_url, images, avg_rating, rating_count, suggestion_count,
    metadata, category, subcategory_id, created_at,
    ${EXT_SELECT[category]},
    subcategories(name)
  `;

  const { data: rawItems, error } = await sb
    .from("items")
    .select(select)
    .eq("category", category)
    .eq("is_published", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mapped: CategoryItem[] = (rawItems ?? []).map((r: any) => {
    const subName = Array.isArray(r.subcategories) ? r.subcategories[0]?.name : r.subcategories?.name;
    return mapItem(r, category, subName);
  });

  // Apply each selected filter. Empty values are no-ops by convention
  // inside matchesFilter — we still hand them in so the predicate sees
  // a consistent shape.
  const matched = mapped.filter((it) => {
    for (const [filterId, value] of Object.entries(filters)) {
      if (!matchesFilter(it, filterId, value, category, regionDescendants)) return false;
    }
    if (minRating !== null && (it.avg_rating ?? 0) < minRating) return false;
    return true;
  });

  // Sort the sample.
  const matchedSorted = [...matched];
  if (sampleSort === "rating") {
    matchedSorted.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  } else if (sampleSort === "newest") {
    // Map back to created_at — needs the raw row. Quick lookup via id.
    const byId = new Map<string, any>();
    for (const r of rawItems ?? []) byId.set((r as any).id, r);
    matchedSorted.sort((a, b) => {
      const ta = new Date(byId.get(a.id)?.created_at ?? 0).getTime();
      const tb = new Date(byId.get(b.id)?.created_at ?? 0).getTime();
      return tb - ta;
    });
  } else {
    // popular: rating_count desc tiebroken by avg_rating
    matchedSorted.sort((a, b) => {
      const dr = (b.rating_count ?? 0) - (a.rating_count ?? 0);
      if (dr !== 0) return dr;
      return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    });
  }

  const sample = matchedSorted.slice(0, 12).map((it) => ({
    id:           it.id,
    slug:         it.slug,
    title:        it.title,
    cover_url:    it.cover_url,
    avg_rating:   it.avg_rating ?? 0,
    rating_count: it.rating_count ?? 0,
    subcategory:  it.subcategory,
    area:         it.area,
  }));

  return NextResponse.json({
    total: mapped.length,
    count: matched.length,
    sample,
  });
}
