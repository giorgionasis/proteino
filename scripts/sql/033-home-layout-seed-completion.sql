-- Migration 033: complete the home page layout seed
--
-- Migration 032 seeded the home page's CHROME widgets (hero blocks,
-- greeting, ai_chips, etc.) but left out the 5 fallback carousels that
-- the hardcoded page renders today for both guest and registered.
-- That meant migrating to the layout-driven renderer would have caused
-- a visible regression (fewer carousels). This migration adds them.
--
-- Also fixes a layout bug from 032: the seed put `movies_tonight` at
-- display_order 40 with audience='all', which is correct for the guest
-- ordering (after CategoryTiles) but WRONG for registered (current JSX
-- renders MoviesTonight right after Greeting, before the food carousel
-- at order 20). The fix splits movies_tonight into audience-specific
-- rows: guest at 40, registered at 5.
--
-- Idempotent — uses NOT EXISTS guards keyed on (widget_key, audience,
-- title) so re-running this migration never creates duplicates.

DO $$
BEGIN
  -- ─── 1. Split movies_tonight into audience-specific rows ─────────
  -- Drop the 'all' row first (no-op if already split).
  DELETE FROM page_sections
  WHERE context='home' AND category IS NULL
    AND section_type='widget' AND widget_key='movies_tonight'
    AND audience='all';

  -- Guest gets it at order 40 (between category_tiles@30 and suggestion_feed@50).
  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT 'widget', 'movies_tonight', 'home', NULL, 40, 'guest', '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections
    WHERE context='home' AND category IS NULL
      AND section_type='widget' AND widget_key='movies_tonight'
      AND audience='guest'
  );

  -- Registered gets it at order 5 (between greeting@0 and food carousel@20).
  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT 'widget', 'movies_tonight', 'home', NULL, 5, 'registered', '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections
    WHERE context='home' AND category IS NULL
      AND section_type='widget' AND widget_key='movies_tonight'
      AND audience='registered'
  );

  -- ─── 2. Guest fallback carousels ─────────────────────────────────
  -- Current hardcoded GuestHome JSX (when no admin collections exist)
  -- renders these between suggestion_feed (50) and register_promo (70),
  -- with how_it_works (60) sandwiched in the middle:
  --
  --   suggestion_feed @50
  --   Ταινίες         @55  ← portrait, movies
  --   Νέες Συνταγές    @57  ← landscape, recipes
  --   how_it_works    @60
  --   Δημοφιλή Μαγαζιά @65  ← landscape, food
  --   Ολοκληρωμένες Σ.@67  ← portrait, series
  --   Top Βιβλία       @69  ← portrait, books
  --   register_promo  @70

  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT * FROM (VALUES
    ('widget', 'static_carousel', 'home', NULL::text, 55, 'guest',
      jsonb_build_object('title','Ταινίες',          'source','top_rated','category','movies', 'limit',7)),
    ('widget', 'static_carousel', 'home', NULL::text, 57, 'guest',
      jsonb_build_object('title','Νέες Συνταγές',     'source','top_rated','category','recipes','limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 65, 'guest',
      jsonb_build_object('title','Δημοφιλή Μαγαζιά',  'source','top_rated','category','food',   'limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 67, 'guest',
      jsonb_build_object('title','Ολοκληρωμένες Σειρές','source','top_rated','category','series','limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 69, 'guest',
      jsonb_build_object('title','Top Βιβλία',        'source','top_rated','category','books',  'limit',5))
  ) AS v(section_type, widget_key, context, category, display_order, audience, config)
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections ps
    WHERE ps.section_type='widget'
      AND ps.widget_key='static_carousel'
      AND ps.context='home'
      AND ps.category IS NULL
      AND ps.audience=v.audience
      AND ps.config->>'title' = v.config->>'title'
  );

  -- ─── 3. Registered fallback carousels ────────────────────────────
  -- Current hardcoded RegisteredHome JSX (no collections):
  --
  --   greeting             @0
  --   movies_tonight       @5  (just added above)
  --   "Ξεχωρίσαμε για σένα"@20 (existing — food, already seeded by 032)
  --   ai_chips             @30
  --   Ταινίες              @35  ← portrait, movies
  --   Δημοφιλή Γλυκά       @37  ← landscape, recipes (distinct title from guest)
  --   suggested_users      @40
  --   Δημοφιλή Μαγαζιά     @45  ← landscape, food (distinct from "Ξεχωρίσαμε")
  --   Ολοκληρωμένες Σ.    @47  ← portrait, series
  --   Top Βιβλία           @49  ← portrait, books
  --   contribution_cta     @50
  --   support_section      @80 (all)
  --   footer_mobile        @90 (all)
  --
  -- Note "Δημοφιλή Μαγαζιά" is intentionally distinct from the
  -- "Ξεχωρίσαμε για σένα" food carousel at @20 — both pull food but
  -- with different titles, matching the current JSX that renders food
  -- twice for registered users.

  INSERT INTO page_sections (section_type, widget_key, context, category, display_order, audience, config)
  SELECT * FROM (VALUES
    ('widget', 'static_carousel', 'home', NULL::text, 35, 'registered',
      jsonb_build_object('title','Ταινίες',          'source','top_rated','category','movies', 'limit',7)),
    ('widget', 'static_carousel', 'home', NULL::text, 37, 'registered',
      jsonb_build_object('title','Δημοφιλή Γλυκά',    'source','top_rated','category','recipes','limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 45, 'registered',
      jsonb_build_object('title','Δημοφιλή Μαγαζιά',  'source','top_rated','category','food',   'limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 47, 'registered',
      jsonb_build_object('title','Ολοκληρωμένες Σειρές','source','top_rated','category','series','limit',5)),
    ('widget', 'static_carousel', 'home', NULL::text, 49, 'registered',
      jsonb_build_object('title','Top Βιβλία',        'source','top_rated','category','books',  'limit',5))
  ) AS v(section_type, widget_key, context, category, display_order, audience, config)
  WHERE NOT EXISTS (
    SELECT 1 FROM page_sections ps
    WHERE ps.section_type='widget'
      AND ps.widget_key='static_carousel'
      AND ps.context='home'
      AND ps.category IS NULL
      AND ps.audience=v.audience
      AND ps.config->>'title' = v.config->>'title'
  );
END $$;
