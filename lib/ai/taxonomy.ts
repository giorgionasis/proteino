import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Taxonomy snapshot — canonical values from the DB that we inject into
 * Gemini system prompts so its structured output uses exact DB
 * vocabulary (no "meze restaurant" when the field is "Μεζεδοπωλείο").
 *
 * Fetched on first call, cached in module memory for 5 minutes. The
 * underlying tables don't change often (admin edits subcategories or
 * regions a few times a week at most), so a 5-minute TTL is fine.
 *
 * What's NOT included intentionally:
 *   - Sub-region neighborhood names (60+ values; address-text fallback
 *     in /api/search handles these via foldGreek substring match)
 *   - Niche extra fields (level, diet, awards categories — too narrow
 *     to bias Gemini toward; we let it freeform these)
 */

export interface Taxonomy {
  categories: string[];
  /** Genres / types / cuisines per category, from DB. */
  subcategoriesByCategory: Record<string, string[]>;
  /** Distinct cuisine values (food only). */
  cuisines: string[];
  /** Distinct type values across venue categories. */
  typesByCategory: Record<string, string[]>;
  /** Top-level regions only — sub-region neighborhood names not included
   *  (those are caught by address text fallback). */
  topRegions: string[];
  /** Amenity option keys for food / bars / hotels, sourced from the
   *  public `category_filters` rows admin maintains at
   *  `/admin/content/filters` (migration 044). Empty record when the
   *  migration isn't applied. */
  amenitiesByCategory: Record<string, string[]>;
}

const TTL_MS = 5 * 60 * 1000;
let cached: Taxonomy | null = null;
let lastFetch = 0;

const CATEGORIES = [
  "movies", "series", "books", "food", "recipes", "bars", "hotels", "theater", "events",
] as const;

async function fetchDistinct(sb: any, table: string, column: string): Promise<string[]> {
  try {
    const { data } = await (sb.from(table) as any)
      .select(column)
      .not(column, "is", null)
      .limit(2000);
    if (!Array.isArray(data)) return [];
    const set = new Set<string>();
    for (const row of data) {
      const v = row?.[column];
      if (typeof v === "string" && v.trim().length > 0) set.add(v.trim());
    }
    return Array.from(set).sort();
  } catch {
    return [];
  }
}

export async function getTaxonomy(force = false): Promise<Taxonomy> {
  if (!force && cached && Date.now() - lastFetch < TTL_MS) return cached;

  const sb = createAdminClient();

  // Subcategories per category
  const { data: subcatRows } = await (sb.from("subcategories") as any)
    .select("category, name")
    .eq("is_published", true)
    .order("display_order");

  const subcategoriesByCategory: Record<string, string[]> = {};
  for (const c of CATEGORIES) subcategoriesByCategory[c] = [];
  for (const row of (subcatRows ?? []) as Array<{ category: string; name: string }>) {
    if (subcategoriesByCategory[row.category]) {
      subcategoriesByCategory[row.category].push(row.name);
    }
  }

  // Top-level regions (parent_id IS NULL — Αττική, Κρήτη, Κυκλάδες, ...)
  const { data: regionRows } = await (sb.from("regions") as any)
    .select("name, parent_id")
    .order("display_order");
  const topRegions = ((regionRows ?? []) as Array<{ name: string; parent_id: string | null }>)
    .filter((r) => r.parent_id === null)
    .map((r) => r.name);

  // Distinct cuisines (food only)
  const cuisines = await fetchDistinct(sb, "item_food", "cuisine");

  // Distinct type values per venue category
  const typesByCategory: Record<string, string[]> = {};
  for (const c of ["food", "bars", "hotels", "theater"] as const) {
    typesByCategory[c] = await fetchDistinct(sb, `item_${c}`, "type");
  }
  typesByCategory.events = await fetchDistinct(sb, "item_events", "event_type");

  // Amenity vocabulary per venue category — sourced from migration 044
  // (`category_filters` rows where filter_id='amenities'). Admin edits
  // at `/admin/content/filters` flow through here within the 5-min
  // taxonomy cache TTL.
  //
  // Each row's `options` jsonb is an array of `{id, label}`; the `id`
  // values are the canonical snake_case keys we want Gemini to emit.
  const amenitiesByCategory: Record<string, string[]> = {};
  try {
    const { data: amenityRows } = await (sb.from("category_filters") as any)
      .select("category, options")
      .eq("filter_id", "amenities")
      .eq("is_published", true)
      .in("category", ["food", "bars", "hotels"]);
    for (const row of (amenityRows ?? []) as Array<{ category: string; options: unknown }>) {
      const opts = Array.isArray(row.options) ? row.options : [];
      const keys: string[] = [];
      for (const opt of opts) {
        if (opt && typeof opt === "object") {
          const id = (opt as any).id;
          if (typeof id === "string" && id.trim().length > 0) keys.push(id.trim());
        }
      }
      if (keys.length > 0) amenitiesByCategory[row.category] = keys;
    }
  } catch {
    // Migration not applied / table missing — leave empty. The prompt
    // section is skipped per-category when its key list is empty, so
    // Gemini just won't extract amenities until admin lands 044.
  }

  cached = {
    categories: CATEGORIES.slice(),
    subcategoriesByCategory,
    cuisines,
    typesByCategory,
    topRegions,
    amenitiesByCategory,
  };
  lastFetch = Date.now();
  return cached;
}

