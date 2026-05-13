-- Migration 032: extend collection_placements into a generic page_sections table
--
-- WHY
-- ───
-- collection_placements (migration 004) only places COLLECTIONS in
-- (context, category) buckets. The non-collection chrome of every page
-- — welcome header, filter row, items list, top-users, suggest-box,
-- "Απόψε στην TV", hero blocks, support footer, etc. — is hardcoded in
-- app/(main)/page.tsx and components/category/CategoryPageShell.tsx.
--
-- That means admin can curate the *contents* of the carousels but not
-- the layout itself. This migration promotes collection_placements into
-- a generic page_sections table that holds BOTH collection rows AND
-- widget rows in one ordered list per (context, category, audience).
--
-- WHAT
-- ────
-- page_sections rows are discriminated by section_type:
--   'collection' — collection_id required; widget_key NULL
--   'widget'     — widget_key required (registered in lib/layout/widgets.ts);
--                   collection_id NULL; per-widget params in config jsonb
--   'divider'    — visual separator; both refs NULL; config carries label/spacing
--
-- The widget registry on the code side decides what each widget_key
-- renders, which contexts/categories/audiences it's compatible with,
-- and whether it's singleton (filter_row) or repeatable (static_carousel).
--
-- All existing collection placements are preserved verbatim — they just
-- get section_type='collection' filled in.
--
-- Seed at the end inserts widget rows that REPRODUCE THE CURRENT
-- HARDCODED LAYOUT for every (context, category) bucket, so the rendered
-- output the day after migration is identical. Admin opens /admin/layout
-- and sees the full stack already laid out, ready to reorder.
--
-- Idempotent.

-- ─── Rename + columns ──────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'collection_placements')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'page_sections')
  THEN
    ALTER TABLE collection_placements RENAME TO page_sections;
  END IF;
END $$;

-- The collection_id FK becomes nullable. Constraint name follows the
-- renamed table; existing constraint name from migration 004 was
-- collection_placements_collection_id_fkey — that name survives the
-- rename, so we don't need to recreate the FK itself.
ALTER TABLE page_sections
  ALTER COLUMN collection_id DROP NOT NULL;

ALTER TABLE page_sections
  ADD COLUMN IF NOT EXISTS section_type text NOT NULL DEFAULT 'collection'
    CHECK (section_type IN ('collection','widget','divider')),
  ADD COLUMN IF NOT EXISTS widget_key  text,
  ADD COLUMN IF NOT EXISTS config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS audience    text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','registered','guest')),
  ADD COLUMN IF NOT EXISTS valid_from  timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;

-- Sanity: every existing row was a collection placement.
UPDATE page_sections
  SET section_type = 'collection'
  WHERE section_type IS NULL OR section_type = '';

-- ─── Constraints ───────────────────────────────────────────────────────
-- Old UNIQUE(collection_id, context, category) was set in migration 004
-- to prevent the same collection appearing twice in the same bucket.
-- For widgets, collection_id is NULL — multiple NULLs are allowed by
-- Postgres UNIQUE, so widgets won't accidentally trip it. We keep the
-- constraint but tighten the row-level integrity:

-- Drop the unique constraint if it still exists from migration 004 —
-- with widgets in the mix, two widget rows of different keys legitimately
-- share (NULL, 'category', 'movies'). Application layer enforces the
-- singleton rule for widgets that should appear at most once per bucket.
ALTER TABLE page_sections
  DROP CONSTRAINT IF EXISTS collection_placements_collection_id_context_category_key;

-- Row-level integrity: each row must have exactly the right ref for its type.
ALTER TABLE page_sections
  DROP CONSTRAINT IF EXISTS page_sections_type_ref_consistency;
ALTER TABLE page_sections
  ADD CONSTRAINT page_sections_type_ref_consistency CHECK (
    (section_type = 'collection' AND collection_id IS NOT NULL AND widget_key IS NULL) OR
    (section_type = 'widget'     AND widget_key IS NOT NULL  AND collection_id IS NULL) OR
    (section_type = 'divider'    AND widget_key IS NULL      AND collection_id IS NULL)
  );

-- Lookup index — the resolver hits this on every request.
DROP INDEX IF EXISTS idx_collection_placements_lookup;
CREATE INDEX IF NOT EXISTS idx_page_sections_lookup
  ON page_sections(context, category, is_active, display_order);

-- ─── RLS ───────────────────────────────────────────────────────────────
-- Migration 004 created two policies referencing `collection_placements`.
-- After the rename they refer to `page_sections` automatically. Drop +
-- recreate so the policy logic also handles widget rows (no collection FK).

