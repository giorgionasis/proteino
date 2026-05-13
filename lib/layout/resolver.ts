/**
 * Layout resolver — server-side.
 *
 * Reads page_sections for a given page, filters by audience + lifecycle,
 * hydrates collection rows (fetches matching items), and returns an
 * ordered RenderedSection[] for the page shell to map to JSX.
 *
 * Hydration of collection rows mirrors the logic in lib/collections.ts
 * but is inlined here so we can do a single JOIN-style query + parallel
 * hydration without the n+1 of calling fetchCategoryCollections per row.
 */

import { safeImageUrl } from "@/lib/image-url";
import type { HydratedItem } from "@/lib/collections";
import type {
  LayoutAudience,
  LayoutContext,
  PageSectionRow,
  RenderedSection,
  ResolvedCollection,
} from "./types";

type SupabaseLike = {
  from: (table: string) => any;
};

interface ResolveOpts {
  context: LayoutContext;
  category: string | null;
  /**
   * Audience to render for.
   *   - 'registered' → rows where audience IN ('all','registered')
   *   - 'guest'      → rows where audience IN ('all','guest')
   *   - null         → admin "show all" preview (no audience filter; visible
   *                    rows still respect is_active + lifecycle)
   */
  viewerAudience: "registered" | "guest" | null;
  /**
   * When false (default), inactive rows are excluded. Admin layout
   * editor passes `true` so it can list inactive sections too.
   */
  includeInactive?: boolean;
}

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

/* ─── Public ───────────────────────────────────────────────────────── */

/**
 * Resolve the ordered section stack for a page. The returned list is
 * what the page shell maps to JSX — each entry already knows what it
 * is (collection / widget / divider) and carries its own payload.
 */
export async function resolvePageLayout(
  sb: SupabaseLike,
  opts: ResolveOpts,
): Promise<RenderedSection[]> {
  const { context, category, viewerAudience, includeInactive = false } = opts;
  const now = new Date().toISOString();

  // Single query: fetch every section for the bucket plus the linked
  // collection row when present. category IS NULL must match home rows
  // (PostgREST uses `.is('category', null)` for that).
  let q = sb
    .from("page_sections")
    .select(
      "id, section_type, collection_id, widget_key, context, category, display_order, audience, config, is_active, valid_from, valid_until, created_at, modified_at, collection:collections(id, type, title, title_specific, alias, image_url, source_category, tags, filters, item_limit, is_published)"
    )
    .eq("context", context)
    .order("display_order");

  if (category === null) q = q.is("category", null);
  else q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    console.error("[layout/resolver] fetch failed:", error.message);
    return [];
  }

  // Row-level filtering (cheaper to do in JS than to compose 4 more
  // .or() clauses; row count is bounded ~30 per bucket).
  const rows = (data ?? []).filter((r: PageSectionRow) => {
    if (!includeInactive && !r.is_active) return false;
    if (r.valid_from  && r.valid_from  > now) return false;
    if (r.valid_until && r.valid_until < now) return false;
    if (viewerAudience !== null) {
      if (r.audience !== "all" && r.audience !== viewerAudience) return false;
    }
    // Drop collection rows whose collection is unpublished or deleted.
    if (r.section_type === "collection") {
      const c = (r as any).collection as { is_published?: boolean } | null | undefined;
      if (!c || c.is_published === false) return false;
    }
    return true;
  }) as (PageSectionRow & { collection?: ResolvedCollectionFull | null })[];

  // Hydrate collection rows in parallel. Widget + divider rows pass
  // through. Empty collections are dropped so the consumer never sees
  // a "[Carousel]" with 0 items.
  const sections = await Promise.all(
    rows.map(async (row): Promise<RenderedSection | null> => {
      if (row.section_type === "widget") {
        const config = (row.config ?? {}) as Record<string, unknown>;

        // Widget with a manual item source override (today: `static_carousel`
        // with `config.itemIds`). When present we hydrate the items here
        // server-side so the bridges render them directly instead of slicing
        // a pre-fetched bucket.
        let items: HydratedItem[] | undefined;
        const itemIds = config.itemIds;
        if (
          row.widget_key === "static_carousel" &&
          Array.isArray(itemIds) &&
          itemIds.length > 0
        ) {
          const ids = (itemIds as unknown[]).filter(
            (x): x is string => typeof x === "string" && x.length > 0,
          );
          if (ids.length > 0) {
            items = await hydrateManualItems(sb, ids);
            if (items.length === 0) items = undefined; // bridge falls back to auto
          }
        }

        return {
          kind: "widget",
          row,
          widgetKey: row.widget_key ?? "",
          config,
          ...(items ? { items } : {}),
        };
      }
      if (row.section_type === "divider") {
        return {
          kind: "divider",
          row,
          config: (row.config ?? {}) as Record<string, unknown>,
        };
      }
      // section_type === 'collection'
      const c = row.collection;
      if (!c) return null;
      const items = await hydrateCollectionItems(sb, c);
      if (items.length === 0) return null;
      return {
        kind: "collection",
        row,
        collection: {
          id: c.id,
          type: c.type,
          title: c.title,
          title_specific: c.title_specific,
          alias: c.alias,
          image_url: safeImageUrl(c.image_url),
          source_category: c.source_category,
          tags: c.tags ?? [],
          filters: c.filters ?? [],
          item_limit: c.item_limit ?? 20,
        },
        items,
      };
    })
  );

  return sections.filter((s): s is RenderedSection => s !== null);
}