/**
 * Render a taxonomy block to inject into a Gemini system prompt.
 * Compact format — list values comma-separated to minimize tokens.
 *
 * Approx token count for a fully-populated DB: ~700-900 input tokens
 * once. Gemini's implicit caching keeps the cost ~negligible after
 * the first few calls warm up the prefix.
 */
export function renderTaxonomyForPrompt(t: Taxonomy): string {
  const lines: string[] = [];
  lines.push("KANONIKES ΤΙΜΈΣ ΤΗΣ ΒΆΣΗΣ — χρησιμοποίησε ΑΥΤΈΣ τις ακριβείς τιμές όπου ταιριάζουν:");
  lines.push("");
  lines.push(`Categories: ${t.categories.join(", ")}`);
  lines.push("");

  // Subcategories per category — only render non-empty lines
  const subLines: string[] = [];
  for (const [cat, subs] of Object.entries(t.subcategoriesByCategory)) {
    if (subs.length > 0) subLines.push(`  ${cat}: ${subs.join(", ")}`);
  }
  if (subLines.length > 0) {
    lines.push("Subcategories (genre/type/cuisine per category):");
    lines.push(...subLines);
    lines.push("");
  }

  // Cuisines (food)
  if (t.cuisines.length > 0) {
    lines.push(`Cuisine values (food.cuisine): ${t.cuisines.slice(0, 30).join(", ")}`);
    lines.push("");
  }

  // Types per venue category
  const typeLines: string[] = [];
  for (const [cat, types] of Object.entries(t.typesByCategory)) {
    if (types.length > 0) typeLines.push(`  ${cat}: ${types.slice(0, 20).join(", ")}`);
  }
  if (typeLines.length > 0) {
    lines.push("Type values per venue:");
    lines.push(...typeLines);
    lines.push("");
  }

  // Top regions
  if (t.topRegions.length > 0) {
    lines.push(`Top-level regions (parent regions): ${t.topRegions.join(", ")}`);
    lines.push("(Σημείωση: για συγκεκριμένες γειτονιές όπως Χαλάνδρι, Παγκράτι, Γκάζι, χρησιμοποίησε το όνομα της γειτονιάς όπως είναι.)");
    lines.push("");
  }

  // Amenity vocabulary — canonical snake_case keys for the `amenities`
  // array. Sourced from `category_filters.options` (migration 044) via
  // getTaxonomy; admin edits at `/admin/content/filters` propagate
  // within the 5-min cache TTL with no code change.
  //
  // Diet vocabulary mirrors lib/category-filters/match.ts:normalizeDietFlags
  // — kept hardcoded because it isn't backed by a category_filters row
  // (recipes' diet filter has its own widget).
  const amenityLines: string[] = [];
  for (const cat of ["food", "bars", "hotels"] as const) {
    const keys = t.amenitiesByCategory[cat];
    if (keys && keys.length > 0) {
      amenityLines.push(`  ${cat}: ${keys.join(", ")}`);
    }
  }
  if (amenityLines.length > 0) {
    lines.push("AMENITY VOCABULARY — χρησιμοποίησε τα παρακάτω ακριβή keys στο amenities array:");
    lines.push(...amenityLines);
    lines.push("");
  }

  lines.push("DIET VOCABULARY (recipes) — χρησιμοποίησε αυτά τα ακριβή keys στο diet array: vegan, no_milk, no_sugar");
  lines.push("");

  return lines.join("\n");
}
