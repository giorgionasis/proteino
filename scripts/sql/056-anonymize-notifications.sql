-- Migration 056: anonymize_user() also clears other members'
-- notifications that reference the deleted account (session 41).
-- Same function as 053 plus one DELETE. Idempotent.

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  short_id text := replace(left(p_user_id::text, 13), '-', '');
  old_handle text;
  t record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user % not found', p_user_id;
  END IF;

  SELECT handle INTO old_handle FROM public.users WHERE id = p_user_id;

  -- Other members' notifications that point at this person ("X σε
  -- ακολουθεί", "X βαθμολόγησε την πρότασή σου") would link to a
  -- handle that no longer exists.
  DELETE FROM public.notifications
   WHERE payload->>'follower_id' = p_user_id::text
      OR (old_handle IS NOT NULL AND payload->>'follower_handle' = old_handle)
      OR (old_handle IS NOT NULL AND payload->>'rater_handle'    = old_handle);

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
