-- Migration 028: structured user region (users.region_id)
--
-- `users.region` (text) was the free-text answer to "where do you
-- live?" from migration 001. It's not joinable, so a Thessaloniki
-- user couldn't be soft-prioritised against Thessaloniki items
-- without expensive string matching.
--
-- This migration adds the structured FK alongside the legacy text
-- column. The text column stays — populated by the profile API at
-- save time with the resolved region name for display compatibility
-- (older queries, admin views, etc.).
--
-- Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_region_id
  ON public.users (region_id)
  WHERE region_id IS NOT NULL;
