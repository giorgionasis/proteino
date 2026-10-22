-- Migration 048: fixed-window rate limiter for public AI routes.
--
-- /api/ai/match, /api/ai/coaching-tip, /api/onboarding/parse-interests and
-- /api/search are callable by guests (by design — "give before you ask")
-- and each request can spend Gemini tokens. lib/rate-limit.ts calls
-- rate_limit_hit() once per request with the service-role client; the
-- counter lives in Postgres so the limit holds across every Vercel
-- instance (in-memory counters don't).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;

-- Returns true when the request is allowed (hits within the window <= p_max).
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key            text,
  p_window_seconds int,
  p_max            int
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
BEGIN
  INSERT INTO public.rate_limit_hits AS r (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO v_hits;

  -- Opportunistic cleanup (~1% of calls) keeps the table tiny without a cron.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, int, int) FROM PUBLIC, anon, authenticated;
