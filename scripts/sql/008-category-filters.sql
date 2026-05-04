-- Migration: Category Filters (admin-curated category-page filters)
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Category page filters were hardcoded in `constants/filters.ts`. Marketing
-- couldn't change which filters appear, in which order, or which surface as
-- chips vs the bottom-sheet panel — without code + deploy. This migration
-- moves it into DB and seeds with the current values so nothing breaks.
--
-- MODEL:
--   category_filters         — per-category filter rows (id, label, widget, options, is_quick, order)
--   category_filter_settings — per-category metadata (has_nearby, sort options)

-- ─── Filters table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_filters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  filter_id text NOT NULL,                 -- 'genre', 'platform', 'region' etc.
  label text NOT NULL,
  widget text NOT NULL,                    -- 'dropdown' | 'segmented' | 'platform-cards' | 'icon-cards' | 'checkboxes' | 'price-range' | 'origin-cards' | 'search-dropdown'
  placeholder text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{id, label}]
  is_quick boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, filter_id)
);

CREATE INDEX IF NOT EXISTS idx_category_filters_lookup
  ON category_filters(category, display_order) WHERE is_published = true;

-- ─── Per-category settings table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS category_filter_settings (
  category text PRIMARY KEY,
  has_nearby boolean NOT NULL DEFAULT false,
  sort_options jsonb NOT NULL DEFAULT '["Πιο Πρόσφατα", "Δημοφιλή", "Βαθμολογία"]'::jsonb,
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Modified-at triggers ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_category_filter_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_filters_touch ON category_filters;
CREATE TRIGGER trg_category_filters_touch
  BEFORE UPDATE ON category_filters
  FOR EACH ROW EXECUTE FUNCTION touch_category_filter_modified_at();

DROP TRIGGER IF EXISTS trg_category_filter_settings_touch ON category_filter_settings;
CREATE TRIGGER trg_category_filter_settings_touch
  BEFORE UPDATE ON category_filter_settings
  FOR EACH ROW EXECUTE FUNCTION touch_category_filter_modified_at();

-- ─── RLS ───────────────────────────────────────────────────────────
ALTER TABLE category_filters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_filter_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_filters_public_read" ON category_filters;
CREATE POLICY "category_filters_public_read" ON category_filters
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "category_filter_settings_public_read" ON category_filter_settings;
CREATE POLICY "category_filter_settings_public_read" ON category_filter_settings
  FOR SELECT USING (true);

-- ─── Seed: current values from constants/filters.ts ────────────────
-- ON CONFLICT DO NOTHING means re-running this migration is idempotent.

-- MOVIES
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('movies', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('movies', 'genre',    'Κατηγορία',     'dropdown',        NULL,                                                         '[]', false, 0),
  ('movies', 'director', 'Σκηνοθέτης',    'search-dropdown', 'Διάλεξε σκηνοθέτη πχ Nolan',                                  '[]', false, 1),
  ('movies', 'actor',    'Πρωταγωνιστής', 'search-dropdown', 'Διάλεξε πρωταγωνιστή πχ Πατσίνο',                              '[]', false, 2),
  ('movies', 'duration', 'Διάρκεια',      'segmented',       NULL,                                                         '[{"id":"all","label":"Όλα"},{"id":"90","label":"90''"},{"id":"120","label":"120''"},{"id":"150","label":"150''+"}]', false, 3),
  ('movies', 'platform', 'Διαθέσιμη',     'platform-cards',  NULL,                                                         '[{"id":"netflix","label":"Netflix"},{"id":"disney","label":"Disney+"},{"id":"prime","label":"Prime"},{"id":"youtube","label":"YouTube"}]', true,  4),
  ('movies', 'awards',   'Βραβεία',       'dropdown',        'Διάλεξε Βραβεία',                                            '[]', false, 5)
ON CONFLICT (category, filter_id) DO NOTHING;

-- SERIES
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('series', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('series', 'genre',           'Κατηγορία',     'dropdown',        NULL,                              '[]', false, 0),
  ('series', 'platform',        'Διαθέσιμη',     'platform-cards',  NULL,                              '[{"id":"netflix","label":"Netflix"},{"id":"disney","label":"Disney+"},{"id":"prime","label":"Prime"},{"id":"youtube","label":"YouTube"}]', true,  1),
  ('series', 'characteristics', 'Χαρακτηριστικά','checkboxes',      NULL,                              '[{"id":"completed","label":"Η σειρά έχει ολοκληρωθεί"},{"id":"single_season","label":"Σειρά με 1 σεζόν"},{"id":"true_story","label":"Βασισμένη σε αληθινά γεγονότα"}]', false, 2),
  ('series', 'actor',            'Πρωταγωνιστής','search-dropdown', 'Διάλεξε πρωταγωνιστή πχ Πατσίνο', '[]', false, 3),
  ('series', 'awards',           'Βραβεία',      'dropdown',        'Διάλεξε Βραβεία',                 '[]', false, 4)
ON CONFLICT (category, filter_id) DO NOTHING;

-- BOOKS
INSERT INTO category_filter_settings (category, has_nearby, sort_options) VALUES ('books', false, '["Πιο Πρόσφατα", "Δημοφιλή", "Βαθμολογία", "Σελίδες"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('books', 'genre',     'Κατηγορία',  'dropdown',        NULL,                              '[]', false, 0),
  ('books', 'writer',    'Συγγραφέας', 'search-dropdown', 'Διάλεξε συγγραφέα πχ Κοέλιο',     '[]', false, 1),
  ('books', 'publisher', 'Εκδόσεις',   'search-dropdown', 'Διάλεξε εκδόσεις πχ Διόπτρα',    '[]', false, 2)
ON CONFLICT (category, filter_id) DO NOTHING;

-- RECIPES
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('recipes', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('recipes', 'type',   'Κατηγορία',   'dropdown',     NULL, '[]', false, 0),
  ('recipes', 'origin', 'Προέλευση',   'origin-cards', NULL, '[]', false, 1),
  ('recipes', 'level',  'Επίπεδο',     'checkboxes',   NULL, '[{"id":"easy","label":"Εύκολη"},{"id":"medium","label":"Μέτρια"},{"id":"hard","label":"Δύσκολη"}]', true, 2),
  ('recipes', 'diet',   'Διατροφή',    'checkboxes',   NULL, '[{"id":"no_milk","label":"Χωρίς γάλα"},{"id":"vegan","label":"Vegan"},{"id":"no_sugar","label":"Χωρίς ζάχαρη"}]', false, 3)
ON CONFLICT (category, filter_id) DO NOTHING;

-- FOOD
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('food', true) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('food', 'region',   'Περιοχή',  'dropdown',       NULL, '[]', true,  0),
  ('food', 'type',     'Είδος',    'dropdown',       NULL, '[]', false, 1),
  ('food', 'cuisine',  'Κουζίνα',  'dropdown',       NULL, '[]', false, 2),
  ('food', 'delivery', 'Delivery', 'platform-cards', NULL, '[{"id":"efood","label":"efood"},{"id":"box","label":"Box"}]', false, 3)
ON CONFLICT (category, filter_id) DO NOTHING;

-- BARS
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('bars', true) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('bars', 'region', 'Περιοχή', 'dropdown', NULL, '[]', true, 0)
ON CONFLICT (category, filter_id) DO NOTHING;

-- HOTELS
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('hotels', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('hotels', 'region',        'Περιοχή',       'dropdown',    NULL, '[]', false, 0),
  ('hotels', 'property_type', 'Είδος',         'icon-cards',  NULL, '[{"id":"hotel","label":"Ξενοδοχείο"},{"id":"apartment","label":"Διαμέρισμα"},{"id":"rooms","label":"Δωμάτια"},{"id":"villa","label":"Βίλα"}]', false, 1),
  ('hotels', 'price',         'Εύρος τιμής',   'price-range', NULL, '[]', true,  2)
ON CONFLICT (category, filter_id) DO NOTHING;

-- THEATER
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('theater', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('theater', 'type',  'Κατηγορία',     'dropdown',        NULL,                              '[]', false, 0),
  ('theater', 'actor', 'Πρωταγωνιστής', 'search-dropdown', 'Διάλεξε πρωταγωνιστή πχ Βλάχος', '[]', false, 1),
  ('theater', 'when',  'Πότε παίζεται', 'segmented',       NULL,                              '[{"id":"all","label":"Όλα"},{"id":"this_week","label":"Αυτή την\nεβδομάδα"},{"id":"this_month","label":"Αυτό το\nμήνα"}]', false, 2)
ON CONFLICT (category, filter_id) DO NOTHING;

-- EVENTS
INSERT INTO category_filter_settings (category, has_nearby) VALUES ('events', false) ON CONFLICT DO NOTHING;
INSERT INTO category_filters (category, filter_id, label, widget, placeholder, options, is_quick, display_order) VALUES
  ('events', 'event_type', 'Κατηγορία',   'dropdown',        NULL,                              '[]', false, 0),
  ('events', 'region',     'Περιοχή',     'dropdown',        NULL,                              '[]', false, 1),
  ('events', 'when',       'Πότε',        'segmented',       NULL,                              '[{"id":"all","label":"Όλα"},{"id":"this_week","label":"Αυτή την\nεβδομάδα"},{"id":"this_month","label":"Αυτό το\nμήνα"}]', false, 2),
  ('events', 'performer',  'Καλλιτέχνης', 'search-dropdown', 'Διάλεξε καλλιτέχνη πχ Μάλαμας',  '[]', false, 3)
ON CONFLICT (category, filter_id) DO NOTHING;
