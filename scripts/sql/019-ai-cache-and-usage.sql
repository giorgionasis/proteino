-- Migration 019: AI query cache + usage log
--
-- Two tables for the Gemini integration:
--   ai_query_cache  — hot queries skip the LLM round-trip on repeat
--   ai_usage_log    — per-call audit + cost dashboard data source
--
-- Idempotent.

-- ── Cache ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_query_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   text NOT NULL UNIQUE,         -- sha256(provider|model|prompt_version|task|query)
  task        text NOT NULL,                 -- 'search' | 'submission' | 'embedding'
  query_text  text NOT NULL,                 -- raw query for human inspection
  result      jsonb NOT NULL,                -- the AIService response, ready to return
  hit_count   int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_task   ON ai_query_cache(task, last_hit_at DESC);

-- ── Usage log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task          text NOT NULL,               -- 'search' | 'submission' | 'embedding'
  provider      text NOT NULL DEFAULT 'gemini',
  model         text NOT NULL,
  query_text    text,
  input_tokens  int,
  output_tokens int,
  latency_ms    int,
  cache_hit     boolean NOT NULL DEFAULT false,
  user_id       uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_dashboard ON ai_usage_log(created_at DESC, task);
CREATE INDEX IF NOT EXISTS idx_ai_usage_by_user   ON ai_usage_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────
ALTER TABLE ai_query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log   ENABLE ROW LEVEL SECURITY;

-- Cache + usage are admin-only — no public read. Service role bypasses
-- RLS so server-side code reads/writes freely.
DROP POLICY IF EXISTS "ai_cache_admin_only" ON ai_query_cache;
CREATE POLICY "ai_cache_admin_only" ON ai_query_cache
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "ai_usage_admin_only" ON ai_usage_log;
CREATE POLICY "ai_usage_admin_only" ON ai_usage_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
