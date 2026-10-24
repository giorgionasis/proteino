-- Migration 057: review + follow side effects (session 41).
--
-- 1) Bookmark v2 rule "rating an item auto-flips wishlist → done" had no
--    implementation. POST /api/reviews now does it going forward; this
--    backfills items people already rated while they sat on the wishlist.
-- 2) users.rating_count was a frozen K2-era counter. Recount from visible
--    reviews + keep in sync with a trigger.
-- 3) items.avg_rating / rating_count follow ONE rule everywhere (reviews +
--    suggester stars, one per person), maintained by triggers on reviews
--    and suggestions — covers moderation hides, which never recomputed.
-- 4) "New follower" notifications deduped (follow/unfollow spam).
--
-- Idempotent. Safe to run before or after the matching code deploy.

-- 1) ─────────────────────────────────────────────────────────────────
UPDATE public.bookmarks b
   SET status = 'done'
  FROM public.reviews r
 WHERE r.user_id = b.user_id
   AND r.item_id = b.item_id
   AND b.status  = 'wishlist';

-- 2) ─────────────────────────────────────────────────────────────────
UPDATE public.users u
   SET rating_count = COALESCE(c.n, 0)
  FROM (
    SELECT u2.id, COUNT(r.id) AS n
      FROM public.users u2
      LEFT JOIN public.reviews r ON r.user_id = u2.id AND r.is_hidden = false
     GROUP BY u2.id
  ) c
 WHERE c.id = u.id
   AND u.rating_count IS DISTINCT FROM COALESCE(c.n, 0);

CREATE OR REPLACE FUNCTION public.sync_user_rating_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.users
     SET rating_count = (
       SELECT COUNT(*) FROM public.reviews WHERE user_id = uid AND is_hidden = false
     )
   WHERE id = uid;
  -- A row can't change owner in practice, but keep the old owner right too.
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    UPDATE public.users
       SET rating_count = (
         SELECT COUNT(*) FROM public.reviews WHERE user_id = OLD.user_id AND is_hidden = false
       )
     WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_rating_count ON public.reviews;
CREATE TRIGGER trg_sync_user_rating_count
  AFTER INSERT OR DELETE OR UPDATE OF is_hidden, user_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_rating_count();

-- 3) ─────────────────────────────────────────────────────────────────
-- items.avg_rating / rating_count — what every card shows. Rule (CLAUDE.md
-- detail-page invariant): visible reviews + the stars a suggester gave in
-- their published suggestion, ONE per person, review wins when someone
-- has both. Before this, /api/reviews recomputed from reviews only (so a
-- first review silently dropped the suggester's stars), the detail page
-- counted reviews only (5 items showed ★5 on cards but «be the first»
-- on the page), and hiding a review never recomputed at all.
-- Mirrored for display in lib/ratings.ts:combineRatings — keep in sync.
CREATE OR REPLACE FUNCTION public.recompute_item_rating(p_item_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT user_id, rating::float AS rating
      FROM public.reviews
     WHERE item_id = p_item_id AND is_hidden = false
  ),
  s AS (
    SELECT DISTINCT ON (user_id) user_id, rating::float AS rating
      FROM public.suggestions
     WHERE item_id = p_item_id
       AND is_published = true
       AND hidden_at IS NULL
       AND rating >= 1
       AND user_id NOT IN (SELECT user_id FROM r)
     ORDER BY user_id, created_at DESC
  ),
  agg AS (
    SELECT COUNT(*)::int AS n,
           COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS avg
      FROM (SELECT rating FROM r UNION ALL SELECT rating FROM s) x
  )
  UPDATE public.items i
     SET rating_count = agg.n,
         avg_rating   = agg.avg
    FROM agg
   WHERE i.id = p_item_id
     AND (i.rating_count IS DISTINCT FROM agg.n OR i.avg_rating IS DISTINCT FROM agg.avg);
$$;

REVOKE ALL ON FUNCTION public.recompute_item_rating(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_item_rating(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_recompute_item_rating()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN PERFORM public.recompute_item_rating(NEW.item_id); END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.item_id IS DISTINCT FROM NEW.item_id) THEN
    PERFORM public.recompute_item_rating(OLD.item_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_item_rating ON public.reviews;
DROP TRIGGER IF EXISTS trg_item_rating_reviews ON public.reviews;
CREATE TRIGGER trg_item_rating_reviews
  AFTER INSERT OR DELETE OR UPDATE OF rating, is_hidden, item_id, user_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_item_rating();

DROP TRIGGER IF EXISTS trg_item_rating_suggestions ON public.suggestions;
CREATE TRIGGER trg_item_rating_suggestions
  AFTER INSERT OR DELETE OR UPDATE OF rating, is_published, hidden_at, item_id, user_id ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_item_rating();

DROP FUNCTION IF EXISTS public.sync_item_rating();

-- One-off: bring every item in line with the rule.
DO $$
DECLARE iid uuid;
BEGIN
  FOR iid IN SELECT id FROM public.items LOOP
    PERFORM public.recompute_item_rating(iid);
  END LOOP;
END;
$$;

-- 4) ─────────────────────────────────────────────────────────────────
-- new_follower dedupe. Same function as migration 029 + one EXISTS guard.
CREATE OR REPLACE FUNCTION public.notify_on_follow_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_handle      text;
  follower_display_name text;
  follower_suggestions int;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;  -- self
  IF NOT public.should_notify(NEW.following_id, 'activity') THEN RETURN NEW; END IF;
  -- Follow → unfollow → follow used to notify every time (an easy way to
  -- spam someone). One "new follower" per person per 30 days.
  IF EXISTS (
    SELECT 1 FROM public.notifications
     WHERE user_id = NEW.following_id
       AND type = 'new_follower'
       AND payload->>'follower_id' = NEW.follower_id::text
       AND created_at > now() - interval '30 days'
  ) THEN RETURN NEW; END IF;

  SELECT handle, display_name, suggestion_count
    INTO follower_handle, follower_display_name, follower_suggestions
    FROM public.users WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, name, payload, is_read)
  VALUES (
    NEW.following_id,
    'new_follower',
    'Νέος follower',
    jsonb_build_object(
      'follower_id',           NEW.follower_id,
      'follower_handle',       follower_handle,
      'follower_display_name', follower_display_name,
      'follower_suggestions',  follower_suggestions
    ),
    false
  );

  RETURN NEW;
END;
$$;