DROP POLICY IF EXISTS "collection_placements_public_read" ON page_sections;
DROP POLICY IF EXISTS "page_sections_public_read"        ON page_sections;
CREATE POLICY "page_sections_public_read" ON page_sections
  FOR SELECT USING (
    is_active = true AND (
      -- Widgets / dividers: visible if active.
      section_type IN ('widget','divider')
      OR
      -- Collections: visible only if the referenced collection is published.
      (section_type = 'collection' AND EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = page_sections.collection_id AND c.is_published = true
      ))
    )
  );

GRANT SELECT ON page_sections TO authenticated, anon;
-- Writes go through service-role API routes; no INSERT/UPDATE policy here.

-- ─── Seed: reproduce current hardcoded layout ──────────────────────────
-- One row per widget per (context, category, audience). Display_order
-- matches the order in CategoryPageShell.tsx and app/(main)/page.tsx
-- as of session 21. Spaced by 10 so admin reorder has room to insert
-- between two without renumbering everything.
--
-- The seed is idempotent — it uses INSERT … WHERE NOT EXISTS keyed on
-- (context, category, widget_key, audience) so re-running this migration
-- never duplicates a widget row. Existing collection placements are
-- untouched (this only inserts widget rows).

DO $$
DECLARE
  v_category text;
  v_categories text[] := ARRAY[
    'movies','series','books','food','recipes',
    'bars','hotels','theater','events'
  ];
  v_venue_categories text[] := ARRAY['food','bars','hotels','theater','events'];
