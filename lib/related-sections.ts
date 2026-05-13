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
}

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

  // Pull all active rules for this category, ordered.
  const { data: rules, error } = await sb
    .from("related_sections_config")
    .select("id, category, field, title_template, min_items, item_limit, display_order, is_active")
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
