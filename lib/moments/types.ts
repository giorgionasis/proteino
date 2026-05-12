/**
 * Shared types for the moments system. Both server (resolver) and
 * client (surface adapters) import from here.
 */

export type MomentSurface =
  | "achievement_modal"
  | "bookmark_modal"
  | "toast"
  | "banner"
  | "published_pill"
  | "notification";

export type MomentTrigger =
  | "suggestion_published"
  | "bookmark_created"
  | "bookmark_status_changed"
  | "rating_submitted"
  | "follow_created"
  | "search_logged"
  | "dormant_14d"
  | "event_tomorrow"
  | "series_new_season"
  | "daily_first_open";

/** One row in `public.moments` as stored. */
export interface MomentRow {
  id:             string;
  key:            string;
  label:          string | null;
  surface:        MomentSurface;
  trigger_event:  MomentTrigger;
  predicate_key:  string;
  predicate_args: Record<string, unknown>;
  copy:           MomentCopy;
  display:        MomentDisplay;
  priority:       number;
  variant_group:  string | null;
  is_active:      boolean;
  valid_from:     string | null;
  valid_until:    string | null;
}

/** Copy templates — strings with {placeholder} interpolation +
 *  **bold** markdown. */
export interface MomentCopy {
  title?:     string;
  subtitle?:  string;
  body?:      string;
  cta_label?: string;
  cta_href?:  string;
}

/** Surface-specific knobs. Keys are not all required on every surface;
 *  each surface adapter cherry-picks what it needs. */
export interface MomentDisplay {
  /** ms to wait after trigger before showing. Default 0. */
  delay_ms?: number;
  /** ms before auto-dismissing. Null/undefined = stay open until user
   *  closes. */
  auto_dismiss_ms?: number | null;
  /** Render the surface in dark theme variant. */
  dark_theme?: boolean;
  /** Free-form variant tag for surfaces that branch internally
   *  (e.g. "progress" vs "tier_unlock" on achievement_modal). */
  variant?: string;
  /** Badge tier for achievement_modal. */
  badge?: "verified" | "gold" | "expert" | "platinum";
  /** Target milestone for achievement_modal (3 / 10 / 25 / 50). */
  target?: number;
  /** Catch-all so future surfaces can add keys without churn. */
  [extra: string]: unknown;
}

/**
 * Context passed to predicate functions + the renderer. Built by the
 * caller from the actual event payload + user state.
 *
 * Predicates evaluate against `payload` + `user`; the renderer's
 * placeholder map comes from `vars` (caller is responsible for
 * computing things like `remaining`, `ordinal`, etc).
 */
export interface MomentContext {
  /** Authenticated user fields the predicate might need. */
  user: {
    id:                string;
    handle?:           string | null;
    display_name?:     string | null;
    suggestion_count?: number | null;
    [extra: string]:   unknown;
  };
  /** Event-specific payload (e.g. for bookmark_created: itemId,
   *  category, bookmarkersTotal). The predicate decides what it needs. */
  payload: Record<string, unknown>;
  /** Resolved placeholder values for renderer. Keys match the
   *  placeholder names documented in migration 026. */
  vars: Record<string, string | number>;
}

/**
 * What the resolver returns to the caller. `copy` is fully interpolated
 * — clients render strings as-is (with **bold** markdown parsing).
 */
export interface ResolvedMoment {
  id:      string;
  key:     string;
  surface: MomentSurface;
  copy:    {
    title:      string;
    subtitle:   string;
    body:       string;
    cta_label?: string;
    cta_href?:  string;
  };
  display: MomentDisplay;
}

/** Predicate function signature. Returns true → moment is eligible to
 *  fire for this context. Async-friendly so predicates can hit the DB
 *  (e.g. bookmarkers_count_gte does a count query). */
export type PredicateFn = (
  ctx: MomentContext,
  args: Record<string, unknown>,
) => boolean | Promise<boolean>;

/** Schema entry exposed to the admin UI so the form knows what fields
 *  to render per predicate_key. */
export interface PredicateSchema {
  /** Human-readable label for the dropdown. */
  label: string;
  /** Short explanation rendered under the dropdown. */
  description?: string;
  /** Per-arg field config. Empty record = no args. */
  args: Record<
    string,
    {
      label: string;
      type:  "integer" | "string" | "category" | "boolean";
      /** Optional helper text under the field. */
      hint?: string;
    }
  >;
}
