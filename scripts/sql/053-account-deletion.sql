-- Migration 053: self-service account deletion (GDPR, session 41).
--
-- /privacy promises: "να διαγράψεις τον λογαριασμό σου ... οι συνεισφορές
-- σου παραμένουν ως ανώνυμες". So deletion ANONYMISES the public.users
-- row instead of deleting it — a hard DELETE would cascade into
-- suggestions + reviews and wipe community content other members rely on.
--
-- What anonymise_user() does, in one transaction:
--   * public.users: email/handle replaced with unique placeholders,
--     name → "Πρώην μέλος", every private + profile field cleared,
--     deleted_at stamped, role forced to 'user'.
--   * Deletes personal-only rows: bookmarks, follows (both directions),
--     notifications, devices, achievements/badges, moment events,
--     submission drafts, search history, embeddings + precomputed recs.
--   * Keeps: published suggestions, reviews, review votes (counts stay
--     consistent), content_reports (moderation audit trail).
--
-- The auth.users row is deleted by the API route (auth admin API) right
-- after this function succeeds — public.users.id has no FK to auth.users.
--
-- Callable by service_role only. Idempotent: CREATE OR REPLACE / IF NOT EXISTS.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Not sensitive, and public queries filter on it (Postgres needs SELECT
-- on a column to use it in WHERE).
GRANT SELECT (deleted_at) ON public.users TO anon, authenticated;

CREATE INDEX IF NOT EXISTS users_deleted_at_idx
  ON public.users (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  short_id text := replace(left(p_user_id::text, 13), '-', '');
  t record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user % not found', p_user_id;
  END IF;

  UPDATE public.users SET
    email          = 'deleted-' || p_user_id::text || '@deleted.invalid',
    handle         = 'deleted-' || short_id,
    display_name   = 'Πρώην μέλος',
    bio            = NULL,
    avatar_url     = NULL,
    gender         = NULL,
    region         = NULL,
    region_id      = NULL,
    birthday       = NULL,
    preferences    = '{}'::jsonb,
    embedding      = NULL,
    role           = 'user',
    is_private     = true,
    last_login_at  = NULL,
    deleted_at     = COALESCE(deleted_at, now())
  WHERE id = p_user_id;

  -- Personal-only rows. Tables are looked up by name so a table that was
  -- never created on this database is skipped instead of failing.
  FOR t IN
    SELECT * FROM (VALUES
      ('public',    'bookmarks',             'user_id'),
      ('public',    'follows',               'follower_id'),
      ('public',    'follows',               'following_id'),
      ('public',    'notifications',         'user_id'),
      ('public',    'devices',               'user_id'),
      ('public',    'user_achievements',     'user_id'),
      ('public',    'user_badges',           'user_id'),
      ('public',    'leaderboard_snapshots', 'user_id'),
      ('public',    'moment_events',         'user_id'),
      ('public',    'submission_sessions',   'user_id'),
      ('public',    'search_log',            'user_id'),
      ('analytics', 'search_log',            'user_id'),
      ('analytics', 'activity_log',          'user_id'),
      ('analytics', 'user_embeddings',       'user_id'),
      ('analytics', 'precomputed_recs',      'user_id')
    ) AS v(sch, tbl, col)
  LOOP
    IF to_regclass(format('%I.%I', t.sch, t.tbl)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema = t.sch AND table_name = t.tbl AND column_name = t.col
       )
    THEN
      EXECUTE format('DELETE FROM %I.%I WHERE %I = $1', t.sch, t.tbl, t.col)
        USING p_user_id;
    END IF;
  END LOOP;

  -- Usage log rows stay for cost accounting, just unlinked.
  IF to_regclass('public.ai_usage_log') IS NOT NULL THEN
    UPDATE public.ai_usage_log SET user_id = NULL WHERE user_id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_user(uuid) TO service_role;

-- Deleted members drop out of the leaderboard (their suggestions stay
-- on the items). Same body as migration 024 + two deleted_at filters.
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
        AND u.deleted_at IS NULL
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
    WHERE u.deleted_at IS NULL
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

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, uuid) TO anon, authenticated;
