-- 043 — promote 3 admin-only tag-pattern facets to public filters
--
-- Adds a `vibes` filter row to food / bars / hotels — multi-select
-- chips that filter items by `metadata.tags` regex patterns. The
-- patterns themselves live in `lib/category-filters/vibes.ts` (the
-- matcher `case "vibes"` looks them up by option id); the rows here
-- own the option labels + admin-editable display ordering.
--
-- Why 3 only: these have the highest data coverage and clearest user
-- intent (vibe browsing). Other admin tag-pattern facets (movies
-- sequel/biographical, books bestseller/classic, recipes quick/healthy
-- etc) stay admin-only — they're more about cataloguing than vibe
-- search.
--
-- Widget is `checkboxes` — existing public renderer handles multi-
-- select chips without code changes. Admin can re-publish, hide, or
-- add options via /admin/content/filters.

-- Bump display_order on existing rows to keep `vibes` last in the
-- filter strip (cuisine / region / etc come first for food).
INSERT INTO category_filters
  (category, filter_id, label, widget, placeholder, options, is_quick, is_published, display_order)
VALUES
  ('food',   'vibes', 'Ατμόσφαιρα', 'checkboxes', NULL,
   '[{"id":"vegan_friendly","label":"Vegan-friendly"},
     {"id":"family","label":"Οικογενειακό"},
     {"id":"romantic","label":"Ρομαντικό"},
     {"id":"brunch","label":"Brunch"},
     {"id":"view","label":"Με θέα"},
     {"id":"terrace","label":"Βεράντα / Κήπος"}]'::jsonb,
   false, true, 100),
  ('bars',   'vibes', 'Είδος', 'checkboxes', NULL,
   '[{"id":"rooftop","label":"Rooftop"},
     {"id":"cocktail","label":"Cocktail"},
     {"id":"wine","label":"Wine bar"},
     {"id":"jazz","label":"Jazz"},
     {"id":"live_music","label":"Live μουσική"},
     {"id":"late_night","label":"Νυχτερινό"},
     {"id":"pet_friendly","label":"Pet friendly"}]'::jsonb,
   false, true, 100),
  ('hotels', 'vibes', 'Χαρακτήρας', 'checkboxes', NULL,
   '[{"id":"pet_friendly","label":"Pet friendly"},
     {"id":"family","label":"Οικογενειακό"},
     {"id":"romantic","label":"Ρομαντικό / Honeymoon"},
     {"id":"beachfront","label":"Beachfront"},
     {"id":"boutique","label":"Boutique"},
     {"id":"eco","label":"Eco / Sustainable"}]'::jsonb,
   false, true, 100)
ON CONFLICT (category, filter_id) DO NOTHING;
