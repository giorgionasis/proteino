-- ─── Review votes — thumbs up/down on individual reviews ──────────────────
-- Mirrors the comment_votes pattern from migration 003. One vote per (user,
-- review). Trigger keeps reviews.vote_up + vote_down in sync so the detail
-- page query can read the counts directly without a JOIN.

CREATE TABLE IF NOT EXISTS review_votes (
  user_id     uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  vote        smallint NOT NULL CHECK (vote IN (-1, 1)),  -- 1 = up, -1 = down
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review
  ON review_votes(review_id);

-- ─── Counter sync trigger ─────────────────────────────────────────────────
-- Keeps reviews.vote_up / vote_down current on every INSERT/UPDATE/DELETE
-- of review_votes. Fires per-row, AFTER. Same shape as the comment trigger.

CREATE OR REPLACE FUNCTION sync_review_vote_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE reviews SET vote_up = vote_up + 1 WHERE id = NEW.review_id;
    ELSE
      UPDATE reviews SET vote_down = vote_down + 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE reviews SET vote_up = GREATEST(vote_up - 1, 0) WHERE id = OLD.review_id;
    ELSE
      UPDATE reviews SET vote_down = GREATEST(vote_down - 1, 0) WHERE id = OLD.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote != NEW.vote THEN
    -- User flipped their vote (up → down or down → up)
    IF NEW.vote = 1 THEN
      UPDATE reviews SET vote_up = vote_up + 1, vote_down = GREATEST(vote_down - 1, 0) WHERE id = NEW.review_id;
    ELSE
      UPDATE reviews SET vote_down = vote_down + 1, vote_up = GREATEST(vote_up - 1, 0) WHERE id = NEW.review_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_review_votes ON review_votes;
CREATE TRIGGER trg_sync_review_votes
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW EXECUTE FUNCTION sync_review_vote_counts();

-- ─── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote rows (used to derive my-vote state)
DROP POLICY IF EXISTS review_votes_select ON review_votes;
CREATE POLICY review_votes_select ON review_votes
  FOR SELECT USING (true);

-- Users can only insert/update/delete their own votes
DROP POLICY IF EXISTS review_votes_insert_own ON review_votes;
CREATE POLICY review_votes_insert_own ON review_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS review_votes_update_own ON review_votes;
CREATE POLICY review_votes_update_own ON review_votes
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS review_votes_delete_own ON review_votes;
CREATE POLICY review_votes_delete_own ON review_votes
  FOR DELETE USING (user_id = auth.uid());
