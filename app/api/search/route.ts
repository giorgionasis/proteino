import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIService } from "@/lib/ai";
import type { CategorySlug, SearchAnalysis } from "@/types";

// Sharp pipeline downstream is on Node runtime; the AIService factory is
// also Node-only since it loads the Gemini SDK lazily.
export const runtime = "nodejs";

/**
 * Real DB-backed search. Replaces the 3-item mock from earlier sessions.
 *
 * Query path:
 *   1. Parse intent (categories, vibe, location) from the raw query — same
 *      shape AIService.analyzeSearchQuery produces, computed inline so the
 *      route stays self-contained and we don't await an extra hop.
 *   2. Resolve location → region row (Greek city name → regions row).
 *   3. Run an ilike against items.title, scoped by category if detected.
 *   4. Score each candidate (title-match × 5 + avg_rating × log(rating_count) +
 *      suggestion_count × 0.5 + recency_30d).
 *   5. Compute confidence_tier from the top score and runner-up gap so the
 *      UI can decide hero-card-vs-list rendering and lookup-vs-discovery.
 *
 * Returns: { items, total, intent, confidence_tier, featured, users, suggestions }
 *
 * Out of scope for v1: pgvector semantic similarity (column exists, model
 * not wired); cross-category combo composition (needs lat/lng backfill via
 * scripts/geocode-venues.js).
 */

interface SearchAnalysisOut {
  categories: CategorySlug[];
  vibe: string | null;
  type: string | null;
  location: string | null;
  /** Best guess at what the user wants. "lookup" = specific item; "discovery"
   *  = browse-style. Drives whether we promote a FEATURED hero. */
  intent: "lookup" | "discovery";
  /** Extended structured signals (Gemini extraction). Surfaced to the
   *  client so the UI can display "Showing: Comedies on Netflix"
   *  badges and so debugging shows what the LLM understood. */
  genre?: string | null;
  channel?: string | null;
  status?: "completed" | "ongoing" | null;
  period?: string | null;
  duration_min?: number | null;
  duration_max?: number | null;
  person?: string | null;
}

// ── Intent extraction ─────────────────────────────────────────────────────

// Note: \b is ASCII-only in JS regex and never fires on Greek input. We
// match Greek roots without word-boundary; the English alternatives keep
// \b only for the ASCII tokens that benefit from it. Loan words written
// in Greek transliteration ("σούσι", "μπέργκερ", "πίτσα") are listed
// alongside their Latin originals so users get the same matching either way.
const CATEGORY_KEYWORDS: Array<[CategorySlug, RegExp]> = [
  ["series",  /σειρ|\bseries|\bseason|σεζόν|\bepisode|επεισόδι/i],
  ["movies",  /ταιν[ίι]|\bmovie|\bfilm|\bcinema|σινε[μν]/i],
  ["books",   /βιβλ[ίι]|\bbook|\bnovel|μυθιστόρ|συγγραφ/i],
  ["recipes", /συνταγ|\brecipe|μαγείρ/i],
  ["food",    /εστιατ[όο]ρ|\brestaurant|φαγητ[όο]|δείπν|γεύμα|ταβέρν|\bbrunch|μπραντς|\bsushi|σού?σι|\bburger|μπέργκερ|\bpizza|πίτσα|\bramen|ραμεν|\bpoke|σαλάτ/i],
  ["bars",    /\bbar\b|μπαρ|καφ[έε]|\bcafe|\bcoffee|\bcocktail|κοκτέιλ|\bwine|κρασ|παμπ|\bpub/i],
  ["hotels",  /ξενοδοχ|\bhotel|διαμον|\bairbnb|\bstay\b|κατάλυμα|\bresort|\bvilla|βίλα/i],
  ["theater", /θέατρ|\btheater|\btheatre|παράστασ|μιούζικαλ|\bmusical/i],
  ["events",  /συναυλ|\bfestival|φεστιβάλ|έκθεσ|\bevent|γιορτ|κονσέρτ|\bconcert/i],
];

const VIBE_KEYWORDS: Array<[string, RegExp]> = [
  ["cozy",      /\bcoz[yi]|χαλαρ|ζεστ|comfort/i],
  ["romantic",  /\bromantic|ρομαντικ|date|ραντεβ/i],
  ["loud",      /\bloud|party|ζωηρ|θορυβ/i],
  ["family",    /\bfamily|οικογεν|παιδι/i],
  ["intimate",  /\bintimate|ιδιαίτερ/i],
  ["upscale",   /\bfine dining|upscale|elegant|κομψ/i],
  ["casual",    /\bcasual|απλ[όο]/i],
];

const NIGHTOUT_RE = /\bβράδυ|night|σάββατ|saturday|date|έξοδος|βγαίνω|βγαλω|ιδέες για|evening/i;

function tokenize(s: string): string[] {
  const punctRe = new RegExp("^[^\\p{L}\\d]+|[^\\p{L}\\d]+$", "gu");
  return s
    .toLowerCase()
    .split(/[\s,.;:!?()/—–-]+/)
    .map((t) => t.replace(punctRe, ""))
    .filter((t) => t.length >= 2);
}

/** Fold Greek diacritics (and lowercase) so users typing "μπεργκερ"
 *  hit the regex defined as "μπέργκερ", and so on. Keeps the regex
 *  source readable while making matching accent-insensitive. */
function foldGreek(s: string): string {
  return s.toLowerCase().replace(/[άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ]/g, (ch) => {
    const map: Record<string, string> = {
      "ά":"α","έ":"ε","ή":"η","ί":"ι","ό":"ο","ύ":"υ","ώ":"ω",
      "ϊ":"ι","ϋ":"υ","ΐ":"ι","ΰ":"υ",
      "Ά":"α","Έ":"ε","Ή":"η","Ί":"ι","Ό":"ο","Ύ":"υ","Ώ":"ω","Ϊ":"ι","Ϋ":"υ",
    };
    return map[ch] ?? ch;
  });
}

/**
 * Tolerant Greek-aware token match. Three accept rules:
 *   1. Exact equality.
 *   2. Target contains token — query was shorter / more general; data
 *      carries a longer canonical name. "ταβερνα" → "ψαροταβερνα" ✓
 *   3. Common-prefix matching for inflection variants where neither is
 *      a strict substring: "ιταλικο" vs "ιταλικη", "συναυλιες" vs
 *      "συναυλια". Requires 4+ shared starting chars AND within 2 chars
 *      of the shorter side — keeps false positives off ("ιταλικ" vs
 *      "ιταλος" still match because they share 4 chars + are equal in
 *      length minus 2; "ιταλικη" vs "ιστορικο" only share 1 char so
 *      they don't).
 *
 * NOT a match rule: token containing target (token longer than target).
 * The user being MORE specific is intentional — "μπακαλοταβερνα" must
 * not silently expand to all "ταβερνα" venues.
 *
 * Both inputs are expected to be foldGreek'd already (lowercased +
 * accent-stripped).
 */
function tokenMatches(token: string, target: string): boolean {
  if (!token || !target) return false;
  if (token === target) return true;
  if (target.includes(token)) return true;
  let i = 0;
  while (i < token.length && i < target.length && token[i] === target[i]) i++;
  return i >= 4 && i >= Math.min(token.length, target.length) - 2;
}

