-- Diacritic-insensitive title search.
--
-- Postgres ilike is case-insensitive but accent-sensitive: 'αθηνα' (no
-- accent) doesn't match 'Αθήνα'. For Greek users who type without accents
-- this means half their queries silently miss real results.
--
-- We add a generated stored column `title_normalized` that lowercases AND
-- strips Greek diacritics via translate(). Then the search route does an
-- ilike against this column instead of the raw title — same cost, accent
-- folding included.
--
-- The translate() pairs cover the seven accented vowels in Greek (and the
-- two vowels with both diaeresis + acute). All are mapped to their plain
-- forms.

alter table public.items
  add column if not exists title_normalized text
    generated always as (
      lower(translate(
        coalesce(title, ''),
        'άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ',
        'αεηιουωιυιυαεηιουωιυ'
      ))
    ) stored;

-- Plain btree on the normalized column. Substring ilike ('%foo%') won't
-- use this index but it cuts comparison cost on the column scan vs. the
-- raw title. For corpus-scale (~2k items) this is plenty; once we cross
-- 50k, swap to a pg_trgm GIN index.
create index if not exists idx_items_title_normalized on public.items (title_normalized);
