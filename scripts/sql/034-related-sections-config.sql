-- Migration 034: related_sections_config — admin-configurable
-- "More from {axis}" sections on detail pages
--
-- WHY
-- ───
-- Detail pages (movies, books, series, theater, events) should surface
-- siblings sharing the same author / director / actor / performer
-- without an engineer hardcoding the query per page. This table holds
-- one row per (category, axis) rule. Detail pages fetch active rules,
-- look up the current item's value for each axis, and render a
-- carousel of matching siblings.
--
-- Rule auto-hides when the current item's value is null or when fewer
-- than `min_items` siblings exist. Title interpolates `{value}` so the
-- admin can write "Περισσότερα από {value}" once and it renders as
-- "Περισσότερα από Christopher Nolan" / "...Kazantzakis" per item.
--
-- Field syntax (parsed by lib/related-sections.ts):
--   - scalar columns    → `writer`, `director`, `event_type`, `cuisine`
--   - JSON array[0]     → `performers[0]`           (string array)
--   - JSON array[0].key → `actors[0].name`          (object array)
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.related_sections_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL CHECK (category IN (
                    'books','movies','series','food','recipes',
                    'bars','hotels','theater','events')),
  field           text NOT NULL,
  title_template  text NOT NULL,
  min_items       int  NOT NULL DEFAULT 2 CHECK (min_items >= 1),
  item_limit      int  NOT NULL DEFAULT 6 CHECK (item_limit BETWEEN 1 AND 20),
  display_order   int  NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  modified_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, field)
);

CREATE INDEX IF NOT EXISTS idx_related_sections_lookup
  ON public.related_sections_config (category, is_active, display_order);

-- Touch trigger
CREATE OR REPLACE FUNCTION touch_related_sections_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_related_sections_touch ON public.related_sections_config;
CREATE TRIGGER trg_related_sections_touch
  BEFORE UPDATE ON public.related_sections_config
  FOR EACH ROW EXECUTE FUNCTION touch_related_sections_modified_at();

-- RLS: public read, admin-only write (writes go through service-role API)
ALTER TABLE public.related_sections_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "related_sections_public_read" ON public.related_sections_config;
CREATE POLICY "related_sections_public_read" ON public.related_sections_config
  FOR SELECT USING (is_active = true);
GRANT SELECT ON public.related_sections_config TO authenticated, anon;

-- ─── Seed default rules ────────────────────────────────────────────
-- Idempotent: UNIQUE(category, field) + ON CONFLICT DO NOTHING.

INSERT INTO public.related_sections_config
  (category, field, title_template, min_items, item_limit, display_order, is_active)
VALUES
  -- Books: more from the same author
  ('books',   'writer',          'Περισσότερα από {value}',       2, 6, 0, true),

  -- Movies: more from the director + more with the lead actor
  ('movies',  'director',        'Άλλες ταινίες από {value}',     2, 6, 0, true),
  ('movies',  'actors[0].name',  'Παίζει επίσης ο {value}',       2, 6, 10, true),

  -- Series: same axes as movies
  ('series',  'director',        'Άλλες σειρές από {value}',      2, 6, 0, true),
  ('series',  'actors[0].name',  'Παίζει επίσης ο {value}',       2, 6, 10, true),

  -- Theater: director + writer
  ('theater', 'director',        'Άλλες παραστάσεις από {value}', 2, 6, 0, true),
  ('theater', 'writer',          'Άλλα έργα του {value}',          2, 6, 10, true),

  -- Events: same performer
  ('events',  'performers[0]',   'Άλλες εμφανίσεις του {value}',  2, 6, 0, true)
ON CONFLICT (category, field) DO NOTHING;
