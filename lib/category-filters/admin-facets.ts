import type { CategorySlug } from "@/types";

/**
 * Admin-only Explorer facets — surface every filterable column on the
 * category extension tables, including ones not (yet) published as
 * `category_filters` rows on the public side.
 *
 * Why a separate registry: the public surface is driven by
 * `category_filters` (admin can toggle which filters render), and we
 * don't want to silently leak admin-only knobs there. The Explorer is
 * always allowed to combine every facet — that's its whole job.
 *
 * Distinct values for `chips` facets are computed by the Explorer
 * endpoint from the candidate item set, so the chip-strip auto-adapts
 * when new countries / origins / bar types appear in the DB without a
 * code change.
 *
 * Lives in `lib/` so it's importable from both the server route
 * (`app/api/admin/explorer/query/route.ts`) and the client component
 * (`components/admin/CombinatorialExplorer.tsx`).
 */

export type AdminFacetKind =
  | "chips"            // Small fixed enum — render all options as chips (e.g. status, price band)
  | "searchable-chips" // Large open set — typeahead combobox, multi-select. Use when distincts > ~15.
  | "year-range"       // Numeric year bucketed (decade)
  | "range"            // Numeric column bucketed (pages, calories, seasons …)
  | "amenities"        // Multi-select from HOTEL_AMENITY_CHOICES (hotel facilities jsonb)
  | "tag-pattern"      // Match against `metadata.tags` jsonb via regex bucket patterns
  | "boolean"          // Single toggle — when selected, filter to rows where ext[field] is truthy
  | "text";            // Free-text ciIncludes — only when no distincts make sense

export interface AdminFacetBucket {
  id:    string;       // selection key
  label: string;       // chip label
  min?:  number;       // inclusive
  max?:  number;       // inclusive
  /** Only for `tag-pattern` kind — regex patterns (case-insensitive)
   *  matched against any tag on `metadata.tags`. */
  patterns?: string[];
}

export interface AdminFacet {
  id:    string;
  label: string;
  kind:  AdminFacetKind;
  /** Path on the row used to read the value. For `chips` /
   *  `searchable-chips` / `text` / `range` this is the ext column
   *  name. For `year-range` it can name either a year integer column
   *  or a date column — the matcher coerces. For `tag-pattern` the
   *  field is conventionally `"tags"` and matched against `metadata.tags`
   *  (passed through on the row alongside the ext columns). */
  field: string;
  /** Required for `year-range`, `range`, and `tag-pattern`. */
  buckets?: AdminFacetBucket[];
  /** Optional hint surfaced under the picker label. */
  hint?: string;
}

const DECADE_BUCKETS: AdminFacetBucket[] = [
  { id: "lt_1970",  label: "<1970",      max: 1969 },
  { id: "1970s",    label: "1970s",      min: 1970, max: 1979 },
  { id: "1980s",    label: "1980s",      min: 1980, max: 1989 },
  { id: "1990s",    label: "1990s",      min: 1990, max: 1999 },
  { id: "2000s",    label: "2000s",      min: 2000, max: 2009 },
  { id: "2010s",    label: "2010s",      min: 2010, max: 2019 },
  { id: "2020s",    label: "2020s+",     min: 2020 },
];

const SEASONS_BUCKETS: AdminFacetBucket[] = [
  { id: "1",      label: "1 σεζόν",  min: 1, max: 1 },
  { id: "2_3",    label: "2–3",      min: 2, max: 3 },
  { id: "4_6",    label: "4–6",      min: 4, max: 6 },
  { id: "7_plus", label: "7+",       min: 7 },
];

const PAGES_BUCKETS: AdminFacetBucket[] = [
  { id: "lt_200",  label: "<200",     max: 199 },
  { id: "200_400", label: "200–400",  min: 200, max: 400 },
  { id: "400_600", label: "400–600",  min: 400, max: 600 },
  { id: "gt_600",  label: ">600",     min: 601 },
];

