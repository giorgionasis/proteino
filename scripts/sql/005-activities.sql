-- Migration: Activities (nearby attractions for hotels, taxonomy + entries)
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Hotel detail pages today have nothing about what to do nearby. Admin needs
-- a curated database of real-world activities (skiing in Καλάβρυτα, rafting
-- in Παρνασσός, museums in Αθήνα). When the user views a hotel, the frontend
-- queries activities by proximity to the hotel's lat/lng — no manual linking.
--
-- MODEL:
--   activity_categories  — Αθλητικές / Εκπαιδευτικές / Ψυχαγωγικές / Αξιοθέατα
--   activity_types       — children: ΣΚΙ, RAFTING, MUSEUM, etc. (per category)
--   activities           — the actual venue/event with lat/lng + links

-- ─── Categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,                                          -- emoji or short string
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Types (sub-categories) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES activity_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  image_url text,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- ─── Activities (the real-world entries) ────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type_id uuid NOT NULL REFERENCES activity_types(id) ON DELETE RESTRICT,

  name text NOT NULL,
  description text,

  -- Location
  address text,
  lat double precision,
  lng double precision,

  -- Links / social / contact
  website_url text,
  facebook_url text,
  instagram_url text,
  phone text,

  -- Visuals
  image_url text,

  -- Lifecycle
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- Index for proximity queries from hotel detail pages.
-- Future: replace with a postgis/earthdistance index if scale demands.
CREATE INDEX IF NOT EXISTS idx_activities_loc
  ON activities(lat, lng) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_activities_type
  ON activities(type_id);

-- ─── Auto-update modified_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_activity_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activities_touch ON activities;
CREATE TRIGGER trg_activities_touch
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION touch_activity_modified_at();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_categories_public_read" ON activity_categories;
CREATE POLICY "activity_categories_public_read" ON activity_categories
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "activity_types_public_read" ON activity_types;
CREATE POLICY "activity_types_public_read" ON activity_types
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "activities_public_read" ON activities;
CREATE POLICY "activities_public_read" ON activities
  FOR SELECT USING (is_published = true);

-- ─── Seed: 4 categories ─────────────────────────────────────────────
INSERT INTO activity_categories (name, slug, icon, display_order)
VALUES
  ('Αθλητικές',   'sports',        '🏔️', 0),
  ('Εκπαιδευτικές', 'educational',  '🏛️', 1),
  ('Ψυχαγωγικές',  'entertainment', '🎭', 2),
  ('Αξιοθέατα',    'attractions',   '🗺️', 3)
ON CONFLICT (slug) DO NOTHING;