function extractCategories(text: string): CategorySlug[] {
  const folded = foldGreek(text);
  const hits: CategorySlug[] = [];
  // Test both forms — regex sources have accents (readable), input is folded.
  // Folding the regex source instead would be cleaner; doing both keeps
  // backward compat for anyone who already typed the accented form too.
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(text) || re.test(foldGreek(re.source))) {
      // Re-test against folded text against a folded regex source as well,
      // since the fold changes characters in ways simple flag-bit
      // case-insensitivity wouldn't capture.
      const foldedRe = new RegExp(foldGreek(re.source), re.flags);
      if (re.test(text) || foldedRe.test(folded)) hits.push(cat);
    }
  }
  return hits;
}

function extractVibe(text: string): string | null {
  const folded = foldGreek(text);
  for (const [vibe, re] of VIBE_KEYWORDS) {
    if (re.test(text)) return vibe;
    const foldedRe = new RegExp(foldGreek(re.source), re.flags);
    if (foldedRe.test(folded)) return vibe;
  }
  return null;
}

/** Categories that have lat/lng + region_id on their extension table. */
const VENUE_CATEGORIES = new Set<CategorySlug>(["food", "bars", "hotels", "theater", "events"]);

interface ResolvedRegion {
  id: string;
  name: string;
  slug: string;
  /** All descendant region IDs (not just direct children) — supports
   *  arbitrary tree depth. 'Κρήτη' search expands to its prefectures
   *  (Ηράκλειο, Χανιά, ...) AND each prefecture's places (Ελούντα,
   *  Μάταλα, ...). Items reference leaf-level regions; this expansion
   *  catches them all. */
  descendantIds: string[];
}

async function resolveLocation(
  admin: ReturnType<typeof createAdminClient>,
  text: string,
): Promise<ResolvedRegion | null> {
  const tokens = tokenize(text).filter((t) => t.length >= 4).map(foldGreek);
  if (tokens.length === 0) return null;
  const { data } = await (admin.from("regions") as any)
    .select("id, name, slug, parent_id")
    .order("display_order", { ascending: true })
    .limit(500);
  if (!data) return null;
  const all = data as Array<{ id: string; name: string; slug: string; parent_id: string | null }>;
  const queryFolded = tokens.join(" ");

  // Score every region:
  //  - Multi-word region name (e.g. "Βόρεια Προάστια") matches only if
  //    ALL of its words appear in the query. Otherwise "Προάστια" alone
  //    would let Νότια Προάστια win against a "βορεια προαστια" query.
  //  - Single-word names match if the word is present.
  //  - Slug variant matches as a secondary signal.
  // Ties broken by name length (more specific name beats shorter).
  let best: { region: typeof all[number]; score: number } | null = null;
  for (const r of all) {
    const foldedName = foldGreek(r.name);
    const nameWords = foldedName.split(/\s+/).filter((w) => w.length >= 3);
    if (nameWords.length === 0) continue;

    // Require every word in the region name to appear somewhere in the
    // (folded) query. For "Βόρεια Προάστια" → ["βορεια", "προαστια"].
    const allWordsInQuery = nameWords.every((w) => queryFolded.includes(w));
    const slugMatch = r.slug && tokens.some((tok) => r.slug.toLowerCase().includes(tok));

    if (!allWordsInQuery && !slugMatch) continue;

    const score = (allWordsInQuery ? nameWords.length * 10 : 0) + (slugMatch ? 1 : 0) + foldedName.length;
    if (!best || score > best.score) {
      best = { region: r, score };
    }
  }

  if (!best) return null;

  const r = best.region;
  const descendantIds: string[] = [];
  const queue = [r.id];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const x of all) {
      if (x.parent_id === parentId) {
        descendantIds.push(x.id);
        queue.push(x.id);
      }
    }
  }
  return { id: r.id, name: r.name, slug: r.slug, descendantIds };
}

/**
 * People search — finds movies/series/books where the actors / director /
 * writer field matches the query. Casts jsonb to text for ilike on the
 * actor-list field; plain ilike on text columns. Doesn't use LLM —
 * the same pattern that Joomla K2's cross-column search uses on large
 * datasets — but it makes "leonardo di caprio" actually find Leonardo
 * DiCaprio's films.
 */
type PeopleField = "actors" | "director" | "writer" | "performers";

async function fetchPeopleMatches(
  admin: ReturnType<typeof createAdminClient>,
  query: string,
): Promise<Array<{ item: any; matchedField: PeopleField }>> {
  const safe = query.trim().replace(/[%_\\]/g, "\\$&");
  if (safe.length < 3) return [];

  // Postgres ilike is case-insensitive but NOT accent-insensitive
  // ("Μπέζος" won't match "Μπεζος"). To cover legacy data with mixed
  // accenting, we run BOTH the raw query AND the accent-folded form
  // through every ilike. Identical hits are deduped by item_id below.
  const safeFolded = foldGreek(safe);
  const variants = safe === safeFolded ? [safe] : [safe, safeFolded];

  const ITEM_SELECT = `item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`;

  // Build one task per (table × field × variant). Each variant is
  // the same field-shape — we just probe both raw + folded forms to
  // beat Postgres's accent sensitivity.
  const tasks: Promise<Array<{ item: any; matchedField: PeopleField }>>[] = [];
  for (const v of variants) {
    tasks.push(
      // Movies
      (admin.from("item_movies") as any)
        .select(ITEM_SELECT).filter("actors::text", "ilike", `%${v}%`).limit(15)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "actors" as const }))),
      (admin.from("item_movies") as any)
        .select(ITEM_SELECT).ilike("director", `%${v}%`).limit(10)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "director" as const }))),
      // Series
      (admin.from("item_series") as any)
        .select(ITEM_SELECT).filter("actors::text", "ilike", `%${v}%`).limit(15)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "actors" as const }))),
      (admin.from("item_series") as any)
        .select(ITEM_SELECT).ilike("director", `%${v}%`).limit(10)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "director" as const }))),
      // Books
      (admin.from("item_books") as any)
        .select(ITEM_SELECT).ilike("writer", `%${v}%`).limit(10)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "writer" as const }))),
      // Theater — actors / director / writer
      (admin.from("item_theater") as any)
        .select(ITEM_SELECT).filter("actors::text", "ilike", `%${v}%`).limit(15)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "actors" as const }))),
      (admin.from("item_theater") as any)
        .select(ITEM_SELECT).ilike("director", `%${v}%`).limit(10)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "director" as const }))),
      (admin.from("item_theater") as any)
        .select(ITEM_SELECT).ilike("writer", `%${v}%`).limit(10)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "writer" as const }))),
      // Events — performers jsonb
      (admin.from("item_events") as any)
        .select(ITEM_SELECT).filter("performers::text", "ilike", `%${v}%`).limit(15)
        .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "performers" as const }))),
    );
  }

  const arrays = await Promise.all(tasks);
  const flat = arrays.flat().filter((r) => r.item && r.item.is_published);

  // Dedup by item_id — an actor + director match on the same movie should
  // count once.
  const seen = new Set<string>();
  const dedup: Array<{ item: any; matchedField: PeopleField }> = [];
  for (const r of flat) {
    if (seen.has(r.item.id)) continue;
    seen.add(r.item.id);
    dedup.push(r);
  }
  return dedup;
}

