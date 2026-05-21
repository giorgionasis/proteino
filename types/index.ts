export type CategorySlug =
  | "movies"
  | "series"
  | "books"
  | "food"
  | "recipes"
  | "bars"
  | "hotels"
  | "theater"
  | "events";

export interface User {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  gender: string | null;
  region: string | null;
  birthday: string | null;
  points: number;
  level: number;
  suggestion_count: number;
  rating_count: number;
  avg_quality_score: number | null;
  embedding: number[] | null;
  is_private: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  last_suggestion_at: string | null;
  last_review_at: string | null;
}

export interface Item {
  id: string;
  category: CategorySlug;
  title: string;
  slug: string;
  description_seo: string | null;
  cover_url: string | null;
  /** Portrait 2:3 — movies/series/books. Optional because legacy items
   *  may only have cover_url. */
  poster_url?: string | null;
  /** Landscape 16:9 — venues / detail-page hero. Same optional caveat. */
  backdrop_url?: string | null;
  /** Subcategory id — present when an item has been mapped to its
   *  taxonomy (genre/cuisine/type). Null on legacy migrated rows. */
  subcategory_id?: string | null;
  avg_rating: number;
  rating_count: number;
  suggestion_count: number;
  is_published: boolean;
  embedding: number[] | null;
  created_at: string;
  modified_at: string;
}

export interface Suggestion {
  id: string;
  user_id: string;
  item_id: string;
  reflection: string | null;
  rating: number | null;
  ai_quality_score: number | null;
  ai_match_data: Record<string, unknown> | null;
  content_hash: string;
  is_published: boolean;
  created_at: string;
  published_at: string | null;
  modified_at: string;
  // Joined fields
  user?: Pick<User, "id" | "handle" | "display_name" | "avatar_url" | "level">;
  item?: Item;
}

export interface Rating {
  id: string;
  user_id: string;
  item_id: string;
  suggestion_id: string | null;
  score: number;
  vote_up: number;
  vote_down: number;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  suggestion_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: Pick<User, "id" | "handle" | "display_name" | "avatar_url">;
}

export interface Bookmark {
  id: string;
  user_id: string;
  item_id: string;
  category: CategorySlug;
  status: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  name: string;
  payload: Record<string, unknown>;
  email_enabled: boolean;
  push_enabled: boolean;
  is_read: boolean;
  created_at: string;
}

// AI service types
export type QualityLabel = "poor" | "fair" | "good" | "excellent";

export interface QualityAssessment {
  /** 0-100 — how well the user's description holds up. */
  score: number;
  label: QualityLabel;
  /** Most actionable next step. Null when description is excellent. */
  tip: string | null;
  /** Quick visible badge for the label, e.g. "🔥 Εξαιρετικό". */
  badge: string;
}

export interface SubmissionAnalysis {
  matched: boolean;
  title: string | null;
  category: CategorySlug | null;
  confidence: number;
  progress: number;
  message: string;
  matchData: Record<string, unknown> | null;
  /** Real-time coaching on the user's description quality. Optional so the
   *  type stays back-compat with anything still returning the older shape. */
  quality?: QualityAssessment;
}

