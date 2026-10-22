-- Migration 047: lock down public.users column access.
--
-- Before: policy "users_public_read" (USING true) + Supabase's default
-- table-level grants let the anon key read EVERY column of EVERY user
-- (email, birthday, gender, preferences, admin_warnings, role, …), and
-- "users_own_write" (USING auth.uid() = id, no column limits) let any
-- logged-in user UPDATE their own `role` to 'admin'.
--
-- After:
--   * anon + authenticated can SELECT only public-profile columns.
--   * authenticated can UPDATE only the self-editable profile fields
--     (RLS still limits it to their own row).
--   * Own private fields are read through get_my_profile() (SECURITY
--     DEFINER, returns only the caller's row).
--   * Service role is unaffected — all server-side admin-client code
--     keeps full access.
--
-- NOTE for future columns: new users columns are NOT readable by
-- anon/authenticated until explicitly added to the GRANT below.
--
-- Idempotent: REVOKE/GRANT are repeatable; functions are CREATE OR REPLACE.

-- 1) Reads ─────────────────────────────────────────────────────────────
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (
  id, handle, display_name, avatar_url, bio,
  level, points, suggestion_count, rating_count, avg_quality_score,
  is_verified, is_private, created_at
) ON public.users TO anon, authenticated;

-- 2) Writes ────────────────────────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.users FROM anon, authenticated;
GRANT UPDATE (
  display_name, bio, gender, birthday, region, region_id
) ON public.users TO authenticated;

-- 3) Own-row private read ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.users
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 4) Counter trigger runs as owner ─────────────────────────────────────
-- on_suggestion_published() bumps users.suggestion_count. It ran with the
-- caller's privileges, which (after step 2) no longer include that column.
-- Same body as 001_initial_schema.sql, now SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.on_suggestion_published()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
begin
  if new.is_published = true and (old.is_published is null or old.is_published = false) then
    update public.users
      set suggestion_count = suggestion_count + 1,
          last_suggestion_at = now()
      where id = new.user_id;

    update public.items
      set suggestion_count = suggestion_count + 1
      where id = new.item_id;
  end if;
  return new;
end;
$$;
