-- Migration: Supabase Storage `media` bucket + policies
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Several admin features (Collections, Activities, future avatars) need
-- image upload. One public-read bucket keeps URLs simple and avoids signing.
-- Writes go through service-role API routes (`/api/admin/upload`) — the
-- bucket itself is locked down to authenticated users only at the storage
-- policy level, but our API uses service-role and skips RLS, so this is a
-- belt-and-suspenders config.
--
-- Path convention: {prefix}/{uuid}-{filename}
--   collections/<uuid>-marvel-logo.png
--   activities/<uuid>-skiing.jpg
--
-- File size limit (5MB) is enforced in the upload API, not at the bucket level.

-- ─── Create the bucket ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── Policies ───────────────────────────────────────────────────────
-- Public read: everyone can fetch images by URL.
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Inserts/updates/deletes go through service-role (skips RLS), so we don't
-- need anon/authenticated write policies. If you ever want client-side
-- uploads, add an INSERT policy here keyed on auth.uid() / role.