export interface SearchAnalysis {
  intent: string;
  vibe: string | null;
  /** Establishment type / sub-type — used for venue refinement
   *  (ταβέρνα, μεζεδοπωλείο, cocktail bar, …) AND non-venue genre
   *  ("θρίλερ", "κωμωδία" — though `genre` is preferred there). Kept
   *  loose: Gemini can put the user's intent in either field and the
   *  search route checks both. */
  type: string | null;
  location: string | null;
  categories: CategorySlug[];
  query: string;
  /** Extra dimensions populated by LLM providers (Gemini etc.). Mock
   *  leaves them undefined. Used by /api/search to refine ranking when
   *  present; regex fallback when not. */
  decade?: string | null;
  price?: "budget" | "mid" | "high" | null;
  person?: string | null;
  /** Genre / sub-category name (e.g. "Κωμωδία", "Θρίλερ", "Παιδικά",
   *  "Sci-Fi"). Maps to `subcategories.name` for movies/series/books/
   *  recipes. Distinct from `type` so prompt + filter logic stay
   *  semantic (genre = taxonomy, type = establishment/sub-type). */
  genre?: string | null;
  /** Streaming/broadcast channel for movies + series ("Netflix", "HBO",
   *  "Apple TV+", "Disney+", "Mega"). Filters item_movies.channel /
   *  item_series.channel. */
  channel?: string | null;
  /** Series airing status: "completed" (end_date set / final season
   *  aired) or "ongoing" (no end_date). Filters item_series. */
  status?: "completed" | "ongoing" | null;
  /** Time period for events / theater: "summer" / "winter" / "spring"
   *  / "autumn" / month names ("december", "july") / "weekend". The
   *  search route translates this into a concrete date range and
   *  filters item_events.dates jsonb for overlap. */
  period?: string | null;
  /** Numeric duration constraints in minutes (movies). Either bound
   *  may be set independently. "κάτω από 90 λεπτά" → duration_max=90;
   *  "πάνω από 120 λεπτά" → duration_min=120; range queries set
   *  both. */
  duration_min?: number | null;
  duration_max?: number | null;

  // ── Search v3 additions (session 36 / CLAUDE.md §54) ────────────────
  // Structured attributes mirrored from SuggestionEditor fields. The
  // data is already on items + extension tables; this surfaces it to
  // free-text queries. Every field is optional — Gemini sets only what
  // the query implies. Empty/null = "no preference; don't constrain".

  /** Venue amenities (food / bars / hotels). Canonical snake_case keys
   *  matching the public filter options seeded by migration 044
   *  (roof_garden, parking, wifi, vegan_menu, live_music, …). AND
   *  semantics in the search route — every selected amenity must be
   *  present on the item. */
  amenities?: string[] | null;

  /** Series — exact season count. "μονή σεζόν" → 1; "πέντε σεζόν" → 5. */
  seasons?: number | null;

  /** Movies / series — true when the user explicitly asked for
   *  award-winning content ("βραβευμένη ταινία" / "Oscar winners").
   *  Filters to items.awards jsonb non-empty. */
  has_awards?: boolean | null;

  /** Recipes — diet flags. Canonical keys: "vegan", "no_milk",
   *  "no_sugar" (mirror lib/category-filters/match.ts:normalizeDietFlags).
   *  AND semantics. */
  diet?: string[] | null;

  /** Theater / events — relative window. Distinct from `period` (which
   *  is month / season based). "αυτό το σαββατοκύριακο" → "this_week";
   *  "αυτόν τον μήνα" → "this_month". */
  when?: "this_week" | "this_month" | null;

  /** Movies / series / books — admin-entered language string ("Ελληνικά",
   *  "English"). ilike match. */
  language?: string | null;

  /** Movies / series — admin-entered country string ("Ελλάδα", "USA").
   *  ilike match. Separate from `location` (which is for venues). */
  country?: string | null;

  /** Recipes — "easy" / "medium" / "hard". Maps to admin level field
   *  via the same alias map matchesFilter uses. */
  level?: "easy" | "medium" | "hard" | null;

  /** Recipes — cuisine origin ("Ελληνική", "Ιταλική"). Distinct from
   *  the venue `type` field; recipes carry it on item_recipes.origin. */
  origin?: string | null;

  /** Books — page count range. "λιγότερο από 200 σελίδες" → pages_max=200. */
  pages_min?: number | null;
  pages_max?: number | null;

  /** Recipes — calorie range. "κάτω από 300 θερμίδες" → calories_max=300. */
  calories_min?: number | null;
  calories_max?: number | null;

  /** Recipes — serving count range. "για 6 άτομα" → yields_min=yields_max=6. */
  yields_min?: number | null;
  yields_max?: number | null;

  /** Books — part of a trilogy / multi-volume work. */
  is_trilogy?: boolean | null;
}

export type SearchPillType = "VIBE" | "TYPE" | "LOC" | "CATEGORY";

export interface SearchPill {
  type: SearchPillType;
  value: string;
}
