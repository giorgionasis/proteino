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
 * Shared Explorer query runner.
 *
 * Extracted from `app/api/admin/explorer/query/route.ts` so the server
 * page (`app/admin/content/filters/page.tsx`) can also pre-run the
 * empty-selection query and seed the Explorer's `result` state — that
 * eliminates the "count card flickers from 0 / … to N" paint on first
 * mount. Route handler still owns input parsing + JSON response.
 *
 * Pure function over `(sb, input)` → `ExplorerQueryResult`. No request
 * concerns. The helpers below mirror the ones the public category page
 * uses — duplicated rather than imported across the `app/(main)`
 * boundary because they're tiny and importing would entangle the
 * bundle.
 */

export const VALID_CATEGORIES: CategorySlug[] = [
  "movies", "series", "books", "recipes", "food", "bars", "hotels", "theater", "events",
];

const EXT_SELECT: Record<CategorySlug, string> = {
  books:   "item_books(writer, publication, publication_year, language, pages, is_trilogy)",
  movies:  "item_movies(director, release_date, end_date, country, language, channel, duration_min, actors, awards)",
  series:  "item_series(director, release_date, end_date, country, language, channel, seasons, actors, awards)",
  food:    "item_food(cuisine, type, address, region_id, lat, lng, delivery_links, information)",
  recipes: "item_recipes(level, channel, origin, nutrition, yields, calories, duration)",
  bars:    "item_bars(type, address, region_id, lat, lng, information)",
  hotels:  "item_hotels(type, address, region_id, lat, lng, price_range, facilities)",
  theater: "item_theater(type, address, region_id, lat, lng, name_place, director, writer, actors, dates, year, price)",
  events:  "item_events(event_type, address, region_id, lat, lng, name_place, performers, dates, status, price)",
};

const EXT_KEY: Record<CategorySlug, string> = {
  food: "item_food", movies: "item_movies", series: "item_series",
  books: "item_books", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

export interface ExplorerSampleItem {
  id:           string;
  slug:         string;
  title:        string;
  cover_url:    string;
  avg_rating:   number;
  rating_count: number;
  subcategory:  string;
  area?:        string;
}

export interface ExplorerQueryResult {
  total:           number;
  count:           number;
  sample:          ExplorerSampleItem[];
  distincts:       Record<string, string[]>;
  peopleDistincts: Record<string, string[]>;
  matchedIds:      string[];
}

export interface ExplorerQueryInput {
  category:    CategorySlug;
  filters:     Record<string, string | string[]>;
  adminFacets: Record<string, string | string[]>;
  minRating:   number | null;
  sample?:     "rating" | "popular" | "newest";
}

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
      result.amenities = ext?.information?.amenities ?? undefined;
      break;
    case "bars":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Bar";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.amenities = ext?.information?.amenities ?? undefined;
      break;
    case "hotels":
      result.subcategory = ext?.type || subcategoryName || tags[0] || "Ξενοδοχείο";
      result.hotelType = ext?.type || undefined;
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.priceRange = ext?.price_range || undefined;
      result.amenities = ext?.facilities ?? undefined;
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

interface RegionDescendantsMap { [parentId: string]: string[] }

async function buildRegionDescendants(sb: any, anchorIds: string[]): Promise<RegionDescendantsMap> {
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

export async function runExplorerQuery(sb: any, input: ExplorerQueryInput): Promise<ExplorerQueryResult> {
  const { category, filters, adminFacets: adminSelections, minRating } = input;
  const sampleSort = input.sample === "rating" ? "rating" : input.sample === "newest" ? "newest" : "popular";

  const regionSelections = filters["region"];
  const regionAnchorIds = Array.isArray(regionSelections) ? regionSelections : [];
  const regionDescendants = await buildRegionDescendants(sb, regionAnchorIds);

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

  if (error) throw new Error(error.message);

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

  const matchedSorted = [...matched];
  if (sampleSort === "rating") {
    matchedSorted.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  } else if (sampleSort === "newest") {
    const byId = new Map<string, any>();
    for (const r of rawItems ?? []) byId.set((r as any).id, r);
    matchedSorted.sort((a, b) => {
      const ta = new Date(byId.get(a.id)?.created_at ?? 0).getTime();
      const tb = new Date(byId.get(b.id)?.created_at ?? 0).getTime();
      return tb - ta;
    });
  } else {
    matchedSorted.sort((a, b) => {
      const dr = (b.rating_count ?? 0) - (a.rating_count ?? 0);
      if (dr !== 0) return dr;
      return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    });
  }

  const sample: ExplorerSampleItem[] = matchedSorted.slice(0, 12).map((it) => ({
    id:           it.id,
    slug:         it.slug ?? "",
    title:        it.title,
    cover_url:    it.cover_url ?? "",
    avg_rating:   it.avg_rating ?? 0,
    rating_count: it.rating_count ?? 0,
    subcategory:  it.subcategory,
    area:         it.area,
  }));

  return {
    total: mapped.length,
    count: matched.length,
    sample,
    distincts,
    peopleDistincts,
    matchedIds: matched.map((it) => it.id),
  };
}
