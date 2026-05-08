-- Migration: align category_filters DB rows with the new widget types
-- introduced after migration 008. Run this in Supabase SQL Editor (or via
-- the seed script).
--
-- Three new widget types were added in code:
--   - multi-dropdown : inline checkbox list (multi-select within bottom sheet)
--   - region-picker  : full-screen two-step parent → sub-area picker
--   - awards-picker  : full-screen grouped checkbox list per award type
--
-- This migration upgrades the seed rows from migration 008 to match. Idempotent.

-- FOOD: region picker + multi-select cuisine/type
UPDATE category_filters SET widget = 'region-picker'
  WHERE category = 'food'  AND filter_id = 'region';
UPDATE category_filters SET widget = 'multi-dropdown'
  WHERE category = 'food'  AND filter_id IN ('type', 'cuisine');

-- BARS: region picker
UPDATE category_filters SET widget = 'region-picker'
  WHERE category = 'bars'  AND filter_id = 'region';

-- HOTELS: region picker
UPDATE category_filters SET widget = 'region-picker'
  WHERE category = 'hotels' AND filter_id = 'region';

-- EVENTS: region picker
UPDATE category_filters SET widget = 'region-picker'
  WHERE category = 'events' AND filter_id = 'region';

-- MOVIES: awards picker
UPDATE category_filters SET widget = 'awards-picker'
  WHERE category = 'movies' AND filter_id = 'awards';

-- SERIES: awards picker
UPDATE category_filters SET widget = 'awards-picker'
  WHERE category = 'series' AND filter_id = 'awards';

-- Sanity check (return rows after update):
SELECT category, filter_id, label, widget, display_order, is_quick
FROM category_filters
ORDER BY category, display_order;