const YIELDS_BUCKETS: AdminFacetBucket[] = [
  { id: "1_2",    label: "1–2",   min: 1, max: 2 },
  { id: "3_4",    label: "3–4",   min: 3, max: 4 },
  { id: "5_8",    label: "5–8",   min: 5, max: 8 },
  { id: "9_plus", label: "9+",    min: 9 },
];

const CALORIES_BUCKETS: AdminFacetBucket[] = [
  { id: "lt_300",  label: "<300 kcal",     max: 299 },
  { id: "300_600", label: "300–600",       min: 300, max: 600 },
  { id: "gt_600",  label: ">600",          min: 601 },
];

/** Movie / series characteristics — pattern-matched against
 *  `metadata.tags`. Greek + English alternates per bucket so admin
 *  doesn't have to bet which spelling lives in the data. Keep
 *  patterns case-insensitive (the matcher normalises). */
const MOVIE_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  {
    id:    "based_on_true",
    label: "Βασισμένη σε πραγματικά γεγονότα",
    patterns: ["αληθιν", "πραγματικ", "true.?stor", "true.?event", "based.?on.?true"],
  },
  {
    id:    "sequel",
    label: "Sequel",
    patterns: ["sequel", "συνέχεια"],
  },
  {
    id:    "prequel",
    label: "Prequel",
    patterns: ["prequel"],
  },
  {
    id:    "remake",
    label: "Remake / Reboot",
    patterns: ["remake", "reboot", "ριμέικ"],
  },
  {
    id:    "biographical",
    label: "Βιογραφική",
    patterns: ["βιογραφικ", "biograph", "biopic"],
  },
  {
    id:    "trilogy",
    label: "Trilogy / Franchise",
    patterns: ["trilogy", "τριλογί", "franchise", "saga"],
  },
  {
    id:    "adapted_book",
    label: "Από βιβλίο",
    patterns: ["adapted.?from.?book", "βασισμέν.*βιβλί", "from.?the.?book"],
  },
];

const SERIES_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  ...MOVIE_CHARACTERISTICS_BUCKETS,
  // Series-specific additions could go here in the future
  // (anthology / limited-series / etc.).
];

/** Book characteristics — tag patterns. Trilogy is intentionally
 *  surfaced as a separate `boolean` facet against `is_trilogy` so it
 *  works even when tags are missing. */
const BOOKS_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "bestseller",     label: "Bestseller",            patterns: ["bestseller", "best.?seller", "ευπώλητο"] },
  { id: "classic",        label: "Κλασικό",                patterns: ["κλασσικ", "κλασικ", "classic"] },
  { id: "adapted_film",   label: "Από/σε ταινία",          patterns: ["κινηματογραφ", "από.{0,15}ταινία", "film.?adaptation"] },
  { id: "young_adult",    label: "Young Adult",            patterns: ["young.?adult", "ya\\b", "εφηβ"] },
  { id: "kids",           label: "Παιδικό",                patterns: ["παιδικ", "kids?"] },
  { id: "award_winning",  label: "Βραβευμένο",             patterns: ["βραβευμέν", "βραβ", "award.?winning"] },
];

const RECIPES_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "quick",          label: "Γρήγορη",                patterns: ["γρήγορ", "quick", "express"] },
  { id: "healthy",        label: "Υγιεινή",                patterns: ["υγιειν", "healthy", "light"] },
  { id: "traditional",    label: "Παραδοσιακή",            patterns: ["παραδοσιακ", "traditional"] },
  { id: "party",          label: "Για πάρτυ",              patterns: ["party", "γιορτή", "γιορτιν"] },
  { id: "kids",           label: "Παιδικό μενού",          patterns: ["παιδικ", "kids?"] },
  { id: "comfort",        label: "Comfort food",           patterns: ["comfort", "παρηγορ"] },
];

