-- 042 — manual item lists for collections
--
-- Until now, a collection's contents were always derived from
-- (source_category + tags + filters) — admin couldn't say "I want
-- exactly these 7 items". The Explorer's Save-as-Collection deeplink
-- could carry filters but not the specific matched items, which made
-- it lossy for picks built from ranges / amenities / decades / etc
-- that don't translate cleanly to ExtFilter shape.
--
-- This adds a manual-list mode: when `manual_item_ids` is non-empty,
-- the hydrator ignores source_category/tags/filters and just SELECTs
-- those items. Editor exposes a mode toggle.
--
-- jsonb (not uuid[]) for shape symmetry with the existing tags +
-- filters columns. Order in the array is preserved by the hydrator
-- and surfaced as the carousel order.

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS manual_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN collections.manual_item_ids IS
  'When non-empty array of item uuids, hydrator returns exactly these items '
  'in this order and ignores source_category / tags / filters / item_limit. '
  'Drives admin "manual list" mode (Explorer Save-as-Collection deeplink).';