BEGIN
  -- ── CATEGORY PAGES ──────────────────────────────────────────────────
  FOREACH v_category IN ARRAY v_categories
  LOOP
    -- welcome_header — sticky collapsing hero
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'welcome_header', 'category', v_category, 0, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='welcome_header'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- sub_category_tabs
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'sub_category_tabs', 'category', v_category, 10, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='sub_category_tabs'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- movies_tonight — movies only
    IF v_category = 'movies' THEN
      INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
      SELECT 'widget', 'movies_tonight', 'category', 'movies', 20, 'all', '{}'::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM page_sections
        WHERE section_type='widget' AND widget_key='movies_tonight'
          AND context='category' AND category='movies' AND audience='all'
      );
    END IF;

    -- filter_row
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'filter_row', 'category', v_category, 30, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='filter_row'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- open_map_button — venues only
    IF v_category = ANY(v_venue_categories) THEN
      INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
      SELECT 'widget', 'open_map_button', 'category', v_category, 40, 'all', '{}'::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM page_sections
        WHERE section_type='widget' AND widget_key='open_map_button'
          AND context='category' AND category=v_category AND audience='all'
      );
    END IF;

    -- items_list + load_more (singleton, structural)
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'items_list', 'category', v_category, 50, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='items_list'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- static_carousel: the primary "fallback" carousel currently rendered by
    -- CategoryPageShell at items.slice(0,3) with SECTION_TITLES[category][0].
    -- Config carries title + slice params so admin can later replace this
    -- with a curated Collection or delete it.
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'static_carousel', 'category', v_category, 60, 'all',
      jsonb_build_object(
        'title', CASE v_category
          WHEN 'food'    THEN 'Δημοφιλή Μαγαζιά'
          WHEN 'bars'    THEN 'Δημοφιλή Μπαρ & Καφέ'
          WHEN 'hotels'  THEN 'Κορυφαία Ξενοδοχεία'
          WHEN 'movies'  THEN 'Βραβευμένες Ταινίες'
          WHEN 'series'  THEN 'Δημοφιλείς Σειρές'
          WHEN 'books'   THEN 'Βιβλία 2026'
          WHEN 'recipes' THEN 'Εύκολες Συνταγές'
          WHEN 'theater' THEN 'Τρέχουσες Παραστάσεις'
          WHEN 'events'  THEN 'Επερχόμενες Εκδηλώσεις'
        END,
        'source',  'top_rated',
        'offset',  0,
        'limit',   3
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='static_carousel'
        AND context='category' AND category=v_category AND audience='all'
        AND (config->>'offset')::int = 0
    );

    -- category_top_users
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'category_top_users', 'category', v_category, 70, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='category_top_users'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- suggest_box
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'suggest_box', 'category', v_category, 80, 'all', '{}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='suggest_box'
        AND context='category' AND category=v_category AND audience='all'
    );

    -- secondary static_carousel: items.slice(3,6) with SECTION_TITLES[category][1]
    INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
    SELECT 'widget', 'static_carousel', 'category', v_category, 90, 'all',
      jsonb_build_object(
        'title', CASE v_category
          WHEN 'food'    THEN 'Κορυφαίες Επιλογές'
          WHEN 'bars'    THEN 'Κορυφαίες Επιλογές'
          WHEN 'hotels'  THEN 'Νέες Προσθήκες'
          WHEN 'movies'  THEN 'Δημοφιλείς Επιλογές'
          WHEN 'series'  THEN 'Must Watch'
          WHEN 'books'   THEN 'Για Λάτρεις της Λογοτεχνίας'
          WHEN 'recipes' THEN 'Δημοφιλή Πιάτα'
          WHEN 'theater' THEN 'Κορυφαίες Επιλογές'
          WHEN 'events'  THEN 'Κορυφαίες Επιλογές'
        END,
        'source',  'top_rated',
        'offset',  3,
        'limit',   3
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM page_sections
      WHERE section_type='widget' AND widget_key='static_carousel'
        AND context='category' AND category=v_category AND audience='all'
        AND (config->>'offset')::int = 3
    );
  END LOOP;

  -- ── HOME PAGE (seeded but not consumed by the resolver yet — category-first this session) ──
  -- Seeded so /admin/layout can show the home stack in read-only mode
  -- once we ship the registry. The home refactor lands in the next session.

  -- Guest stack
  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT * FROM (VALUES
    ('widget', 'hero_discover',     'home', NULL,   0, 'guest', '{}'::jsonb),
    ('widget', 'hero_suggest',      'home', NULL,  10, 'guest', '{}'::jsonb),
    ('widget', 'hero_personalise',  'home', NULL,  20, 'guest', '{}'::jsonb),
    ('widget', 'category_tiles',    'home', NULL,  30, 'guest', '{}'::jsonb),
    ('widget', 'movies_tonight',    'home', NULL,  40, 'all',   '{}'::jsonb),
    ('widget', 'suggestion_feed',   'home', NULL,  50, 'guest', '{}'::jsonb),
    ('widget', 'how_it_works',      'home', NULL,  60, 'guest', '{}'::jsonb),
    ('widget', 'register_promo',    'home', NULL,  70, 'guest', '{}'::jsonb),
    ('widget', 'support_section',   'home', NULL,  80, 'all',   '{}'::jsonb),
    ('widget', 'footer_mobile',     'home', NULL,  90, 'all',   '{}'::jsonb)
  ) AS v(section_type, widget_key, context, category, display_order, audience, config)
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections ps
    WHERE ps.section_type = v.section_type
      AND ps.widget_key   = v.widget_key
      AND ps.context      = v.context
      AND ps.category IS NOT DISTINCT FROM v.category
      AND ps.audience     = v.audience
  );

  -- Registered stack (different widgets)
  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT * FROM (VALUES
    ('widget', 'greeting',          'home', NULL,  0, 'registered', '{}'::jsonb),
    ('widget', 'static_carousel',   'home', NULL, 20, 'registered',
      jsonb_build_object('title','Ξεχωρίσαμε για σένα','source','top_rated','category','food','limit',5)),
    ('widget', 'ai_chips',          'home', NULL, 30, 'registered', '{}'::jsonb),
    ('widget', 'suggested_users',   'home', NULL, 40, 'registered', '{}'::jsonb),
    ('widget', 'contribution_cta',  'home', NULL, 50, 'registered', '{}'::jsonb)
  ) AS v(section_type, widget_key, context, category, display_order, audience, config)
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections ps
    WHERE ps.section_type = v.section_type
      AND ps.widget_key   = v.widget_key
      AND ps.context      = v.context
      AND ps.category IS NOT DISTINCT FROM v.category
      AND ps.audience     = v.audience
      AND ps.config->>'offset' IS NOT DISTINCT FROM v.config->>'offset'
  );
END $$;

-- ─── Touch trigger (kept for consistency with collections.modified_at) ───
ALTER TABLE page_sections
  ADD COLUMN IF NOT EXISTS modified_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION touch_page_sections_modified_at()
RETURNS trigger AS $$
BEGIN
  NEW.modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_page_sections_touch ON page_sections;
CREATE TRIGGER trg_page_sections_touch
  BEFORE UPDATE ON page_sections
  FOR EACH ROW EXECUTE FUNCTION touch_page_sections_modified_at();
