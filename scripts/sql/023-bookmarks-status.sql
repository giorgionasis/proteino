-- Migration 023: bookmarks.status (wishlist | done)
--
-- Bookmarks now carry an explicit state: 'wishlist' (want to do) vs
-- 'done' (have done it). One row per (user_id, item_id) — toggling
-- between states updates the row, doesn't create a second one. NULL
-- is treated as 'wishlist' (default) for safety, but the column is
-- NOT NULL going forward.
--
-- Idempotent: safe to re-run.

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'wishlist';

-- Backfill: every existing bookmark is treated as wishlist. We do
-- NOT auto-flip to 'done' based on whether the user has reviewed
-- the item; that's a UX decision the user makes explicitly.
UPDATE bookmarks SET status = 'wishlist' WHERE status IS NULL;

-- Constraint: only allow the two states.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookmarks_status_check'
  ) THEN
    ALTER TABLE bookmarks
      ADD CONSTRAINT bookmarks_status_check
      CHECK (status IN ('wishlist', 'done'));
  END IF;
END $$;

-- Index for the profile page query: list all of a user's bookmarks
-- filtered by status. The existing (user_id, item_id) unique index
-- already covers the toggle case.
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_status
  ON bookmarks (user_id, status);
