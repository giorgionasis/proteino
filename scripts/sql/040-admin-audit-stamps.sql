-- Migration 040 — admin audit stamps
--
-- Adds modified_by + modified_at to the admin-managed configuration
-- tables so the Overview "recent changes" widget can show what changed
-- and who changed it, and so each manager UI can render a "Last edited
-- by X on Y" footer per row.
--
-- Tables covered (the ones touched most frequently from /admin):
--   moments, page_sections, collections, related_sections_config,
--   category_filters
--
-- app_settings already has updated_by + updated_at from migration 010.
--
-- All endpoints that PATCH these tables should write `modified_by`
-- (auth user id) + `modified_at` (now()) on every change. Reads happen
-- via /api/admin/audit-log which unions the 5 tables.
--
-- Idempotent.

ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

ALTER TABLE page_sections
  ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

ALTER TABLE related_sections_config
  ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

ALTER TABLE category_filters
  ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

-- modified_at indexes — recent changes feed sorts by modified_at DESC
-- per table, then merges. Without an index this would be a seq scan on
-- larger tables. Partial index on NOT NULL keeps it tight (most rows
-- haven't been touched since insertion).
CREATE INDEX IF NOT EXISTS idx_moments_modified_at
  ON moments (modified_at DESC) WHERE modified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_sections_modified_at
  ON page_sections (modified_at DESC) WHERE modified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_modified_at
  ON collections (modified_at DESC) WHERE modified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_related_sections_modified_at
  ON related_sections_config (modified_at DESC) WHERE modified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_category_filters_modified_at
  ON category_filters (modified_at DESC) WHERE modified_at IS NOT NULL;

COMMENT ON COLUMN moments.modified_by IS
  'Admin user who last touched this row. Stamped by /api/admin/moments PATCH.';
COMMENT ON COLUMN page_sections.modified_by IS
  'Admin user who last touched this row. Stamped by /api/admin/page-sections PATCH.';
COMMENT ON COLUMN collections.modified_by IS
  'Admin user who last touched this row. Stamped by /api/admin/collections PATCH.';
COMMENT ON COLUMN related_sections_config.modified_by IS
  'Admin user who last touched this row. Stamped by /api/admin/related-sections PATCH.';
COMMENT ON COLUMN category_filters.modified_by IS
  'Admin user who last touched this row. Stamped by /api/admin/category-filters PATCH.';
