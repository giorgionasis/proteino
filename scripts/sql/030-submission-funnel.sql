-- Migration 030: AI submission funnel tracking
--
-- Three tables capture every authenticated overlay session of the
-- "Make a suggestion" flow so we can answer: where do users drop, how
-- long do they linger per state, what text were they typing when they
-- bailed, which categories struggle, how often does the AI return a
-- false-positive match, etc.
--
-- Auth-only: the submission FAB rejects guests upstream
-- (useGuestGuard + API 401), so every row here has a non-null
-- user_id. No anon-id / cookie consent gymnastics required.
--
-- Storage shape:
--   submission_sessions       — one row per overlay session
--   submission_events         — one row per fired event (state, AI, decisions)
--   submission_text_snapshots — sampled, PII-masked text (retention-bounded)
--
-- All writes go through the ingest_funnel_batch() SECURITY DEFINER
-- function so the API doesn't need direct INSERT grants and we get a
-- single audit choke point.
--
-- Idempotent.

-- ── sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,

  -- Last state the session ever reached. Updated by the API close call
  -- OR by the sweep_abandoned_funnel_sessions() cron when ended_at is
  -- still null after 30 minutes.
  final_state       text,

  -- Denormalised aggregates for fast headline queries (so we don't
  -- have to JOIN the events table for the funnel dashboard).
  category          text,
  text_length_max   int  NOT NULL DEFAULT 0,
  ai_call_count     int  NOT NULL DEFAULT 0,
  match_locked      boolean NOT NULL DEFAULT false,
  published         boolean NOT NULL DEFAULT false,
  duplicate_hit     boolean NOT NULL DEFAULT false,
  error_count       int  NOT NULL DEFAULT 0,

  -- Device + context (set at session start; never mutates).
  device_kind       text,                     -- 'mobile' | 'tablet' | 'desktop'
  viewport_width    int,
  referrer_path     text,
  user_agent        text,                     -- truncated to 250 chars
  first_submission  boolean  NOT NULL DEFAULT false  -- the user's first lifetime submission attempt
);

CREATE INDEX IF NOT EXISTS idx_subm_sessions_started_at
  ON public.submission_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_subm_sessions_user
  ON public.submission_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_subm_sessions_final_state
  ON public.submission_sessions (final_state, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_subm_sessions_category
  ON public.submission_sessions (category, started_at DESC)
  WHERE category IS NOT NULL;

-- ── events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.submission_sessions(id) ON DELETE CASCADE,
  event_name    text NOT NULL,            -- 'state_enter', 'match_locked', 'ai_call_finished', etc.
  state         text,                     -- the state machine state at fire time
  fired_at      timestamptz NOT NULL DEFAULT now(),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_latency_ms int                       -- only set for ai_call_finished
);

CREATE INDEX IF NOT EXISTS idx_subm_events_session
  ON public.submission_events (session_id, fired_at);
CREATE INDEX IF NOT EXISTS idx_subm_events_name_fired
  ON public.submission_events (event_name, fired_at DESC);

