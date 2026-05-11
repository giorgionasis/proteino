-- Migration 020: Multi-language title search
--
-- Many items have a Greek-localized title in `items.title` (Λούσιφερ,
-- Κονκλάβιο) but users may search the original-language title (Lucifer,
-- Conclave) and vice versa. Adding a hidden `original_title` column
-- captures the source-language form so search ilike matches both.
--
-- Source-language values:
--   Movies/Series: TMDB original_title field (English most of the time)
--   Books: Google Books original-language title (when published in
--          another language)
--   Local items (food/bars/hotels/recipes): typically null
--
-- Idempotent.

ALTER TABLE items ADD COLUMN IF NOT EXISTS original_title text;

-- Generated normalized column: lowercased + Greek-accent stripped.
-- Mirrors title_normalized's approach so search can ilike both columns
-- with identical token preprocessing.
ALTER TABLE items ADD COLUMN IF NOT EXISTS original_title_normalized text
  GENERATED ALWAYS AS (
    translate(
      lower(coalesce(original_title, '')),
      'άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ',
      'αεηιουωιυιυαεηιουωιυ'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_items_original_title_normalized
  ON items USING btree (original_title_normalized)
  WHERE original_title IS NOT NULL;
