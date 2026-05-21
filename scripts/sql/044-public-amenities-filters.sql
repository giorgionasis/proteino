-- 044 — public amenities filter for food / bars / hotels
--
-- Structured replacement for the rolled-back vibes tag-pattern
-- approach (see 043-rollback). Reads from the existing amenity stores:
--   food   → item_food.information.amenities    (object-of-booleans)
--   bars   → item_bars.information.amenities    (object-of-booleans)
--   hotels → item_hotels.facilities             (same shape)
--
-- Admin already writes to these via the IconToggleGrid in
-- SuggestionEditor — no admin UI change needed. Option keys match the
-- catalogues in lib/icons.ts (FOOD_AMENITY_OPTIONS / HOTEL_AMENITY_GROUPS).
-- Bars uses the existing extra_fields-driven attribute list; the
-- common subset is seeded here, admin can edit the row's options to
-- add/remove.
--
-- Widget is `checkboxes` (existing public renderer). matchesFilter
-- case `amenities` ANDs the selection against item.amenities — every
-- selected amenity must be present.
--
-- Idempotent on (category, filter_id).

INSERT INTO category_filters
  (category, filter_id, label, widget, placeholder, options, is_quick, is_published, display_order)
VALUES
  ('food',   'amenities', 'Παροχές', 'checkboxes', NULL,
   '[{"id":"parking","label":"Parking"},
     {"id":"wifi","label":"Wi-Fi"},
     {"id":"pet","label":"Pet Friendly"},
     {"id":"vegan_menu","label":"Vegan Menu"},
     {"id":"playground","label":"Παιδότοπος"},
     {"id":"disabled","label":"ΑΜΕΑ"},
     {"id":"sea_view","label":"Θέα Θάλασσα"},
     {"id":"on_the_sea","label":"Παραλιακό"},
     {"id":"roof_garden","label":"Roof Garden"}]'::jsonb,
   false, true, 110),
  ('bars',   'amenities', 'Παροχές', 'checkboxes', NULL,
   '[{"id":"parking","label":"Parking"},
     {"id":"wifi","label":"Wi-Fi"},
     {"id":"outdoor_seating","label":"Outdoor Seating"},
     {"id":"live_music","label":"Live Music"},
     {"id":"dj","label":"DJ"},
     {"id":"pet","label":"Pet Friendly"},
     {"id":"reservations","label":"Reservations"},
     {"id":"smoking_area","label":"Smoking Area"},
     {"id":"accessible","label":"Accessible"},
     {"id":"happy_hour","label":"Happy Hour"},
     {"id":"late_night","label":"Late Night"}]'::jsonb,
   false, true, 110),
  ('hotels', 'amenities', 'Παροχές', 'checkboxes', NULL,
   '[{"id":"pool","label":"Πισίνα"},
     {"id":"bar","label":"Bar"},
     {"id":"restaurant","label":"Εστιατόριο"},
     {"id":"parking","label":"Free Parking"},
     {"id":"breakfast","label":"Πρωινό"},
     {"id":"wifi","label":"Wi-Fi"},
     {"id":"sea_view","label":"Θέα Θάλασσα"},
     {"id":"mountain","label":"Θέα Βουνό"},
     {"id":"on_the_sea","label":"Παραλιακό"},
     {"id":"roof_garden","label":"Roof Garden"},
     {"id":"pet","label":"Pet Friendly"},
     {"id":"disabled","label":"ΑΜΕΑ"},
     {"id":"transfer","label":"Transfer"},
     {"id":"vegan_menu","label":"Vegan Menu"},
     {"id":"playground","label":"Παιδότοπος"}]'::jsonb,
   false, true, 110)
ON CONFLICT (category, filter_id) DO NOTHING;
