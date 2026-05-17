-- 037: items.admin_reviewed_at + admin_reviewed_by
--
-- Adds a lightweight "final-review" state on top of is_published. The
-- item is publicly visible once published, but admin still needs to
-- sweep through to confirm attributes / images / subcategory are
-- correct. The detail page shows a "Νέα πρόταση — σε επιθεώρηση"
-- chip while admin_reviewed_at is null; once admin clicks "Mark as
-- reviewed" the timestamp is set and the chip disappears.
--
-- Why a timestamp instead of a boolean: captures WHEN reviewed for
-- free, makes "items reviewed today" a simple WHERE clause.
-- admin_reviewed_by is the admin user id for the audit trail.
--
-- All existing K2-migrated items get null (correct — none have been
-- admin-reviewed). The admin /admin/suggestions queue can sweep them.

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid NULL REFERENCES users(id) ON DELETE SET NULL;

-- Indexed on the null/not-null state so the moderation-queue WHERE
-- clause (admin_reviewed_at IS NULL) is fast.
CREATE INDEX IF NOT EXISTS items_admin_reviewed_at_idx
  ON items (admin_reviewed_at)
  WHERE admin_reviewed_at IS NULL;

COMMENT ON COLUMN items.admin_reviewed_at IS
  'When the admin marked the item as final-reviewed (attributes, images, subcategory). NULL = pending. Shows the "Νέα πρόταση — σε επιθεώρηση" chip on the detail page.';
COMMENT ON COLUMN items.admin_reviewed_by IS
  'Which admin marked it reviewed. Cleared on un-review.';
