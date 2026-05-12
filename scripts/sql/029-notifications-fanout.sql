-- Migration 029: notifications fan-out + preference gate
--
-- Wires the second half of the notifications system. Adds the
-- preference gate (`should_notify`) and four new event triggers that
-- collectively cover the high-value real-time hooks from HOOKS.md §1B:
--
--   suggestion_rated              — when someone reviews YOUR suggestion
--   new_follower                  — when someone follows YOU
--   new_suggestion_from_friend    — when someone you follow publishes
--   suggestion_bookmarked         — bookmark count crosses milestone on YOUR item
--
-- Also retrofits the two existing triggers (movie_airing from 011,
-- search_match from 013) to consult the preference gate.
--
-- Preference gate consults `users.preferences.notifications.<category>.push`
-- AND the master mute flags. When the gate returns false, the
-- INSERT is skipped — the user simply won't see the row in their inbox.
--
-- Idempotent: re-running drops + recreates each function/trigger.

-- ── should_notify ─────────────────────────────────────────────────────
-- One central gate. Categories must match the keys exposed in the
-- settings UI (see components/profile/settings/NotificationsSettings).
--
--   category: 'activity' | 'friends' | 'discoveries' | 'system'
--
-- Defaults (when the user has never opened settings): allow.

CREATE OR REPLACE FUNCTION public.should_notify(
  p_user_id  uuid,
  p_category text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  prefs        jsonb;
  master       jsonb;
  cat_prefs    jsonb;
  paused       boolean;
  paused_until timestamptz;
BEGIN
  SELECT preferences INTO prefs FROM public.users WHERE id = p_user_id;
  IF prefs IS NULL THEN RETURN TRUE; END IF;

  master       := prefs -> 'notifications' -> '_master';
  paused       := COALESCE((master ->> 'paused')::boolean, FALSE);
  paused_until := NULLIF(master ->> 'paused_until', '')::timestamptz;

  IF paused THEN
    -- Master pause: indefinite when paused_until is NULL, otherwise
    -- auto-resumes when wall-clock passes paused_until.
    IF paused_until IS NULL OR now() < paused_until THEN
      RETURN FALSE;
    END IF;
  END IF;

  cat_prefs := prefs -> 'notifications' -> p_category;
  IF cat_prefs IS NULL THEN
    -- Category never explicitly configured → fall back to allow.
    RETURN TRUE;
  END IF;

  -- Both channels off → user said "nothing in this category".
  IF COALESCE((cat_prefs ->> 'push')::boolean,  FALSE) = FALSE
     AND COALESCE((cat_prefs ->> 'email')::boolean, FALSE) = FALSE
  THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ── 1) suggestion_rated ───────────────────────────────────────────────
-- Trigger: a new row in `reviews` → notify the author of the suggestion
-- on the same item (the original suggester). Self-review skipped.

CREATE OR REPLACE FUNCTION public.notify_on_review_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  suggester_id  uuid;
  suggester_handle text;
  item_title    text;
  rater_handle  text;
BEGIN
  -- Author = first published suggestion's user (one per item by design).
  SELECT s.user_id, u.handle, i.title
    INTO suggester_id, suggester_handle, item_title
    FROM public.suggestions s
    JOIN public.items i ON i.id = s.item_id
    JOIN public.users u ON u.id = s.user_id
   WHERE s.item_id = NEW.item_id
     AND s.is_published = true
   ORDER BY s.published_at ASC NULLS LAST
   LIMIT 1;

  IF suggester_id IS NULL  THEN RETURN NEW; END IF;
  IF suggester_id = NEW.user_id THEN RETURN NEW; END IF;  -- self-review
  IF NOT public.should_notify(suggester_id, 'activity') THEN RETURN NEW; END IF;

  SELECT handle INTO rater_handle FROM public.users WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, name, payload, is_read)
  VALUES (
    suggester_id,
    'suggestion_rated',
    'Νέα αξιολόγηση στην πρότασή σου',
    jsonb_build_object(
      'item_id',      NEW.item_id,
      'item_title',   item_title,
      'review_id',    NEW.id,
      'rating',       NEW.rating,
      'rater_handle', rater_handle
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_review_inserted ON public.reviews;
CREATE TRIGGER trg_notify_on_review_inserted
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_review_inserted();

-- ── 2) new_follower ───────────────────────────────────────────────────
-- Trigger: a new row in `follows` → notify the followed user.

CREATE OR REPLACE FUNCTION public.notify_on_follow_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  follower_handle      text;
  follower_display_name text;
  follower_suggestions int;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;  -- self
  IF NOT public.should_notify(NEW.following_id, 'activity') THEN RETURN NEW; END IF;

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

DROP TRIGGER IF EXISTS trg_notify_on_follow_inserted ON public.follows;
CREATE TRIGGER trg_notify_on_follow_inserted
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow_inserted();

-- ── 3) new_suggestion_from_friend ─────────────────────────────────────
-- Trigger: a new published suggestion → fan-out to every follower of
-- the author. One INSERT per follower (no batching here — the inbox
-- itself collapses if needed).

CREATE OR REPLACE FUNCTION public.notify_followers_of_suggestion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  follower_id      uuid;
  author_handle    text;
  author_display   text;
  item_title       text;
  item_category    text;
