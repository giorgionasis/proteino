import { scoreTitleMatch } from "./scoring";

/**
 * Typed Google Places (New) client. Powers food + bars enrichment.
 *
 * Uses the modern Places API (places.googleapis.com/v1/*) with field
 * masks for billing control. Greek-localized via languageCode=el +
 * regionCode=GR so primaryTypeDisplayName comes back in Greek
 * ("Πολυτελές εστιατόριο" instead of "Fine dining restaurant").
 *
 * One searchText call per submission — the field mask carries
 * everything we need (address, phone, website, hours, rating, photo
 * reference). No second Place Details round-trip in the common path,
 * which keeps cost at ~$32/1000 submissions instead of ~$50/1000.
 *
 * Photo fetching is intentionally deferred — we surface the photo
 * reference and let the consumer build the photo URL on-demand
 * ($7/1000 per fetch, only billed when actually loaded).
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

/** Fields requested per search hit. Each field-class bumps the
 *  billing tier; this set targets Text Search "Enterprise + Contact"
 *  which gives us everything for a submission preview in one call. */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.regularOpeningHours",
  "places.editorialSummary",
  "places.photos",
].join(",");

export interface GooglePlaceMatch {
  id: string;
  /** Localized canonical name (Greek when GR/el headers set). */
  name: string;
  formatted_address: string | null;
  short_address: string | null;
  lat: number | null;
  lng: number | null;
  phone_national: string | null;
  phone_international: string | null;
  website: string | null;
  google_maps_url: string | null;
  rating: number | null;
  rating_count: number | null;
  /** PRICE_LEVEL_INEXPENSIVE → 1, MODERATE → 2, EXPENSIVE → 3, VERY_EXPENSIVE → 4. */
  price_level: number | null;
  primary_type: string | null;
  /** Greek display label, e.g. "Ταβέρνα", "Πολυτελές εστιατόριο". */
  primary_type_label: string | null;
  types: string[];
  opening_hours: {
    open_now: boolean | null;
    weekday_descriptions: string[];
  } | null;
  /** Short editorial blurb when Google has one for this venue. */
  description: string | null;
  /** First photo's resource name (build URL on-demand via photoUrl()). */
  primary_photo_name: string | null;
  /** All photo names — useful if the gallery surface wants more. */
  photo_names: string[];
  /** 0-100 vs. the user's query — drives tier selection. */
  match_score: number;
}

interface PlacesSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    shortFormattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    primaryType?: string;
    primaryTypeDisplayName?: { text?: string };
    types?: string[];
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    regularOpeningHours?: {
      openNow?: boolean;
      weekdayDescriptions?: string[];
    };
    editorialSummary?: { text?: string };
    photos?: Array<{ name: string }>;
  }>;
  error?: { code: number; message: string; status: string };
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function mapPlace(place: NonNullable<PlacesSearchResponse["places"]>[number], query: string): GooglePlaceMatch | null {
  const name = place.displayName?.text;
  if (!name) return null;
  const photos = (place.photos ?? []).map((p) => p.name);
  return {
    id: place.id,
    name,
    formatted_address: place.formattedAddress ?? null,
    short_address: place.shortFormattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    phone_national: place.nationalPhoneNumber ?? null,
    phone_international: place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    google_maps_url: place.googleMapsUri ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    rating_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    price_level: place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
    primary_type: place.primaryType ?? null,
    primary_type_label: place.primaryTypeDisplayName?.text ?? null,
    types: Array.isArray(place.types) ? place.types : [],
    opening_hours: place.regularOpeningHours
      ? {
          open_now: place.regularOpeningHours.openNow ?? null,
          weekday_descriptions: place.regularOpeningHours.weekdayDescriptions ?? [],
        }
      : null,
    description: place.editorialSummary?.text ?? null,
    primary_photo_name: photos[0] ?? null,
    photo_names: photos,
    match_score: scoreTitleMatch(query, name),
  };
}

/** Build a fetchable photo URL from the resource name returned in
 *  primary_photo_name / photo_names. Each fetch costs ~$0.007 — only
 *  call when actually displaying. */
export function photoUrl(photoName: string, opts?: { maxWidthPx?: number; maxHeightPx?: number }): string | null {
  if (!photoName) return null;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ key });
  if (opts?.maxWidthPx) params.set("maxWidthPx", String(opts.maxWidthPx));
  if (opts?.maxHeightPx) params.set("maxHeightPx", String(opts.maxHeightPx));
  // Default to a sensible size if neither given.
  if (!opts?.maxWidthPx && !opts?.maxHeightPx) params.set("maxWidthPx", "1200");
  return `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`;
}