/** Items in a given category filtered by region via the extension table.
 *  Returns rows including the address column so the caller can do an
 *  address-text fallback when region_id is unset (most legacy rows). */
// Extension-table fields per category that represent the "type" or
// "cuisine" of a venue. Pulled alongside address so refinement-token
// filtering can match cuisine/type, not just title.
//   food: cuisine (Ελληνική, Ιταλική, ...) + type (Εστιατόριο, Ταβέρνα, ...)
//   bars: type (Cocktail Bar, Wine Bar, ...)
//   hotels: type (Ξενοδοχείο, Διαμέρισμα, ...)
//   theater: type (Θέατρο, Μιούζικαλ, ...)
//   events: event_type (Συναυλία, Φεστιβάλ, ...)
const TYPE_FIELDS: Record<string, string[]> = {
  food:    ["cuisine", "type"],
  bars:    ["type"],
  hotels:  ["type"],
  theater: ["type"],
  events:  ["event_type", "dates"],
};

async function fetchVenueItems(
  admin: ReturnType<typeof createAdminClient>,
  category: CategorySlug,
  opts: { regionIds?: string[] | null; limit: number },
): Promise<Array<{ item: any; address: string | null; cuisine: string | null; type: string | null; dates: any | null }>> {
  const extTable = `item_${category}`;
  const typeFields = TYPE_FIELDS[category] ?? [];
  const extraSelect = typeFields.length > 0 ? typeFields.join(", ") + ", " : "";
  let q = (admin.from(extTable) as any)
    .select(`item_id, address, ${extraSelect}items!inner(id, title, title_normalized, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
    .limit(opts.limit);
  if (opts.regionIds && opts.regionIds.length > 0) {
    q = opts.regionIds.length === 1
      ? q.eq("region_id", opts.regionIds[0])
      : q.in("region_id", opts.regionIds);
  }
  const { data } = await q;
  return ((data ?? []) as any[])
    .map((row: any) => ({
      item: row.items,
      address: row.address ?? null,
      // Normalize the type/cuisine fields per category to a uniform shape.
      cuisine: row.cuisine ?? null,
      type: row.type ?? row.event_type ?? null,
      // dates: only events have this — null for other venues. Stored
      // as a jsonb array of {from, to, price, status} per K2 model.
      dates: row.dates ?? null,
    }))
    .filter((r) => r.item && r.item.is_published);
}

/* ── Period → month range helper (events) ──────────────────────────────
 *
 * Translates Gemini's `period` field into a set of months (0-11) that
 * an event must overlap. Year-agnostic — "summer concerts" matches
 * any event scheduled in June-August regardless of year. This is the
 * right model for archived event data (K2 legacy events span multiple
 * years) and for forward-looking searches alike: the user means
 * "concerts that happen in summer", not specifically "summer 2026
 * concerts".
 *
 * Returns the set of allowed months. Empty set means the period was
 * unrecognized — caller should skip the filter.
 */
function periodToMonths(periodRaw: string): Set<number> | null {
  if (!periodRaw) return null;
  const p = foldGreek(periodRaw.toLowerCase().trim());

  const seasons: Record<string, number[]> = {
    summer:    [5, 6, 7],
    καλοκαιρι: [5, 6, 7],
    winter:    [11, 0, 1],
    χειμωνας:  [11, 0, 1],
    spring:    [2, 3, 4],
    ανοιξη:    [2, 3, 4],
    autumn:    [8, 9, 10],
    fall:      [8, 9, 10],
    φθινοπωρο: [8, 9, 10],
  };
  if (seasons[p]) return new Set(seasons[p]);

  const monthMap: Record<string, number> = {
    january: 0, ιανουαριος: 0,
    february: 1, φεβρουαριος: 1,
    march: 2, μαρτιος: 2,
    april: 3, απριλιος: 3,
    may: 4, μαιος: 4,
    june: 5, ιουνιος: 5,
    july: 6, ιουλιος: 6,
    august: 7, αυγουστος: 7,
    september: 8, σεπτεμβριος: 8,
    october: 9, οκτωβριος: 9,
    november: 10, νοεμβριος: 10,
    december: 11, δεκεμβριος: 11,
  };
  if (monthMap[p] !== undefined) return new Set([monthMap[p]]);

  // "Weekend" is a day-of-week predicate, not a month — handled by
  // a separate day-of-week filter below. Returning null here so the
  // caller skips month-based matching for weekend; the weekend check
  // is folded into eventMatchesPeriod for symmetry.
  return null;
}

function parseEventDate(s: unknown): Date | null {
  if (!s || typeof s !== "string") return null;
  // DD/MM/YY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function eventMatchesPeriod(dates: unknown, periodRaw: string): boolean {
  if (!Array.isArray(dates)) return false;
  const folded = foldGreek(periodRaw.toLowerCase().trim());

  // Weekend predicate — any date that lands on Sat or Sun matches.
  if (folded === "weekend" || folded === "σαββατοκυριακο") {
    for (const entry of dates) {
      if (!entry || typeof entry !== "object") continue;
      const from = parseEventDate((entry as any).from);
      const to   = parseEventDate((entry as any).to);
      const start = from ?? to;
      const end   = to ?? from;
      if (!start || !end) continue;
      // Walk every day in the entry's range — small ranges, cheap.
      for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow === 0 || dow === 6) return true;
      }
    }
    return false;
  }

  const months = periodToMonths(periodRaw);
  if (!months || months.size === 0) return false;
  for (const entry of dates) {
    if (!entry || typeof entry !== "object") continue;
    const from = parseEventDate((entry as any).from);
    const to   = parseEventDate((entry as any).to);
    const start = from ?? to;
    const end   = to ?? from;
    if (!start || !end) continue;
    // Walk months covered by the entry — usually just one or two.
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor.getTime() <= endCursor.getTime()) {
      if (months.has(cursor.getMonth())) return true;
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return false;
}

/* ── Structured-filter query (non-venue) ──────────────────────────────
 *
 * Runs when Gemini extracted at least one structured signal (genre,
 * channel, status, duration_min/max). Composes the signals into one
 * Supabase query per category and returns matching items. Replaces
 * title ilike for queries like "κωμωδίες netflix", "παιδικά κάτω από
 * 90 λεπτά", "ολοκληρωμένες σειρές" — none of which match item titles
 * directly.
 *
 * Per-category semantics:
 *   movies  → subcategory_id (genre) + item_movies.channel + duration_min range
 *   series  → subcategory_id (genre) + item_series.channel + end_date (status)
 *   books   → subcategory_id (genre)  [extension table has no extra filters here]
 *   recipes → subcategory_id (type/origin)
 */
const NON_VENUE_CATEGORIES: CategorySlug[] = ["movies", "series", "books", "recipes"];

interface StructuredFilters {
  categories: CategorySlug[];
  genre?: string | null;
  channel?: string | null;
  status?: "completed" | "ongoing" | null;
  duration_min?: number | null;
  duration_max?: number | null;
  type?: string | null;
}

/**
 * Greek genre/type aliases — maps user-language variants to canonical
 * subcategory names that exist in our DB. Used when Gemini didn't emit
 * a canonical name OR when the user typed something idiomatic.
 *
 * Keys are foldGreek'd (lowercase + accent-stripped). Values are
 * substring-matched against canonical subcategory names (also folded).
 */
const GENRE_ALIASES: Record<string, string[]> = {
  "παιδικα":     ["animation"],
  "παιδικη":     ["animation"],
  "παιδικο":     ["animation"],
  "κινουμενα":   ["animation"],
  "κινουμενα σχεδια": ["animation"],
  "νουαρ":       ["θριλερ"],
  "νεο-νουαρ":   ["θριλερ"],
  "ψυχολογικο":  ["θριλερ", "δραμα"],
  "ντοκυμαντερ": ["ντοκιμαντερ"],
  "ντοκο":       ["ντοκιμαντερ"],
  "μυστηριου":   ["θριλερ"],
  "ρομαντικη":   ["ρομαντικη"],
  "ρομαντικο":   ["ρομαντικη"],
};

async function resolveSubcategoryIds(
  admin: ReturnType<typeof createAdminClient>,
  query: string,
  categories: CategorySlug[],
): Promise<string[]> {
  if (!query || categories.length === 0) return [];
  // Pull all subcategories for the target categories — a small set
  // (<25 rows total in our DB) — and filter in JS. Postgres ilike
  // doesn't accent-fold the column, so "θρίλερ" wouldn't match
  // "Θρίλερ" with raw ilike. tokenMatches handles inflection
  // ("παιδικά" → "Παιδικά", "ασιατικός" → "Ασιατική") which a plain
  // substring match misses.
  const { data } = await (admin.from("subcategories") as any)
    .select("id, name, category")
    .in("category", categories);
  const rows = (data ?? []) as Array<{ id: string; name: string; category: string }>;
  const folded = foldGreek(query.trim());

  // Direct fuzzy match first — handles canonical names + simple inflection.
  const direct = rows
    .filter((r) => tokenMatches(folded, foldGreek(r.name ?? "")))
    .map((r) => r.id);
  if (direct.length > 0) return direct;

  // Alias fallback — when the user typed an idiom that doesn't match
  // any canonical name directly, try the alias map.
  const aliasTargets = GENRE_ALIASES[folded];
  if (aliasTargets) {
    return rows
      .filter((r) => aliasTargets.some((target) => foldGreek(r.name ?? "").includes(target)))
      .map((r) => r.id);
  }
  return [];
}

async function fetchExtensionFilteredIds(
  admin: ReturnType<typeof createAdminClient>,
  category: CategorySlug,
  filters: StructuredFilters,
): Promise<Set<string> | null> {
  // Returns null when no extension filter applies (no constraint on
  // item_ids). Returns Set when filters apply — possibly empty (no
  // matches).
  if (category === "movies") {
    const useChannel = !!filters.channel;
    const useDuration = filters.duration_min != null || filters.duration_max != null;
    if (!useChannel && !useDuration) return null;
    let q = (admin.from("item_movies") as any).select("item_id").limit(1000);
    if (filters.channel) q = q.ilike("channel", `%${filters.channel}%`);
    if (filters.duration_min != null) q = q.gte("duration_min", filters.duration_min);
    if (filters.duration_max != null) q = q.lte("duration_min", filters.duration_max);
    const { data } = await q;
    return new Set((data ?? []).map((r: any) => r.item_id));
  }
  if (category === "series") {
    const useChannel = !!filters.channel;
    const useStatus = !!filters.status;
    if (!useChannel && !useStatus) return null;
    let q = (admin.from("item_series") as any).select("item_id").limit(1000);
    if (filters.channel) q = q.ilike("channel", `%${filters.channel}%`);
    if (filters.status === "completed") q = q.not("end_date", "is", null);
    if (filters.status === "ongoing")   q = q.is("end_date", null);
    const { data } = await q;
    return new Set((data ?? []).map((r: any) => r.item_id));
  }
  // Books / recipes have no structured filters yet beyond genre
  // (handled by subcategory_id at the items level).
  return null;
}

async function fetchByStructuredFilters(
  admin: ReturnType<typeof createAdminClient>,
  filters: StructuredFilters,
): Promise<any[]> {
  const targetCategories: CategorySlug[] = filters.categories.length > 0
    ? filters.categories.filter((c) => NON_VENUE_CATEGORIES.includes(c))
    : NON_VENUE_CATEGORIES;
  if (targetCategories.length === 0) return [];

  // Resolve genre/type → subcategory ids. We try `genre` first; if
  // empty, fall back to `type` (Gemini may use either field for the
  // same intent — "θρίλερ" might land in type instead of genre).
  //
  // If genre is set but resolves to nothing AND we have OTHER filters
  // (channel, duration, status), we drop the genre constraint rather
  // than returning empty — better to show "movies under 90min" than
  // nothing when the user asked for a subcategory we don't carry.
  // Only return early-empty when genre is the ONLY signal.
  let subcategoryIds: string[] | null = null;
  const genreSeed = (filters.genre ?? "").trim();
  const typeSeed  = (filters.type  ?? "").trim();
  const hasOtherFilters = !!(
    filters.channel || filters.status ||
    filters.duration_min != null || filters.duration_max != null
  );
  if (genreSeed) {
    const ids = await resolveSubcategoryIds(admin, genreSeed, targetCategories);
    if (ids.length > 0) {
      subcategoryIds = ids;
    } else if (!hasOtherFilters) {
      // Genre is the only signal and we don't have it — honest empty.
      return [];
    }
    // Otherwise: genre missed but other filters exist → drop genre,
    // continue with channel/duration/status. subcategoryIds stays null.
  } else if (typeSeed) {
    const ids = await resolveSubcategoryIds(admin, typeSeed, targetCategories);
    if (ids.length > 0) subcategoryIds = ids;
    // If type doesn't match any subcategory, leave subcategoryIds null
    // — type may be a venue hint; let extension filters carry the load.
  }

  // Per-category extension-table prefilter → allowed item_ids.
  const extensionAllowed = await Promise.all(
    targetCategories.map(async (cat) => [
      cat,
      await fetchExtensionFilteredIds(admin, cat, filters),
    ] as const),
  );

  // Compose final per-category items query.
  const arrays = await Promise.all(
    targetCategories.map(async (cat) => {
      const allowed = extensionAllowed.find(([c]) => c === cat)?.[1] ?? null;
      if (allowed && allowed.size === 0) return [];

      let q = (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .eq("category", cat)
        .limit(40);
      if (subcategoryIds && subcategoryIds.length > 0) {
        q = q.in("subcategory_id", subcategoryIds);
      }
      if (allowed) {
        // .in() chokes on huge lists (8k+ ids breaks URL length); cap
        // to 500 — for our DB this comfortably covers all real cases.
        const ids = Array.from(allowed).slice(0, 500);
        q = q.in("id", ids);
      }
      const { data } = await q;
      return (data ?? []) as any[];
    }),
  );
  return arrays.flat();
}

function computeIntent(text: string, categories: CategorySlug[]): "lookup" | "discovery" {
  if (NIGHTOUT_RE.test(text)) return "discovery";
  if (categories.length > 1) return "discovery";
  const tokens = tokenize(text);
  if (tokens.length >= 5) return "discovery";
  return "lookup";
}

// ── Ranking ───────────────────────────────────────────────────────────────

function scoreTitleMatch(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase().trim();
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const qTokens = tokenize(q);
  const tTokens = new Set(tokenize(t));
  const overlap = qTokens.filter((tok) => tTokens.has(tok)).length;
  if (overlap === 0) return 0;
  return Math.min(50, overlap * 15);
}

function rankScore(opts: {
  titleScore: number;
  avgRating: number;
  ratingCount: number;
  suggestionCount: number;
  ageDays: number;
}): number {
  const { titleScore, avgRating, ratingCount, suggestionCount, ageDays } = opts;
  const titlePart = titleScore * 5;
  const qualityPart = avgRating * Math.log(Math.max(1, ratingCount + 1));
  const popularityPart = suggestionCount * 0.5;
  const recencyPart = ageDays < 30 ? (30 - ageDays) * 0.3 : 0;
  return titlePart + qualityPart + popularityPart + recencyPart;
}

function tierFromScores(best: number, runnerUp: number): "high" | "medium" | "low" {
  if (best >= 500 && best - runnerUp >= 100) return "high";
  if (best >= 300) return "medium";
  return "low";
}

// ── Route ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const categoriesParam = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  // When the user removes the CATEGORY pill we set this flag so the route
  // skips the inferred-from-query category filter on the re-run. Without
  // it, removing the pill is futile because the regex would re-detect the
  // same trigger word (e.g. "βιβλίο") and re-apply the filter.
  const noCategoryFilter = searchParams.get("no_category_filter") === "1";

  if (!q) {
    return NextResponse.json({
      items: [],
      total: 0,
      intent: null,
      confidence_tier: null,
      featured: null,
      users: [],
      suggestions: [],
    });
  }

  const admin = createAdminClient();

  // 1. Intent extraction — Gemini is the single source of truth. The
  //    full DB taxonomy (categories, subcategories, cuisines, types,
  //    top-level regions) is injected into Gemini's system prompt so
  //    its structured output uses canonical DB values directly. Regex
  //    extractors below only fire as emergency fallback when the LLM
  //    call hard-errors (no API key / network down / parse fail).
  let llmAnalysis: SearchAnalysis | null = null;
  let llmFailed = false;
  try {
    llmAnalysis = await getAIService().analyzeSearchQuery(q);
  } catch (err) {
    console.error("[search] AI analyzeSearchQuery failed; using regex fallback:", err);
    llmFailed = true;
  }

  // Category resolution priority:
  //   1. Gemini's categories[] (when non-empty) — taxonomy-aware
  //   2. Regex extraction (when Gemini returned empty OR threw)
  //   3. [] — caller will NOT auto-expand to all venues. The route
  //      below requires an explicit category for the venue branch
  //      to fire, so 'no category detected' falls through to the
  //      cross-category title search rather than returning random
  //      venues from every category.
  const detectedCats: CategorySlug[] =
    !llmFailed && llmAnalysis && llmAnalysis.categories.length > 0
      ? llmAnalysis.categories
      : extractCategories(q);
  const categories: CategorySlug[] = noCategoryFilter
    ? []
    : categoriesParam.length > 0
      ? (categoriesParam as CategorySlug[])
      : detectedCats;

  const vibe = llmFailed ? extractVibe(q) : (llmAnalysis?.vibe ?? null);

  // Region resolution: if Gemini gave us a location, validate it
  // appears in the user's original query before trusting it. Gemini
  // sometimes inverts directions ("Βόρεια Προάστια" → "Νότια
  // Προάστια") which silently sends searches to the wrong area. Token
  // overlap check: every word in Gemini's location must appear (folded)
  // in the user's query — else fall back to the raw query for lookup.
  const isLocationInQuery = (loc: string | null | undefined): boolean => {
    if (!loc) return false;
    const queryFolded = foldGreek(q);
    const tokens = loc.toLowerCase().split(/\s+/).map(foldGreek).filter((t) => t.length >= 3);
    if (tokens.length === 0) return false;
    return tokens.every((t) => queryFolded.includes(t));
  };
  const trustedLocation = isLocationInQuery(llmAnalysis?.location)
    ? llmAnalysis!.location
    : null;
  const locationLookup = trustedLocation ?? q;
  const region = await resolveLocation(admin, locationLookup);
  const intent = computeIntent(q, categories);

  const analysis: SearchAnalysisOut = {
    categories,
    vibe,
    type: llmAnalysis?.type ?? null,
    location: region?.name ?? trustedLocation ?? null,
    intent,
    genre: llmAnalysis?.genre ?? null,
    channel: llmAnalysis?.channel ?? null,
    status: llmAnalysis?.status ?? null,
    period: llmAnalysis?.period ?? null,
    duration_min: llmAnalysis?.duration_min ?? null,
    duration_max: llmAnalysis?.duration_max ?? null,
    person: llmAnalysis?.person ?? null,
  };

  // 2. Items query.
  //    a) When a region was detected AND we have venue categories, filter
  //       venues via the extension table's region_id (lat/lng-aware filter
  //       isn't possible without geocoded items; region_id is the next-best
  //       grain we have).
  //    b) Otherwise: title ilike on items, scoped by category if detected.
  //    c) Auto-fallback: if (b) returns nothing AND a category was detected,
  //       retry as "discovery browse" — drop the title filter, return the
  //       most-suggested items in that category. Better than "no results"
  //       when the user wrote a vibe phrase ("βιβλίο για παραλία") that
  //       matches no title.
  const safeQ = q.replace(/[%_\\]/g, "\\$&");
  const venueCats = categories.filter((c) => VENUE_CATEGORIES.has(c));

  // Location tokens for address-text fallback. We try every 4+ char
  // folded token from the user's query — names like "χαλάνδρι" /
  // "παγκράτι" / "πλάκα" rarely live as their own region rows but DO
  // live in venue address text. BUT we have to subtract category-trigger
  // words ("μπαρ", "καφέ", "hotel") and Greek stopwords; otherwise a bar
  // in Kerkyra whose address contains "μπαρ" gets falsely included as
  // a "location match" for the query "γαλάτσι μπαρ". Real bug we hit.
  const STOPWORDS_FOLDED = new Set([
    // Category triggers (folded). Match the CATEGORY_KEYWORDS regexes.
    "μπαρ", "καφε", "ταινια", "ταινιες", "σειρα", "σειρες", "βιβλιο", "βιβλια",
    "συνταγη", "συνταγες", "εστιατοριο", "εστιατορια", "φαγητο", "ταβερνα",
    "ξενοδοχειο", "διαμονη", "θεατρο", "παρασταση", "συναυλια", "φεστιβαλ",
    "movie", "movies", "film", "series", "book", "books", "cafe", "coffee",
    "cocktail", "wine", "hotel", "stay", "theater", "theatre", "event",
    "concert", "festival", "restaurant", "burger", "sushi", "pizza", "ramen",
    "brunch", "musical", "pub", "resort", "villa",
    // Common Greek stopwords (4+ chars)
    "για", "στο", "στη", "στις", "στους", "και", "αυτο", "αυτη", "αυτος",
    "αυτη", "αυτα", "αυτες", "αυτους", "ειναι", "εχει", "εχω",
  ]);
  const allTokens = tokenize(q)
    .filter((t) => t.length >= 4)
    .map(foldGreek)
    .filter((t) => !STOPWORDS_FOLDED.has(t));

  // Split tokens by intent.
  //
  // When a location IS resolved/extracted: tokens that overlap the
  // location string are locationTokens (filtered against address
  // text); the rest are refinementTokens (filtered against title +
  // cuisine + type). Avoids "ψαροταβερνα στο γαλατσι" treating both
  // tokens as location and matching every Galatsi venue.
  //
  // When NO location is detected: tokens are AMBIGUOUS — could be a
  // type/cuisine ("μπακαλοταβέρνα") OR a sub-area name not in our
  // regions table ("παγκράτι"). We start as refinementTokens
  // (title/cuisine/type) so type-keyword queries work; if refinement
  // yields nothing we retry as locationTokens (address text) further
  // down. Catches both intents from a single ambiguous query.
  const locationFolded = region?.name
    ? foldGreek(region.name)
    : llmAnalysis?.location
      ? foldGreek(llmAnalysis.location)
      : "";
  const locationTokens = locationFolded
    ? allTokens.filter((t) => locationFolded.includes(t) || t.includes(locationFolded))
    : [];
  const refinementTokens = locationFolded
    ? allTokens.filter((t) => !(locationFolded.includes(t) || t.includes(locationFolded)))
    : allTokens;
  // Ambiguous bucket: the same tokens we tried as refinement, kept
  // separately so we can retry them as locationTokens if refinement
  // returns nothing. Empty when a location was detected (split is
  // already authoritative in that case).
  const ambiguousTokens = locationFolded ? [] : allTokens;
  // Pure place-name queries: ONLY broaden to all-venues when the user
  // typed nothing else but a region name. If they wrote refinement
  // tokens too (e.g. 'μεζεδοπωλειο αττικη' — where Gemini didn't know
  // the type), we should NOT silently mix events + hotels + bars into
  // the result. Better: require explicit category, fall through to
  // empty + chip clarification.
  //
  // Rule: auto-expand to all venues only when query is JUST a region
  // (no refinement tokens left after subtracting the region).
  const isPureRegionQuery = !!region && allTokens.every((t) =>
    locationFolded.includes(t) || t.includes(locationFolded)
  );
  const venueCatsForFilter = venueCats.length > 0
    ? venueCats
    : (region && isPureRegionQuery ? (Array.from(VENUE_CATEGORIES) as CategorySlug[]) : []);

  const useVenueBranch = venueCatsForFilter.length > 0;

  let items: any[] = [];
  let regionFallbackUsed = false;
  let addressMatchUsed = false;

  if (useVenueBranch && venueCatsForFilter.length > 0) {
    // Step 1: pull a generous candidate set per category — both region-
    // matched (when region_id is wired on the row) and unrestricted.
    // We then JS-filter by address-text against the user's location
    // tokens. This catches sub-regions like "Χαλάνδρι" that don't have
    // their own row in the regions table.
    //
    // Pick candidate limit based on intent:
    //   - location OR refinement/ambiguous tokens present → fetch the
    //     FULL extension table (~250-500 rows per category in our DB).
    //     We need every row because the JS-side filter (address text /
    //     title / cuisine / type) compares against a specific token —
    //     a recently-added match would be missed by a small LIMIT.
    //   - bare category trigger ("φαγητό", "ταινίες") with no further
    //     tokens → bounded sample (60), good enough for popular browse.
    const hasLocationContext = !!region || locationTokens.length > 0;
    const hasRefinement = refinementTokens.length > 0 || ambiguousTokens.length > 0;
    const limitPerCat = (hasLocationContext || hasRefinement)
      ? Math.ceil(800 / venueCatsForFilter.length)
      : Math.ceil(60 / venueCatsForFilter.length);
    // Build the region_id list. Includes the resolved region itself
    // plus ALL descendants (recursive — supports any tree depth, not
    // just direct children). 'Κρήτη' search captures items tagged to
    // 'Ηράκλειο' (prefecture) AND 'Ελούντα' (place under Ηράκλειο).
    const regionIds = region
      ? region.descendantIds.length > 0
        ? [region.id, ...region.descendantIds]
        : [region.id]
      : null;

    const arrays = await Promise.all(
      venueCatsForFilter.map((c) => fetchVenueItems(admin, c, {
        regionIds,
        limit: limitPerCat,
      })),
    );
    let candidates = arrays.flat();

    // If the region_id-scoped query came back empty (most legacy rows
    // have null region_id), retry without the constraint so we have a
    // candidate pool to filter by address.
    if (candidates.length === 0 && region) {
      const fallbackArrays = await Promise.all(
        venueCatsForFilter.map((c) => fetchVenueItems(admin, c, {
          regionIds: null,
          limit: limitPerCat,
        })),
      );
      candidates = fallbackArrays.flat();
    }

    // Step 2: address-text filter. If the user mentioned a place name,
    // keep ONLY candidates whose folded address contains any of those
    // tokens. No mixing with global-popular — that's how "καφέ χαλάνδρι"
    // started leaking results from Kerkyra. Either we found venues at
    // the named place or we didn't, and the banner explains honestly.
    if (locationTokens.length > 0) {
      const matched = candidates.filter((r) => {
        if (!r.address) return false;
        const folded = foldGreek(r.address);
        return locationTokens.some((tok) => folded.includes(tok));
      });
      if (matched.length > 0) {
        items = matched.map((r) => r.item);
        addressMatchUsed = true;
      } else {
        // Zero address-matches → leave items empty here. Step 3 below
        // either fills with popular-global-in-category (with the
        // honesty banner) or returns 0 if even that fails.
        items = [];
      }
    } else {
      items = candidates.map((r) => r.item);
    }

    // Refinement-token filter: when the user wrote "ψαροταβέρνα στο
    // γαλάτσι", 'ψαροταβερνα' is the type/cuisine intent. Match against
    // title_normalized AND the structured cuisine/type fields.
    //
    // If refinement wipes everything: previously we silently kept the
    // broader set, which leaked unrelated stuff ('μεζεδοπωλειο αττικη'
    // → all Attica venues including events). Now we return empty, let
    // the no_match flow surface chips so the user can clarify.
    if (refinementTokens.length > 0 && items.length > 0) {
      const candidateMap = new Map<string, typeof candidates[number]>();
      for (const c of candidates) candidateMap.set(c.item.id, c);

      // Pass 1: keep every item whose title or structured field matches
      // a refinement token. Title is a plain substring (proper-noun
      // variance we don't fuzzy); cuisine/type use tokenMatches for
      // Greek inflection.
      const matched = items.filter((it: any) => {
        const tn = (it.title_normalized ?? foldGreek(it.title ?? "")).toLowerCase();
        const c = candidateMap.get(it.id);
        const cuisine = c?.cuisine ? foldGreek(c.cuisine) : "";
        const type = c?.type ? foldGreek(c.type) : "";
        return refinementTokens.some((t) =>
          tn.includes(t) ||
          tokenMatches(t, cuisine) ||
          tokenMatches(t, type)
        );
      });

      // Pass 2: distinguish "title anchors" (items where the title
      // itself is the match — proper-noun lookups like "Μπακαλοταβέρνα")
      // from "type/cuisine matches" (items found via structured field).
      // When we have anchors, surface SMART related results — items
      // sharing both the anchor's TYPE and its ADDRESS area — and drop
      // the rest of the type/cuisine matches that aren't contextually
      // close. "μπακαλοταβέρνα" should return Μπακαλοταβέρνα + nearby
      // μεζεδοπωλεία in Χαλάνδρι, not every ταβέρνα in the country.
      const anchorIds = new Set<string>();
      for (const it of matched) {
        const tn = (it.title_normalized ?? foldGreek(it.title ?? "")).toLowerCase();
        if (refinementTokens.some((t) => tn.includes(t))) anchorIds.add(it.id);
      }

      if (anchorIds.size > 0) {
        // Build context (types + address tokens) from anchors.
        const anchorTypes = new Set<string>();
        const anchorAddrTokens = new Set<string>();
        anchorIds.forEach((id) => {
          const c = candidateMap.get(id);
          if (c?.type) anchorTypes.add(foldGreek(c.type).toLowerCase());
          if (c?.address) {
            for (const tok of foldGreek(c.address).toLowerCase().split(/[\s,.\-]+/)) {
              if (tok.length >= 4) anchorAddrTokens.add(tok);
            }
          }
        });

        const anchors: any[] = matched.filter((it: any) => anchorIds.has(it.id));

        // Related items: pull from the FULL candidate pool (not just
        // refinement-matched). Refinement may have rejected items that
        // don't match the strict tokens but ARE contextually similar
        // to the anchor — those are exactly what "related" should
        // surface.
        const buildRelated = (requireNearby: boolean): any[] => {
          const out: any[] = [];
          for (const c of candidates) {
            if (anchorIds.has(c.item.id)) continue;
            const itType = foldGreek(c.type ?? "").toLowerCase();
            if (!itType) continue;
            const sameType = Array.from(anchorTypes).some((at) => tokenMatches(at, itType));
            if (!sameType) continue;
            if (requireNearby) {
              const itAddr = foldGreek(c.address ?? "").toLowerCase();
              const nearby = itAddr.length > 0 && Array.from(anchorAddrTokens).some((at) => itAddr.includes(at));
              if (!nearby) continue;
            }
            out.push(c.item);
          }
          return out;
        };

        // Tier A: same type + nearby (strict). Tier B fallback: same
        // type anywhere — used only when A is empty (anchor's area has
        // no peers in the DB). UI/ranking can render tier-B as
        // "Παρόμοια" via the __related_tier tag.
        const tierA = buildRelated(true);
        if (tierA.length > 0) {
          items = [...anchors, ...tierA];
        } else {
          const tierB = buildRelated(false);
          for (const it of tierB) (it as any).__related_tier = "type_only";
          items = [...anchors, ...tierB];
        }
      } else {
        items = matched;
      }
      // items now: anchors + (optionally) contextually-similar siblings.
    }

    // Ambiguous-token address fallback. When no location was detected
    // and refinement returned nothing, retry the same tokens as
    // address-text matches — catches sub-area names absent from the
    // regions table (Παγκράτι, Καλαμάκι, …). Skipped when a location
    // was already resolved (the split above is authoritative there).
    if (items.length === 0 && ambiguousTokens.length > 0) {
      const matched = candidates.filter((r) => {
        if (!r.address) return false;
        const folded = foldGreek(r.address);
        return ambiguousTokens.some((tok) => folded.includes(tok));
      });
      if (matched.length > 0) {
        items = matched.map((r) => r.item);
        addressMatchUsed = true;
      }
    }

    // Period filter (events only). When Gemini extracted a `period`,
    // restrict event items to those whose dates jsonb overlaps the
    // resolved date range. Dates are parsed in JS because they're
    // stored as DD/MM/YY strings — Postgres can't filter them
    // natively. Non-event items pass through untouched (period only
    // applies semantically to events; theater venue items don't
    // surface dates at this layer).
    if (llmAnalysis?.period && venueCatsForFilter.includes("events")) {
      const datesById = new Map<string, unknown>();
      for (const c of candidates) {
        if (c.item.category === "events") datesById.set(c.item.id, c.dates);
      }
      items = items.filter((it: any) => {
        if (it.category !== "events") return true;
        return eventMatchesPeriod(datesById.get(it.id), llmAnalysis.period!);
      });
    }

    // People-search fallback for venue categories. Catches "θέατρο
    // μπέζος" (theater play with actor μπέζος) and "συναυλία dimitri
    // μάρας" (events with performer). Runs when refinement and
    // address fallback both yielded nothing. Uses Gemini's extracted
    // `person` when present, else the raw query — fetchPeopleMatches
    // handles the ilike across actors/director/writer/performers and
    // we keep only matches in the active venue category.
    if (items.length === 0) {
      const personQ = llmAnalysis?.person || q;
      if (personQ.trim().length >= 3) {
        const peopleHits = await fetchPeopleMatches(admin, personQ);
        const venueHits = peopleHits.filter((p) =>
          venueCatsForFilter.includes(p.item.category as CategorySlug),
        );
        if (venueHits.length > 0) {
          items = venueHits.map((p) => {
            (p.item as any).__matched_via = p.matchedField;
            return p.item;
          });
        }
      }
    }

    // Step 3: only fall back to global-popular when the user did NOT
    // specify a location. If they did and we had no matches, the UI's
    // no_match flow (chips + "Πρότεινέ το πρώτος") is the right answer
    // — showing them Kerkyra bars when they asked for Γαλάτσι is worse
    // than showing nothing.
    const userSpecifiedLocation = locationTokens.length > 0 || !!region;
    if (items.length === 0 && !userSpecifiedLocation) {
      const { data: fallback } = await (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .in("category", venueCatsForFilter)
        .order("suggestion_count", { ascending: false })
        .limit(20);
      items = fallback ?? [];
      regionFallbackUsed = true;
    } else if (items.length === 0 && userSpecifiedLocation) {
      // Honest empty state — caller will route to no_match UI.
      regionFallbackUsed = true;
    }
  } else {
    // Diacritic-insensitive search via the generated `title_normalized`
    // column (migration 014). Fold the query the same way (lowercase +
    // Greek accent strip) so a user typing "αθηνα" matches "Αθήνα".
    // Falls back to plain title ilike if the column doesn't exist yet
    // (pre-migration deploys).
    const foldedQ = safeQ
      .toLowerCase()
      .replace(/[άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ]/g, (ch) => {
        const map: Record<string, string> = {
          "ά":"α","έ":"ε","ή":"η","ί":"ι","ό":"ο","ύ":"υ","ώ":"ω",
          "ϊ":"ι","ϋ":"υ","ΐ":"ι","ΰ":"υ",
          "Ά":"α","Έ":"ε","Ή":"η","Ί":"ι","Ό":"ο","Ύ":"υ","Ώ":"ω","Ϊ":"ι","Ϋ":"υ",
        };
        return map[ch] ?? ch;
      });

    // Structured-filter primary path. When Gemini extracted genre /
    // channel / status / duration, query items via those fields
    // BEFORE the title ilike — the trigger words ("κωμωδίες",
    // "θρίλερ", "netflix") rarely appear in titles, so ilike alone
    // would miss them. The title ilike below still runs as a fallback
    // when structured returns zero (or wasn't applicable).
    const hasStructuredSignals = !!(
      llmAnalysis?.genre ||
      llmAnalysis?.channel ||
      llmAnalysis?.status ||
      llmAnalysis?.duration_min != null ||
      llmAnalysis?.duration_max != null
    );
    if (hasStructuredSignals) {
      items = await fetchByStructuredFilters(admin, {
        categories,
        genre: llmAnalysis?.genre ?? null,
        channel: llmAnalysis?.channel ?? null,
        status: llmAnalysis?.status ?? null,
        duration_min: llmAnalysis?.duration_min ?? null,
        duration_max: llmAnalysis?.duration_max ?? null,
        type: llmAnalysis?.type ?? null,
      });
    }

    // Match against title_normalized OR original_title_normalized so
    // users find items in either language. 'Lucifer' matches the Greek
    // 'Λούσιφερ' via its original_title; 'λούσιφερ' matches via title.
    // Migration 020 adds original_title_normalized; pre-migration falls
    // back to title-only.
    const buildQuery = (useNormalized: boolean, includeOriginal: boolean) => {
      let q = (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .limit(40);
      if (useNormalized) {
        q = includeOriginal
          ? q.or(`title_normalized.ilike.%${foldedQ}%,original_title_normalized.ilike.%${foldedQ}%`)
          : q.ilike("title_normalized", `%${foldedQ}%`);
      } else {
        q = q.ilike("title", `%${safeQ}%`);
      }
      if (categories.length > 0) q = q.in("category", categories);
      return q;
    };

    // Title ilike — only when structured didn't fill items, OR there
    // were no structured signals at all (proper-noun queries like
    // "Lucifer" / "Inception" land here).
    if (items.length === 0) {
      let { data, error: itemsErr } = await buildQuery(true, true);
      if (itemsErr && (itemsErr as any).code === "42703") {
        const retryNoOrig = await buildQuery(true, false);
        if (retryNoOrig.error && (retryNoOrig.error as any).code === "42703") {
          const retryPlain = await buildQuery(false, false);
          data = retryPlain.data;
        } else {
          data = retryNoOrig.data;
        }
      }
      items = data ?? [];
    }

    // Cross-category title fallback. When Gemini guessed the wrong
    // category for a proper-noun query (e.g. 'Άγριες ανεμώνες' is a
    // book but Gemini said 'series' from the word's vibe), the
    // category-filtered query above returns 0. Retry without the
    // category filter — if a real title matches, it should win
    // regardless of category. Fixes the "Gemini wrong category"
    // failure mode where users see garbage from the wrong category.
    if (items.length === 0 && categories.length > 0 && q.length >= 3) {
      const widerQ = (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .ilike("title_normalized", `%${foldedQ}%`)
        .limit(20);
      const { data: wider } = await widerQ;
      if (wider && wider.length > 0) {
        items = wider;
        // We dropped the category filter — clear analysis.categories
        // so the UI doesn't show a misleading CATEGORY pill.
        analysis.categories = [];
      }
    }

    // People search — find movies/series/books/theater/events where
    // actor/director/writer/performer matches. Uses Gemini's extracted
    // `person` when present (clean name) else the raw query — for
    // "θρίλερ Sebastian Fitzek", `person` is "Sebastian Fitzek" and
    // we search by that, not by the full query that includes "θρίλερ".
    if (q.length >= 3) {
      const personQ = llmAnalysis?.person || q;
      const peopleHits = await fetchPeopleMatches(admin, personQ);
      // Merge — dedup against title-matched items by id.
      const titleIds = new Set(items.map((it: any) => it.id));
      for (const ph of peopleHits) {
        if (!titleIds.has(ph.item.id)) {
          // Tag with the matched field so ranking can score appropriately
          // (people matches get ~60-point baseline, below an exact title).
          (ph.item as any).__matched_via = ph.matchedField;
          items.push(ph.item);
        }
      }
    }

    // Auto-fallback: title match returned nothing → browse the category(s)
    // by popularity. Saves the no-dead-end promise even before chips kick in.
    if (items.length === 0 && categories.length > 0) {
      const { data: fallback } = await (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .in("category", categories)
        .order("suggestion_count", { ascending: false })
        .limit(20);
      items = fallback ?? [];
    }
  }

  // 3. Score + rank
  const now = Date.now();
  const ranked = (items ?? []).map((it: any) => {
    const ageDays = (now - new Date(it.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const titleScore = scoreTitleMatch(q, it.title);
    // People match — director/writer/actor — gets a baseline 50 score so
    // it ranks alongside substring title matches but below exact titles.
    // Set in Step 2 above when peopleHits merged in.
    const peopleScore = (it as any).__matched_via ? 50 : 0;
    const effectiveScore = Math.max(titleScore, peopleScore);
    return {
      item: it,
      score: rankScore({
        titleScore: effectiveScore,
        avgRating: it.avg_rating ?? 0,
        ratingCount: it.rating_count ?? 0,
        suggestionCount: it.suggestion_count ?? 0,
        ageDays,
      }),
      titleScore: effectiveScore,
    };
  }).sort((a: any, b: any) => b.score - a.score);

  // 4. Confidence tier
  const tier = ranked.length === 0
    ? "low"
    : tierFromScores(ranked[0].score, ranked[1]?.score ?? 0);

  // 5. Featured hero — high tier + exact title match
  const featured = tier === "high" && ranked[0]?.titleScore >= 100 ? ranked[0].item : null;

  // 6. Users matching the query (handle / display_name)
  let users: Array<{ id: string; handle: string; display_name: string; avatar_url: string | null }> = [];
  if (q.length >= 2) {
    const { data: u } = await (admin.from("users") as any)
      .select("id, handle, display_name, avatar_url")
      .or(`handle.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`)
      .limit(3);
    users = (u ?? []).map((row: any) => ({
      id: row.id,
      handle: row.handle,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }));
  }

  // 7. Zero-result fallback — top items in the inferred category(s) so the
  // UI can offer "Πιθανώς εννοούσες..." / "Βρες κάτι παρόμοιο" without a
  // dead end.
  let suggestions: any[] = [];
  if (ranked.length === 0 && categories.length > 0) {
    const { data: fallback } = await (admin.from("items") as any)
      .select("id, title, slug, category, cover_url, poster_url, avg_rating, rating_count, suggestion_count")
      .eq("is_published", true)
      .in("category", categories)
      .order("suggestion_count", { ascending: false })
      .limit(6);
    suggestions = fallback ?? [];
  }

  // 8. Latent-intent log (hook-driven loop) — record no-match queries so
  // the fan-out trigger fires a notification when a matching item is
  // published later. Best-effort: any failure (table missing, network)
  // is swallowed so search keeps working before migration 013 is applied.
  // Lives in public.search_log (not analytics — Supabase PostgREST
  // exposure + schema-create perms made the analytics path bumpy).
  if (ranked.length === 0) {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const normalized = q
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      await (admin.from("search_log") as any).insert({
        user_id: user?.id ?? null,
        query: q,
        normalized,
        category: categories[0] ?? null,
        region_id: region?.id ?? null,
        was_no_match: true,
      });
    } catch {
      /* table missing pre-migration — non-fatal */
    }
  }

  return NextResponse.json({
    items: ranked.slice(0, 20).map((r: any) => r.item),
    total: ranked.length,
    intent: analysis,
    confidence_tier: tier,
    featured,
    users,
    suggestions,
    // Honesty flags — UI uses these to label results so a missing region
    // filter doesn't get presented as if it succeeded.
    region_fallback_used: regionFallbackUsed,
    address_match_used: addressMatchUsed,
  });
}
