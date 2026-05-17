-- 038: related_sections_config.radius_km
--
-- Adds a numeric radius column so the resolver knows the search
-- distance for the new "_nearby_radius_" field type. NULL for every
-- other rule type (writer / director / actors[0].name etc. don't
-- need a radius). For nearby rules, the resolver uses lat/lng of the
-- current item + Haversine distance to find sibling venues within
-- the configured km.
--
-- Default radius for the seeded food/bars/hotels rules is 1km (good
-- balance for dense urban areas like Athens).

ALTER TABLE related_sections_config
  ADD COLUMN IF NOT EXISTS radius_km numeric NULL;

COMMENT ON COLUMN related_sections_config.radius_km IS
  'Distance in km for field=_nearby_radius_ rules. NULL for value-match rules (writer/director/etc).';

-- Seed default nearby rules for the three venue categories. Admin
-- can disable / change radius / change title via /admin/related-
-- sections at any time. We seed conservatively: only on conflict-do-
-- nothing so re-running this migration doesn't duplicate.

INSERT INTO related_sections_config
  (category, field, title_template, min_items, item_limit, display_order, is_active, radius_km)
VALUES
  ('food',   '_nearby_radius_', 'Άλλα μέρη εδώ κοντά',     2, 6, 100, true, 1.0),
  ('bars',   '_nearby_radius_', 'Άλλα μέρη εδώ κοντά',     2, 6, 100, true, 1.0),
  ('hotels', '_nearby_radius_', 'Άλλα καταλύματα εδώ κοντά', 2, 6, 100, true, 1.0)
ON CONFLICT (category, field) DO NOTHING;