BEGIN
  -- Skip drafts.
  IF NEW.is_published IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;

  SELECT u.handle, u.display_name INTO author_handle, author_display
    FROM public.users u WHERE u.id = NEW.user_id;
  SELECT i.title, i.category INTO item_title, item_category
    FROM public.items i WHERE i.id = NEW.item_id;

  FOR follower_id IN
    SELECT f.follower_id
      FROM public.follows f
     WHERE f.following_id = NEW.user_id
  LOOP
    IF NOT public.should_notify(follower_id, 'friends') THEN CONTINUE; END IF;

    INSERT INTO public.notifications (user_id, type, name, payload, is_read)
    VALUES (
      follower_id,
      'new_suggestion_from_friend',
      'Νέα πρόταση από φίλο',
      jsonb_build_object(
        'item_id',          NEW.item_id,
        'item_title',       item_title,
        'item_category',    item_category,
        'suggestion_id',    NEW.id,
        'author_id',        NEW.user_id,
        'author_handle',    author_handle,
        'author_display',   author_display
      ),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_of_suggestion ON public.suggestions;
CREATE TRIGGER trg_notify_followers_of_suggestion
  AFTER INSERT OR UPDATE OF is_published ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_suggestion();

-- ── 4) suggestion_bookmarked (milestone) ──────────────────────────────
-- Trigger: a new bookmark on an item → if the bookmark count crosses
-- one of the milestone thresholds (5, 10, 25, 50, 100), notify the
-- original suggester. Avoids spam on every individual bookmark.

CREATE OR REPLACE FUNCTION public.notify_on_bookmark_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  bk_count       int;
  suggester_id   uuid;
  item_title     text;
  is_milestone   boolean;
BEGIN
  -- Count bookmarks on this item INCLUDING the row just inserted.
  -- AFTER INSERT trigger so the row is visible to the COUNT.
  SELECT COUNT(*) INTO bk_count
    FROM public.bookmarks WHERE item_id = NEW.item_id;

  is_milestone := bk_count IN (5, 10, 25, 50, 100);
  IF NOT is_milestone THEN RETURN NEW; END IF;

  SELECT s.user_id, i.title
    INTO suggester_id, item_title
    FROM public.suggestions s
    JOIN public.items i ON i.id = s.item_id
   WHERE s.item_id = NEW.item_id
     AND s.is_published = true
   ORDER BY s.published_at ASC NULLS LAST
   LIMIT 1;

  IF suggester_id IS NULL  THEN RETURN NEW; END IF;
  IF suggester_id = NEW.user_id THEN RETURN NEW; END IF;  -- bookmarker is the author
  IF NOT public.should_notify(suggester_id, 'activity') THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, name, payload, is_read)
  VALUES (
    suggester_id,
    'suggestion_bookmarked',
    'Η πρότασή σου είναι trending',
    jsonb_build_object(
      'item_id',     NEW.item_id,
      'item_title',  item_title,
      'bookmark_count', bk_count,
      'milestone',   bk_count
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_bookmark_milestone ON public.bookmarks;
CREATE TRIGGER trg_notify_on_bookmark_milestone
  AFTER INSERT ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_bookmark_milestone();

-- ── Retrofit: movie_airing (migration 011) ───────────────────────────
-- Wrap the existing INSERT with should_notify. We rebuild the function
-- entirely (CREATE OR REPLACE) preserving the same semantics — just
-- adding the gate.

CREATE OR REPLACE FUNCTION public.notify_bookmarkers_of_airing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  bookmarker_id uuid;
  movie_title   text;
BEGIN
  SELECT title INTO movie_title FROM public.items WHERE id = NEW.item_id;

  FOR bookmarker_id IN
    SELECT b.user_id FROM public.bookmarks b WHERE b.item_id = NEW.item_id
  LOOP
    IF NOT public.should_notify(bookmarker_id, 'discoveries') THEN CONTINUE; END IF;

    INSERT INTO public.notifications (user_id, type, name, payload, email_enabled, push_enabled, is_read)
    VALUES (
      bookmarker_id,
      'movie_airing',
      'Η ταινία σου παίζει σήμερα στην TV',
      jsonb_build_object(
        'item_id',     NEW.item_id,
        'movie_title', movie_title,
        'channel',     NEW.channel,
        'air_date',    NEW.air_date,
        'air_time',    NEW.air_time,
        'airing_id',   NEW.id
      ),
      true, true, false
    );
  END LOOP;
  RETURN NEW;
END;
$$;
-- Trigger already exists from 011; no DROP/CREATE TRIGGER here.

-- ── Retrofit: search_match (migration 013) ────────────────────────────
-- Same pattern. The original function inserts inside a loop over
-- matching search_log entries; we add the gate per-iteration.

CREATE OR REPLACE FUNCTION public.fanout_search_matches()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  hit RECORD;
BEGIN
  IF NEW.is_published IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;

  FOR hit IN
    SELECT sl.id, sl.user_id
      FROM public.search_log sl
     WHERE sl.notified_at IS NULL
       AND sl.user_id IS NOT NULL
       AND sl.category = NEW.category
       AND LOWER(NEW.title) LIKE '%' || LOWER(sl.query) || '%'
  LOOP
    IF NOT public.should_notify(hit.user_id, 'discoveries') THEN
      UPDATE public.search_log SET notified_at = now() WHERE id = hit.id;
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, name, payload, is_read)
    VALUES (
      hit.user_id,
      'search_match',
      'Βρέθηκε αυτό που ψάχνες',
      jsonb_build_object(
        'item_id',    NEW.id,
        'item_title', NEW.title,
        'item_slug',  NEW.slug,
        'category',   NEW.category,
        'kind',       'strict'
      ),
      false
    );
    UPDATE public.search_log SET notified_at = now() WHERE id = hit.id;
  END LOOP;
  RETURN NEW;
END;
$$;
-- Trigger trg_fanout_search_matches already exists from 013.
