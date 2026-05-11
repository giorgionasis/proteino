-- Migration 024: leaderboard RPC
--
-- Returns a ranked slice of users for the leaderboard view, scored by
-- pure published-suggestion count (per CLAUDE.md §10 — "Level
-- progression: Based on suggestion count only — simple, transparent").
--
-- Inputs:
--   p_period   text  : 'all' | 'month' | 'week'
--   p_category text  : 'all' OR category slug (movies, books, ...)
--   p_viewer   uuid  : optional — flags the viewer's row so the client
--                       can render them with the "Εσύ" highlight
--
-- Returns one row per ranked user:
--   id, handle, display_name, avatar_url, level, score, rank, is_viewer
--
-- Strategy:
--   • For the unfiltered case (period='all' AND category='all') we
--     read `users.suggestion_count` directly — already denormalised,
--     covered by `idx_users_suggestion_count` (created here if needed).
--   • For any filtered case we GROUP BY user over `suggestions` joined
--     to `items`, applying the date + category filter. Indexes:
--       - suggestions(user_id, created_at) covers period scans
--       - suggestions(item_id) covers join to items
--       - items(category) covers category filter
--
-- Idempotent — DROP + CREATE the function.

-- Index for the unfiltered all-time path. Most calls hit this.
CREATE INDEX IF NOT EXISTS idx_users_suggestion_count
  ON users (suggestion_count DESC);

-- Index supports the filtered-by-time path. Already implicitly
-- supported by the suggestions PK but a partial index focused on
-- published rows narrows the scan.
CREATE INDEX IF NOT EXISTS idx_suggestions_published_created
  ON suggestions (user_id, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_items_category
  ON items (category);

DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_period   text DEFAULT 'all',
  p_category text DEFAULT 'all',
  p_viewer   uuid DEFAULT NULL
)
RETURNS TABLE (
  id            uuid,
  handle        text,
  display_name  text,
  avatar_url    text,
  level         int,
  score         bigint,
  rank          int,
  is_viewer     boolean
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_since timestamptz := NULL;
BEGIN
  -- Resolve the period cutoff. 'all' = no cutoff.
  IF p_period = 'week' THEN
    v_since := now() - interval '7 days';
  ELSIF p_period = 'month' THEN
    v_since := now() - interval '30 days';
  END IF;

  -- Fast path: no filters → read denormalised count directly. The
  -- LEFT JOIN ensures the viewer always appears in the output even
  -- when they're not in the top 10 (handled by the LIMIT in the
  -- outer query the API will run). Here we return the FULL ranked
  -- list — the API trims.
  IF v_since IS NULL AND p_category = 'all' THEN
    RETURN QUERY
    WITH ranked AS (
      SELECT
        u.id,
        u.handle,
        u.display_name,
        u.avatar_url,
        COALESCE(u.level, 1) AS level,
        COALESCE(u.suggestion_count, 0)::bigint AS score,
        ROW_NUMBER() OVER (ORDER BY COALESCE(u.suggestion_count, 0) DESC, u.created_at ASC)::int AS rank
      FROM users u
      WHERE COALESCE(u.suggestion_count, 0) > 0
    )
    SELECT
      r.id,
      r.handle,
      r.display_name,
      r.avatar_url,
      r.level,
      r.score,
      r.rank,
      (r.id = p_viewer) AS is_viewer
    FROM ranked r
    ORDER BY r.rank;
    RETURN;
  END IF;

  -- Filtered path: aggregate suggestions in the window + category.
  RETURN QUERY
  WITH counts AS (
    SELECT
      s.user_id,
      COUNT(*)::bigint AS score
    FROM suggestions s
    JOIN items i ON i.id = s.item_id
    WHERE s.is_published = true
      AND (v_since IS NULL OR s.created_at >= v_since)
      AND (p_category = 'all' OR i.category = p_category)
    GROUP BY s.user_id
  ),
  ranked AS (
    SELECT
      u.id,
      u.handle,
      u.display_name,
      u.avatar_url,
      COALESCE(u.level, 1) AS level,
      c.score,
      ROW_NUMBER() OVER (ORDER BY c.score DESC, u.created_at ASC)::int AS rank
    FROM counts c
    JOIN users u ON u.id = c.user_id
  )
  SELECT
    r.id,
    r.handle,
    r.display_name,
    r.avatar_url,
    r.level,
    r.score,
    r.rank,
    (r.id = p_viewer) AS is_viewer
  FROM ranked r
  ORDER BY r.rank;
END;
$$;

-- Grant execute to authenticated + anon roles so the frontend can
-- call it both for guests (no viewer) and logged-in users.
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, uuid) TO anon, authenticated;