const FOOD_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "vegan_friendly", label: "Vegan-friendly",         patterns: ["vegan", "βίγκαν", "vegetarian", "χορτοφαγ"] },
  { id: "family",         label: "Οικογενειακό",           patterns: ["οικογενει", "family"] },
  { id: "romantic",       label: "Ρομαντικό",              patterns: ["ρομαντικ", "romantic", "date.?night"] },
  { id: "brunch",         label: "Brunch",                 patterns: ["brunch"] },
  { id: "late_night",     label: "Νυχτερινό",              patterns: ["late.?night", "νυχτεριν", "after.?hours"] },
  { id: "view",           label: "Με θέα",                  patterns: ["θέα", "view"] },
  { id: "terrace",        label: "Βεράντα / Κήπος",        patterns: ["βεράντ", "terrace", "patio", "κήπο"] },
  { id: "byob",           label: "BYOB",                   patterns: ["byob", "φέρε.το.κρασ"] },
];

const BARS_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "rooftop",        label: "Rooftop",                patterns: ["rooftop", "ταράτσ"] },
  { id: "cocktail",       label: "Cocktail",               patterns: ["cocktail"] },
  { id: "wine",           label: "Κρασί / Wine bar",       patterns: ["wine", "κρασ"] },
  { id: "jazz",           label: "Jazz",                   patterns: ["jazz"] },
  { id: "live_music",     label: "Live μουσική",            patterns: ["live.?music", "ζωντανή.?μουσική", "live\\b"] },
  { id: "terrace",        label: "Βεράντα",                patterns: ["βεράντ", "terrace"] },
  { id: "late_night",     label: "Νυχτερινό",              patterns: ["late.?night", "νυχτεριν"] },
  { id: "pet_friendly",   label: "Pet friendly",           patterns: ["pet.?friendly", "κατοικίδιο", "σκύλο"] },
  { id: "speakeasy",      label: "Speakeasy",              patterns: ["speakeasy"] },
];

const HOTELS_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "pet_friendly",   label: "Pet friendly",           patterns: ["pet.?friendly", "κατοικίδιο"] },
  { id: "family",         label: "Οικογενειακό",           patterns: ["οικογενει", "family"] },
  { id: "romantic",       label: "Ρομαντικό / Honeymoon",  patterns: ["ρομαντικ", "romantic", "honeymoon", "γαμήλι"] },
  { id: "business",       label: "Business",               patterns: ["business"] },
  { id: "boutique",       label: "Boutique",               patterns: ["boutique"] },
  { id: "eco",            label: "Eco / Sustainable",      patterns: ["eco", "οικολογικ", "sustainable"] },
  { id: "beachfront",     label: "Beachfront",             patterns: ["beachfront", "παραλία", "θαλάσσ"] },
  { id: "mountain",       label: "Ορεινό",                  patterns: ["βουν", "mountain", "ορειν"] },
  { id: "ski",            label: "Ski / Χιονοδρομικό",     patterns: ["ski", "σκι", "χιον"] },
  { id: "adults_only",    label: "Adults only",            patterns: ["adults.?only", "ενηλίκ", "no.?kids"] },
  { id: "all_inclusive",  label: "All-inclusive",          patterns: ["all.?inclusive"] },
];

const THEATER_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "classic",        label: "Κλασικό",                patterns: ["κλασσικ", "κλασικ", "classic"] },
  { id: "comedy",         label: "Κωμωδία",                patterns: ["κωμωδ", "comedy"] },
  { id: "drama",          label: "Δράμα",                  patterns: ["δράμα", "drama", "τραγωδ"] },
  { id: "musical",        label: "Μιούζικαλ",              patterns: ["μιούζικαλ", "musical"] },
  { id: "monologue",      label: "Μονόλογος",              patterns: ["μονόλογ", "monologue", "solo"] },
  { id: "family",         label: "Οικογενειακό / Παιδικό", patterns: ["παιδικ", "οικογενει", "kids?", "family"] },
  { id: "experimental",   label: "Πειραματικό",            patterns: ["πειραματικ", "experimental", "avant"] },
];

