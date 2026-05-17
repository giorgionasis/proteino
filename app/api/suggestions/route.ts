import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type { CategorySlug } from "@/types";
import { processAndStoreItemImageFromUrl } from "@/lib/item-image-upload";
import { resolveOneMoment, buildVars } from "@/lib/moments";
import type { ResolvedMoment } from "@/lib/moments";

// Node runtime: Sharp (used by the image pipeline kicked off after item
// creation) has native bindings and can't run on Edge.
export const runtime = "nodejs";
// Pipeline can take 5–10s for poster + backdrop combined; allow headroom.
export const maxDuration = 60;

const GREEK_TO_LATIN: Record<string, string> = {
  "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
  "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
  "ΐ":"i","ΰ":"y",
};
function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => GREEK_TO_LATIN[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * TMDB genre ID → our subcategory slug. We key by numeric ID, not name,
 * because TMDB returns genre names in whatever locale we ask for (we ask
 * for el-GR for the user-facing flow) — IDs are stable across locales.
 *
 * Some TMDB genres don't have a direct match in our taxonomy; we pick the
 * nearest neighbour. When TMDB returns several, we walk in order and take
 * the first that maps — typically the most descriptive (Drama, Comedy)
 * over the catch-alls (Family, Music).
 *
 * Reference: https://developer.themoviedb.org/reference/genre-movie-list
 */
const TMDB_GENRE_TO_SLUG: Record<"movies" | "series", Record<number, string>> = {
  movies: {
    28:    "drasi",        // Action
    12:    "drasi",        // Adventure
    16:    "animation",    // Animation
    35:    "komodia",      // Comedy
    80:    "thriler",      // Crime
    99:    "ntokimanter",  // Documentary
    18:    "drama",        // Drama
    10751: "drama",        // Family
    14:    "sci-fi",       // Fantasy
    36:    "viografiki",   // History
    27:    "horror",       // Horror
    10402: "mousikal",     // Music
    9648:  "thriler",      // Mystery
    10749: "romantiki",    // Romance
    878:   "sci-fi",       // Science Fiction
    10770: "drama",        // TV Movie
    53:    "thriler",      // Thriller
    10752: "drasi",        // War
    37:    "drasi",        // Western
  },
  series: {
    10759: "drasi",        // Action & Adventure
    16:    "animation",    // Animation
    35:    "komodia",      // Comedy
    80:    "crime",        // Crime
    99:    "ntokimanter",  // Documentary
    18:    "drama",        // Drama
    10751: "drama",        // Family
    10762: "animation",    // Kids
    9648:  "thriler",      // Mystery
    10763: "ntokimanter",  // News
    10764: "ntokimanter",  // Reality
    10765: "sci-fi",       // Sci-Fi & Fantasy
    10766: "drama",        // Soap
    10767: "ntokimanter",  // Talk
    10768: "drasi",        // War & Politics
    37:    "drasi",        // Western
  },
};

/** Resolve subcategory_id from TMDB genre IDs for a given category. */
async function resolveSubcategoryId(
  admin: ReturnType<typeof createAdminClient>,
  category: "movies" | "series",
  genreIds: number[],
): Promise<string | null> {
  if (!genreIds || genreIds.length === 0) return null;
  const map = TMDB_GENRE_TO_SLUG[category];
  for (const id of genreIds) {
    const slug = map[id];
    if (!slug) continue;
    const { data } = await admin
      .from("subcategories")
      .select("id")
      .eq("category", category)
      .eq("slug", slug)
      .maybeSingle();
    if (data) return (data as any).id;
  }
  return null;
}

/** Build the item_movies / item_series payload from ai_match_data. */
function buildVideoExtPayload(
  itemId: string,
  category: "movies" | "series",
  md: Record<string, any>,
): Record<string, any> {
  const actors = Array.isArray(md.cast)
    ? md.cast.map((c: any) => ({ name: c?.name ?? "", avatar: c?.avatar ?? null }))
    : [];
  const payload: Record<string, any> = {
    item_id: itemId,
    director: typeof md.director === "string" ? md.director : null,
    actors: actors.length > 0 ? actors : null,
    plot: typeof md.plot === "string" ? md.plot : null,
    country: typeof md.country === "string" ? md.country : null,
    language: typeof md.language === "string" ? md.language : null,
    trailer_url: null,
  };
  if (category === "movies") {
    payload.duration_min = typeof md.runtime === "number" ? md.runtime : null;
  }
  if (md.year) payload.release_date = `${md.year}-01-01`;
  return payload;
}

/** Build the item_books payload from a Google Books ai_match_data
 *  (source === "google-books"). Maps:
 *    writer ← md.writer (first author)
 *    publication ← md.publisher
 *    language ← md.language (ISO code, e.g. "el", "en")
 *    pages ← md.pages
 *    publication_year ← md.publication_year
 *    plot ← md.plot (description)
 *
 *  is_trilogy / trilogy_name stay null — Google Books doesn't expose
 *  series metadata at this level; admin sets via editor. */
function buildBookExtPayload(itemId: string, md: Record<string, any>): Record<string, any> {
  return {
    item_id: itemId,
    writer: typeof md.writer === "string" ? md.writer : null,
    publication: typeof md.publisher === "string" ? md.publisher : null,
    language: typeof md.language === "string" ? md.language : null,
    pages: typeof md.pages === "number" ? md.pages : null,
    publication_year: typeof md.publication_year === "number" ? md.publication_year : null,
    plot: typeof md.plot === "string" ? md.plot : null,
    is_trilogy: false,
    trilogy_name: null,
  };
}

/** Derive a Proteino-style cuisine label from a Google Places types[]
 *  array when one of the cuisine-coded restaurant types is present
 *  ("italian_restaurant" → "Ιταλική"). Returns null when no cuisine
 *  signal — admin can fill via editor later. */
function deriveCuisine(types: unknown): string | null {
  if (!Array.isArray(types)) return null;
  const map: Record<string, string> = {
    italian_restaurant: "Ιταλική",
    japanese_restaurant: "Ιαπωνική",
    chinese_restaurant: "Κινέζικη",
    indian_restaurant: "Ινδική",
    mexican_restaurant: "Μεξικάνικη",
    french_restaurant: "Γαλλική",
    spanish_restaurant: "Ισπανική",
    thai_restaurant: "Ταϊλανδέζικη",
    korean_restaurant: "Κορεάτικη",
    vietnamese_restaurant: "Βιετναμέζικη",
    greek_restaurant: "Ελληνική",
    mediterranean_restaurant: "Μεσογειακή",
    seafood_restaurant: "Θαλασσινά",
    vegan_restaurant: "Vegan",
    vegetarian_restaurant: "Χορτοφαγική",
    steak_house: "Steak House",
    sushi_restaurant: "Sushi",
    pizza_restaurant: "Πίτσα",
    fast_food_restaurant: "Fast food",
  };
  for (const t of types) {
    if (typeof t === "string" && map[t]) return map[t];
  }
  return null;
}

/** Build the item_food / item_bars / item_hotels payload from a Google
 *  Places ai_match_data (source === "google-places"). Common fields
 *  across all three venue extensions: type, address, telephone, lat,
 *  lng, external_ratings, plot. Hotels add price_range from
 *  md.price_level. Food adds cuisine derived from primary_type. */
function buildVenueExtPayload(
  itemId: string,
  category: "food" | "bars" | "hotels",
  md: Record<string, any>,
): Record<string, any> {
  // Prefer Greek label when Google gave us one — that's what the
  // admin + detail surfaces want to display. Falls back to the raw
  // primary_type when label is missing.
  const venueType =
    (typeof md.primary_type_label === "string" && md.primary_type_label) ||
    (typeof md.primary_type === "string" ? md.primary_type : null);

  const base: Record<string, any> = {
    item_id: itemId,
    type: venueType,
    address: typeof md.address === "string" ? md.address : null,
    telephone: typeof md.telephone === "string" ? md.telephone : null,
    lat: typeof md.lat === "number" ? md.lat : null,
    lng: typeof md.lng === "number" ? md.lng : null,
    external_ratings:
      md.external_ratings && typeof md.external_ratings === "object" ? md.external_ratings : null,
    information: {
      ...(typeof md.website === "string" ? { website: md.website } : {}),
      ...(typeof md.google_maps_url === "string" ? { google_maps_url: md.google_maps_url } : {}),
      ...(md.opening_hours ? { opening_hours: md.opening_hours } : {}),
      ...(typeof md.price_level === "number" ? { price_level: md.price_level } : {}),
      ...(Array.isArray(md.types) && md.types.length > 0 ? { google_types: md.types } : {}),
      ...(typeof md.google_places_id === "string" ? { google_places_id: md.google_places_id } : {}),
    },
    plot: typeof md.plot === "string" ? md.plot : null,
  };

  if (category === "food") {
    base.cuisine = deriveCuisine(md.types);
    base.delivery_links = null;
  }
  if (category === "hotels") {
    // price_level 0-4 → price_range buckets: 0-1 = "€", 2 = "€€",
    // 3 = "€€€", 4 = "€€€€". Null when Google didn't classify.
    const pl = md.price_level;
    base.price_range =
      typeof pl !== "number"
        ? null
        : pl <= 1 ? "€" : pl === 2 ? "€€" : pl === 3 ? "€€€" : "€€€€";
    base.facilities = null;
  }
  return base;
}

const VENUE_CATEGORIES = new Set<CategorySlug>(["food", "bars", "hotels"]);
const VENUE_EXT_TABLE: Record<"food" | "bars" | "hotels", string> = {
  food: "item_food",
  bars: "item_bars",
  hotels: "item_hotels",
};

interface SubmitBody {
  category: CategorySlug;
  title: string;
  reflection?: string;
  rating?: number;
  ai_match_data?: Record<string, unknown> | null;
  ai_quality_score?: number | null;
  cover_url?: string | null;
}

/**
 * POST /api/suggestions
 *
 * The user-facing submission flow's persistence endpoint. Called by
 * `useSubmission.publish()` when the user confirms their suggestion.
 *
 * Behavior:
 *  1. Auth (must be logged in).
 *  2. Validate body (category + title required).
 *  3. Resolve item: lookup by `${category}/${slug}`. Insert if missing.
 *  4. Duplicate check: has this user already suggested this item?
 *     - same user → 409 with `kind: "own"` (UI shows "Το έχεις ήδη προτείνει εσύ! 😄")
 *     - other user → 409 with `kind: "other"` + suggester handle (UI shows
 *       "Το [item] έχει ήδη προταθεί" with rate/follow CTAs)
 *  5. Insert suggestion with real SHA-256 content_hash (proof of authorship).
 *  6. Return new suggestion id, item slug, and the user's *new*
 *     suggestion_count so <AchievementProgress> can animate.
 *
 * Notes:
 * - `suggestion_count` and `avg_rating` on items are denormalized — we don't
 *   recompute here; admin processes / DB triggers handle that. We DO bump
 *   users.suggestion_count so the achievement block reflects reality
 *   immediately.
 * - Service-role client is used for the items insert (RLS would block an
 *   authenticated insert from a non-admin user). Suggestion insert also uses
 *   service role; we already validated auth at the top.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as SubmitBody;
  const title = body.title?.trim();
  const category = body.category;
  const reflection = body.reflection?.trim() || null;
  const rating = typeof body.rating === "number" ? body.rating : null;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });
  if (rating !== null && (rating < 0 || rating > 5)) {
    return NextResponse.json({ error: "rating must be 0–5" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Resolve or create the item
  const baseSlug = slugify(title);
  const fullSlug = `${category}/${baseSlug}`;

  const { data: existingItem } = await admin
    .from("items")
    .select("id, slug, title, subcategory_id")
    .eq("slug", fullSlug)
    .maybeSingle();

  let itemId: string;
  let itemSlug: string;

  // Pull rich metadata out of ai_match_data (TMDB / Books / Places shape).
  const md = (body.ai_match_data ?? {}) as Record<string, any>;
  const tmdbGenreIds: number[] = Array.isArray(md.genre_ids)
    ? md.genre_ids.filter((n: any): n is number => typeof n === "number")
    : [];

  if (existingItem) {
    itemId = (existingItem as any).id;
    itemSlug = (existingItem as any).slug;

    // 2. Duplicate check — has anyone already suggested this item?
    // Only PUBLISHED suggestions block resubmission — admin can
    // unpublish via the editor to free the user up. See sibling logic
    // in /api/suggestions/check/route.ts.
    const { data: dup } = await admin
      .from("suggestions")
      .select("id, user_id, users!suggestions_user_id_fkey(id, handle, display_name, avatar_url)")
      .eq("item_id", itemId)
      .eq("is_published", true)
      .limit(1)
      .maybeSingle();

    if (dup) {
      const ownSuggestion = (dup as any).user_id === user.id;
      // Pre-compute is_following so the DuplicateScreen's follow CTA
      // shows the right state without a second round-trip.
      let isFollowing = false;
      if (!ownSuggestion) {
        const { data: f } = await admin
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", (dup as any).user_id)
          .maybeSingle();
        isFollowing = !!f;
      }
      return NextResponse.json(
        {
          error: "duplicate",
          kind: ownSuggestion ? "own" : "other",
          suggestion_id: (dup as any).id,
          item_slug: itemSlug,
          suggester: ownSuggestion ? null : (dup as any).users,
          is_following: isFollowing,
        },
        { status: 409 }
      );
    }

    // Existing item with no suggestions yet (e.g. legacy MySQL row, or
    // created earlier by a flow that bailed). Backfill anything missing
    // from the fresh enrichment payload — extension row, subcategory_id
    // — so the admin/detail surfaces aren't half-empty.
    if ((category === "movies" || category === "series") && md.tmdb_id) {
      const extTable = category === "movies" ? "item_movies" : "item_series";
      const { data: existingExt } = await admin
        .from(extTable)
        .select("item_id")
        .eq("item_id", itemId)
        .maybeSingle();
      if (!existingExt) {
        const { error: extErr } = await (admin.from(extTable) as any)
          .insert(buildVideoExtPayload(itemId, category, md));
        if (extErr) console.error(`[suggestions] enrich ${extTable} for existing ${itemId}:`, extErr.message);
      }
      if (!(existingItem as any).subcategory_id) {
        const subId = await resolveSubcategoryId(admin, category, tmdbGenreIds);
        if (subId) {
          const { error: subErr } = await (admin.from("items") as any)
            .update({ subcategory_id: subId })
            .eq("id", itemId);
          if (subErr) console.error(`[suggestions] subcategory backfill for existing ${itemId}:`, subErr.message);
        }
      }
    }
    // Books — enrich from Google Books matchData when present.
    if (category === "books" && md.source === "google-books") {
      const { data: existingExt } = await admin
        .from("item_books")
        .select("item_id")
        .eq("item_id", itemId)
        .maybeSingle();
      if (!existingExt) {
        const { error: extErr } = await (admin.from("item_books") as any)
          .insert(buildBookExtPayload(itemId, md));
        if (extErr) console.error(`[suggestions] enrich item_books for existing ${itemId}:`, extErr.message);
      }
    }
    // Venues (food/bars/hotels) — enrich from Google Places matchData.
    if (VENUE_CATEGORIES.has(category) && md.source === "google-places") {
      const venueCat = category as "food" | "bars" | "hotels";
      const extTable = VENUE_EXT_TABLE[venueCat];
      const { data: existingExt } = await admin
        .from(extTable)
        .select("item_id")
        .eq("item_id", itemId)
        .maybeSingle();
      if (!existingExt) {
        const { error: extErr } = await (admin.from(extTable) as any)
          .insert(buildVenueExtPayload(itemId, venueCat, md));
        if (extErr) console.error(`[suggestions] enrich ${extTable} for existing ${itemId}:`, extErr.message);
      }
    }
  } else {
    // Create new item — start with a unique slug suffix loop in case of
    // case-insensitive collisions or whitespace variations.
    let candidate = baseSlug;
    let n = 1;
    while (true) {
      const { data: clash } = await admin
        .from("items")
        .select("id")
        .eq("slug", `${category}/${candidate}`)
        .maybeSingle();
      if (!clash) break;
      candidate = `${baseSlug}-${++n}`;
    }
    itemSlug = `${category}/${candidate}`;

    const posterUrl = typeof md.poster_url === "string" ? md.poster_url : null;
    const backdropUrl = typeof md.backdrop_url === "string" ? md.backdrop_url : null;
    const coverUrl = body.cover_url ?? posterUrl ?? backdropUrl ?? null;

    // Resolve subcategory_id from TMDB genres. Best-effort — null when no
    // genre matches our taxonomy (admin can pick later).
    const subcategoryId =
      category === "movies" || category === "series"
        ? await resolveSubcategoryId(admin, category, tmdbGenreIds)
        : null;

    const { data: newItem, error: itemErr } = await (admin.from("items") as any)
      .insert({
        title,
        slug: itemSlug,
        category,
        subcategory_id: subcategoryId,
        cover_url: coverUrl,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        description_seo: typeof md.plot === "string" ? md.plot.slice(0, 500) : null,
        is_published: true,
        avg_rating: rating ?? 0,
        rating_count: rating !== null ? 1 : 0,
        suggestion_count: 1,
        // images is owned by the image pipeline (processAndStoreItemImage
        // writes the dual-shape JSONB with poster/backdrop/og variants).
        // Don't seed an array here — it collides with the pipeline's
        // object shape and gets wiped on first pipeline run anyway.
        // Admin gallery photos land under images.gallery, set later
        // via the editor (see mergeGalleryIntoImages).
        images: {},
        metadata: {
          tags: [],
          ...(md.tmdb_id ? { tmdb_id: md.tmdb_id } : {}),
        },
      })
      .select("id, slug")
      .single();

    if (itemErr || !newItem) {
      return NextResponse.json(
        { error: itemErr?.message ?? "item insert failed" },
        { status: 500 }
      );
    }
    itemId = (newItem as any).id;
    itemSlug = (newItem as any).slug;

    // Extension row. Best-effort — failures are logged, not fatal: the
    // suggestion still publishes, admin editor can fill gaps later.
    if (category === "movies" || category === "series") {
      const extTable = category === "movies" ? "item_movies" : "item_series";
      const { error: extErr } = await (admin.from(extTable) as any)
        .insert(buildVideoExtPayload(itemId, category, md));
      if (extErr) console.error(`[suggestions] insert ${extTable} for new ${itemId}:`, extErr.message);
    }
    if (category === "books" && md.source === "google-books") {
      const { error: extErr } = await (admin.from("item_books") as any)
        .insert(buildBookExtPayload(itemId, md));
      if (extErr) console.error(`[suggestions] insert item_books for new ${itemId}:`, extErr.message);
    }
    if (VENUE_CATEGORIES.has(category) && md.source === "google-places") {
      const venueCat = category as "food" | "bars" | "hotels";
      const extTable = VENUE_EXT_TABLE[venueCat];
      const { error: extErr } = await (admin.from(extTable) as any)
        .insert(buildVenueExtPayload(itemId, venueCat, md));
      if (extErr) console.error(`[suggestions] insert ${extTable} for new ${itemId}:`, extErr.message);
    }

    // Image pipeline: when AI matched a TMDB / Books / Places result,
    // run those URLs through Sharp → 4 WebP variants + OG JPEG → store
    // in Supabase + update items.images jsonb. Done in parallel so the
    // submission flow doesn't double its latency.
    //
    // Awaited so when /published is shown to the user the optimized URLs
    // are already live (cover_url/poster_url/backdrop_url replaced).
    // If pipeline fails, the item still has the original TMDB URLs as
    // fallback (whitelisted in next.config.mjs), so the page still works.
    const pipelineJobs: Promise<unknown>[] = [];
    if (posterUrl) {
      pipelineJobs.push(
        processAndStoreItemImageFromUrl(admin, itemId, "poster", posterUrl)
          .catch((e: any) => console.error(`[suggestions] pipeline poster ${itemId}:`, e?.message ?? e))
      );
    }
    if (backdropUrl) {
      pipelineJobs.push(
        processAndStoreItemImageFromUrl(admin, itemId, "backdrop", backdropUrl)
          .catch((e: any) => console.error(`[suggestions] pipeline backdrop ${itemId}:`, e?.message ?? e))
      );
    }
    if (pipelineJobs.length > 0) {
      await Promise.allSettled(pipelineJobs);
    }
  }

  // 3. Insert the suggestion
  const now = new Date().toISOString();
  const contentHash = crypto
    .createHash("sha256")
    .update(`${user.id}|${itemId}|${reflection ?? ""}|${now}`)
    .digest("hex");

  const { data: sugRow, error: sugErr } = await (admin.from("suggestions") as any)
    .insert({
      user_id: user.id,
      item_id: itemId,
      reflection,
      rating,
      ai_quality_score: body.ai_quality_score ?? null,
      ai_match_data: body.ai_match_data ?? null,
      content_hash: contentHash,
      is_published: true,
      published_at: now,
    })
    .select("id")
    .single();

  if (sugErr || !sugRow) {
    return NextResponse.json(
      { error: sugErr?.message ?? "suggestion insert failed" },
      { status: 500 }
    );
  }

  // 4. Bump the user's suggestion_count + last_suggestion_at so the
  //    achievement block animates immediately. We compute the new count
  //    by reading current then writing — race-safe enough for individual
  //    user actions (the user can't double-publish).
  const { data: userRow } = await admin
    .from("users")
    .select("suggestion_count")
    .eq("id", user.id)
    .single();

  const newCount = ((userRow as any)?.suggestion_count ?? 0) + 1;

  await (admin.from("users") as any)
    .update({ suggestion_count: newCount, last_suggestion_at: now })
    .eq("id", user.id);

  // 4a. Achievement moment — resolved via the DB-driven `moments` table
  //     (migration 026/027). The resolver picks the highest-priority
  //     active row matching `trigger_event='suggestion_published'`
  //     whose predicate evaluates true for this user's new count, then
  //     interpolates copy placeholders ({count}, {remaining}, {ordinal})
  //     before returning. Admins can edit copy + timing + add new
  //     variants via /admin/moments without a code change.
  const { data: userMeta } = await admin
    .from("users")
    .select("handle, display_name")
    .eq("id", user.id)
    .single();

  const targetForCount =
    newCount <= 3  ? 3  :
    newCount <= 10 ? 10 :
    newCount <= 25 ? 25 : 50;
  const badgeForTarget =
    targetForCount === 3  ? "verified" :
    targetForCount === 10 ? "gold" :
    targetForCount === 25 ? "expert"   : "platinum";

  const momentCtx = {
    user: {
      id:               user.id,
      handle:           (userMeta as any)?.handle ?? null,
      display_name:     (userMeta as any)?.display_name ?? null,
      suggestion_count: newCount,
    },
    payload: {
      count:    newCount,
      category,
    },
    vars: buildVars({
      user:    { handle: (userMeta as any)?.handle, display_name: (userMeta as any)?.display_name },
      category,
      count:   newCount,
      target:  targetForCount,
      badge:   badgeForTarget,
    }),
  };

  const achievementRaw: ResolvedMoment | null = await resolveOneMoment(
    "suggestion_published",
    "achievement_modal",
    momentCtx,
  );
  // Enrich display with the runtime count — the modal uses it to draw
  // progress dots ([target - dotCount + 1 .. target]). Stored alongside
  // the moment's own display knobs (variant/badge/target/delay_ms).
  const achievement = achievementRaw
    ? { ...achievementRaw, display: { ...achievementRaw.display, count: newCount } }
    : null;

  // 5. Hook moments (HOOKS.md §2B). Three cheap counts that drive the
  //    Published screen's social-proof + variable-reward block. Computed
  //    in parallel; failures degrade gracefully (counts default to 0).
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [weeklyRes, audienceRes, followersRes] = await Promise.all([
    // Total suggestions (any user) in the last 7 days, including the one
    // we just inserted. Drives "Ήσουν ο Nth που πρότεινε αυτή την εβδομάδα".
    admin
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString()),
    // Distinct users with a bookmark in this category — soft proxy for
    // "how many people care about this category". No "follow category"
    // feature exists yet; bookmarks are the closest engagement signal.
    admin
      .from("bookmarks")
      .select("user_id", { count: "exact", head: true })
      .eq("category", category),
    // Followers of the suggester — drives "X χρήστες σε ακολουθούν —
    // θα το δουν στο feed τους". Only meaningful when > 0.
    admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id),
  ]);

  return NextResponse.json({
    suggestion_id: (sugRow as any).id,
    item_id: itemId,
    item_slug: itemSlug,
    new_suggestion_count: newCount,
    weekly_count: weeklyRes.count ?? 0,
    category_audience_count: audienceRes.count ?? 0,
    my_followers_count: followersRes.count ?? 0,
    achievement,
  });
}

// Achievement trigger schedule + copy now lives in the DB-driven
// `moments` table (migration 026/027). The resolver in lib/moments
// replaces the previous hardcoded TRIGGERS map + computeAchievement
// helper.
