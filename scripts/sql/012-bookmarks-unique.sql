-- Migration: bookmarks (user_id, item_id) uniqueness + RLS
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- The bookmark API uses upsert(user_id, item_id) for idempotent toggling,
-- which requires a unique constraint. Adds RLS so users can only see/modify
-- their own bookmarks.

-- Idempotent unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_user_item_unique'
  ) THEN
    -- Drop any pre-existing duplicates first (safety against legacy data)
    DELETE FROM bookmarks b1
    USING bookmarks b2
    WHERE b1.ctid < b2.ctid
      AND b1.user_id = b2.user_id
      AND b1.item_id = b2.item_id;

    ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_user_item_unique UNIQUE (user_id, item_id);
  END IF;
END
$$;

-- RLS — users see/modify only their own bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_own_read" ON bookmarks;
CREATE POLICY "bookmarks_own_read" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_own_insert" ON bookmarks;
CREATE POLICY "bookmarks_own_insert" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_own_delete" ON bookmarks;
CREATE POLICY "bookmarks_own_delete" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);
