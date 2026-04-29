-- ============================================================
-- Proteino — Initial Schema
-- Run against a Supabase project with pgvector enabled.
-- ============================================================

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Analytics schema
create schema if not exists analytics;

-- ============================================================
-- PUBLIC SCHEMA
-- ============================================================

-- users
create table public.users (
  id                  uuid        primary key default gen_random_uuid(),
  email               text        not null unique,
  handle              text        not null unique,
  display_name        text        not null,
  bio                 text,
  avatar_url          text,
  role                text        not null default 'user' check (role in ('user', 'admin')),
  gender              text,
  region              text,
  birthday            date,
  points              int         not null default 0,
  level               int         not null default 1,
  suggestion_count    int         not null default 0,
  rating_count        int         not null default 0,
  avg_quality_score   float,
  embedding           vector(1536),
  is_private          boolean     not null default false,
  is_verified         boolean     not null default false,
  created_at          timestamptz not null default now(),
  last_login_at       timestamptz,
  last_suggestion_at  timestamptz,
  last_review_at      timestamptz
);

-- items (shared base for all categories)
create table public.items (
  id               uuid        primary key default gen_random_uuid(),
  category         text        not null check (category in (
                     'movies','series','books','food','recipes',
                     'bars','hotels','theater','events'
                   )),
  title            text        not null,
  slug             text        not null unique,
  description_seo  text,
  cover_url        text,
  avg_rating       float       not null default 0,
  rating_count     int         not null default 0,
  suggestion_count int         not null default 0,
  is_published     boolean     not null default false,
  embedding        vector(1536),
  created_at       timestamptz not null default now(),
  modified_at      timestamptz not null default now()
);

create index items_category_idx      on public.items (category);
create index items_is_published_idx  on public.items (is_published);
create index items_avg_rating_idx    on public.items (avg_rating desc);
create index items_embedding_idx     on public.items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- item_movies
create table public.item_movies (
  item_id        uuid    primary key references public.items (id) on delete cascade,
  director       text,
  duration_min   int,
  release_date   date,
  end_date       date,
  country        text,
  language       text,
  channel        text,
  trailer_url    text,
  status_message text,
  plot           text,
  actors         jsonb   default '[]',
  awards         jsonb   default '[]'
);

-- item_series
create table public.item_series (
  item_id        uuid    primary key references public.items (id) on delete cascade,
  director       text,
  seasons        int,
  release_date   date,
  end_date       date,
  country        text,
  language       text,
  channel        text,
  trailer_url    text,
  status_message text,
  plot           text,
  actors         jsonb   default '[]'
);

-- item_books
create table public.item_books (
  item_id           uuid    primary key references public.items (id) on delete cascade,
  writer            text,
  publication       text,
  language          text,
  pages             int,
  publication_year  int,
  plot              text,
  is_trilogy        boolean default false,
  trilogy_name      text
);

-- item_food
create table public.item_food (
  item_id         uuid    primary key references public.items (id) on delete cascade,
  cuisine         text,
  type            text,
  address         text,
  telephone       text,
  lat             float,
  lng             float,
  delivery_links  jsonb   default '{}',
  external_ratings jsonb  default '{}',
  information     jsonb   default '{}',
  plot            text
);

create index item_food_coords_idx on public.item_food (lat, lng);

-- item_recipes
create table public.item_recipes (
  item_id      uuid    primary key references public.items (id) on delete cascade,
  yields       int,
  calories     int,
  origin       text,
  level        text,
  channel      text,
  duration     jsonb   default '{}',
  nutrition    jsonb   default '{}',
  ingredients  jsonb   default '[]',
  steps        jsonb   default '[]',
  tips         text
);

-- item_bars
create table public.item_bars (
  item_id          uuid    primary key references public.items (id) on delete cascade,
  type             text,
  address          text,
  telephone        text,
  lat              float,
  lng              float,
  external_ratings jsonb   default '{}',
  information      jsonb   default '{}',
  plot             text
);

create index item_bars_coords_idx on public.item_bars (lat, lng);

-- item_hotels
create table public.item_hotels (
  item_id          uuid    primary key references public.items (id) on delete cascade,
  type             text,
  address          text,
  telephone        text,
  lat              float,
  lng              float,
  price_range      text,
  facilities       jsonb   default '[]',
  information      jsonb   default '{}',
  external_ratings jsonb   default '{}',
  plot             text
);

create index item_hotels_coords_idx on public.item_hotels (lat, lng);

-- item_theater
create table public.item_theater (
  item_id      uuid    primary key references public.items (id) on delete cascade,
  name_place   text,
  address      text,
  lat          float,
  lng          float,
  type         text,
  year         int,
  writer       text,
  director     text,
  availability text,
  ticket_url   text,
  price        text,
  actors       jsonb   default '[]',
  dates        jsonb   default '[]',
  plot         text
);

