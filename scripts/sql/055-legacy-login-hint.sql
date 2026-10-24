-- Migration 055: "welcome back" hint for accounts migrated from the old
-- Joomla/K2 proteino.gr (session 41).
--
-- scripts/migrate-mysql.ts created those auth users with a random
-- password and user_metadata.source = 'k2-migration'. Until they set a
-- new password (or sign in with Google), every password login fails.
-- The login form calls this on email blur and shows "set a new password"
-- instead of a generic "wrong password" error.
--
-- Reveals no more than email_exists() already does: one boolean, and
-- only for accounts that have never signed in on the new platform.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.legacy_account_needs_password(email_param text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM auth.users u
     WHERE lower(u.email) = lower(trim(email_param))
       AND u.raw_user_meta_data->>'source' = 'k2-migration'
       AND u.last_sign_in_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.legacy_account_needs_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legacy_account_needs_password(text) TO anon, authenticated;
