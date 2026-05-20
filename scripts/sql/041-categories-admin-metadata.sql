-- 041 — admin-editable category metadata
--
-- Stores the *display* layer for the 9 categories: Greek label, icon,
-- sort order, nav visibility. The canonical category list (slugs +
-- capability flags like hasMap / hasTrailer) lives in
-- `constants/categories.ts` and stays code-coupled — slugs are tied to
-- routes, switch-case logic, and `items.category` foreign-key strings,
-- so admin can't safely edit them.
--
-- Why `category_meta` and not the legacy `categories` table from
-- supabase/migrations/001_initial_schema.sql:
--   - That table is dormant — no app code reads it, no migrations have
--     ever seeded it.
--   - It uses `id uuid PK` + `alias` (a CMS-style category catalog).
--     Reusing it would require a slug column, a uniqueness constraint,
--     and seed reconciliation with whatever's already in there.
--   - `category_meta` is a clean, slug-keyed metadata side-table with
--     a clear single purpose.
--
-- Resolver pattern (lib/categories-meta.ts): merge `category_meta` row
-- over the code constant. Missing row falls back to the constant. This
-- way an un-applied migration or empty seed is non-fatal — every
-- consumer keeps working with the in-code defaults.

CREATE TABLE IF NOT EXISTS category_meta (
  slug              text PRIMARY KEY,                    -- 'movies' / 'books' / …
  display_label_el  text,                                -- Greek display label
  icon              text,                                -- emoji or icon ref
  display_order     int  NOT NULL DEFAULT 0,
  is_nav_published  bool NOT NULL DEFAULT true,          -- show in home tiles + nav
  modified_at       timestamptz NOT NULL DEFAULT now(),
  modified_by       uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS category_meta_display_order_idx
  ON category_meta (display_order);

-- RLS — public read only; writes via service-role admin client.
ALTER TABLE category_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS category_meta_public_read ON category_meta;
CREATE POLICY category_meta_public_read ON category_meta
  FOR SELECT USING (true);

-- Seed the 9 canonical slugs with the current code defaults. ON
-- CONFLICT DO NOTHING preserves any admin edits if the migration is
-- accidentally re-run.
INSERT INTO category_meta (slug, display_label_el, icon, display_order, is_nav_published) VALUES
  ('movies',  'Ταινίες',       '🎬',   0, true),
  ('series',  'Σειρές',        '📺',   1, true),
  ('books',   'Βιβλία',        '📚',   2, true),
  ('food',    'Φαγητό',        '🍽️',  3, true),
  ('recipes', 'Συνταγές',      '👨‍🍳', 4, true),
  ('bars',    'Μπαρ & Καφέ',   '☕',   5, true),
  ('hotels',  'Ξενοδοχεία',    '🏨',   6, true),
  ('theater', 'Θέατρο',        '🎭',   7, true),
  ('events',  'Εκδηλώσεις',    '🎉',   8, true)
ON CONFLICT (slug) DO NOTHING;
