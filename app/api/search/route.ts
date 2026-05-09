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

async function resolveLocation(
  admin: ReturnType<typeof createAdminClient>,
  text: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  // Pre-fetch all regions once (the table is small — ~80 rows in our DB)
  // and do the matching in JS so we can fold diacritics on both sides.
  // Direct ilike against accented region names misses "αθηνα" → "Αθήνα".
  const tokens = tokenize(text).filter((t) => t.length >= 4).map(foldGreek);
  if (tokens.length === 0) return null;
  const { data } = await (admin.from("regions") as any)
    .select("id, name, slug")
    .order("display_order", { ascending: true })
    .limit(500);
  if (!data) return null;
  for (const r of data as Array<{ id: string; name: string; slug: string }>) {
    const foldedName = foldGreek(r.name);
    const foldedSlug = r.slug.toLowerCase();
    if (tokens.some((tok) => foldedName.includes(tok) || foldedSlug.includes(tok))) {
      return r;
    }
  }
  return null;
}

/**
 * People search — finds movies/series/books where the actors / director /
 * writer field matches the query. Casts jsonb to text for ilike on the
 * actor-list field; plain ilike on text columns. Doesn't use LLM —
 * the same pattern that Joomla K2's cross-column search uses on large
 * datasets — but it makes "leonardo di caprio" actually find Leonardo
 * DiCaprio's films.
 */