-- item_events
create table public.item_events (
  item_id      uuid    primary key references public.items (id) on delete cascade,
  name_place   text,
  address      text,
  lat          float,
  lng          float,
  event_type   text,
  availability text,
  status       text,
  ticket_url   text,
  price        text,
  performers   jsonb   default '[]',
  dates        jsonb   default '[]',
  description  text
);

-- suggestions
create table public.suggestions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users (id) on delete cascade,
  item_id          uuid        not null references public.items (id) on delete cascade,
  reflection       text,
  rating           float       check (rating between 0 and 5),
  ai_quality_score float,
  ai_match_data    jsonb,
  content_hash     text        not null,
  is_published     boolean     not null default false,
  created_at       timestamptz not null default now(),
  published_at     timestamptz,
  modified_at      timestamptz not null default now(),
  unique (user_id, item_id)
);

create index suggestions_user_id_idx on public.suggestions (user_id);
create index suggestions_item_id_idx on public.suggestions (item_id);
create index suggestions_published_idx on public.suggestions (is_published, published_at desc);

-- ratings
create table public.ratings (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  item_id       uuid        not null references public.items (id) on delete cascade,
  suggestion_id uuid        references public.suggestions (id) on delete set null,
  score         float       not null check (score between 0 and 5),
  vote_up       int         not null default 0,
  vote_down     int         not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, item_id)
);

-- comments
create table public.comments (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  suggestion_id uuid        not null references public.suggestions (id) on delete cascade,
  parent_id     uuid        references public.comments (id) on delete cascade,
  body          text        not null,
  created_at    timestamptz not null default now()
);

create index comments_suggestion_id_idx on public.comments (suggestion_id, created_at);

-- bookmarks
create table public.bookmarks (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  item_id    uuid        not null references public.items (id) on delete cascade,
  category   text        not null,
  status     text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

-- follows
create table public.follows (
  id           uuid        primary key default gen_random_uuid(),
  follower_id  uuid        not null references public.users (id) on delete cascade,
  following_id uuid        not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- notifications
create table public.notifications (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  type          text        not null,
  name          text        not null,
  payload       jsonb       not null default '{}',
  email_enabled boolean     not null default true,
  push_enabled  boolean     not null default true,
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);

-- achievements
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  image_url   text
);

create table public.user_achievements (
  user_id        uuid        not null references public.users (id) on delete cascade,
  achievement_id uuid        not null references public.achievements (id) on delete cascade,
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- badges
create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  image_url   text
);

create table public.user_badges (
  user_id   uuid        not null references public.users (id) on delete cascade,
  badge_id  uuid        not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- devices
create table public.devices (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users (id) on delete cascade,
  os                text,
  browser           text,
  region            text,
  device_image_type text,
  login_at          timestamptz not null default now()
);

-- categories (hierarchical)
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  alias           text,
  description_seo text,
  parent_id       uuid references public.categories (id) on delete set null
);

-- nearby_activities (admin-managed)
create table public.nearby_activities (
  id         uuid        primary key default gen_random_uuid(),
  item_id    uuid        not null references public.items (id) on delete cascade,
  title      text        not null,
  type       text,
  lat        float       not null,
  lng        float       not null,
  radius_km  float       not null default 1.0,
  created_at timestamptz not null default now()
);

-- leaderboard_snapshots
create table public.leaderboard_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users (id) on delete cascade,
  period      text        not null check (period in ('all_time','last_month','last_week')),
  category    text,
  rank        int         not null,
  score       int         not null,
  snapshot_at timestamptz not null default now()
);

create index leaderboard_period_idx on public.leaderboard_snapshots (period, category, rank);

-- ============================================================
-- ANALYTICS SCHEMA
-- ============================================================

create table analytics.user_embeddings (
  user_id    uuid        primary key references public.users (id) on delete cascade,
  embedding  vector(1536) not null,
  updated_at timestamptz not null default now()
);

create table analytics.item_embeddings (
  item_id    uuid        primary key references public.items (id) on delete cascade,
  embedding  vector(1536) not null,
  updated_at timestamptz not null default now()
);

create table analytics.activity_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.users (id) on delete set null,
  action      text        not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index activity_log_user_idx   on analytics.activity_log (user_id, created_at desc);
create index activity_log_entity_idx on analytics.activity_log (entity_type, entity_id);

create table analytics.precomputed_recs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users (id) on delete cascade,
  item_id     uuid        not null references public.items (id) on delete cascade,
  score       float       not null,
  reason      text,
  computed_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index precomputed_recs_user_idx on analytics.precomputed_recs (user_id, score desc);

