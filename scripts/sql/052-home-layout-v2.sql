-- Migration 052: home layout v2 (UX review, session 40).
--
-- Guest home led with ~4 screens of stock-photo pitch before any real
-- recommendation. New order: search hero → recommendation of the day →
-- categories → new recommendations → carousels → pitch → register.
-- Members get search + their wishlist + people they follow on top.
--
-- Deactivated (not deleted — re-enable in /admin/layout):
--   hero_suggest   — "*Η Κατερίνα πρότεινε…" invented story cards
--   hero_discover  — stock-photo category tiles; replaced by search_hero
--                    + category_tiles
--
-- Idempotent: inserts only when the widget row is missing; reorders by
-- (audience, widget_key[, config title]).

-- 1) New widgets
INSERT INTO public.page_sections (context, category, audience, section_type, widget_key, display_order, config, is_active)
SELECT 'home', NULL, a.audience, 'widget', a.widget_key, a.display_order, '{}'::jsonb, true
FROM (VALUES
  ('guest',      'search_hero',     0),
  ('guest',      'pick_of_the_day', 10),
  ('registered', 'search_hero',     5),
  ('registered', 'my_wishlist',     10),
  ('registered', 'following_feed',  15),
  ('registered', 'pick_of_the_day', 25)
) AS a(audience, widget_key, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.page_sections p
   WHERE p.context = 'home' AND p.audience = a.audience AND p.widget_key = a.widget_key
);

-- 2) Guest order
UPDATE public.page_sections SET display_order = v.ord
FROM (VALUES
  ('category_tiles',  20),
  ('suggestion_feed', 30),
  ('movies_tonight',  40),
  ('how_it_works',    60),
  ('hero_personalise',65),
  ('register_promo',  70)
) AS v(widget_key, ord)
WHERE page_sections.context = 'home' AND page_sections.audience = 'guest'
  AND page_sections.widget_key = v.widget_key;

UPDATE public.page_sections SET display_order = v.ord
FROM (VALUES
  ('Ταινίες',              45),
  ('Νέες Συνταγές',        47),
  ('Δημοφιλή Μαγαζιά',     50),
  ('Ολοκληρωμένες Σειρές', 52),
  ('Top Βιβλία',           54)
) AS v(title, ord)
WHERE page_sections.context = 'home' AND page_sections.audience = 'guest'
  AND page_sections.widget_key = 'static_carousel'
  AND page_sections.config->>'title' = v.title;

UPDATE public.page_sections SET is_active = false
WHERE context = 'home' AND audience = 'guest'
  AND widget_key IN ('hero_suggest', 'hero_discover');

-- 3) Member order (greeting 0 · search 5 · wishlist 10 · following 15 stay as inserted)
UPDATE public.page_sections SET display_order = v.ord
FROM (VALUES
  ('movies_tonight', 20),
  ('ai_chips',       35)
) AS v(widget_key, ord)
WHERE page_sections.context = 'home' AND page_sections.audience = 'registered'
  AND page_sections.widget_key = v.widget_key;

UPDATE public.page_sections SET display_order = 30
WHERE context = 'home' AND audience = 'registered'
  AND widget_key = 'static_carousel' AND config->>'title' = 'Ξεχωρίσαμε για σένα';
