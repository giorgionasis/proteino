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
```

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
