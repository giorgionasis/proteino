/**
 * "More from this {axis}" — admin-configurable related sections for
 * item detail pages.
 *
 * Reads active rules from related_sections_config for the item's
 * category, looks up the current item's value for each rule's field,
 * and queries siblings that share it. Sections with fewer than
 * `min_items` siblings (after excluding the current item) are dropped.
 *
 * Field syntax:
 *   - "writer"          → ext.writer
 *   - "director"        → ext.director
 *   - "actors[0].name"  → ext.actors[0]?.name
 *   - "performers[0]"   → ext.performers[0]              (string array)
 *
 * Title template interpolates `{value}` so admin can write a single
 * Greek phrase like "Άλλες ταινίες από {value}" that renders as
 * "Άλλες ταινίες από Christopher Nolan" per item.
 */

import { safeImageUrl } from "@/lib/image-url";
import type { CategorySlug } from "@/types";

type SupabaseLike = {
  from: (table: string) => any;
};

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

export interface RelatedSection {
  ruleId: string;
  title: string;
  items: RelatedItem[];
}

export interface RelatedItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover_url: string | null;
  avg_rating: number;
  rating_count: number;
}

interface RuleRow {
  id: string;
  category: string;
  field: string;
  title_template: string;
  min_items: number;
  item_limit: number;
  display_order: number;
  is_active: boolean;
  /** Set only for `_nearby_radius_` rules. NULL for value-match rules. */
  radius_km?: number | null;
}

/** Special field tokens that don't follow the value-match pattern.
 *  Resolver branches on these before the regular parseFieldPath path. */
const NEARBY_FIELD = "_nearby_radius_";

interface FetchInput {
  /** Item's UUID — excluded from sibling results. */
  itemId: string;
  /** Slug-prefixed or unprefixed; siblings need the prefix-stripped form to build hrefs. */
  category: CategorySlug;
  /** The category-specific extension row (item_<category>) for the current item. */
  extension: Record<string, unknown>;
}

/**
 * Resolve all active related-section rules for an item and return the
 * sections that have ≥ min_items siblings. Result preserves
 * display_order. Sections with no usable value or insufficient siblings
 * are silently dropped — admin sees an empty list, user never sees an
 * empty section.
 */
export async function fetchRelatedSections(
  sb: SupabaseLike,
  input: FetchInput,
): Promise<RelatedSection[]> {
  const { itemId, category, extension } = input;
  const extTable = EXT_TABLES[category];
  if (!extTable) return [];

  // Pull all active rules for this category, ordered. `radius_km` is
  // only set for nearby-radius rules (added by migration 038). Older
  // environments without the column fall through to the value-match
  // path because radius_km is just undefined on those rows.
  const { data: rules, error } = await sb
    .from("related_sections_config")
    .select("id, category, field, title_template, min_items, item_limit, display_order, is_active, radius_km")
    .eq("category", category)
    .eq("is_active", true)
    .order("display_order");
  if (error || !rules || rules.length === 0) return [];

  // For each rule, extract the current item's value + fetch siblings.
  const sections = await Promise.all(
    (rules as RuleRow[]).map((rule) => buildSection(sb, extTable, itemId, category, extension, rule))
  );

  return sections.filter((s): s is RelatedSection => s !== null);
}

/* ─── Section builder ───────────────────────────────────────────── */

