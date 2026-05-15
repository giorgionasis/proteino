# Proteino — Production Deploy Checklist

Step-by-step for deploying a new environment (or rolling out the latest from `main`). Skip steps you've already done.

---

## 1. Environment variables

Set on Vercel (or whatever runtime hosts Next.js):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (server-only; never expose) |
| `TMDB_API_KEY` | optional | Movie/series cover enrichment ([themoviedb.org](https://www.themoviedb.org/settings/api)) |
| `GOOGLE_BOOKS_API_KEY` | optional | Books cover enrichment (works without for low volume) |
| `GOOGLE_PLACES_API_KEY` | optional | Venue photos (food/bars/hotels) |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical site origin (e.g. `https://proteino.gr`). Used by JSON-LD `@id`, sitemap loc, canonical URLs, OG `og:url`. Defaults to `https://proteino.gr` if unset. |
| `ADMIN_DEV_BYPASS` | **must NOT be set** | If `=1` and `NODE_ENV !== production`, skips /admin auth. Refused in prod. |

If image enrichment env vars are absent, the "✨ Auto-fetch cover" UI surfaces a friendly "API not configured" notice. No errors, no crashes.

---

## 2. Database migrations (Supabase SQL Editor)

Run **in numeric order**:

```
scripts/sql/001-create-subcategories-regions.sql
scripts/sql/002-create-extra-field-options.sql
scripts/sql/003-comments-votes-reports.sql
scripts/sql/004-collections.sql
scripts/sql/005-activities.sql
scripts/sql/006-movies-tonight.sql
scripts/sql/007-storage-media-bucket.sql
scripts/sql/008-category-filters.sql
scripts/sql/009-item-gallery.sql
scripts/sql/010-app-settings.sql
scripts/sql/011-movies-tonight-reminders.sql
scripts/sql/012-bookmarks-unique.sql
scripts/sql/013-search-log.sql
scripts/sql/014-items-title-normalized.sql
scripts/sql/015-content-reports.sql
scripts/sql/016-reviews-table.sql
scripts/sql/017-review-votes.sql
scripts/sql/018-filters-new-widget-types.sql
scripts/sql/019-ai-cache-and-usage.sql
scripts/sql/020-original-title.sql
scripts/sql/021-food-tabs-flip-type.sql
scripts/sql/022-user-preferences.sql
scripts/sql/023-bookmarks-status.sql
scripts/sql/024-leaderboard-rpc.sql
scripts/sql/025-bookmarks-update-policy.sql
scripts/sql/026-moments-tables.sql
scripts/sql/027-seed-moments.sql
scripts/sql/028-users-region-id.sql
scripts/sql/029-notifications-fanout.sql
scripts/sql/030-submission-funnel.sql
scripts/sql/031-funnel-retention.sql
scripts/sql/032-page-sections.sql
scripts/sql/033-home-layout-seed-completion.sql
scripts/sql/034-related-sections-config.sql
scripts/sql/035-content-reports-add-review-type.sql
scripts/sql/036-moments-review-published.sql
```

**Note:** Migration 016 wipes the legacy `ratings` table and resets `items.rating_count` / `avg_rating` to 0 across all items. The legacy `comments` and `ratings` tables stay in the DB as archive but are NOT read by the new UI — all reviews from now on flow through the new `reviews` table (rating mandatory + reflection optional, one row per (user, item)).

**Note:** Migration 032 renames `collection_placements` → `page_sections` and seeds widget rows for every (context, category, audience) bucket. Day-1 rendering is identical to the previous hardcoded JSX. Migration 033 completes the home seed (audience-split `movies_tonight` + 5 fallback carousels per audience). Migration 034 adds `related_sections_config` (admin-defined "More from {axis}" rules per category) with 8 seeded rules. See CLAUDE.md §37 + §38.

**Note:** Migration 036 extends `moments.trigger_event` CHECK to include `'review_published'` and seeds 5 review-milestone celebrations (counts 1 / 5 / 10 / 25 / 50). Drops the existing CHECK constraint and re-adds it with the new value. Idempotent. See CLAUDE.md §42 + PROGRESS.md session 26.

Each is idempotent (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`); rerunning is safe.

**Note:** `007-storage-media-bucket.sql` creates the public `media` bucket via `storage.buckets`. If your project has bucket creation gated, create it manually in Storage UI (public, name `media`).

---

## 3. Seed scripts (one-shot)

Run from the project root after migrations:

```bash
# Required: extra-field options + Greek regions
node scripts/seed-extra-fields.js
node scripts/seed-regions.js

# Required: backfill galleries from existing covers
node scripts/backfill-item-images.js

# Optional: bulk-geocode venues missing lat/lng (slow — Nominatim 1 req/sec)
node scripts/geocode-venues.js               # all venue tables
node scripts/geocode-venues.js --table=item_food --limit=100   # scoped

# Optional: bulk-enrich items missing covers (uses TMDB/Books/Places)
ENRICH_BASE_URL=https://your-deploy.vercel.app node scripts/bulk-enrich.js --dry-run
ENRICH_BASE_URL=https://your-deploy.vercel.app node scripts/bulk-enrich.js
```

Each script reads `.env.local` for Supabase keys.

---

## 4. Admin user setup

The `/admin` route requires `public.users.role = 'admin'`. Add your account:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'you@example.com';
```

Verify: visit `/admin` while logged in. You should see the sidebar.

---

## 5. Post-deploy smoke test

Verify each surface returns content (not blank, not erroring):

- [ ] **Home** (logged out) — heroes + carousels render
- [ ] **Home** (logged in) — greeting + collections (if any)
- [ ] **Category page** — `/movies`, `/food` show items + filters
- [ ] **Detail page** — `/movies/[slug]` shows item; food/bars/hotels show gallery if images
- [ ] **Search** — overlay opens, shows results
- [ ] **Submit** — overlay opens, AI listening
- [ ] **Profile** — `/you` (logged in) shows real stats
- [ ] **Admin** — `/admin` loads (you'll need `role = admin`)
- [ ] **Notifications** — `/notifications` shows real notifications or empty state
- [ ] **Collections** — `/collections/[alias]` (after admin creates one) renders
- [ ] **Maintenance banner** — toggle on in `/admin/settings`, verify yellow banner appears site-wide; toggle off

---

## 6. Operational toggles (no deploy required)

The admin can change these from the UI without redeploying:

- **Maintenance mode** → `/admin/settings`
- **Site name + tagline** → `/admin/settings`
- **Home page sections** → `/admin/content/collections`
- **Category page filters** → `/admin/content/filters`
- **Movies on TV tonight** → `/admin/content/movies-tonight`
- **Hotel-nearby activities** → `/admin/content/activities`
- **Subcategories** → `/admin/categories/[id]`
- **Extra-field options** → `/admin/extra-fields`

---

## 7. Rolling back

Migrations are forward-only. To roll back the schema:

1. Identify the last-known-good migration number
2. Manually `DROP` tables added by later migrations (or revert via `pg_restore` from a snapshot)
3. Redeploy the matching code commit

**No data is destroyed by deploying** — collections/filters/etc. with no rows simply fall back to defaults (constants).

---

## 8. Known operational notes

- **Storage `media` bucket** must remain public-read for image URLs to work in browsers without signed URLs.
- **Nominatim usage policy** caps at 1 req/sec — `geocode-venues.js` enforces this. Don't run multiple instances in parallel.
- **TMDB rate limit**: 50 req/sec; bulk-enrich's 250ms throttle keeps us well under.
- **Movies Tonight bookmark trigger** runs `SECURITY DEFINER`. If you add new notification types, update the trigger function in `011-movies-tonight-reminders.sql`.
- **Edge middleware is intentionally lean** — does NOT import `@supabase/ssr` (Edge cold-start was crashing as `MIDDLEWARE_INVOCATION_FAILED` on Vercel). It only checks for an `sb-*-auth-token` cookie's presence to decide redirects. Real JWT validation happens at page-level (admin layout etc.). If you add features that need server-validated auth in middleware itself, put them in a route handler instead.
- **Image-URL safety** — every data-layer function (home/category/detail fetchers, `lib/collections.ts`, `lib/movies-tonight.ts`, `lib/notifications.ts`) wraps `cover_url` with `safeImageUrl()` before passing downstream. Bare relatives (legacy K2 paths like `k2-legacy/movies/.../poster.jpg`) get a leading `/`; `null` returns trigger placeholder branches. Without this `next/image` would 500 on legacy items.
- **Migration tolerance** — `app/admin/suggestions/[id]/page.tsx` has a fallback SELECT pattern that retries without `items.images` if Postgres returns 42703. This means the editor still loads on databases where migration 009 hasn't run. Don't remove this until you're confident every environment has run all migrations 001-012.
