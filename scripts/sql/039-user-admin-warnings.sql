-- Migration 039 — users.admin_warnings jsonb
--
-- Admin moderation surfaces (initially: the review-reports drawer at
-- /admin/reviews) can attach a warning to a user's profile when their
-- behaviour warrants more than a content action. Two flavours today:
--
--   1. Review author warning — review hidden + admin chose to also flag
--      the author. Shows up in user moderation views as "this person had
--      a review hidden on YYYY-MM-DD for reason X".
--   2. Abusive reporter — admin flagged a user whose filed reports keep
--      getting dismissed. Helps spot trolls without auto-banning anyone.
--
-- Stored as a jsonb array on `users` so each row carries its own
-- timestamp / admin / note / source pointer. Append-only via the
-- /api/admin/users/[id]/warn endpoint — never deleted, even after the
-- source review/report is moderated.
--
-- Idempotent.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_warnings jsonb NOT NULL DEFAULT '[]'::jsonb;

-- jsonb_path_ops index — fast lookups of "all users with any warning of
-- a specific kind" without scanning the array client-side.
CREATE INDEX IF NOT EXISTS idx_users_admin_warnings
  ON users USING gin (admin_warnings jsonb_path_ops);

COMMENT ON COLUMN users.admin_warnings IS
  'Append-only audit log of admin-issued warnings. Each element: '
  '{ created_at, by_admin_id, note, kind, source_review_id?, source_report_id? }. '
  'Kinds: ''review_hidden'' (author of a hidden review) | ''abusive_reporter'' '
  '(filed repeated invalid reports) | ''manual'' (admin-initiated note).';
