-- Migration: Create subcategories + regions tables
-- Run this in Supabase SQL Editor BEFORE running assign-subcategories.js

-- ─── Subcategories Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description_seo text,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, slug)
);

-- ─── Regions Table (2-level: Region → Area) ─────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES regions(id),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ─── Add subcategory_id FK to items ─────────────────────────────────────
ALTER TABLE items ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES subcategories(id);
CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items(subcategory_id);

-- ─── Add region_id FK to location-based extension tables ────────────────
ALTER TABLE item_food ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);
ALTER TABLE item_bars ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);
ALTER TABLE item_hotels ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);
ALTER TABLE item_theater ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);
ALTER TABLE item_events ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);

-- ─── Indexes for region lookups ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_region ON item_food(region_id);
CREATE INDEX IF NOT EXISTS idx_bars_region ON item_bars(region_id);
CREATE INDEX IF NOT EXISTS idx_hotels_region ON item_hotels(region_id);
CREATE INDEX IF NOT EXISTS idx_theater_region ON item_theater(region_id);
CREATE INDEX IF NOT EXISTS idx_events_region ON item_events(region_id);

-- ─── RLS Policies (public read, admin write) ────────────────────────────
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcategories_public_read" ON subcategories
  FOR SELECT USING (true);

CREATE POLICY "regions_public_read" ON regions
  FOR SELECT USING (true);
