-- Migration 022: user preferences (notification + personalization)
--
-- Single jsonb column on `users` for all user-level preferences. One
-- column instead of N because:
--   1. Preferences shape evolves frequently (we want to add settings
--      without a migration each time).
--   2. Read-then-merge-then-write semantics fit jsonb naturally; the
--      `/api/profile/preferences` PATCH endpoint deep-merges instead
--      of replacing.
--   3. Schema migrations for additive prefs (new toggle, new section)
--      become application-only: just write the new key.
--
-- Conventions for keys under `preferences`:
--   { "interests":      ["movies", "books", ...]      // category slugs
--   , "notifications":  { "<section>": { "push": bool, "email": bool } }
--   , "tour_seen":      { "<feature>": iso_timestamp } // for first-run tooltips
--   }
--
-- Idempotent.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Lookup by interest tag — covers personalisation home-feed fan-out.
CREATE INDEX IF NOT EXISTS idx_users_preferences_interests
  ON users USING gin ((preferences -> 'interests'));
