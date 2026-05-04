-- Extra Field Options table
-- Stores configurable option lists per (category, field_group)
-- Examples:
--   (hotels, amenities_facilities) → [Pool, Bar, Restaurant, Parking, Breakfast]
--   (hotels, amenities_room)       → [Sea view, Mountain View, Wifi]
--   (hotels, amenities_extra)      → [Pet Friendly, Disabilities, Transfer]
--   (food, attributes)             → [Parking, Wi-Fi, Outdoor Seating, ...]
--   (food, delivery_provider)      → [efood, Wolt, Box]
--   (movies, country)              → [Αυστραλία, Αυστρία, Αίγυπτος, ...]
--   (movies, attributes)           → [Based on true events, Based on a book, ...]

CREATE TABLE IF NOT EXISTS extra_field_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  field_group text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean DEFAULT true,
  icon text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, field_group, value)
);

CREATE INDEX IF NOT EXISTS idx_extra_field_options_category_group
  ON extra_field_options(category, field_group, display_order)
  WHERE is_published = true;

-- RLS: public read (frontend needs these for SuggestionEditor)
ALTER TABLE extra_field_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read extra_field_options"
  ON extra_field_options FOR SELECT
  USING (is_published = true OR auth.role() = 'service_role');
