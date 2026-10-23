-- Migration 050: add the missing item_series.awards column.
--
-- The series category page selects item_series(..., awards) and the
-- series "Βραβεία" filter is seeded since migration 008, but the column
-- only ever existed on item_movies. PostgREST rejects the whole select
-- ("column item_series_1.awards does not exist"), so /series rendered
-- "0 προτάσεις" for all 161 published series.
--
-- Same type as item_movies.awards. Idempotent.

ALTER TABLE public.item_series
  ADD COLUMN IF NOT EXISTS awards jsonb;
