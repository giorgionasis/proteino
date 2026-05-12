-- Migration 031: submission funnel retention + idle sweep
--
-- Two SQL functions safe to call manually. Once you're happy with
-- them, schedule via Supabase pg_cron (one nightly job each).
--
--   SELECT public.purge_old_text_snapshots();        -- 90d retention
--   SELECT public.sweep_abandoned_funnel_sessions(); -- mark 30+min idles
--
-- Idempotent.

-- Purge text snapshots older than 90 days. Aggregate metrics (sessions +
-- events) are preserved forever — only the raw text gets pruned for
-- privacy.
CREATE OR REPLACE FUNCTION public.purge_old_text_snapshots()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.submission_text_snapshots
  WHERE captured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'purge_old_text_snapshots: % rows deleted', v_deleted;
  RETURN v_deleted;
END;
$$;

-- Sessions that never got an explicit close event (tab closed, network
-- failed, etc.) get marked abandoned after 30 minutes of inactivity so
-- they show up correctly in funnel breakdowns. Idempotent — re-running
-- only touches sessions still in the wild.
CREATE OR REPLACE FUNCTION public.sweep_abandoned_funnel_sessions()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_swept int;
BEGIN
  UPDATE public.submission_sessions
  SET    final_state = COALESCE(final_state, 'abandoned_idle'),
         ended_at    = now()
  WHERE  ended_at IS NULL
    AND  started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_swept = ROW_COUNT;
  RAISE NOTICE 'sweep_abandoned_funnel_sessions: % sessions swept', v_swept;
  RETURN v_swept;
END;
$$;