/**
 * Find a venue on Google Places matching the user's text. Wraps the
 * query with `locationHint` (Athens / Thessaloniki / Mykonos etc.)
 * when supplied to bias against same-name venues in other regions.
 *
 * Returns null when Google has no places key configured. Returns a
 * weak match (<60) when nothing scores well — caller decides whether
 * to use it.
 */
export async function searchGooglePlace(opts: {
  /** The venue name as extracted by Gemini ("Διόνυσος"). */
  name: string;
  /** Optional location bias — added to the text query
   *  ("Δίοενυσος Πλάκα Αθήνα"). */
  locationHint?: string | null;
  /** "food" or "bars" — drives which Google place types we accept. */
  category: "food" | "bars" | "hotels";
}): Promise<GooglePlaceMatch | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.warn("[google-places] GOOGLE_PLACES_API_KEY not set");
    return null;
  }

  const name = opts.name.trim();
  if (!name) return null;

  const textQuery = opts.locationHint?.trim()
    ? `${name} ${opts.locationHint.trim()}`
    : name;

  try {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "el",
        regionCode: "GR",
        pageSize: 5,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn("[google-places] quota / auth issue", { status: res.status });
      }
      return null;
    }
    const data = (await res.json()) as PlacesSearchResponse;
    if (data.error) {
      console.warn("[google-places]", data.error.message);
      return null;
    }
    const places = data.places ?? [];
    if (places.length === 0) return null;

    // Filter by category — drop hits that are clearly the wrong
    // venue type (e.g. a "store" or "school" matching a name search).
    const acceptableTypes = TYPES_FOR_CATEGORY[opts.category];
    const candidates = places
      .map((p) => mapPlace(p, name))
      .filter((m): m is GooglePlaceMatch => m !== null)
      .filter((m) => {
        if (!m.primary_type) return true;
        const types = [m.primary_type, ...m.types];
        return acceptableTypes.some((t) => types.includes(t));
      });

    if (candidates.length === 0) return null;
    // When a location hint was supplied, Google's ranking IS the
    // truth — the API applied location bias and put the best
    // contextual match first. Our title-score re-ranking can
    // sabotage this: for "Διόνυσος" + Πλάκα the user means the
    // famous "Dionysos Zonar's" (Latin canonical name, low title
    // overlap with the typed Greek word) but a namesake γυράδικο
    // with an exact-script title would score higher.
    //
    // Without a location hint, score-sort is our only signal.
    if (opts.locationHint) {
      const top = candidates[0];
      // Always treat location-biased #1 as high confidence — Google
      // told us this is the location-best match. Tier calculator
      // upstream uses match_score so we bump it.
      return top.match_score >= 100 ? top : { ...top, match_score: 100 };
    }
    candidates.sort((a, b) => b.match_score - a.match_score);
    return candidates[0];
  } catch (err) {
    console.error("[google-places] fetch error", err);
    return null;
  }
}

/** Bar/cafe-leaning Google place types. Any of these in a place's
 *  primaryType or types[] signals the venue should land in "bars"
 *  category in Proteino — including all-day cafe-bar-restaurants
 *  that Google often tags with multiple types. Per the product
 *  rule (locked in conversation): when a venue has BOTH bar and
 *  restaurant types, bars wins. */
const BAR_LEANING_TYPES = new Set([
  "bar",
  "pub",
  "wine_bar",
  "cocktail_bar",
  "sports_bar",
  "night_club",
  "cafe",
  "coffee_shop",
  "ice_cream_shop",
  "juice_shop",
  "tea_house",
]);

/** Restaurant-only types. Pure food venues, no bar/cafe overlap. */
const FOOD_ONLY_TYPES = new Set([
  "restaurant",
  "fine_dining_restaurant",
  "fast_food_restaurant",
  "italian_restaurant",
  "japanese_restaurant",
  "greek_restaurant",
  "seafood_restaurant",
  "mediterranean_restaurant",
  "vegan_restaurant",
  "vegetarian_restaurant",
  "steak_house",
  "sushi_restaurant",
  "pizza_restaurant",
  "bakery",
  "brunch_restaurant",
  "breakfast_restaurant",
  "meal_takeaway",
  "meal_delivery",
]);

