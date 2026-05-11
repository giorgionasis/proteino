-- Migration 021: flip food tabs dimension from cuisine → type.
--
-- The Greek browsing intent for food is establishment type first
-- (ταβέρνα, μεζεδοπωλείο, ψαροταβέρνα, εστιατόριο, …), with cuisine as
-- a secondary refinement. CategoryPageShell.TABS_OWNED_FILTER and the
-- mapItem precedence in app/(main)/[category]/page.tsx flip
-- accordingly in code. This migration aligns the bottom-sheet
-- visibility:
--
--   - food.type   → is_published = false  (now owned by tabs, redundant
--                   in the bottom sheet — would double-filter)
--   - food.cuisine → is_published = true  (was hidden when tabs owned
--                   cuisine; surfacing back as a multi-select)
--
-- Reversible: run a manual UPDATE to flip is_published back if we
-- decide cuisine-as-tabs is better after UX testing. No data is
-- destroyed; subcategories rows + item_food fields are untouched.
--
-- Idempotent.

UPDATE category_filters SET is_published = false
  WHERE category = 'food' AND filter_id = 'type';

UPDATE category_filters SET is_published = true
  WHERE category = 'food' AND filter_id = 'cuisine';

-- Sanity check:
SELECT category, filter_id, label, widget, is_quick, is_published, display_order
FROM category_filters
WHERE category = 'food'
ORDER BY display_order;