-- ── text snapshots (PII-bounded, retention-bounded) ─────────────────
CREATE TABLE IF NOT EXISTS public.submission_text_snapshots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.submission_sessions(id) ON DELETE CASCADE,

  -- Sanitised text: client-side regex-masks emails/phones, truncates
  -- to 500 chars. Use this column for human-readable drop-off review.
  text_sanitized    text,
  text_length_full  int,
  state_at_capture  text,
  captured_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subm_snapshots_session
  ON public.submission_text_snapshots (session_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_subm_snapshots_retention
  ON public.submission_text_snapshots (captured_at)
  WHERE text_sanitized IS NOT NULL;

-- ── Ingest function (SECURITY DEFINER) ──────────────────────────────
-- One choke point for all writes. The API hands it a payload and
-- doesn't need direct INSERT grants on any table. Caller passes its
-- own user_id (verified by /api/submission-funnel beforehand).
--
-- Args:
--   p_user_id   — must match the API's authed user
--   p_session   — { id, started_at, device_kind, viewport_width, referrer_path, user_agent, first_submission }
--   p_events    — array of event records
--   p_snapshot  — { text_sanitized, text_length_full, state_at_capture } or NULL
--   p_counters  — denormalised counters to merge into the session row
--                  (text_length_max, ai_call_count, match_locked, etc.)

CREATE OR REPLACE FUNCTION public.ingest_funnel_batch(
  p_user_id  uuid,
  p_session  jsonb,
  p_events   jsonb DEFAULT '[]'::jsonb,
  p_snapshot jsonb DEFAULT NULL,
  p_counters jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_existing   public.submission_sessions%ROWTYPE;
  v_event      jsonb;
BEGIN
  v_session_id := (p_session->>'id')::uuid;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'session.id required';
  END IF;

  -- Upsert the session. First call creates it; subsequent calls only
  -- update the denormalised counters and never mutate immutable fields.
  SELECT * INTO v_existing FROM public.submission_sessions WHERE id = v_session_id;

  IF NOT FOUND THEN
    INSERT INTO public.submission_sessions (
      id, user_id, started_at, device_kind, viewport_width,
      referrer_path, user_agent, first_submission
    ) VALUES (
      v_session_id, p_user_id,
      COALESCE((p_session->>'started_at')::timestamptz, now()),
      NULLIF(p_session->>'device_kind', ''),
      NULLIF(p_session->>'viewport_width', '')::int,
      NULLIF(p_session->>'referrer_path', ''),
      LEFT(COALESCE(p_session->>'user_agent', ''), 250),
      COALESCE((p_session->>'first_submission')::boolean, false)
    );
  ELSIF v_existing.user_id <> p_user_id THEN
    -- Defence-in-depth: refuse cross-user mutation. The API already
    -- gates by auth.uid() but this catches a misconfigured route too.
    RAISE EXCEPTION 'session.user_id mismatch';
  END IF;

  -- Merge denormalised counters (idempotent — take the MAX/OR of new
  -- vs existing so re-sent events don't roll counters backward).
  UPDATE public.submission_sessions
  SET
    category        = COALESCE(NULLIF(p_counters->>'category', ''), category),
    text_length_max = GREATEST(text_length_max, COALESCE((p_counters->>'text_length_max')::int, 0)),
    ai_call_count   = GREATEST(ai_call_count,   COALESCE((p_counters->>'ai_call_count')::int, 0)),
    match_locked    = match_locked  OR COALESCE((p_counters->>'match_locked')::boolean, false),
    published       = published     OR COALESCE((p_counters->>'published')::boolean, false),
    duplicate_hit   = duplicate_hit OR COALESCE((p_counters->>'duplicate_hit')::boolean, false),
    error_count     = error_count + COALESCE((p_counters->>'error_delta')::int, 0)
  WHERE id = v_session_id;

  -- Append events.
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO public.submission_events (
      session_id, event_name, state, fired_at, payload, ai_latency_ms
    ) VALUES (
      v_session_id,
      v_event->>'event_name',
      NULLIF(v_event->>'state', ''),
      COALESCE((v_event->>'fired_at')::timestamptz, now()),
      COALESCE(v_event->'payload', '{}'::jsonb),
      NULLIF(v_event->>'ai_latency_ms', '')::int
    );
  END LOOP;

  -- Optional snapshot. Caller sends at most one per call.
  IF p_snapshot IS NOT NULL AND p_snapshot->>'text_sanitized' IS NOT NULL THEN
    INSERT INTO public.submission_text_snapshots (
      session_id, text_sanitized, text_length_full, state_at_capture
    ) VALUES (
      v_session_id,
      LEFT(p_snapshot->>'text_sanitized', 500),
      NULLIF(p_snapshot->>'text_length_full', '')::int,
      NULLIF(p_snapshot->>'state_at_capture', '')
    );
  END IF;

  RETURN v_session_id;
END;
$$;

-- Close function. Single endpoint to finalise final_state + ended_at.
-- Called by PATCH /api/submission-funnel/[session_id] or via beacon
-- on overlay close.
CREATE OR REPLACE FUNCTION public.close_funnel_session(
  p_user_id     uuid,
  p_session_id  uuid,
  p_final_state text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.submission_sessions
  SET final_state = p_final_state,
      ended_at    = COALESCE(ended_at, now())
  WHERE id = p_session_id
    AND user_id = p_user_id
    AND ended_at IS NULL;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────
-- Users see their own sessions only (helps drives a future "your
-- submission timeline" surface). Writes are service-role only via the
-- ingest function. Admin views use the service role client.

ALTER TABLE public.submission_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_text_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subm_sessions_own_read" ON public.submission_sessions;
CREATE POLICY "subm_sessions_own_read" ON public.submission_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subm_events_own_read" ON public.submission_events;
CREATE POLICY "subm_events_own_read" ON public.submission_events
  FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM public.submission_sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "subm_snapshots_own_read" ON public.submission_text_snapshots;
CREATE POLICY "subm_snapshots_own_read" ON public.submission_text_snapshots
  FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM public.submission_sessions WHERE user_id = auth.uid()));

GRANT SELECT ON public.submission_sessions       TO authenticated;
GRANT SELECT ON public.submission_events         TO authenticated;
GRANT SELECT ON public.submission_text_snapshots TO authenticated;

-- Ingest function exposed to authenticated callers (the API). Internal
-- check inside the function rejects user_id mismatches.
GRANT EXECUTE ON FUNCTION public.ingest_funnel_batch(uuid, jsonb, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_funnel_session(uuid, uuid, text)                TO authenticated;
