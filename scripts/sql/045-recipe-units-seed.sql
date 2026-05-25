-- 045-recipe-units-seed.sql
-- Seed canonical recipe units into extra_field_options so the admin
-- SuggestionEditor and the user-facing recipe wizard pull from the
-- same source. Idempotent — `INSERT ... ON CONFLICT DO NOTHING`
-- preserves any admin edits (renaming a label, adding custom units,
-- changing display_order) made after the initial seed.
--
-- The canonical list lives in lib/recipes/units.ts (RECIPE_UNITS).
-- Adding a new unit to that file alone is NOT enough — you must also
-- append it to this seed and re-run, OR add it via /admin/extra-fields.

INSERT INTO extra_field_options (category, field_group, value, label, display_order, is_published)
VALUES
  -- Common
  ('recipes', 'unit', 'tbsp',        'κ.σ.',          10,  true),
  ('recipes', 'unit', 'tsp',         'κ.γ.',          20,  true),
  ('recipes', 'unit', 'cup',         'φλ.',           30,  true),
  ('recipes', 'unit', 'cup_tea',     'φλ. τσαγιού',   40,  true),
  ('recipes', 'unit', 'cup_coffee',  'φλ. καφέ',      50,  true),
  -- Volume
  ('recipes', 'unit', 'ml',          'ml',            100, true),
  ('recipes', 'unit', 'l',           'λίτρο',         110, true),
  -- Weight
  ('recipes', 'unit', 'g',           'γρ.',           200, true),
  ('recipes', 'unit', 'kg',          'κιλό',          210, true),
  -- Count / portion
  ('recipes', 'unit', 'pcs',         'τεμ.',          300, true),
  ('recipes', 'unit', 'slice',       'φέτες',         310, true),
  ('recipes', 'unit', 'clove',       'σκελ.',         320, true),
  ('recipes', 'unit', 'sprig',       'κλ.',           330, true),
  ('recipes', 'unit', 'bunch',       'ματσάκι',       340, true),
  ('recipes', 'unit', 'head',        'κεφάλι',        350, true),
  -- Special
  ('recipes', 'unit', 'pinch',       'τσιμπιά',       400, true),
  ('recipes', 'unit', 'drop',        'σταγόνα',       410, true),
  ('recipes', 'unit', 'handful',     'χούφτα',        420, true),
  ('recipes', 'unit', 'to_taste',    'κατά βούληση',  500, true)
ON CONFLICT (category, field_group, value) DO NOTHING;

-- Common ingredients — same source-of-truth pattern. Helps the
-- ingredient name input autocomplete consistently across recipes.
-- Catalogue stays small + curated; admin extends via UI if needed.
INSERT INTO extra_field_options (category, field_group, value, label, display_order, is_published)
VALUES
  ('recipes', 'common_ingredient', 'alevri',       'αλεύρι',      10,  true),
  ('recipes', 'common_ingredient', 'zaxari',       'ζάχαρη',      20,  true),
  ('recipes', 'common_ingredient', 'voutyro',      'βούτυρο',     30,  true),
  ('recipes', 'common_ingredient', 'avga',         'αυγά',        40,  true),
  ('recipes', 'common_ingredient', 'gala',         'γάλα',        50,  true),
  ('recipes', 'common_ingredient', 'alati',        'αλάτι',       60,  true),
  ('recipes', 'common_ingredient', 'piperi',       'πιπέρι',      70,  true),
  ('recipes', 'common_ingredient', 'elaiolado',    'ελαιόλαδο',   80,  true),
  ('recipes', 'common_ingredient', 'kremmydi',     'κρεμμύδι',    90,  true),
  ('recipes', 'common_ingredient', 'skordo',       'σκόρδο',      100, true),
  ('recipes', 'common_ingredient', 'domata',       'ντομάτα',     110, true),
  ('recipes', 'common_ingredient', 'lemoni',       'λεμόνι',      120, true),
  ('recipes', 'common_ingredient', 'feta',         'φέτα',        130, true),
  ('recipes', 'common_ingredient', 'gioyrti',      'γιαούρτι',    140, true),
  ('recipes', 'common_ingredient', 'mayintano',    'μαϊντανός',   150, true),
  ('recipes', 'common_ingredient', 'rigani',       'ρίγανη',      160, true),
  ('recipes', 'common_ingredient', 'kanela',       'κανέλα',      170, true),
  ('recipes', 'common_ingredient', 'baking_powder','baking powder', 180, true),
  ('recipes', 'common_ingredient', 'soda',         'σόδα',        190, true),
  ('recipes', 'common_ingredient', 'vanilia',      'βανίλια',     200, true)
ON CONFLICT (category, field_group, value) DO NOTHING;

-- Difficulty levels — already used by RecipeExtraFields; seed to keep
-- the admin Extra Fields page complete.
INSERT INTO extra_field_options (category, field_group, value, label, display_order, is_published)
VALUES
  ('recipes', 'level', 'easy',   'Easy',   10, true),
  ('recipes', 'level', 'medium', 'Medium', 20, true),
  ('recipes', 'level', 'hard',   'Hard',   30, true)
ON CONFLICT (category, field_group, value) DO NOTHING;
