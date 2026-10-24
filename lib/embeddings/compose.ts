/**
 * Compose embedding input text per category. Each function takes the
 * base item + its extension row and returns a single string optimised
 * for semantic similarity via text-embedding-3-small.
 *
 * Design: include every field that helps distinguish "what this item
 * IS" — title, plot/description, genre, cast, origin. Exclude noisy
 * fields (ratings, admin notes).
 *
 * Exception: the first member reflection is appended (truncated). Most
 * migrated K2 items — venues especially — have no description other
 * than the suggester's text, so without it their vectors are just
 * "title · address".
 */

interface BaseItem {
  title: string;
  original_title?: string | null;
  description_seo?: string | null;
  category: string;
}

function clean(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

function jsonbNames(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : x?.name ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

export function composeMoviesText(
  item: BaseItem,
  ext: {
    plot?: string | null;
    director?: string | null;
    actors?: unknown;
    country?: string | null;
    language?: string | null;
  },
): string {
  return clean([
    item.title,
    item.original_title,
    ext.plot,
    ext.director ? `Σκηνοθεσία: ${ext.director}` : null,
    jsonbNames(ext.actors) || null,
    ext.country,
    ext.language,
    item.description_seo,
  ]);
}

export function composeSeriesText(
  item: BaseItem,
  ext: {
    plot?: string | null;
    director?: string | null;
    actors?: unknown;
    country?: string | null;
    language?: string | null;
    seasons?: number | null;
  },
): string {
  return clean([
    item.title,
    item.original_title,
    ext.plot,
    ext.director ? `Σκηνοθεσία: ${ext.director}` : null,
    jsonbNames(ext.actors) || null,
    ext.country,
    ext.language,
    ext.seasons ? `${ext.seasons} σεζόν` : null,
    item.description_seo,
  ]);
}

export function composeBooksText(
  item: BaseItem,
  ext: {
    writer?: string | null;
    plot?: string | null;
    language?: string | null;
    publication?: string | null;
  },
): string {
  return clean([
    item.title,
    item.original_title,
    ext.writer ? `Συγγραφέας: ${ext.writer}` : null,
    ext.plot,
    ext.publication,
    ext.language,
    item.description_seo,
  ]);
}

export function composeFoodText(
  item: BaseItem,
  ext: {
    cuisine?: string | null;
    type?: string | null;
    address?: string | null;
    information?: unknown;
  },
): string {
  return clean([
    item.title,
    ext.cuisine,
    ext.type,
    ext.address,
    item.description_seo,
  ]);
}

export function composeRecipesText(
  item: BaseItem,
  ext: {
    ingredients?: unknown;
    origin?: string | null;
    level?: string | null;
  },
): string {
  const ingredientNames = Array.isArray(ext.ingredients)
    ? ext.ingredients
        .map((i: any) => i?.name ?? "")
        .filter(Boolean)
        .join(", ")
    : "";
  return clean([
    item.title,
    ingredientNames || null,
    ext.origin,
    ext.level,
    item.description_seo,
  ]);
}

export function composeBarsText(
  item: BaseItem,
  ext: {
    type?: string | null;
    address?: string | null;
  },
): string {
  return clean([item.title, ext.type, ext.address, item.description_seo]);
}

export function composeHotelsText(
  item: BaseItem,
  ext: {
    type?: string | null;
    address?: string | null;
    price_range?: string | null;
    facilities?: unknown;
  },
): string {
  const facilityList = Array.isArray(ext.facilities)
    ? ext.facilities.filter((f): f is string => typeof f === "string").join(", ")
    : "";
  return clean([
    item.title,
    ext.type,
    ext.address,
    ext.price_range,
    facilityList || null,
    item.description_seo,
  ]);
}

export function composeTheaterText(
  item: BaseItem,
  ext: {
    type?: string | null;
    writer?: string | null;
    director?: string | null;
    actors?: unknown;
    name_place?: string | null;
  },
): string {
  return clean([
    item.title,
    ext.type,
    ext.writer ? `Συγγραφέας: ${ext.writer}` : null,
    ext.director ? `Σκηνοθεσία: ${ext.director}` : null,
    jsonbNames(ext.actors) || null,
    ext.name_place,
    item.description_seo,
  ]);
}

export function composeEventsText(
  item: BaseItem,
  ext: {
    event_type?: string | null;
    performers?: unknown;
    name_place?: string | null;
  },
): string {
  return clean([
    item.title,
    ext.event_type,
    jsonbNames(ext.performers) || null,
    ext.name_place,
    item.description_seo,
  ]);
}

const COMPOSERS: Record<string, (item: BaseItem, ext: any) => string> = {
  movies: composeMoviesText,
  series: composeSeriesText,
  books: composeBooksText,
  food: composeFoodText,
  recipes: composeRecipesText,
  bars: composeBarsText,
  hotels: composeHotelsText,
  theater: composeTheaterText,
  events: composeEventsText,
};

const REFLECTION_MAX_CHARS = 1200;

export interface EmbeddingExtras {
  /** Item tags (items.metadata.tags). */
  tags?: string[] | null;
  /** First published member reflection on the item. */
  reflection?: string | null;
}

export function composeEmbeddingText(
  item: BaseItem,
  ext: Record<string, unknown> | null,
  extras: EmbeddingExtras = {},
): string {
  const fn = COMPOSERS[item.category];
  const base = fn ? fn(item, ext ?? {}) : clean([item.title, item.description_seo]);

  const tags = (extras.tags ?? []).filter((t) => typeof t === "string" && t.trim()).join(", ");
  let reflection = (extras.reflection ?? "").replace(/\s+/g, " ").trim();
  // K2 copied many reflections verbatim into the plot — don't double them.
  if (reflection && base.includes(reflection.slice(0, 80))) reflection = "";
  if (reflection.length > REFLECTION_MAX_CHARS) reflection = reflection.slice(0, REFLECTION_MAX_CHARS);

  return clean([base, tags || null, reflection || null]);
}
