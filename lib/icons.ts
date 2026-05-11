/**
 * Single source of truth for icon assets.
 *
 * Add an icon: drop the SVG into `public/icons/<category>/`, register it below.
 * Use anywhere (frontend or admin) via `<Icon name="..." />`.
 *
 * Names are flat (no namespace prefix) — kept unique across categories.
 */

export const ICON_PATHS = {
  // ── Brands ──────────────────────────────────────────────────────────
  "efood":              "/icons/brands/efood.svg",
  "box":                "/icons/brands/box.svg",
  "booking":            "/icons/brands/booking.svg",            // small B icon
  "booking-wordmark":   "/icons/brands/booking-wordmark.svg",   // full Booking.com lockup
  "google":             "/icons/brands/google.svg",
  "google-pin":         "/icons/brands/google-pin.svg",
  "public":             "/icons/brands/public.svg",
  "airbnb":             "/icons/brands/airbnb.svg",
  "imdb":               "/icons/brands/imdb.svg",
  "rotten-tomatoes":    "/icons/brands/rotten-tomatoes.svg",
  "metacritic":         "/icons/brands/metacritic.svg",
  "netflix":            "/icons/brands/netflix.svg",
  "netflix-wordmark":   "/icons/brands/netflix-wordmark.svg",
  "disney":             "/icons/brands/disney.svg",
  "prime":              "/icons/brands/prime.svg",
  "youtube":            "/icons/brands/youtube.svg",

  // ── Recipe nutrition (full-color illustrated) ──────────────────────
  "vegan":              "/icons/nutrition/vegan.svg",
  "no-milk":            "/icons/nutrition/no-milk.svg",
  "sugar-free":         "/icons/nutrition/sugar-free.svg",
  "ingredients":        "/icons/nutrition/ingredients.svg",
  "steps":              "/icons/nutrition/steps.svg",

  // ── Hotel + food amenities (line-art) ──────────────────────────────
  "amenity-hotel":      "/icons/amenities/hotel.svg",
  "amenity-three-star": "/icons/amenities/three-star.svg",
  "amenity-rooms":      "/icons/amenities/rooms.svg",
  "amenity-suites":     "/icons/amenities/suites.svg",
  "amenity-breakfast":  "/icons/amenities/breakfast.svg",
  "amenity-parking":    "/icons/amenities/free-parking.svg",
  "amenity-pool":       "/icons/amenities/swimming-pool.svg",
  "amenity-wifi":       "/icons/amenities/wifi.svg",
  "amenity-bar":        "/icons/amenities/bar.svg",
  "amenity-restaurant": "/icons/amenities/restaurant.svg",
  "amenity-sea-view":   "/icons/amenities/sea-view.svg",
  "amenity-mountain":   "/icons/amenities/mountain-view.svg",
  "amenity-transfer":   "/icons/amenities/transfer.svg",
  "amenity-disabled":   "/icons/amenities/disabilities.svg",
  "amenity-pet":        "/icons/amenities/pet-friendly.svg",
  "amenity-vegan-menu": "/icons/amenities/vegan-menu.svg",
  "amenity-playground": "/icons/amenities/playground.svg",
  "amenity-on-the-sea": "/icons/amenities/on-the-sea.svg",
  "amenity-roof-garden":"/icons/amenities/roof-garden.svg",

  // ── Property types (hotel filter / category) ───────────────────────
  "property-apartment":     "/icons/property/apartment.svg",
  "property-apartment-alt": "/icons/property/apartment-alt.svg",
  "property-villa":         "/icons/property/villa.svg",
  "property-camping":       "/icons/property/camping.svg",
  "property-house":         "/icons/property/house.svg",

  // ── Awards (movies) ─────────────────────────────────────────────────
  "oscar-best-actor":      "/icons/awards/oscar-best-actor.svg",
  "oscar-best-picture":    "/icons/awards/oscar-best-picture.svg",
  "oscar-best-screenplay": "/icons/awards/oscar-best-screenplay.svg",
  "oscar-best-sound":      "/icons/awards/oscar-best-sound.svg",

  // ── User level badges ───────────────────────────────────────────────
  "badge-verified": "/icons/badges/verified.svg",
  "badge-expert":   "/icons/badges/expert.svg",
  "badge-gold":     "/icons/badges/gold.svg",
  "badge-platinum": "/icons/badges/platinum.svg",

  // ── Generic UI ──────────────────────────────────────────────────────
  "star":             "/icons/ui/star.svg",
  "star-rating-hero": "/icons/ui/star-rating-hero.svg",
  "pin":              "/icons/ui/pin.svg",
  "calendar":         "/icons/ui/calendar.svg",
  "play":             "/icons/ui/play.svg",
  "follow":           "/icons/ui/follow.svg",
  "followed":         "/icons/ui/followed.svg",
  "bookmark-add":     "/icons/ui/bookmark-add.svg",
  "bookmark-added":   "/icons/ui/bookmark-added.svg",

  // ── Leaderboard ─────────────────────────────────────────────────────
  "leaderboard-first":   "/icons/leaderboard/first.svg",
  "leaderboard-second":  "/icons/leaderboard/second.svg",
  "leaderboard-third":   "/icons/leaderboard/third.svg",
  "leaderboard-trophy":  "/icons/leaderboard/trophy.svg",

  // ── Admin-specific ──────────────────────────────────────────────────
  "admin-placeholder-upload": "/icons/admin/placeholder-upload.svg",
  "admin-link-card":          "/icons/admin/link-card.png",
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** Resolve a path by name; throws at compile-time if name doesn't exist. */
export function iconPath(name: IconName): string {
  return ICON_PATHS[name];
}

/* ─── Helpers used to map data to icons ────────────────────────────────
 *
 * Hotel amenity keys (as stored on `item_hotels.facilities` jsonb) →
 * the icon name. Used by HotelDetail's amenities row. Add more keys
 * here as the admin schema settles.
 */

export const AMENITY_ICON_MAP: Record<string, IconName> = {
  hotel:       "amenity-hotel",
  three_star:  "amenity-three-star",
  rooms:       "amenity-rooms",
  suites:      "amenity-suites",
  breakfast:   "amenity-breakfast",
  parking:     "amenity-parking",
  pool:        "amenity-pool",
  wifi:        "amenity-wifi",
  bar:         "amenity-bar",
  restaurant:  "amenity-restaurant",
  sea_view:    "amenity-sea-view",
  mountain:    "amenity-mountain",
  transfer:    "amenity-transfer",
  disabled:    "amenity-disabled",
  pet:         "amenity-pet",
  vegan_menu:  "amenity-vegan-menu",
  playground:  "amenity-playground",
  on_the_sea:  "amenity-on-the-sea",
  roof_garden: "amenity-roof-garden",
};

/** Greek labels shown beneath the amenity icon. */
export const AMENITY_LABELS: Record<string, string> = {
  hotel:       "Ξενοδοχείο",
  three_star:  "3★",
  rooms:       "Δωμάτια",
  suites:      "Σουίτες",
  breakfast:   "Πρωινό",
  parking:     "Free Parking",
  pool:        "Πισίνα",
  wifi:        "Wi-Fi",
  bar:         "Bar",
  restaurant:  "Εστιατόριο",
  sea_view:    "Θέα Θάλασσα",
  mountain:    "Θέα Βουνό",
  transfer:    "Transfer",
  disabled:    "ΑΜΕΑ",
  pet:         "Pet Friendly",
  vegan_menu:  "Vegan",
  playground:  "Παιδότοπος",
  on_the_sea:  "Παραλιακό",
  roof_garden: "Roof Garden",
};

/**
 * Normalize the various shapes `ext.facilities` can take into a list of
 * active amenity keys. Handles array form (`["wifi", "breakfast"]`),
 * object-of-booleans (`{ wifi: true, breakfast: false }`), and
 * object-of-strings (`{ wifi: "yes" }` is treated truthy).
 */
export function getActiveAmenities(facilities: unknown): string[] {
  if (!facilities) return [];
  if (Array.isArray(facilities)) return facilities.filter(Boolean).map(String);
  if (typeof facilities === "object") {
    return Object.entries(facilities as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === "string" && v.trim() !== "" && v.toLowerCase() !== "false"))
      .map(([k]) => k);
  }
  return [];
}