/* ─── Collection hydration (inlined; mirrors lib/collections.ts) ───── */

interface ResolvedCollectionFull extends ResolvedCollection {
  is_published?: boolean;
}

async function hydrateCollectionItems(
  sb: SupabaseLike,
  c: ResolvedCollectionFull,
): Promise<HydratedItem[]> {
  const extFilters = (Array.isArray(c.filters) ? c.filters : []).filter(
    (f: any): f is { field: string; value: string } =>
      f && typeof f.field === "string" && typeof f.value === "string"
  );
  const extTable = c.source_category ? EXT_TABLES[c.source_category] : undefined;
  const useExtJoin = extFilters.length > 0 && !!extTable;

  // Same suggester-join shape as lib/collections.ts so the
  // Landscape/Portrait carousels render their avatar overlay correctly.
  const suggesterJoin =
    "suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))";
  const baseSelect = `id, title, slug, cover_url, category, avg_rating, rating_count, metadata, ${suggesterJoin}`;
  const select = useExtJoin ? `${baseSelect}, ${extTable}!inner()` : baseSelect;

  let q: any = sb
    .from("items")
    .select(select)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(Math.min(Math.max(c.item_limit ?? 20, 1), 100));

  if (c.source_category) q = q.eq("category", c.source_category);

  const tags = Array.isArray(c.tags)
    ? c.tags.filter((t) => typeof t === "string" && t.trim().length > 0)
    : [];
  if (tags.length > 0) q = q.contains("metadata->tags", tags);

  if (useExtJoin) {
    for (const f of extFilters) q = q.eq(`${extTable}.${f.field}`, f.value);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[layout/resolver] hydrate failed for collection", c.id, error.message);
    return [];
  }
  return (data ?? []) as HydratedItem[];
}

/* ─── Manual item hydration ────────────────────────────────────────────
 *  Used when an admin pins a specific ordered set of items to a widget
 *  (e.g. `static_carousel` with `config.itemIds`). Returns the items in
 *  the exact order requested so the admin's hand-curation is preserved.
 *  Unpublished + missing IDs are silently dropped. Hard-capped at 30. */

async function hydrateManualItems(
  sb: SupabaseLike,
  ids: string[],
): Promise<HydratedItem[]> {
  const capped = ids.slice(0, 30);
  if (capped.length === 0) return [];

  const suggesterJoin =
    "suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))";

  const { data, error } = await (sb.from("items") as any)
    .select(
      `id, title, slug, cover_url, category, avg_rating, rating_count, metadata, ${suggesterJoin}`,
    )
    .in("id", capped)
    .eq("is_published", true);

  if (error) {
    console.error("[layout/resolver] hydrateManualItems failed:", error.message);
    return [];
  }

  // Re-order to match the admin's `ids` order. Postgres returns items in
  // arbitrary order on `.in(...)`; this restores the curation.
  const byId = new Map<string, HydratedItem>(
    (data ?? []).map((it: HydratedItem) => [it.id, it]),
  );
  const ordered: HydratedItem[] = [];
  for (const id of capped) {
    const it = byId.get(id);
    if (it) ordered.push(it);
  }
  return ordered;
}

/* ─── Static carousel source resolution ────────────────────────────────
 *  Used by the widget bridge when rendering a `static_carousel` row.
 *  Doesn't go through the collection hydration path because no admin-
 *  curated tags/filters are involved — pure "newest N of category X"
 *  style queries.                                                       */

interface StaticCarouselQuery {
  source: "top_rated" | "newest" | "most_bookmarked" | "most_reviewed";
  category: string;
  offset: number;
  limit: number;
}

export async function fetchStaticCarousel(
  sb: SupabaseLike,
  q: StaticCarouselQuery,
): Promise<HydratedItem[]> {
  let qb = sb
    .from("items")
    .select(
      `id, title, slug, cover_url, category, avg_rating, rating_count, metadata, suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))`
    )
    .eq("is_published", true)
    .eq("category", q.category)
    .range(q.offset, q.offset + q.limit - 1);

  switch (q.source) {
    case "top_rated":
      qb = qb.order("avg_rating", { ascending: false });
      break;
    case "newest":
      qb = qb.order("created_at", { ascending: false });
      break;
    case "most_bookmarked":
      // Best-effort — no denormalised count, so fall back to rating_count
      // as a proxy until a future cron column lands.
      qb = qb.order("rating_count", { ascending: false });
      break;
    case "most_reviewed":
      qb = qb.order("rating_count", { ascending: false });
      break;
  }

  const { data, error } = await qb;
  if (error) {
    console.error("[layout/resolver] fetchStaticCarousel failed:", error.message);
    return [];
  }
  return (data ?? []) as HydratedItem[];
}
