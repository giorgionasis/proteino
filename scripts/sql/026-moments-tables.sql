-- Migration 026: moments + moment_events tables
--
-- Single home for every in-app celebration / nudge / hook (achievement
-- modal, bookmark celebration, toasts, banners, future notifications).
-- The "where + when + what to say" lives in the DB so admins can iterate
-- copy + timing + active state without a code deploy.
--
-- What stays in code: predicate FUNCTIONS (registered by predicate_key
-- in lib/moments/registry.ts) — they're the bits that touch DB
-- aggregates and need to be SQL-safe. The admin form reads the
-- registry's arg schema to render the right input fields per predicate.
--
-- Idempotent.

-- ── moments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable identifier — admins reference by key, not id. Lowercase
  -- dot-namespaced (e.g. "achievement.tier_unlock_3", "bookmark.default").
  key             text NOT NULL UNIQUE,

  -- Human-readable label for admin list view. Optional.
  label           text,

  -- Which surface renders this moment. The client adapter for each
  -- surface declares which copy slots it consumes (title/subtitle/body/
  -- cta_label/cta_href + display knobs).
  surface         text NOT NULL CHECK (surface IN (
                    'achievement_modal',
                    'bookmark_modal',
                    'toast',
                    'banner',
                    'published_pill',
                    'notification'
                  )),

  -- Event that potentially fires this moment. Resolver looks up by this
  -- column when the corresponding action happens server-side.
  trigger_event   text NOT NULL CHECK (trigger_event IN (
                    'suggestion_published',
                    'bookmark_created',
                    'bookmark_status_changed',
                    'rating_submitted',
                    'follow_created',
                    'search_logged',
                    'dormant_14d',
                    'event_tomorrow',
                    'series_new_season',
                    'daily_first_open'
                  )),

  -- Names a registered predicate function (lib/moments/registry.ts).
  -- Examples: 'always', 'suggestion_count_eq', 'category_bookmark_count_eq',
  -- 'bookmarkers_count_gte', 'user_first_in_category'.
  predicate_key   text NOT NULL DEFAULT 'always',

  -- Arguments passed to the predicate function. Shape is per-predicate,
  -- declared in the registry. Examples:
  --   suggestion_count_eq       → { "n": 10 }
  --   category_bookmark_count_eq → { "category": "movies", "n": 10 }
  --   bookmarkers_count_gte     → { "min": 100 }
  --   always                    → {}
  predicate_args  jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Copy templates. Each value is a string that supports {placeholder}
  -- interpolation (resolved server-side at fire time) and **bold**
  -- markdown for emphasis (parsed client-side).
  --
  -- Supported placeholders:
  --   {count}              - the event's primary number (e.g. new suggestion count)
  --   {target}             - next milestone target
  --   {remaining}          - target - count
  --   {ordinal}            - tier ordinal in Greek ("πρώτο", "δεύτερό", "τρίτο", "τέταρτο")
  --   {category}           - category slug ("movies", "books", ...)
  --   {category_noun}      - singular Greek noun ("ταινία", "βιβλίο", ...)
  --   {category_list_noun} - plural genitive form ("ταινίες", "βιβλία", ...)
  --   {handle}             - the user's handle
  --   {first_name}         - the user's first name (display_name first word)
  --
  -- Shape: { title, subtitle, body, cta_label, cta_href }
  copy            jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Surface-specific config. Achievement modal reads variant/badge
  -- from here; bookmark modal reads category-driven hints; future
  -- surfaces can store their own knobs without schema changes.
  --
  -- Common keys:
  --   delay_ms        - how long after the trigger to show (default 0)
  --   auto_dismiss_ms - auto-close after N ms (null = stay open)
  --   dark_theme      - boolean
  --   variant         - surface-specific variant tag (e.g. 'progress'|'tier_unlock')
  --   badge           - badge tier for achievement_modal ('verified'|'gold'|'expert'|'platinum')
  display         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Higher wins when multiple moments match the same trigger.
  -- Default 100; bump above for category-specific overrides that
  -- should beat the generic default row.
  priority        int  NOT NULL DEFAULT 100,

  -- Moments sharing a variant_group key are treated as A/B variants —
  -- the resolver picks one (weighted by priority). Leave null for
  -- moments that should always fire when their predicate matches.
  variant_group   text,

  is_active       boolean NOT NULL DEFAULT true,

  -- Optional time-bounded campaigns (e.g. holiday-themed copy).
  valid_from      timestamptz,
  valid_until     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Resolver hot path: load active moments for a trigger.
CREATE INDEX IF NOT EXISTS idx_moments_trigger_active
  ON moments (trigger_event, is_active)
  WHERE is_active = true;

-- Admin list view groups by trigger_event.
CREATE INDEX IF NOT EXISTS idx_moments_trigger
  ON moments (trigger_event);

-- Keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION moments_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_moments_touch_updated_at ON moments;
CREATE TRIGGER trg_moments_touch_updated_at
  BEFORE UPDATE ON moments
  FOR EACH ROW EXECUTE FUNCTION moments_touch_updated_at();

-- ── moment_events (audit log) ─────────────────────────────────────────
-- Every fire of a moment is recorded for throttling, dedup, and the
-- admin stats panel (last-7d fires / CTA click rate / dismiss rate).

CREATE TABLE IF NOT EXISTS moment_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id       uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fired_at        timestamptz NOT NULL DEFAULT now(),
  -- Snapshot of the event payload at fire time (item_id, count, etc.).
  -- Lets us debug "why did this fire" without re-running the predicate.
  payload         jsonb,
  cta_clicked     boolean NOT NULL DEFAULT false,
  dismissed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_moment_events_user
  ON moment_events (user_id, fired_at DESC);

CREATE INDEX IF NOT EXISTS idx_moment_events_moment_fired
  ON moment_events (moment_id, fired_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE moments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_events  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so the resolver (server-only) is unaffected.
-- Authenticated users get read access to active moments so SSR pages can
-- render their own banners without a server round-trip. Writes are
-- service-role-only via the admin API.

DROP POLICY IF EXISTS "moments_read_active" ON moments;
CREATE POLICY "moments_read_active" ON moments
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "moment_events_read_own" ON moment_events;
CREATE POLICY "moment_events_read_own" ON moment_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON moments       TO authenticated, anon;
GRANT SELECT ON moment_events TO authenticated;