/**
 * Recipe nutrition tag → icon. Used by RecipeDetail's nutrition row.
 * Keys reflect the boolean-style flags expected on `item_recipes.nutrition`.
 */
export const NUTRITION_ICON_MAP: Record<string, IconName> = {
  vegan:      "vegan",
  no_milk:    "no-milk",
  sugar_free: "sugar-free",
};

/** User level → badge icon. Mirrors the existing `getBadge(level)` pattern. */
export function badgeIconForLevel(level: number): IconName {
  if (level >= 25) return "badge-platinum";
  if (level >= 10) return "badge-expert";
  if (level >= 5) return "badge-gold";
  return "badge-verified";
}

/**
 * Match a channel/platform name string (admin-entered, free-text) to one
 * of the streaming-service brand icons. Returns null when no match —
 * caller renders just the text fallback.
 */
export function platformIconForChannel(channel: string | null | undefined): IconName | null {
  if (!channel) return null;
  const c = channel.toLowerCase();
  if (c.includes("netflix")) return "netflix";
  if (c.includes("disney")) return "disney";
  if (c.includes("prime") || c.includes("amazon")) return "prime";
  if (c.includes("youtube")) return "youtube";
  return null;
}

/**
 * Map an Oscar category string to its specific badge icon.
 * Used both in MovieDetail (frontend awards accordion) and the admin
 * award-row preview (so admins see the icon they're picking).
 */
