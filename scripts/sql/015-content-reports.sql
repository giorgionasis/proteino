-- ─── Content reports (generalized — comments + suggestions) ──────────────
--
-- Replaces the piecemeal `comment_reports` table from migration 003 for
-- all NEW reports. The 3-step user flow (reason → description → confirm)
-- writes here regardless of whether the target is a comment or a suggestion.
--
-- Old `comment_reports` rows stay untouched (no migration). New rows for
-- both target types land in this table.

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What's being reported
  target_type text NOT NULL CHECK (target_type IN ('comment', 'suggestion')),
  target_id uuid NOT NULL,

  -- Who reported
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 4-reason enum from the user-facing modal
  reason text NOT NULL CHECK (reason IN ('inaccurate', 'fraud', 'offensive', 'other')),

  -- Required free-text from the user (step 2 of modal). Min 10 chars
  -- enforced both client + server.
  description text NOT NULL,

  -- Admin moderation
  resolved boolean NOT NULL DEFAULT false,
  resolution_action text CHECK (resolution_action IN ('kept', 'hidden')),
  resolution_note text,                                     -- admin's justification
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Fast lookup: unresolved reports per target (admin moderation queue).
CREATE INDEX IF NOT EXISTS idx_content_reports_unresolved
  ON content_reports(target_type, target_id) WHERE resolved = false;

-- Idempotency: same user can't report the same target with the same reason
-- more than once. They CAN report the same target with a different reason.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_content_reports_dedup
  ON content_reports(reporter_id, target_type, target_id, reason);

-- Suggestions: add hidden_* columns to mirror what comments already has from
-- migration 003. Lets us soft-hide a suggestion without losing history.
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES users(id);

-- Filter index: detail-page queries skip hidden suggestions.
CREATE INDEX IF NOT EXISTS idx_suggestions_visible
  ON suggestions(item_id) WHERE hidden_at IS NULL AND is_published = true;

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports (reporter_id must match auth uid).
DROP POLICY IF EXISTS content_reports_insert_own ON content_reports;
CREATE POLICY content_reports_insert_own
  ON content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Users can SELECT their own reports (so they can see history if we ever
-- surface it). Admins read everything.
DROP POLICY IF EXISTS content_reports_select_own ON content_reports;
CREATE POLICY content_reports_select_own
  ON content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Admins can SELECT/UPDATE all rows (resolution flow).
-- Service-role client bypasses RLS anyway; this is defense-in-depth for any
-- future admin operations that go through the user-token path.
DROP POLICY IF EXISTS content_reports_admin ON content_reports;
CREATE POLICY content_reports_admin
  ON content_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- No DELETE policy — full report history is preserved per product decision.
