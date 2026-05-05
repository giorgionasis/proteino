-- Latent-intent search log + fan-out trigger.
--
-- Hook-driven principle: passive signal × event = personal moment. Here
-- the passive signal is "user searched X but we had nothing"; the event
-- is "later, someone publishes X". When the event fires we drop a
-- notification — the platform "remembered" the user.
--
-- This v2 lives entirely in `public` rather than a separate `analytics`
-- schema — the original spec called for analytics but Supabase's
-- PostgREST exposure + schema-create permissions made that path bumpy.
-- public works identically for the trigger and is exposed to the API
-- automatically.

create table if not exists public.search_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete cascade,
  query         text not null,
  -- Lowercased + Greek-accent-stripped + whitespace-collapsed copy of
  -- `query`. The fan-out trigger compares against this so "αθήνα μπαρ"
  -- and "ΑΘΗΝΑ ΜΠΑΡ" both match a newly published bar in Athens.
  normalized    text not null,
  category      text,         -- inferred CategorySlug, nullable
  region_id     uuid references public.regions(id) on delete set null,
  was_no_match  boolean not null default true,
  -- Anti-spam: once we've notified the user about a match on this query,
  -- never notify again. Null = not yet notified.
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_search_log_normalized
  on public.search_log (normalized);
create index if not exists idx_search_log_user_unnotified
  on public.search_log (user_id)
  where was_no_match and notified_at is null;
create index if not exists idx_search_log_category_region
  on public.search_log (category, region_id)
  where was_no_match and notified_at is null;

-- RLS: users see/own their own log rows. Anonymous queries (user_id null)
-- have no readers — the fan-out trigger uses SECURITY DEFINER to bypass.
alter table public.search_log enable row level security;
drop policy if exists "search_log_self_select" on public.search_log;
create policy "search_log_self_select" on public.search_log
  for select using (auth.uid() = user_id);
-- Inserts come from the route via the service-role admin client, which
-- bypasses RLS. No insert policy needed.

-- Postgres-side text normalization (mirrors the JS-side `foldGreek`):
--   - lowercase
--   - strip Greek diacritics (20-char translate)
--   - collapse repeated whitespace
create or replace function public.search_log_normalize(t text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(translate(coalesce(t, ''),
      'άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ',
      'αεηιουωιυιυαεηιουωιυ'
    )),
    '\s+', ' ', 'g'
  ))
$$;

-- Fan-out: on every items insert/update where is_published flips true,
-- walk unnotified no-match rows in the same category whose normalized
-- query contains the new item's normalized title. Drop one notification
-- per affected user, then mark the search_log row as notified.
create or replace function public.fanout_search_matches()
returns trigger
language plpgsql
security definer
as $$
declare
  norm_title text;
  hit record;
begin
  if (new.is_published is not true) then return new; end if;
  norm_title := public.search_log_normalize(new.title);
  if length(norm_title) < 3 then return new; end if;

  for hit in
    select id, user_id
    from public.search_log
    where was_no_match
      and notified_at is null
      and user_id is not null
      and category = new.category
      and normalized like '%' || norm_title || '%'
    limit 50
  loop
    insert into public.notifications (user_id, type, name, payload, is_read)
    values (
      hit.user_id,
      'search_match',
      'Βρέθηκε αυτό που ψάχνες',
      jsonb_build_object(
        'item_id',    new.id,
        'item_title', new.title,
        'item_slug',  new.slug,
        'category',   new.category,
        'kind',       'strict'
      ),
      false
    );
    update public.search_log set notified_at = now() where id = hit.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_fanout_search_matches on public.items;
create trigger trg_fanout_search_matches
  after insert or update of is_published on public.items
  for each row execute function public.fanout_search_matches();