export function oscarIconForCategory(type: string, category: string): IconName | null {
  if (!type.toLowerCase().startsWith("oscar")) return null;
  const c = category.toLowerCase();
  if (c.includes("picture") || c.includes("film") || c.includes("motion")) return "oscar-best-picture";
  if (c.includes("actor") || c.includes("actress")) return "oscar-best-actor";
  if (c.includes("screenplay") || c.includes("scenario")) return "oscar-best-screenplay";
  if (c.includes("sound")) return "oscar-best-sound";
  return null;
}

/* ─── Admin form catalogs ──────────────────────────────────────────────
 *
 * Used by `<IconToggleGrid>` in the admin SuggestionEditor to render
 * visual amenity / nutrition pickers. Keys map 1:1 to the keys
 * frontend HotelDetail / RecipeDetail expect on `ext.facilities` and
 * `ext.nutrition`, so admin saves and frontend reads "just work."
 */

export interface IconOption {
  key: string;
  icon: IconName;
  label: string;
}

export const HOTEL_AMENITY_GROUPS: { title: string; options: IconOption[] }[] = [
  {
    title: "Παροχές",
    options: [
      { key: "pool",       icon: "amenity-pool",       label: "Πισίνα" },
      { key: "bar",        icon: "amenity-bar",        label: "Bar" },
      { key: "restaurant", icon: "amenity-restaurant", label: "Εστιατόριο" },
      { key: "parking",    icon: "amenity-parking",    label: "Free Parking" },
      { key: "breakfast",  icon: "amenity-breakfast",  label: "Πρωινό" },
      { key: "wifi",       icon: "amenity-wifi",       label: "Wi-Fi" },
    ],
  },
  {
    title: "Θέα / Τοποθεσία",
    options: [
      { key: "sea_view",    icon: "amenity-sea-view",   label: "Θέα Θάλασσα" },
      { key: "mountain",    icon: "amenity-mountain",   label: "Θέα Βουνό" },
      { key: "on_the_sea",  icon: "amenity-on-the-sea", label: "Παραλιακό" },
      { key: "roof_garden", icon: "amenity-roof-garden", label: "Roof Garden" },
    ],
  },
  {
    title: "Extra",
    options: [
      { key: "pet",        icon: "amenity-pet",        label: "Pet Friendly" },
      { key: "disabled",   icon: "amenity-disabled",   label: "ΑΜΕΑ" },
      { key: "transfer",   icon: "amenity-transfer",   label: "Transfer" },
      { key: "vegan_menu", icon: "amenity-vegan-menu", label: "Vegan Menu" },
      { key: "playground", icon: "amenity-playground", label: "Παιδότοπος" },
    ],
  },
];

export const RECIPE_NUTRITION_OPTIONS: IconOption[] = [
  { key: "vegan",      icon: "vegan",      label: "Vegan" },
  { key: "no_milk",    icon: "no-milk",    label: "Χωρίς γάλα" },
  { key: "sugar_free", icon: "sugar-free", label: "Χωρίς ζάχαρη" },
];

export const HOTEL_PROPERTY_TYPES: IconOption[] = [
  { key: "hotel",     icon: "amenity-hotel",      label: "Ξενοδοχείο" },
  { key: "apartment", icon: "property-apartment", label: "Διαμέρισμα" },
  { key: "villa",     icon: "property-villa",     label: "Βίλα" },
  { key: "house",     icon: "property-house",     label: "Μονοκατοικία" },
  { key: "camping",   icon: "property-camping",   label: "Camping" },
];

/**
 * Food/restaurant amenities — stored under `ext.information.amenities`
 * jsonb (existing field, no migration needed). Same icon set as hotels;
 * subset that makes sense for restaurants.
 */
export const FOOD_AMENITY_OPTIONS: IconOption[] = [
  { key: "parking",     icon: "amenity-parking",     label: "Parking" },
  { key: "wifi",        icon: "amenity-wifi",        label: "Wi-Fi" },
  { key: "pet",         icon: "amenity-pet",         label: "Pet Friendly" },
  { key: "vegan_menu",  icon: "amenity-vegan-menu",  label: "Vegan Menu" },
  { key: "playground",  icon: "amenity-playground",  label: "Παιδότοπος" },
  { key: "disabled",    icon: "amenity-disabled",    label: "ΑΜΕΑ" },
  { key: "sea_view",    icon: "amenity-sea-view",    label: "Θέα Θάλασσα" },
  { key: "on_the_sea",  icon: "amenity-on-the-sea",  label: "Παραλιακό" },
  { key: "roof_garden", icon: "amenity-roof-garden", label: "Roof Garden" },
];
