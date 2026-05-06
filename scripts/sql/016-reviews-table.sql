-- ─── Reviews table — clean replacement for the legacy ratings + comments ───
--
-- Going forward, every user-on-item interaction is ONE row here:
--   - rating: mandatory 1..5 stars
--   - reflection: optional text
--   - one row per (user, item) — UNIQUE constraint enforces this
--
-- The legacy `comments` (343 K2 rows) and `ratings` (1 row) tables stay
-- in the DB for archive/history but are NOT read by the new UI. No
-- "is_legacy" flags, no schema mutations on those tables — clean break.
--
-- The original submitter's reflection lives in `suggestions` (1 per item)
-- and continues to render as the featured block above the rating box.
-- Suggestions are NOT reviews.

CREATE TABLE IF NOT EXISTS reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Stars (mandatory) + optional text
  rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  reflection    text,

  -- Engagement
  vote_up       int NOT NULL DEFAULT 0,
  vote_down     int NOT NULL DEFAULT 0,
  report_count  int NOT NULL DEFAULT 0,

  -- Moderation (mirrors the comments + suggestions hidden_* pattern)
  is_hidden     boolean NOT NULL DEFAULT false,
  hidden_at     timestamptz,
  hidden_reason text,
  hidden_by     uuid REFERENCES users(id),

  created_at    timestamptz NOT NULL DEFAULT now(),

  -- One review per (user, item)
  UNIQUE (user_id, item_id)
);

-- Hot path: detail-page query "all visible reviews for item X newest first"
CREATE INDEX IF NOT EXISTS idx_reviews_visible
  ON reviews(item_id, created_at DESC)
  WHERE is_hidden = false;

-- Per-user lookup: "did this user review item X" + profile reviews list
CREATE INDEX IF NOT EXISTS idx_reviews_user
  ON reviews(user_id, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. guests) can read non-hidden reviews
DROP POLICY IF EXISTS reviews_select_visible ON reviews;
CREATE POLICY reviews_select_visible ON reviews
  FOR SELECT USING (is_hidden = false);

-- Authenticated users can insert their own reviews (rating mandatory)
DROP POLICY IF EXISTS reviews_insert_own ON reviews;
CREATE POLICY reviews_insert_own ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update or delete their own reviews
DROP POLICY IF EXISTS reviews_update_own ON reviews;
CREATE POLICY reviews_update_own ON reviews
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_delete_own ON reviews;
CREATE POLICY reviews_delete_own ON reviews
  FOR DELETE USING (user_id = auth.uid());

-- Admins can do anything (defense-in-depth; service-role bypasses RLS anyway)
DROP POLICY IF EXISTS reviews_admin_all ON reviews;
CREATE POLICY reviews_admin_all ON reviews
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ─── Reset legacy aggregates on items ──────────────────────────────────
-- The K2-imported rating_count + avg_rating are no longer the source of
-- truth. Going forward, the detail page recomputes from `reviews` at fetch
-- time (small N — sub-100ms even at 1000 reviews/item). Setting to 0 so
-- the UI doesn't show stale "67 αξιολογήσεις" type headlines on items
-- that have no real reviews yet.
UPDATE items SET rating_count = 0, avg_rating = 0;
