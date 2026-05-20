import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchesFilter } from "@/lib/category-filters/match";
import {
  ADMIN_FACETS,
  matchesAdminFacet,
  parseAmenities,
} from "@/lib/category-filters/admin-facets";
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
  books:   "item_books(writer, publication, publication_year, language, pages, is_trilogy)",
  movies:  "item_movies(director, release_date, end_date, country, language, channel, duration_min, actors, awards)",
  series:  "item_series(director, release_date, end_date, country, language, channel, seasons, actors, awards)",
  food:    "item_food(cuisine, type, address, region_id, lat, lng, delivery_links)",
  recipes: "item_recipes(level, channel, origin, nutrition, yields, calories, duration)",
  bars:    "item_bars(type, address, region_id, lat, lng)",
  hotels:  "item_hotels(type, address, region_id, lat, lng, price_range, facilities)",
  theater: "item_theater(type, address, region_id, lat, lng, name_place, director, writer, actors, dates, year, price)",
  events:  "item_events(event_type, address, region_id, lat, lng, name_place, performers, dates, status, price)",
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

/** Same diet / dates / awards helpers as the public mapper — duplicated
 *  rather than imported because the public page lives under `app/(main)`
 *  and pulling helpers across that boundary would entangle the bundle.
 *  Tiny enough that the duplication cost is lower than the coupling
 *  cost; if either ever grows, hoist to lib/ together. */
function normalizeDietFlags(nutrition: any): string[] {
  if (!nutrition || typeof nutrition !== "object") return [];
  const flags: string[] = [];
  if (nutrition.vegan) flags.push("vegan");
  if (nutrition.dairy_free || nutrition.milk === false || nutrition.no_milk) flags.push("no_milk");
  if (nutrition.sugar_free || nutrition.sugar === false || nutrition.no_sugar) flags.push("no_sugar");
  return flags;
}

function extractEventDates(dates: any): string[] {
  if (!dates) return [];
  const raw = Array.isArray(dates) ? dates : [dates];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      out.push(entry);
      continue;
    }
    if (entry && typeof entry === "object") {
      const candidate = entry.date ?? entry.start ?? entry.startDate ?? entry.from ?? null;
      if (typeof candidate === "string") out.push(candidate);
    }
  }
  return out;
}

function hasAnyAward(awards: any): boolean {
  if (!awards) return false;
  if (Array.isArray(awards)) return awards.length > 0;
  if (typeof awards === "object") return Object.keys(awards).length > 0;
  return false;
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
      result.priceRange = ext?.price_range || undefined;
      break;
    case "theater":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Θέατρο";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.director = ext?.director || undefined;
      result.actors = stringifyActors(ext?.actors);
      result.dates = extractEventDates(ext?.dates);
      break;
    case "events":
      result.subcategory = ext?.event_type || subcategoryName || tags[0] || "Εκδήλωση";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.actors = stringifyActors(ext?.performers);
      result.dates = extractEventDates(ext?.dates);
      break;
    case "movies":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.director = ext?.director || undefined;
      result.duration_min = ext?.duration_min || undefined;
      result.actors = stringifyActors(ext?.actors);
      result.hasAwards = hasAnyAward(ext?.awards);
      break;
    case "series":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.actors = stringifyActors(ext?.actors);
      result.endDate = ext?.end_date ?? null;
      result.seasons = typeof ext?.seasons === "number" ? ext.seasons : undefined;
      result.hasAwards = hasAnyAward(ext?.awards);
      break;
    case "books":
      result.year = ext?.publication_year ?? undefined;
      result.writer = ext?.writer || undefined;
      result.publisher = ext?.publication || undefined;
      break;
    case "recipes":
      result.subcategory = subcategoryName || tags[0] || ext?.level || "Συνταγή";
      result.level = ext?.level || undefined;
      result.origin = ext?.origin || undefined;
      result.diet = normalizeDietFlags(ext?.nutrition);
      break;
  }

  return result;
}

interface ExplorerRequestBody {
  category?: unknown;
  filters?: unknown;
  /** Admin-only Class B facets — country / language / decade / amenities
   *  / etc. Keyed by facet id, values mirror the public filter shape
   *  (string or string[]). See ADMIN_FACETS for the catalogue. */
  adminFacets?: unknown;
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

