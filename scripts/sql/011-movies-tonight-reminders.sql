-- Migration: Movies Tonight bookmark reminder trigger
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- When admin schedules a movie airing on TV, every user who bookmarked that
-- movie should get a notification. Trigger fires on insert into
-- movies_tonight (only when is_published = true) and creates one
-- notifications row per bookmarker.
--
-- The notification payload carries the airing details so the bell-icon list
-- can render: "Inception is on MEGA tomorrow at 21:00".

CREATE OR REPLACE FUNCTION notify_bookmarkers_of_airing()
RETURNS trigger AS $$
DECLARE
  bookmarker_id uuid;
  movie_title text;
BEGIN
  -- Only notify when the airing is published
  IF NEW.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Look up the movie title once
  SELECT title INTO movie_title FROM items WHERE id = NEW.item_id;
  IF movie_title IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert one notification per bookmarker (no fan-out limit — assumed small)
  FOR bookmarker_id IN
    SELECT user_id FROM bookmarks WHERE item_id = NEW.item_id
  LOOP
    INSERT INTO notifications (user_id, type, name, payload, email_enabled, push_enabled, is_read)
    VALUES (
      bookmarker_id,
      'movie_airing',
      'Η ταινία σου παίζει σήμερα στην TV',
      jsonb_build_object(
        'item_id', NEW.item_id,
        'movie_title', movie_title,
        'channel', NEW.channel,
        'air_date', NEW.air_date,
        'air_time', NEW.air_time,
        'airing_id', NEW.id
      ),
      true,
      true,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_bookmarkers_on_airing ON movies_tonight;
CREATE TRIGGER trg_notify_bookmarkers_on_airing
  AFTER INSERT ON movies_tonight
  FOR EACH ROW EXECUTE FUNCTION notify_bookmarkers_of_airing();