async function buildSection(
  sb: SupabaseLike,
  extTable: string,
  itemId: string,
  category: CategorySlug,
  extension: Record<string, unknown>,
  rule: RuleRow,
): Promise<RelatedSection | null> {
  // Special "nearby venues by lat/lng" branch — doesn't follow the
  // value-match pattern; uses Haversine distance from the current
  // item's coordinates. Only meaningful for venue categories (food/
  // bars/hotels/theater/events) which carry lat/lng on the extension.
  if (rule.field === NEARBY_FIELD) {
    const lat = numericOrNull(extension.lat);
    const lng = numericOrNull(extension.lng);
    if (lat === null || lng === null) return null;
    const radiusKm = typeof rule.radius_km === "number" && rule.radius_km > 0 ? rule.radius_km : 1.0;
    const items = await fetchNearby(sb, extTable, itemId, category, lat, lng, radiusKm, rule.item_limit);
    if (items.length < rule.min_items) return null;
    return {
      ruleId: rule.id,
      title: rule.title_template.replaceAll("{km}", `${radiusKm}`),
      items,
    };
  }

  const parsed = parseFieldPath(rule.field);
  if (!parsed) return null;

  const value = extractValue(extension, parsed);
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;

  // Build the sibling query. For scalar columns: `eq(table.field, value)`.
  // For JSON paths: join items + ext, filter by `ext.field`
  // (Postgres can handle JSON path equality via `->>`, but Supabase JS
  // doesn't expose that nicely — we use a raw filter expression).
  const items = await fetchSiblings(sb, extTable, itemId, category, parsed, value, rule.item_limit);

  if (items.length < rule.min_items) return null;

  return {
    ruleId: rule.id,
    title: rule.title_template.replaceAll("{value}", value),
    items,
  };
}

function numericOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/* ─── Field path parser ─────────────────────────────────────────── */

type FieldPath =
  | { kind: "scalar"; column: string }
  | { kind: "array_index"; column: string; index: number }
  | { kind: "array_index_key"; column: string; index: number; key: string };

function parseFieldPath(raw: string): FieldPath | null {
  const path = raw.trim();
  if (!path) return null;

  // Scalar: just a column name (no [ or .)
  if (!path.includes("[") && !path.includes(".")) {
    return { kind: "scalar", column: path };
  }

  // array_index: `name[0]`
  // array_index_key: `name[0].key`
  const m = path.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\](?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/);
  if (!m) return null;
  const [, column, idxStr, key] = m;
  const index = Number.parseInt(idxStr, 10);
  if (Number.isNaN(index)) return null;
  if (key) return { kind: "array_index_key", column, index, key };
  return { kind: "array_index", column, index };
}

/* ─── Value extractor (from current item's extension row) ──────── */

function extractValue(ext: Record<string, unknown>, path: FieldPath): unknown {
  switch (path.kind) {
    case "scalar":
      return ext[path.column];

    case "array_index": {
      const arr = ext[path.column];
      if (!Array.isArray(arr)) return null;
      return arr[path.index] ?? null;
    }

    case "array_index_key": {
      const arr = ext[path.column];
      if (!Array.isArray(arr)) return null;
      const el = arr[path.index];
      if (!el || typeof el !== "object") return null;
      return (el as Record<string, unknown>)[path.key] ?? null;
    }
  }
}

/* ─── Sibling query ─────────────────────────────────────────────── */

async function fetchSiblings(
  sb: SupabaseLike,
  extTable: string,
  itemId: string,
  category: CategorySlug,
  path: FieldPath,
  value: string,
  limit: number,
): Promise<RelatedItem[]> {
  // Items query joined with the extension table — the extension is the
  // axis we're filtering on. `!inner` so items without an extension row
  // never leak into the result.
  const select = `id, title, slug, category, cover_url, avg_rating, rating_count, ${extTable}!inner()`;

  let q: any = sb
    .from("items")
    .select(select)
    .eq("category", category)
    .eq("is_published", true)
    .neq("id", itemId)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  switch (path.kind) {
    case "scalar":
      q = q.eq(`${extTable}.${path.column}`, value);
      break;

    case "array_index":
      // PostgREST jsonb path equality: column->>index = value
      // (no native operator; this works because Postgres jsonb path
      // operators are exposed through ->-style notation in the URL)
      q = q.filter(`${extTable}.${path.column}->>${path.index}`, "eq", value);
      break;

    case "array_index_key":
      // column->index->>key = value
      q = q.filter(`${extTable}.${path.column}->${path.index}->>${path.key}`, "eq", value);
      break;
  }

  const { data, error } = await q;
  if (error) {
    console.error(`[related-sections] siblings query failed for ${path.kind} ${value}:`, error.message);
    return [];
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: stripPrefix(r.slug),
    category: r.category,
    cover_url: safeImageUrl(r.cover_url),
    avg_rating: r.avg_rating ?? 0,
    rating_count: r.rating_count ?? 0,
  }));
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