  const adminFacetsRaw = (body.adminFacets ?? {}) as Record<string, unknown>;
  const adminSelections: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(adminFacetsRaw)) {
    if (typeof v === "string") adminSelections[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) adminSelections[k] = v as string[];
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

  /** ext payload kept parallel to `mapped` so the admin-facet matcher
   *  can read raw extension columns (country, language, facilities, …)
   *  that `CategoryItem` doesn't carry. Index alignment is enforced by
   *  building both arrays inside the same map iteration. The
   *  `tag-pattern` admin facet kind also needs the row's tags — those
   *  live on `metadata.tags`, not on the ext, so we shallow-copy the
   *  ext and attach `tags` for the matcher's convenience. */
  const exts: any[] = [];
  const mapped: CategoryItem[] = (rawItems ?? []).map((r: any) => {
    const subName = Array.isArray(r.subcategories) ? r.subcategories[0]?.name : r.subcategories?.name;
    const rawExt: any = Array.isArray(r[EXT_KEY[category]]) ? r[EXT_KEY[category]][0] : r[EXT_KEY[category]];
    const tags: string[] = Array.isArray(r.metadata?.tags) ? r.metadata.tags : [];
    const ext: any = { ...(rawExt ?? {}), tags };
    exts.push(ext);
    return mapItem(r, category, subName);
  });

  const facets = ADMIN_FACETS[category] ?? [];

  // Apply each selected filter. Empty values are no-ops by convention
  // inside matchesFilter — we still hand them in so the predicate sees
  // a consistent shape. Admin-only facets run as a second pass against
  // the parallel ext array.
  const matchedIdx: number[] = [];
  for (let i = 0; i < mapped.length; i++) {
    const it = mapped[i];
    let ok = true;
    for (const [filterId, value] of Object.entries(filters)) {
      if (!matchesFilter(it, filterId, value, category, regionDescendants)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const f of facets) {
      const sel = adminSelections[f.id];
      if (sel === undefined) continue;
      if (!matchesAdminFacet(f, sel, exts[i])) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (minRating !== null && (it.avg_rating ?? 0) < minRating) continue;
    matchedIdx.push(i);
  }
  const matched: CategoryItem[] = matchedIdx.map((i) => mapped[i]);

  // Distincts for facets that need server-derived option lists.
  // Computed over the FULL mapped set (not the matched subset) so
  // chip options don't disappear when the admin tightens selection.
  // - `chips` / `searchable-chips`: distinct string values from the
  //   ext column; client decides between full-render and combobox.
  // - `amenities`: derived from facilities jsonb, used to dim chips
  //   that have zero coverage in the data.
  // - `tag-pattern`: no distincts (buckets are static), but the
  //   client computes per-bucket counts via the matcher to label chips.
  const distincts: Record<string, string[]> = {};
  for (const f of facets) {
    if (f.kind === "chips" || f.kind === "searchable-chips") {
      const set = new Set<string>();
      for (const ext of exts) {
        const v = ext?.[f.field];
        if (typeof v === "string" && v.trim()) set.add(v.trim());
      }
      distincts[f.id] = Array.from(set).sort((a, b) => a.localeCompare(b, "el"));
    } else if (f.kind === "amenities") {
      const set = new Set<string>();
      for (const ext of exts) {
        for (const a of parseAmenities(ext?.[f.field])) set.add(a);
      }
      distincts[f.id] = Array.from(set).sort();
    }
  }

  // Distincts for FREE-TEXT public filters (director / actor /
  // performer / writer / publisher). These exist on the public side as
  // `search-dropdown` widgets, but the Explorer renders them as text
  // inputs today — admin types blind. Surfacing distincts lets the
  // client offer the same searchable picker UX as admin-facet
  // searchable-chips. Names are flattened from the actor/performer
  // jsonb arrays where applicable.
  const peopleDistincts: Record<string, string[]> = {};
  function collectPeopleColumn(col: string, dst: Set<string>) {
    for (const ext of exts) {
      const v = ext?.[col];
      if (typeof v === "string" && v.trim()) dst.add(v.trim());
      else if (Array.isArray(v)) {
        for (const entry of v) {
          if (typeof entry === "string" && entry.trim()) dst.add(entry.trim());
          else if (entry && typeof entry === "object") {
            const nm = (entry as any).name ?? (entry as any).label ?? (entry as any).fullName;
            if (typeof nm === "string" && nm.trim()) dst.add(nm.trim());
          }
        }
      }
    }
  }
  const PEOPLE_FIELDS_BY_CATEGORY: Record<CategorySlug, Array<{ filterId: string; column: string }>> = {
    movies:  [{ filterId: "director", column: "director" }, { filterId: "actor", column: "actors" }],
    series:  [{ filterId: "director", column: "director" }, { filterId: "actor", column: "actors" }],
    books:   [{ filterId: "writer",   column: "writer"   }, { filterId: "publisher", column: "publication" }],
    theater: [{ filterId: "director", column: "director" }, { filterId: "actor", column: "actors" }],
    events:  [{ filterId: "performer", column: "performers" }],
    food: [], recipes: [], bars: [], hotels: [],
  };
  for (const f of PEOPLE_FIELDS_BY_CATEGORY[category]) {
    const set = new Set<string>();
    collectPeopleColumn(f.column, set);
    peopleDistincts[f.filterId] = Array.from(set).sort((a, b) => a.localeCompare(b, "el"));
  }

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
    distincts,
    peopleDistincts,
    matchedIds: matched.map((it) => it.id),
  });
}
