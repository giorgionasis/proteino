-- ─── Comments: votes + reports + hide ────────────────────────────────────

-- Counter columns on comments (denormalized for fast reads)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS vote_up int NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS vote_down int NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_count int NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Per-user vote tracking (so users can't double-vote)
CREATE TABLE IF NOT EXISTS comment_votes (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  vote int NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);

-- Reports
CREATE TABLE IF NOT EXISTS comment_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,                      -- 'offensive' | 'spam' | 'misinformation' | 'harassment' | 'other'
  description text,
  resolved boolean NOT NULL DEFAULT false,
  resolution_action text,                    -- 'kept' | 'hidden' | 'deleted'
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_unresolved
  ON comment_reports(comment_id, created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);

-- ─── Counter sync triggers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_comment_vote_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE comments SET vote_up = vote_up + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET vote_down = vote_down + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE comments SET vote_up = GREATEST(vote_up - 1, 0) WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET vote_down = GREATEST(vote_down - 1, 0) WHERE id = OLD.comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote != NEW.vote THEN
    -- User changed their vote
    IF NEW.vote = 1 THEN
      UPDATE comments SET vote_up = vote_up + 1, vote_down = GREATEST(vote_down - 1, 0) WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET vote_down = vote_down + 1, vote_up = GREATEST(vote_up - 1, 0) WHERE id = NEW.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_votes ON comment_votes;
CREATE TRIGGER trg_sync_comment_votes
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION sync_comment_vote_counts();

CREATE OR REPLACE FUNCTION sync_comment_report_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.resolved THEN
    UPDATE comments SET report_count = report_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND NOT OLD.resolved THEN
    UPDATE comments SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.comment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.resolved != NEW.resolved THEN
    IF NEW.resolved THEN
      UPDATE comments SET report_count = GREATEST(report_count - 1, 0) WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET report_count = report_count + 1 WHERE id = NEW.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_reports ON comment_reports;
CREATE TRIGGER trg_sync_comment_reports
  AFTER INSERT OR UPDATE OR DELETE ON comment_reports
  FOR EACH ROW EXECUTE FUNCTION sync_comment_report_counts();

-- ─── RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own votes" ON comment_votes;
CREATE POLICY "Users see own votes" ON comment_votes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own votes" ON comment_votes;
CREATE POLICY "Users insert own votes" ON comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own votes" ON comment_votes;
CREATE POLICY "Users update own votes" ON comment_votes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own votes" ON comment_votes;
CREATE POLICY "Users delete own votes" ON comment_votes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert reports" ON comment_reports;
CREATE POLICY "Users insert reports" ON comment_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users see own reports" ON comment_reports;
CREATE POLICY "Users see own reports" ON comment_reports FOR SELECT USING (auth.uid() = reporter_id);