/* ─── Nearby (lat/lng + radius) sibling query ──────────────────── */

/** Earth radius in km. Haversine formula's constant. */
const EARTH_RADIUS_KM = 6371;

/** Approximate km per degree of latitude (constant). Longitude
 *  shrinks with latitude — we adjust by cos(lat) for the bounding
 *  box. For Greek lat ≈ 38° the per-degree distance is ~88km lng. */
const KM_PER_DEG_LAT = 111.32;

/**
 * Find venues within `radiusKm` of (lat, lng), same category, sorted
 * by ascending distance. Excludes the current item.
 *
 * Two-step query for efficiency:
 *   1. Bounding-box SQL filter (cheap, indexable) — drops the obvious
 *      far-away rows without computing distances. Box is intentionally
 *      generous (1.2× radius) so edge cases aren't missed by the
 *      sin/cos approximation.
 *   2. Exact Haversine distance in JS — sorts the candidates and
 *      cuts to limit. With <800 venues in a city the JS side is
 *      microsecond-scale.
 *
 * No PostGIS dependency. Works on stock Supabase Postgres.
 */
async function fetchNearby(
  sb: SupabaseLike,
  extTable: string,
  itemId: string,
  category: CategorySlug,
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): Promise<RelatedItem[]> {
  const latDelta = (radiusKm * 1.2) / KM_PER_DEG_LAT;
  const lngDelta = (radiusKm * 1.2) / (KM_PER_DEG_LAT * Math.cos(toRad(lat)));

  // Pull candidates within the bounding box. The select aliases the
  // ext table so we can read lat/lng off the joined row.
  const select = `id, title, slug, category, cover_url, avg_rating, rating_count, ${extTable}!inner(lat, lng)`;
  const { data, error } = await sb
    .from("items")
    .select(select)
    .eq("category", category)
    .eq("is_published", true)
    .neq("id", itemId)
    .gte(`${extTable}.lat`, lat - latDelta)
    .lte(`${extTable}.lat`, lat + latDelta)
    .gte(`${extTable}.lng`, lng - lngDelta)
    .lte(`${extTable}.lng`, lng + lngDelta)
    .limit(200);
  if (error) {
    console.error("[related-sections] nearby query failed:", error.message);
    return [];
  }

  // Compute exact distance for each candidate, filter to radius, sort.
  type Row = {
    id: string; title: string; slug: string; category: string;
    cover_url: string | null; avg_rating: number | null; rating_count: number | null;
    [key: string]: any;
  };
  type Scored = { raw: Row; distance: number };
  const rows: Row[] = (data ?? []) as Row[];
  const scored: Scored[] = rows
    .map((raw: Row): Scored | null => {
      const extJoin = raw[extTable];
      const ext = Array.isArray(extJoin) ? extJoin[0] : extJoin;
      const elat = numericOrNull(ext?.lat);
      const elng = numericOrNull(ext?.lng);
      if (elat === null || elng === null) return null;
      const distance = haversineKm(lat, lng, elat, elng);
      if (distance > radiusKm) return null;
      return { raw, distance };
    })
    .filter((x: Scored | null): x is Scored => x !== null)
    .sort((a: Scored, b: Scored) => a.distance - b.distance)
    .slice(0, limit);

  return scored.map(({ raw }) => ({
    id: raw.id,
    title: raw.title,
    slug: stripPrefix(raw.slug),
    category: raw.category,
    cover_url: safeImageUrl(raw.cover_url),
    avg_rating: raw.avg_rating ?? 0,
    rating_count: raw.rating_count ?? 0,
  }));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
