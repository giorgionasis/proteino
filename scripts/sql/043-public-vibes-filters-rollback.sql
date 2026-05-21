-- 043-rollback — drop the vibes filter rows seeded in (the now-deleted) 043.
--
-- The tag-pattern matching approach was the wrong tool for structured
-- filters like "bars with a roof garden" — see migration 044
-- (item_food / item_bars amenities) for the proper structured-data
-- model. This rollback removes only the seeded rows; any admin edits
-- on top of them are also dropped.
--
-- Idempotent: deletes by exact (category, filter_id) — runs as no-op
-- if 043 was never applied.

DELETE FROM category_filters
  WHERE filter_id = 'vibes'
    AND category IN ('food', 'bars', 'hotels');