/** Hotel/lodging types. */
const HOTEL_TYPES = new Set([
  "lodging",
  "hotel",
  "resort_hotel",
  "bed_and_breakfast",
  "guest_house",
  "hostel",
  "motel",
  "extended_stay_hotel",
]);

/**
 * Categorize a Google Places result into a Proteino venue category.
 * Used to OVERRIDE Gemini's initial category guess — Google knows
 * the venue's actual primary use better than the user's free text.
 *
 * Returns:
 *   "bars"   → any bar/cafe type present (priority over food)
 *   "food"   → only restaurant-style types
 *   "hotels" → lodging types
 *   null     → can't determine (caller keeps Gemini's guess)
 */
export function categorizeGooglePlace(
  primaryType: string | null,
  types: string[],
): "food" | "bars" | "hotels" | null {
  // Step 1: trust primaryType when it's a specific signal. A fine-
  // dining restaurant whose secondary types[] include "bar" is still
  // primarily a restaurant — Google's primaryType says so.
  if (primaryType) {
    if (HOTEL_TYPES.has(primaryType)) return "hotels";
    if (FOOD_ONLY_TYPES.has(primaryType)) return "food";
    if (BAR_LEANING_TYPES.has(primaryType)) return "bars";
  }

  // Step 2: primaryType was missing or generic ("establishment",
  // "point_of_interest", "store"). Fall back to scanning types[]
  // with the "bar wins when both present" product rule for all-day
  // venues that genuinely sit in both worlds (Etouto, etc.).
  if (types.length > 0) {
    const hasHotel = types.some((t) => HOTEL_TYPES.has(t));
    if (hasHotel) return "hotels";
    const hasBar = types.some((t) => BAR_LEANING_TYPES.has(t));
    const hasFood = types.some((t) => FOOD_ONLY_TYPES.has(t));
    if (hasBar) return "bars";
    if (hasFood) return "food";
  }
  return null;
}

/** Acceptable primary types per Proteino category. Strict — every
 *  Google type listed must be a real food/bar/hotel signal. We
 *  intentionally drop "establishment" + "point_of_interest" (every
 *  business has those, so they filter nothing — letting a toy store
 *  named "Μουστάκας" win a search for the famous taverna).
 *
 *  Because the user might submit a food + bar venue (Etouto), the
 *  food and bars sets accept each other's types — the post-search
 *  `categorizeGooglePlace()` does the actual food vs bar split. */
const VENUE_TYPES = [
  ...Array.from(BAR_LEANING_TYPES),
  ...Array.from(FOOD_ONLY_TYPES),
];
const TYPES_FOR_CATEGORY: Record<"food" | "bars" | "hotels", string[]> = {
  food: VENUE_TYPES,
  bars: VENUE_TYPES,
  hotels: Array.from(HOTEL_TYPES),
};

/**
 * Shape the Places match into the same matchData payload shape the
 * rest of /api/ai/match returns. Mirrors TMDB / Google Books mapping
 * functions so the consumer (useSubmission + preview) doesn't need
 * venue-specific branches for the shared fields.
 */
export function googlePlaceToMatchData(place: GooglePlaceMatch) {
  return {
    source: "google-places" as const,
    google_places_id: place.id,
    // For venues: the photo is the "poster" and we leave backdrop_url
    // null. PreviewScreen already handles poster-only layout.
    poster_url: place.primary_photo_name ? photoUrl(place.primary_photo_name, { maxWidthPx: 1600 }) : null,
    backdrop_url: null,
    year: null,
    runtime: null,
    plot: place.description,
    director: null,
    cast: [],
    genres: [],
    genre_ids: [],
    country: null,
    language: null,
    // Venue-specific extras for the preview screen + item_food/bars
    // hydration at publish time.
    address: place.formatted_address,
    short_address: place.short_address,
    lat: place.lat,
    lng: place.lng,
    telephone: place.phone_national,
    phone_international: place.phone_international,
    website: place.website,
    google_maps_url: place.google_maps_url,
    external_ratings: {
      google: {
        rating: place.rating,
        count: place.rating_count,
      },
    },
    price_level: place.price_level,
    primary_type: place.primary_type,
    primary_type_label: place.primary_type_label,
    types: place.types,
    opening_hours: place.opening_hours,
    photo_names: place.photo_names,
    match_score: place.match_score,
  };
}
