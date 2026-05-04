-- Migration: Movies Tonight (curated TV airings)
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Greeks watching TV at night want to know which good movies are airing
-- right now. Admin curates this list (TV listings change daily). The home
-- page surfaces today's airings as a "Don't miss" section. Hardcoded
-- carousels can't do this — content lives in DB, admin curates without deploy.
--
-- MODEL:
-- A movies_tonight row = a single airing of an existing movie at a specific
-- channel + date + time. The movie itself comes from `items` (so we reuse
-- title, cover, rating, slug). Admin only enters the airing metadata.

CREATE TABLE IF NOT EXISTS movies_tonight (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  channel text NOT NULL,
  air_date date NOT NULL,
  air_time time NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, channel, air_date, air_time)
);

CREATE INDEX IF NOT EXISTS idx_movies_tonight_air_date
  ON movies_tonight(air_date) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_movies_tonight_item
  ON movies_tonight(item_id);

-- ─── Auto-update modified_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_movies_tonight_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movies_tonight_touch ON movies_tonight;
CREATE TRIGGER trg_movies_tonight_touch
  BEFORE UPDATE ON movies_tonight
  FOR EACH ROW EXECUTE FUNCTION touch_movies_tonight_modified_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE movies_tonight ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movies_tonight_public_read" ON movies_tonight;
CREATE POLICY "movies_tonight_public_read" ON movies_tonight
  FOR SELECT USING (is_published = true);
