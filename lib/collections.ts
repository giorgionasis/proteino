/**
 * Collections — DB-driven curated home/category sections.
 *
 * Server-side helpers that fetch active collections + their matching items,
 * filtered by audience and lifecycle window. Used by app/(main)/page.tsx
 * (and later category pages).
 */

import type { LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import type { PortraitItem } from "@/components/recommendation/CarouselPortrait";
import { safeImageUrl } from "@/lib/image-url";

type SupabaseLike = {
  from: (table: string) => any;
};

export type CollectionType = "card" | "carousel";

export interface CollectionRow {
  id: string;
  type: CollectionType;
  title: string;
  title_specific: string | null;
  alias: string;
  image_url: string | null;
  source_category: string | null;
  tags: string[];
  filters: { field: string; value: string }[];
  item_limit: number;
  is_published: boolean;
  target_audience: "all" | "registered" | "guest";
  valid_from: string | null;
  valid_until: string | null;
}

export interface HydratedCollection {
  collection: CollectionRow;
  /** Items matching the filter, capped at collection.item_limit. */
  items: HydratedItem[];
  total: number;
}

export interface HydratedItem {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  category: string;
  avg_rating: number;
  rating_count: number;
  metadata: Record<string, any> | null;
  /** Original suggester(s) — populated via the suggestions+users join
   *  on the items query. The Landscape card pulls the first non-null
   *  user as the bottom-left avatar overlay; the popup needs id /
   *  handle / display_name to fetch + render full profile. */
  suggestions?: {
    users: {
      id: string;
      handle: string;
      display_name: string;
      avatar_url: string | null;
      level: number | null;
      suggestion_count: number | null;
      avg_quality_score: number | null;
    } | null;
  }[] | null;
}

/* ─── Public API ──────────────────────────────────────────── */

/**
 * Fetch all home-placed collections matching audience, ordered by display_order,
 * with each collection's items already attached.
 */
export async function fetchHomeCollections(
  sb: SupabaseLike,
  isRegistered: boolean
): Promise<HydratedCollection[]> {
  return fetchPlacedCollections(sb, "home", null, isRegistered);
}

export async function fetchCategoryCollections(
  sb: SupabaseLike,
  category: string,
  isRegistered: boolean
): Promise<HydratedCollection[]> {
  return fetchPlacedCollections(sb, "category", category, isRegistered);
}

/* ─── Core ────────────────────────────────────────────────── */

async function fetchPlacedCollections(
  sb: SupabaseLike,
  context: "home" | "category",
  category: string | null,
  isRegistered: boolean
): Promise<HydratedCollection[]> {
  const audiences = isRegistered ? ["all", "registered"] : ["all", "guest"];
  const now = new Date().toISOString();

  let q = sb
    .from("collection_placements")
    .select("display_order, collections!inner(*)")
    .eq("context", context)
    .order("display_order");

  if (context === "home") q = q.is("category", null);
  else if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    console.error("[collections] fetch placements failed:", error.message);
    return [];
  }

  const rows: CollectionRow[] = (data ?? [])
    .map((r: any) => r.collections as CollectionRow)
    .filter((c: CollectionRow) => c && c.is_published)
    .filter((c: CollectionRow) => audiences.includes(c.target_audience))
    .filter((c: CollectionRow) => !c.valid_from || c.valid_from <= now)
    .filter((c: CollectionRow) => !c.valid_until || c.valid_until >= now);

  // Hydrate each in parallel
  const hydrated = await Promise.all(rows.map((c: CollectionRow) => hydrateCollection(sb, c)));

  // Drop empty collections — never show a section with 0 items to a user.
  return hydrated.filter((h) => h.items.length > 0);
}

/**
 * Filters jsonb shape:
 *   [{ field: 'channel', value: 'Netflix' }, ...]
 *
 * Each row matches an extension-table column equal to the value. Requires
 * source_category to be set (so we know which item_<category> table to join).
 */
type ExtFilter = { field: string; value: string };

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