async function fetchPeopleMatches(
  admin: ReturnType<typeof createAdminClient>,
  query: string,
): Promise<Array<{ item: any; matchedField: "actors" | "director" | "writer" }>> {
  const safe = query.trim().replace(/[%_\\]/g, "\\$&");
  if (safe.length < 3) return [];

  // Three parallel queries, one per (table × field). Each pulls a small
  // candidate set; we merge + dedup downstream by item_id.
  const tasks = [
    // Movies — actors jsonb cast to text
    (admin.from("item_movies") as any)
      .select(`item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
      .filter("actors::text", "ilike", `%${safe}%`)
      .limit(15)
      .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "actors" as const }))),
    // Movies — director text
    (admin.from("item_movies") as any)
      .select(`item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
      .ilike("director", `%${safe}%`)
      .limit(10)
      .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "director" as const }))),
    // Series — actors jsonb cast to text
    (admin.from("item_series") as any)
      .select(`item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
      .filter("actors::text", "ilike", `%${safe}%`)
      .limit(15)
      .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "actors" as const }))),
    // Series — director text
    (admin.from("item_series") as any)
      .select(`item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
      .ilike("director", `%${safe}%`)
      .limit(10)
      .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "director" as const }))),
    // Books — writer text
    (admin.from("item_books") as any)
      .select(`item_id, items!inner(id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
      .ilike("writer", `%${safe}%`)
      .limit(10)
      .then((r: any) => (r.data ?? []).map((row: any) => ({ item: row.items, matchedField: "writer" as const }))),
  ];

  const arrays = await Promise.all(tasks);
  const flat = arrays.flat().filter((r) => r.item && r.item.is_published);

  // Dedup by item_id — an actor + director match on the same movie should
  // count once.
  const seen = new Set<string>();
  const dedup: Array<{ item: any; matchedField: "actors" | "director" | "writer" }> = [];
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
async function fetchVenueItems(
  admin: ReturnType<typeof createAdminClient>,
  category: CategorySlug,
  opts: { regionId?: string | null; limit: number },
): Promise<Array<{ item: any; address: string | null }>> {
  const extTable = `item_${category}`;
  let q = (admin.from(extTable) as any)
    .select(`item_id, address, items!inner(id, title, title_normalized, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at, is_published)`)
    .limit(opts.limit);
  if (opts.regionId) q = q.eq("region_id", opts.regionId);
  const { data } = await q;
  return ((data ?? []) as any[])
    .map((row: any) => ({ item: row.items, address: row.address ?? null }))
    .filter((r) => r.item && r.item.is_published);
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

  // 1. Intent extraction — Gemini first (richer extraction: vibe, type,
  //    decade, price, person, location), regex as fallback for missing
  //    dimensions. Augmentation pattern: prefer LLM where set, fall back
  //    to regex per-dimension.
  let llmAnalysis: SearchAnalysis | null = null;
  try {
    llmAnalysis = await getAIService().analyzeSearchQuery(q);
  } catch (err) {
    console.error("[search] AI analyzeSearchQuery failed; falling back to regex:", err);
  }

  const regexCats = extractCategories(q);
  const detectedCats: CategorySlug[] =
    llmAnalysis && llmAnalysis.categories.length > 0
      ? llmAnalysis.categories
      : regexCats;
  const categories: CategorySlug[] = noCategoryFilter
    ? []
    : categoriesParam.length > 0
      ? (categoriesParam as CategorySlug[])
      : detectedCats;

  const vibe = llmAnalysis?.vibe ?? extractVibe(q);

  // Region resolution: if Gemini gave us a location, use it as the lookup
  // text (more canonical than the raw query); else use the raw query.
  const locationLookup = llmAnalysis?.location ?? q;
  const region = await resolveLocation(admin, locationLookup);
  const intent = computeIntent(q, categories);

  const analysis: SearchAnalysisOut = {
    categories,
    vibe,
    type: llmAnalysis?.type ?? null,
    location: region?.name ?? llmAnalysis?.location ?? null,
    intent,
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

  // Split tokens: anything matching the resolved/extracted LOCATION goes
  // into locationTokens (filtered against address text); everything else
  // is a refinement token (title / cuisine / type — filtered against
  // title_normalized). Without this split, "ψαροταβερνα στο γαλατσι"
  // matched any food venue in Galatsi because both tokens were treated
  // as location tokens.
  const locationFolded = region?.name
    ? foldGreek(region.name)
    : llmAnalysis?.location
      ? foldGreek(llmAnalysis.location)
      : "";
  const locationTokens = locationFolded
    ? allTokens.filter((t) => locationFolded.includes(t) || t.includes(locationFolded))
    : allTokens;
  const refinementTokens = locationFolded
    ? allTokens.filter((t) => !(locationFolded.includes(t) || t.includes(locationFolded)))
    : [];
  // Pure place-name queries (no detected category, just a token that
  // resolved to a known region row) imply the user wants venues in that
  // area — drop a default venue scope so we still return something.
  // BUT: don't auto-promote arbitrary 4+ char tokens to "maybe a place
  // name" because that would route any one-word lookup ("Anora") through
  // the venue branch. Only widen when the *region table* matched.
  const venueCatsForFilter = venueCats.length > 0
    ? venueCats
    : (region ? (Array.from(VENUE_CATEGORIES) as CategorySlug[]) : []);

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
    // When the user mentioned a location, fetch the FULL extension table
    // (per-category caps at ~250 rows in our DB — small enough to JS-
    // filter by address). Without a location, stay bounded.
    const hasLocationContext = !!region || locationTokens.length > 0;
    const limitPerCat = hasLocationContext
      ? Math.ceil(400 / venueCatsForFilter.length)
      : Math.ceil(60 / venueCatsForFilter.length);
    const arrays = await Promise.all(
      venueCatsForFilter.map((c) => fetchVenueItems(admin, c, {
        regionId: region?.id ?? null,
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
          regionId: null,
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

    // Refinement-token filter: when the user wrote something like
    // "ψαροταβέρνα στο γαλάτσι", "ψαροταβερνα" is the type/cuisine
    // intent. We keep ONLY items whose title_normalized contains a
    // refinement token. If that wipes everything, we relax — better
    // to show all Galatsi food than nothing — and flag with a fallback.
    if (refinementTokens.length > 0 && items.length > 0) {
      const beforeRefine = items.length;
      const refined = items.filter((it: any) => {
        const tn = (it.title_normalized ?? foldGreek(it.title ?? "")).toLowerCase();
        return refinementTokens.some((t) => tn.includes(t));
      });
      if (refined.length > 0) {
        items = refined;
      } else if (beforeRefine > 0) {
        // Refinement wiped everything; keep the broader set but the
        // UI still shows the original results. (No flag needed — this
        // is silent degradation; user sees fewer-than-expected hits
        // for their type but at least sees the area.)
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

    const buildQuery = (useNormalized: boolean) => {
      let q = (admin.from("items") as any)
        .select(
          "id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, avg_rating, rating_count, suggestion_count, created_at",
        )
        .eq("is_published", true)
        .limit(40);
      q = useNormalized
        ? q.ilike("title_normalized", `%${foldedQ}%`)
        : q.ilike("title", `%${safeQ}%`);
      if (categories.length > 0) q = q.in("category", categories);
      return q;
    };

    let { data, error: itemsErr } = await buildQuery(true);
    if (itemsErr && (itemsErr as any).code === "42703") {
      // title_normalized column missing — migration 014 not applied yet.
      const retry = await buildQuery(false);
      data = retry.data;
    }
    items = data ?? [];

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

    // People search — find movies/series/books where actor / director /
    // writer matches the query. Uses ilike on jsonb-cast-to-text + plain
    // text columns. Doesn't replace title hits; merges in BELOW them so a
    // search for "anora" still ranks the movie titled Anora first, but
    // "leonardo di caprio" surfaces his films even though no title contains
    // that string. Track B (LLM-extracted intent) will refine this further.
    if (q.length >= 3) {
      const peopleHits = await fetchPeopleMatches(admin, q);
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
