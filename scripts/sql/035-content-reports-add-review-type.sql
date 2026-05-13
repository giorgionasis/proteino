-- ============================================================
-- 035-content-reports-add-review-type.sql
-- ============================================================
-- Extends content_reports.target_type CHECK to include 'review'.
--
-- Why: prior to this migration, the only allowed values were
-- ('comment','suggestion'). Reports filed against rows in the new
-- `reviews` table (migration 016) were written with target_type
-- = 'suggestion', which caused admin /admin/reports lookups to
-- search for the review.id inside the suggestions table — every
-- review report rendered as "(δεν βρέθηκε)".
--
-- After this migration: review reports use target_type='review'
-- and the admin page branches on the new type to fetch the right
-- row.
--
-- Optional cleanup: any rows that were misrouted historically
-- (target_type='suggestion' but target_id points at a row in
-- `reviews` rather than `suggestions`) are re-classified via the
-- UPDATE below. Idempotent — re-running is safe.
-- ============================================================

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.content_reports'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%target_type%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.content_reports DROP CONSTRAINT %I',
      con_name
    );
  END IF;
END $$;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('comment', 'suggestion', 'review'));

-- Heal historical misrouted reports — these were filed with
-- target_type='suggestion' but the target_id actually belongs to a
-- review row. Re-classify them so the admin page can find them.
UPDATE public.content_reports cr
   SET target_type = 'review'
 WHERE cr.target_type = 'suggestion'
   AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = cr.target_id)
   AND NOT EXISTS (SELECT 1 FROM public.suggestions s WHERE s.id = cr.target_id);