const EVENTS_CHARACTERISTICS_BUCKETS: AdminFacetBucket[] = [
  { id: "free",           label: "Δωρεάν",                  patterns: ["δωρεάν", "free", "eleftheri"] },
  { id: "outdoor",        label: "Εξωτερικό / Open-air",   patterns: ["εξωτερικ", "outdoor", "open.?air", "ύπαιθρ"] },
  { id: "indoor",         label: "Εσωτερικό",               patterns: ["εσωτερικ", "indoor"] },
  { id: "kids",           label: "Παιδικό / Οικογενειακό", patterns: ["παιδικ", "kids?", "οικογενει"] },
  { id: "festival",       label: "Φεστιβάλ",                patterns: ["festival", "φεστιβάλ"] },
  { id: "exhibition",     label: "Έκθεση",                  patterns: ["έκθεση", "exhibition"] },
  { id: "concert",        label: "Συναυλία",                patterns: ["συναυλία", "concert", "live\\b"] },
  { id: "workshop",       label: "Workshop / Εργαστήρι",   patterns: ["workshop", "εργαστήρ"] },
  { id: "conference",     label: "Συνέδριο",                patterns: ["συνέδρι", "conference"] },
];

const THEATER_PRICE_BUCKETS: AdminFacetBucket[] = [
  { id: "lt_15",  label: "<15€",     max: 14 },
  { id: "15_30",  label: "15–30€",   min: 15, max: 30 },
  { id: "30_60",  label: "30–60€",   min: 31, max: 60 },
  { id: "gt_60",  label: ">60€",     min: 61 },
];