create table analytics.search_log (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references public.users (id) on delete set null,
  query        text        not null,
  analysis     jsonb,
  result_count int,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update items.modified_at on change
create or replace function public.set_modified_at()
returns trigger language plpgsql as $$
begin
  new.modified_at = now();
  return new;
end;
$$;

create trigger items_modified_at
  before update on public.items
  for each row execute function public.set_modified_at();

create trigger suggestions_modified_at
  before update on public.suggestions
  for each row execute function public.set_modified_at();

-- Increment user.suggestion_count and items.suggestion_count after publish
create or replace function public.on_suggestion_published()
returns trigger language plpgsql as $$
begin
  if new.is_published = true and (old.is_published is null or old.is_published = false) then
    update public.users
      set suggestion_count = suggestion_count + 1,
          last_suggestion_at = now()
      where id = new.user_id;

    update public.items
      set suggestion_count = suggestion_count + 1
      where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger suggestion_published_trigger
  after insert or update on public.suggestions
  for each row execute function public.on_suggestion_published();

-- Update item avg_rating after a rating upsert
create or replace function public.on_rating_change()
returns trigger language plpgsql as $$
begin
  update public.items i
  set avg_rating  = (select coalesce(avg(score), 0) from public.ratings where item_id = new.item_id),
      rating_count = (select count(*)               from public.ratings where item_id = new.item_id)
  where i.id = new.item_id;
  return new;
end;
$$;

create trigger rating_change_trigger
  after insert or update or delete on public.ratings
  for each row execute function public.on_rating_change();

-- Vector similarity search RPC
create or replace function public.match_items(
  query_item_id uuid,
  match_count   int default 10
)
returns table (
  id         uuid,
  category   text,
  title      text,
  slug       text,
  cover_url  text,
  avg_rating float,
  similarity float
)
language sql stable as $$
  select
    i.id, i.category, i.title, i.slug, i.cover_url, i.avg_rating,
    1 - (i.embedding <=> q.embedding) as similarity
  from public.items i
  cross join (select embedding from public.items where id = query_item_id) q
  where i.id <> query_item_id
    and i.is_published = true
    and i.embedding is not null
  order by i.embedding <=> q.embedding
  limit match_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users              enable row level security;
alter table public.items              enable row level security;
alter table public.suggestions        enable row level security;
alter table public.ratings            enable row level security;
alter table public.comments           enable row level security;
alter table public.bookmarks          enable row level security;
alter table public.follows            enable row level security;
alter table public.notifications      enable row level security;
alter table public.user_achievements  enable row level security;
alter table public.user_badges        enable row level security;
alter table public.devices            enable row level security;
alter table analytics.activity_log    enable row level security;
alter table analytics.precomputed_recs enable row level security;

-- Public read on items and published suggestions
create policy "items_public_read"
  on public.items for select using (is_published = true);

create policy "suggestions_public_read"
  on public.suggestions for select using (is_published = true);

-- Users can read any profile, edit only their own
create policy "users_public_read"
  on public.users for select using (true);

create policy "users_own_write"
  on public.users for update using (auth.uid() = id);

-- Authenticated users can insert suggestions
create policy "suggestions_insert"
  on public.suggestions for insert
  with check (auth.uid() = user_id);

create policy "suggestions_own_update"
  on public.suggestions for update
  using (auth.uid() = user_id);

-- Ratings
create policy "ratings_public_read"
  on public.ratings for select using (true);

create policy "ratings_auth_write"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "ratings_own_update"
  on public.ratings for update
  using (auth.uid() = user_id);

-- Comments
create policy "comments_public_read"
  on public.comments for select using (true);

create policy "comments_auth_insert"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "comments_own_update"
  on public.comments for update
  using (auth.uid() = user_id);

-- Bookmarks — private to owner
create policy "bookmarks_own"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Follows — public read, auth write
create policy "follows_public_read"
  on public.follows for select using (true);

create policy "follows_auth_write"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows_own_delete"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Notifications — private to owner
create policy "notifications_own"
  on public.notifications for all
  using (auth.uid() = user_id);

-- User achievements/badges — public read
create policy "user_achievements_public_read"
  on public.user_achievements for select using (true);

create policy "user_badges_public_read"
  on public.user_badges for select using (true);

-- Devices — private
create policy "devices_own"
  on public.devices for all
  using (auth.uid() = user_id);

-- Analytics — auth user reads their own precomputed recs
create policy "precomputed_recs_own"
  on analytics.precomputed_recs for select
  using (auth.uid() = user_id);

-- ============================================================
-- SEED: Achievements & Badges
-- ============================================================

insert into public.achievements (name, description) values
  ('Πρώτη Πρόταση',          'Έκανες την πρώτη σου πρόταση!'),
  ('Τακτικός Contributor',   '10 προτάσεις'),
  ('Power User',             '25 προτάσεις'),
  ('Proteino Legend',        '100 προτάσεις');

insert into public.badges (name, description) values
  ('Επαληθευμένος χρήστης',  '3 προτάσεις — green shield'),
  ('Έμπειρος χρήστης',       '10 προτάσεις — blue star'),
  ('Τακτικός contributor',   '25 προτάσεις — flame'),
  ('Power user',             '50 προτάσεις — diamond'),
  ('Proteino Legend',        '100 προτάσεις — crown');
