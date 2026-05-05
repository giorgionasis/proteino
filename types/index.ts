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
  type: string | null;
  location: string | null;
  categories: CategorySlug[];
  query: string;
}

export type SearchPillType = "VIBE" | "TYPE" | "LOC";

export interface SearchPill {
  type: SearchPillType;
  value: string;
}