export const ADMIN_FACETS: Record<CategorySlug, AdminFacet[]> = {
  movies: [
    { id: "country",         label: "Χώρα παραγωγής",  kind: "searchable-chips", field: "country" },
    { id: "language",        label: "Γλώσσα",          kind: "searchable-chips", field: "language" },
    { id: "decade",          label: "Δεκαετία",        kind: "year-range",       field: "release_date", buckets: DECADE_BUCKETS },
    { id: "characteristics", label: "Χαρακτηριστικά",  kind: "tag-pattern",      field: "tags",         buckets: MOVIE_CHARACTERISTICS_BUCKETS,
      hint: "Match στα tags. Πολλαπλή επιλογή = OR — βρίσκει ταινίες με τουλάχιστον ένα από αυτά." },
  ],
  series: [
    { id: "country",         label: "Χώρα παραγωγής",  kind: "searchable-chips", field: "country" },
    { id: "language",        label: "Γλώσσα",          kind: "searchable-chips", field: "language" },
    { id: "decade",          label: "Δεκαετία",        kind: "year-range",       field: "release_date", buckets: DECADE_BUCKETS },
    { id: "seasons",         label: "Σεζόν",           kind: "range",            field: "seasons",      buckets: SEASONS_BUCKETS },
    { id: "characteristics", label: "Χαρακτηριστικά",  kind: "tag-pattern",      field: "tags",         buckets: SERIES_CHARACTERISTICS_BUCKETS,
      hint: "Πέρα από το seeded characteristics filter (completed / single-season / true-story) που είναι ήδη στις public σελίδες." },
  ],
  books: [
    { id: "language",        label: "Γλώσσα",          kind: "searchable-chips", field: "language" },
    { id: "pages",           label: "Σελίδες",          kind: "range",            field: "pages",            buckets: PAGES_BUCKETS },
    { id: "decade",          label: "Δεκαετία",         kind: "year-range",       field: "publication_year", buckets: DECADE_BUCKETS },
    { id: "trilogy",         label: "Τριλογία",         kind: "boolean",          field: "is_trilogy",
      hint: "Φιλτράρει σε βιβλία με is_trilogy = true." },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",             buckets: BOOKS_CHARACTERISTICS_BUCKETS },
  ],
  recipes: [
    { id: "yields",          label: "Μερίδες",          kind: "range",            field: "yields",   buckets: YIELDS_BUCKETS },
    { id: "calories",        label: "Θερμίδες",         kind: "range",            field: "calories", buckets: CALORIES_BUCKETS },
    { id: "origin",          label: "Προέλευση",        kind: "searchable-chips", field: "origin" },
    { id: "channel",         label: "Πηγή / Channel",   kind: "searchable-chips", field: "channel",
      hint: "Από ποιο site/blog/περιοδικό προέρχεται η συνταγή." },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",     buckets: RECIPES_CHARACTERISTICS_BUCKETS },
  ],
  food: [
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",     buckets: FOOD_CHARACTERISTICS_BUCKETS,
      hint: "Match στα tags. Vibes / κοινό / atmosphere — όχι κουζίνα/τύπος (αυτά είναι ήδη public)." },
  ],
  bars: [
    { id: "type",            label: "Είδος bar",        kind: "searchable-chips", field: "type" },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",     buckets: BARS_CHARACTERISTICS_BUCKETS },
  ],
  hotels: [
    { id: "facilities",      label: "Παροχές",          kind: "amenities",        field: "facilities" },
    { id: "price_band",      label: "Εύρος τιμής",      kind: "chips",            field: "price_range" },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",     buckets: HOTELS_CHARACTERISTICS_BUCKETS,
      hint: "Vibes πέρα από τις παροχές: pet-friendly, οικογενειακό, ορεινό, beachfront κλπ." },
  ],
  theater: [
    { id: "year",            label: "Έτος ανέβασμα",    kind: "year-range",       field: "year",   buckets: DECADE_BUCKETS },
    { id: "director",        label: "Σκηνοθέτης",       kind: "searchable-chips", field: "director",
      hint: "Δεν είναι στο public filter — admin-only εδώ." },
    { id: "writer",          label: "Συγγραφέας έργου", kind: "searchable-chips", field: "writer" },
    { id: "price",           label: "Τιμή εισιτηρίου",  kind: "range",            field: "price",  buckets: THEATER_PRICE_BUCKETS },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",   buckets: THEATER_CHARACTERISTICS_BUCKETS },
  ],
  events: [
    { id: "status",          label: "Status",           kind: "searchable-chips", field: "status" },
    { id: "price",           label: "Τιμή",             kind: "range",            field: "price",  buckets: THEATER_PRICE_BUCKETS },
    { id: "characteristics", label: "Χαρακτηριστικά",   kind: "tag-pattern",      field: "tags",   buckets: EVENTS_CHARACTERISTICS_BUCKETS },
  ],
};

/* ── Matcher ─────────────────────────────────────────────────── */

/** Read the value from the row's category extension (`ext`) at the
 *  facet's field path. For `year-range`, coerce a string date or year
 *  integer to a 4-digit year number. */
export function readFacetValue(ext: any, facet: AdminFacet): unknown {
  const raw = ext?.[facet.field];
  if (facet.kind !== "year-range") return raw;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    // ISO date or "YYYY" string.
    const direct = Number(raw);
    if (!Number.isNaN(direct) && direct > 0 && direct < 9999) return direct;
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) return dt.getFullYear();
  }
  return null;
}

/** Parse the hotel facilities jsonb into a flat lowercase string array.
 *  Mirrors `getActiveAmenities` from lib/icons.ts — both shapes
 *  (array-of-strings and object-of-booleans) are supported. */
export function parseAmenities(facilities: any): string[] {
  if (!facilities) return [];
  if (Array.isArray(facilities)) {
    return facilities
      .filter((s) => typeof s === "string")
      .map((s: string) => s.toLowerCase());
  }
  if (typeof facilities === "object") {
    return Object.entries(facilities)
      .filter(([, v]) => !!v)
      .map(([k]) => k.toLowerCase());
  }
  return [];
}

/** Apply a single admin facet's selection against the row's extension
 *  payload. Empty/zero-length selection always passes. */
