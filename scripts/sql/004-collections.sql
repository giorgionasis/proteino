-- Migration: Collections (curated home/category feed sections)
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- The home feed and category-page sections are currently hardcoded in
-- app/(main)/page.tsx and app/(main)/[category]/page.tsx. To curate
-- seasonal/themed content (Marvel movies, Netflix series, Oscar winners,
-- summer rooftops...) we need DB-driven sections an admin can edit.
--
-- MODEL:
--   collections             — what & how it looks (type, title, image, filters)
--   collection_placements   — where & in what order (home / category / suggestions)
--
-- An item belongs to a collection if items.category = collections.source_category
-- (when set) AND items.metadata->'tags' contains every tag in collections.tags.
-- Richer filters (extension fields, awards json) extend later via collections.filters.

-- ─── Collections Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Visual format
  type text NOT NULL CHECK (type IN ('card','carousel')),

  -- Card uses title + title_specific (renders bold on the second line);
  -- carousel uses title only.
  title text NOT NULL,
  title_specific text,

  -- URL slug, unique. Drives /collections/[alias] (frontend reading route, future).
  alias text NOT NULL UNIQUE,

  -- Optional brand image (cards only — Marvel logo, Netflix N, etc.)
  image_url text,

  -- Source filter
  source_category text,                              -- NULL = cross-category
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,           -- string[] — every tag must match
  filters jsonb NOT NULL DEFAULT '[]'::jsonb,        -- reserved: extension-field filters
  item_limit int NOT NULL DEFAULT 20,

  -- Lifecycle
  is_published boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  target_audience text NOT NULL DEFAULT 'all'
    CHECK (target_audience IN ('all','registered','guest')),

  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Placements Table (where the collection appears) ────────────────────
-- A collection can appear in multiple places. Order is per-bucket
-- (context, category) so reordering on the "Movies" tab in admin doesn't
-- affect "Home" or "Food" ordering.
CREATE TABLE IF NOT EXISTS collection_placements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

  -- Where this collection shows up
  context text NOT NULL CHECK (context IN ('home','category','suggestions')),
  category text,                                     -- NULL for home; required otherwise

  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(collection_id, context, category)
);

CREATE INDEX IF NOT EXISTS idx_collection_placements_lookup
  ON collection_placements(context, category, display_order);

CREATE INDEX IF NOT EXISTS idx_collections_published
  ON collections(is_published);

-- ─── Auto-update modified_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_collection_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collections_touch ON collections;
CREATE TRIGGER trg_collections_touch
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION touch_collection_modified_at();

-- ─── RLS ────────────────────────────────────────────────────────────────
-- Public read for published collections (frontend reads them).
-- Admin writes go through service-role API routes.
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections_public_read" ON collections;
CREATE POLICY "collections_public_read" ON collections
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "collection_placements_public_read" ON collection_placements;
CREATE POLICY "collection_placements_public_read" ON collection_placements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_placements.collection_id AND c.is_published = true
    )
  );