async function hydrateCollection(sb: SupabaseLike, c: CollectionRow): Promise<HydratedCollection> {
  // If admin set ext-field filters, we need to inner-join the ext table
  // so we can filter on its columns. Otherwise plain items query is fine.
  const extFilters: ExtFilter[] = (Array.isArray(c.filters) ? c.filters : [])
    .filter((f: any): f is ExtFilter =>
      f && typeof f.field === "string" && typeof f.value === "string"
    );

  const extTable = c.source_category ? EXT_TABLES[c.source_category] : undefined;
  const useExtJoin = extFilters.length > 0 && !!extTable;

  // Always fetch the original-suggester profile alongside item metadata —
  // the Landscape card renders the avatar overlay AND wires it to the
  // ProfilePopup (id/handle/display_name needed). FK disambiguator:
  // `suggestions` has two FKs to `users` (user_id + hidden_by) so plain
  // `users(...)` returns ambiguous.
  const suggesterJoin = "suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))";
  const baseSelect = `id, title, slug, cover_url, category, avg_rating, rating_count, metadata, ${suggesterJoin}`;
  const select = useExtJoin
    ? `${baseSelect}, ${extTable}!inner()`
    : baseSelect;

  let q: any = sb
    .from("items")
    .select(select, { count: "exact" })
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(Math.min(Math.max(c.item_limit ?? 20, 1), 100));

  if (c.source_category) q = q.eq("category", c.source_category);

  const tags = Array.isArray(c.tags) ? c.tags.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  if (tags.length > 0) q = q.contains("metadata->tags", tags);

  if (useExtJoin) {
    for (const f of extFilters) {
      q = q.eq(`${extTable}.${f.field}`, f.value);
    }
  }

  const { data, count, error } = await q;
  if (error) {
    console.error("[collections] hydrate failed for", c.id, error.message);
    return { collection: c, items: [], total: 0 };
  }
  return { collection: c, items: (data ?? []) as HydratedItem[], total: count ?? 0 };
}

/* ─── Mappers (item → carousel format) ────────────────────── */

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

const PORTRAIT_CATEGORIES = new Set(["movies", "series", "books"]);

export function isPortraitCollection(c: CollectionRow): boolean {
  if (!c.source_category) return false;
  return PORTRAIT_CATEGORIES.has(c.source_category);
}

export function toPortraitItem(item: HydratedItem): PortraitItem {
  const tags: string[] = (item.metadata as any)?.tags ?? [];
  return {
    id: item.id,
    title: item.title,
    cover_url: safeImageUrl(item.cover_url),
    genre: tags[0],
    avg_rating: item.avg_rating,
    href: `/${item.category}/${stripPrefix(item.slug)}`,
  };
}

export function toLandscapeItem(item: HydratedItem): LandscapeItem {
  const tags: string[] = (item.metadata as any)?.tags ?? [];
  // Pick the first suggestion that has a user attached. Most items
  // have exactly one original suggestion; this is defensive against
  // edge-case rows where the FK has been cleared.
  const firstUser = item.suggestions?.find((s) => s?.users?.id)?.users ?? null;
  const suggester = firstUser
    ? {
        id: firstUser.id,
        handle: firstUser.handle,
        display_name: firstUser.display_name,
        avatar_url: firstUser.avatar_url,
        level: firstUser.level ?? undefined,
        suggestion_count: firstUser.suggestion_count ?? undefined,
        avg_quality_score: firstUser.avg_quality_score ?? undefined,
      }
    : null;
  return {
    id: item.id,
    title: item.title,
    cover_url: safeImageUrl(item.cover_url),
    subtitle: tags[0],
    avg_rating: item.avg_rating,
    rating_count: item.rating_count,
    is_top_rated: item.avg_rating >= 4.5 && item.rating_count >= 5,
    href: `/${item.category}/${stripPrefix(item.slug)}`,
    avatar_url: suggester?.avatar_url ?? null,
    suggester,
  };
}