export function matchesAdminFacet(
  facet: AdminFacet,
  selection: string | string[],
  ext: any,
): boolean {
  const arr = Array.isArray(selection)
    ? selection
    : typeof selection === "string" && selection
      ? [selection]
      : [];
  if (arr.length === 0) return true;

  if (facet.kind === "text") {
    const v = typeof selection === "string" ? selection : arr[0];
    if (!v) return true;
    const target = ext?.[facet.field];
    if (typeof target !== "string") return false;
    return target.toLowerCase().includes(v.toLowerCase());
  }

  if (facet.kind === "chips" || facet.kind === "searchable-chips") {
    // Both kinds share matching semantics — the only difference is UI.
    const target = ext?.[facet.field];
    if (typeof target !== "string") return false;
    const t = target.toLowerCase();
    return arr.some((sel) => sel.toLowerCase() === t);
  }

  if (facet.kind === "tag-pattern") {
    // Match against the row's tag array (passed in via ext.tags by the
    // Explorer route — see the slim mapper there). OR semantics: any
    // selected bucket whose patterns hit any tag → row passes.
    const tags: any = ext?.[facet.field];
    const tagList: string[] = Array.isArray(tags)
      ? tags.filter((t) => typeof t === "string").map((t: string) => t.toLowerCase())
      : [];
    if (tagList.length === 0) return false;
    const buckets = facet.buckets ?? [];
    return arr.some((bid) => {
      const b = buckets.find((bb) => bb.id === bid);
      if (!b || !b.patterns) return false;
      return b.patterns.some((p) => {
        try {
          const rx = new RegExp(p, "i");
          return tagList.some((t) => rx.test(t));
        } catch {
          // Invalid regex in config — fall back to substring match.
          return tagList.some((t) => t.includes(p.toLowerCase()));
        }
      });
    });
  }

  if (facet.kind === "boolean") {
    // Single-toggle chip — when ANY value is selected (we use "yes"
    // as the convention but accept any non-empty marker), filter to
    // rows where ext[field] is truthy. Empty selection passes all.
    return !!ext?.[facet.field];
  }

  if (facet.kind === "amenities") {
    const have = parseAmenities(ext?.[facet.field]);
    if (have.length === 0) return false;
    // AND semantics — every selected amenity must be present.
    return arr.every((sel) => have.includes(sel.toLowerCase()));
  }

  if (facet.kind === "year-range" || facet.kind === "range") {
    const raw = readFacetValue(ext, facet);
    if (typeof raw !== "number") return false;
    const buckets = facet.buckets ?? [];
    // OR semantics — any selected bucket matches.
    return arr.some((bid) => {
      const b = buckets.find((bb) => bb.id === bid);
      if (!b) return false;
      if (b.min !== undefined && raw < b.min) return false;
      if (b.max !== undefined && raw > b.max) return false;
      return true;
    });
  }

  return true;
}

/** Hotel facilities — canonical multi-select option list. Mirrors the
 *  set surfaced in the admin hotel editor (lib/icons.ts ::
 *  HOTEL_AMENITY_GROUPS) so admin sees the same vocabulary in both
 *  places. */
export const HOTEL_AMENITY_CHOICES: { id: string; label: string }[] = [
  { id: "breakfast",    label: "Πρωινό" },
  { id: "parking",      label: "Parking" },
  { id: "wifi",         label: "Wi-Fi" },
  { id: "pool",         label: "Πισίνα" },
  { id: "spa",          label: "Spa" },
  { id: "gym",          label: "Γυμναστήριο" },
  { id: "restaurant",   label: "Εστιατόριο" },
  { id: "bar",          label: "Bar" },
  { id: "pet_friendly", label: "Pet friendly" },
  { id: "family",       label: "Οικογενειακό" },
  { id: "sea_view",     label: "Θέα θάλασσα" },
  { id: "beachfront",   label: "Στην παραλία" },
  { id: "air_conditioning", label: "A/C" },
];
