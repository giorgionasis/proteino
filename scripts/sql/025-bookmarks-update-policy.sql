-- Migration 025: bookmarks GRANT + UPDATE RLS policy
--
-- Two fixes bundled:
--
-- 1) GRANT — explicit table-level permissions for `authenticated`.
--    Without this, supabase-js writes return "permission denied for
--    table bookmarks" (Postgres error 42501). RLS only filters rows;
--    the role still needs base GRANT to even attempt the operation.
--    Supabase's defaults normally seed these grants when a table is
--    created via the dashboard, but tables created/altered via raw
--    SQL (or with grants revoked at some point) need this explicitly.
--
-- 2) UPDATE RLS policy — migration 012 added SELECT/INSERT/DELETE
--    policies but not UPDATE. PATCH /api/bookmarks (move wishlist ↔
--    done from migration 023's status column) needs UPDATE permission.
--    Without this, the chip status changes silently fail.
--
-- Idempotent — safe to re-run.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT                          ON public.bookmarks TO anon;

DROP POLICY IF EXISTS "bookmarks_own_update" ON bookmarks;

CREATE POLICY "bookmarks_own_update" ON bookmarks
  FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
