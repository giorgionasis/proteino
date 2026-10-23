-- Migration 051: launch data fixes (UX review, session 40).
--
-- Run AFTER the session-40 code deploy: the recount below relies on
-- /api/suggestions no longer adding its own +1 on top of the trigger.
-- Idempotent — every statement is safe to re-run.

-- 1) Migrated items were reviewed on the old site. Without this stamp,
--    376 of 377 venue pages show "Νέα πρόταση — σε επιθεώρηση".
UPDATE public.items
   SET admin_reviewed_at = COALESCE(created_at, now())
 WHERE metadata ? 'legacy_k2_id'
   AND admin_reviewed_at IS NULL;

-- 2) The one item whose slug lacked the category prefix (its page 404'd).
UPDATE public.items
   SET slug = 'movies/doctor-strange'
 WHERE slug = 'doctor-strange'
   AND category = 'movies'
   AND NOT EXISTS (SELECT 1 FROM public.items WHERE slug = 'movies/doctor-strange');

-- 3) Test submissions that were showing in home carousels. Unpublished,
--    not deleted — re-publish from /admin if ever needed.
UPDATE public.items
   SET is_published = false
 WHERE slug IN (
   'movies/just-watched-inc',
   'movies/just-watched-inceptino-a',
   'movies/molis-eida-to-chi',
   'movies/tgggggg'
 );

UPDATE public.suggestions s
   SET is_published = false
  FROM public.items i
 WHERE s.item_id = i.id
   AND i.slug IN (
     'movies/just-watched-inc',
     'movies/just-watched-inceptino-a',
     'movies/molis-eida-to-chi',
     'movies/tgggggg'
   );

-- 4) Recount from the real published rows. New-flow suggestions were
--    counted twice (trigger + API), which inflated badge tiers.
UPDATE public.users u
   SET suggestion_count = COALESCE(c.n, 0)
  FROM (
    SELECT u2.id, (SELECT count(*) FROM public.suggestions s
                    WHERE s.user_id = u2.id AND s.is_published) AS n
      FROM public.users u2
  ) c
 WHERE c.id = u.id
   AND u.suggestion_count IS DISTINCT FROM COALESCE(c.n, 0);

UPDATE public.items i
   SET suggestion_count = COALESCE(c.n, 0)
  FROM (
    SELECT i2.id, (SELECT count(*) FROM public.suggestions s
                    WHERE s.item_id = i2.id AND s.is_published) AS n
      FROM public.items i2
  ) c
 WHERE c.id = i.id
   AND i.suggestion_count IS DISTINCT FROM COALESCE(c.n, 0);
