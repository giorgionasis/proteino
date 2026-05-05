# Proteino — Build Progress

Last updated: 2026-05-05 (session 12)

---

## 1. COMPLETED

### Phase 1 — User-action persistence ✅ (session 12)

The audit's biggest CRITICAL gap: every engagement UI on the user side existed but none persisted. Closed in 5 routes:

- **`POST /api/suggestions`** — replaces `useSubmission.publish()`'s `setTimeout(1000)`. Resolves item by slug, creates if missing, rejects duplicates with `kind: own/other` so the overlay can render HOOKS.md §8 CTAs. Real SHA-256 `content_hash`. Bumps `users.suggestion_count` + `last_suggestion_at`.
- **`POST /api/ratings`** — upsert on `(user_id, item_id)`. Recomputes `items.avg_rating + rating_count` from source-of-truth scores. `GET` prefills the star UI on revisit.
- **`POST /api/comments`** — auth + length validation + parent-on-same-suggestion check. Returns joined user so callers can append without re-fetch. `GET` filters out `is_hidden=true` rows.
- **`POST /api/follows`** — idempotent via upsert; rejects self-follow. `DELETE` + `GET` for unfollow / state check.
- **`POST /api/reports`** — comment-report flow against migration 003. Validates reason against the 5-value enum. Idempotent: same user reporting same comment with same reason returns `already_reported`.

Consumer wiring:
- `useSubmission.publish()` → POST `/api/suggestions` with duplicate handling. New overlay states `duplicate` + `error`. `<DuplicateScreen>` renders HOOKS.md §8 ("Το έχεις ήδη προτείνει εσύ" / "Έχει ήδη προταθεί από @X") with rate/follow CTAs.
- `useRating` hook + 9 detail components: server fetches `userRating` parallel with `isBookmarked`; pre-fills stars; "Αποθήκευσε βαθμολογία" button now persists. 5 components needed prop-threading through their `<CommunitySection>` sub-component.
- `<CommentComposer>` (new) wired below each detail page's rating block, attached to `data.suggestions[0]?.id`.
- `<CommentThread>` (new) renders existing comments via `GET /api/comments` with kebab-menu Report flow.
- `useFollow` hook + `<UserProfileViewer>`: replaces local-state toggle with real persistence. Server fetches `initialFollowing` only when viewer ≠ target.

### Submission flow — best-in-class polish ✅ (session 12)

After Phase 1, a focused pass to make the user-side submission feel great:

**Live AI quality coach** (`lib/ai/quality.ts`)
- Real-time text analysis: length, "γιατί/why" markers, emotional language, specificity, sentence count
- Returns `{score, label, tip, badge}` — drives the IntelligencePanel: tip becomes the message, colored badge replaces the bare progress %
- Color shifts zinc → yellow → emerald → coral as the user writes (poor → fair → good → excellent)
- Same shape real AI will populate later — swap implementation, UI unchanged

**Real TMDB matching** (`app/api/ai/match`)
- New server endpoint the mock calls instead of doing local heuristics
- Bilingual title extraction via `\p{Lu}` / `\p{L}` Unicode property classes — `\b` is ASCII-only and was failing silently on Greek input
- Multiple candidate titles tried **concurrently** against TMDB; each result scored vs the candidate (exact=100, prefix/suffix=80, substring=60, fuzzy=20); highest wins
- Stops Greek opening verbs like "Είδα" from fuzzy-matching unrelated movies and beating the real title
- Returns canonical title (Greek-localized when TMDB has it), year, director, full cast with avatars, plot, runtime, poster, backdrop — all rendered in `PreviewScreen`
- When TMDB returns nothing, refuses to pretend — shows "Δεν βρήκα τον τίτλο" instead of shipping garbage to the DB
- `/api/suggestions` now writes the full TMDB metadata into `items` + `item_movies`/`item_series` extension tables on first publish, so the admin's suggestion editor sees director/cast/plot/year already populated

**Mandatory rating + full reflection + editable match**
- Share button disabled until rating > 0 — CLAUDE.md §11 "every suggestion has an embedded rating from the suggester" now enforced
- PreviewScreen shows the entire reflection (was truncated to 80 chars; user wrote 500, saw 80)
- "↺ Άλλαξε" button next to the LOCKED badge resets to typing so AI can re-match. Locked match also no longer blocks textarea editing — user keeps adding "γιατί το προτείνω" while the match stays put.

**Preflight duplicate check** (`app/api/suggestions/check`)
- GET hit by `useSubmission.verify()` between syncing and preview. If the matched item already has a suggestion, route to DuplicateScreen immediately — saves the user from writing a 200-char reflection POST would reject anyway.
- Race-condition safe: POST still catches duplicates that slip past.

**Hook moments + share link** (HOOKS.md §2B)
- `POST /api/suggestions` returns `weekly_count` / `category_audience_count` / `my_followers_count` alongside the new suggestion count
- `PublishedScreen` renders up to 3 cards: "Είσαι ο Νος που πρότεινε αυτή την εβδομάδα 🔥", "X άνθρωποι ενδιαφέρονται για αυτή την κατηγορία", "X χρήστες σε ακολουθούν — θα το δουν στο feed τους". Zero-counts suppressed.
- Share Link wired to `navigator.share()` on mobile + clipboard fallback on desktop with "✓ Αντιγράφηκε" toast
- "Δες την πρότασή σου →" deeplink to the new item's detail page
- Removed the dark syncing-screen flash between Share and Published (was redundant — enrichment happened during Verify→Preview)

### Auth fixes ✅ (session 12)
- **Login redirect trap** — middleware was redirecting `/login → /` based on cookie *presence* alone (deliberate; can't validate JWT at Edge cold-start). With a stale cookie, layout treated the user as guest (header showed "Σύνδεση") but middleware bounced any click on Σύνδεση back home — infinite trap. Fix: dropped the redirect from middleware; `/login` and `/register` pages do their own real `auth.getSession()` validation and redirect only when the cookie actually decodes.
- **YOU-tab avatar mismatch** — layout was reading avatar only from `auth.users.user_metadata` (Google OAuth path). Users migrated from MySQL have their avatar in `public.users.avatar_url` but not in auth metadata, so YOU-tab showed a generic person icon while the profile page showed initials. Fix: layout now falls back to `public.users` (id then email lookup), and `<BottomNav>` uses the same `<AvatarImage>` component the profile page does — so both surfaces show the same colored-initials block when no real photo exists.

### Auth Flow ✅ (session 1-3)
- Supabase Auth with Google OAuth, email/password, session persistence
- `/login`, `/register`, `/forgot-password` — all with `react-hook-form` + `zod`
- `/reset-password`, `/verify-code` — password reset flow
- Middleware route protection, auth callback handler
- Real-time password validation (8 chars, uppercase, number)
- Auth screens redesigned to match Figma: AuthHeader, AuthTrustBadge, OAuthButtons

### Design System ✅ (session 2, Figma-verified)
- `tailwind.config.ts` — coral `#FE6F5E`, full zinc scale, ios-gray, all radii/weights/shadows
- `app/globals.css` — Open Sans 400–900, CSS variables, gradient-coral, `.theme-dark`
- Full component library in `components/ui/`

### Navigation + Overlay Architecture ✅ (sessions 2-3)
- Header (logo + bell), BottomNav (HOME/SEARCH/YOU), FAB (coral, opens suggestion)
- Full-screen overlays: SearchOverlay (5 states), SuggestionOverlay (6 states)
- Zustand `useOverlay` store, GPU-accelerated slide-up, body scroll lock
- `ClientAwareHeader` — logo only on `/`, inner headers elsewhere

### Home Page ✅ (session 3 + session 6)
- Guest: HeroDiscover, HeroSuggest, HeroPersonalise, CategoryTiles, SuggestionFeed, carousels, HowItWorks, RegisterPromo
- Registered: personalized greeting, AIChips, carousels, SuggestedUsers, ContributionCTA
- **All wired to real Supabase data** (food, movies, series, books, recipes, topUsers, chips, feedItems)

### Category Pages ✅ (session 4 + session 6)
- All 9 categories with real data from Supabase
- SubCategoryTabs, FilterRow, FeaturedCard, CategoryCard (4 layout variants)
- CategoryPageShell with top contributors, item counts, social proof
- `constants/subcategories.ts` — all sub-categories per category

### Detail Pages ✅ (session 5 + sessions 6-7)
- All 9 detail components: MovieDetail, SeriesDetail, BookDetail, FoodDetail, BarsDetail, HotelDetail, TheaterDetail, EventDetail, RecipeDetail
- All accept `ItemDetailData` from server component, render real Supabase data
- BookDetail rebuilt to match Figma: no chips, proper metadata grid, author section, suggester card above info
- Slug handling: category prefix strip for links, prefix reconstruction for lookups

### Profile System ✅ (sessions 6-8)
- Own profile (`UserProfile`): real stats, follower/following counts, avgQualityScore, topSuggestion
- Other user profile (`UserProfileViewer`): real data, dynamic badge (MEMBER/GOLD/EXPERT), topSuggestion section
- Level-based badge derivation, conditional sections (hide when no data)
- `FollowersPopupCentered` — followers/following popup
- `GuestYouPage` — value-proposition for unauthenticated users on YOU tab
- Profile sub-pages: `/profile/[handle]/bookmarks`, `/profile/[handle]/reviews`, `/profile/[handle]/suggestions`, `/profile/[handle]/suggestions/[category]`
- Settings pages: `/profile/[handle]/settings/edit`, `/settings/security`, `/settings/notifications`, `/settings/personalization`

### Leaderboard ✅ (session 7)
- `/leaderboard` page with `LeaderboardPage` component
- Period filters, category filters, ranking display

### Notifications ✅ (session 7)
- `/notifications` page with `NotificationsPage` component
- Social + smart notification types, read/unread state

### Support ✅ (session 7)
- `/support` page with `SupportPage` component
- Help center and contact

### Codebase Audit + 6 Critical Fixes ✅ (session 5)
- Created missing detail components (SeriesDetail, BookDetail, BarsDetail)
- Replaced 12 duplicate inline headers with `<InnerHeader />`
- Wired `useSearch` → SearchOverlay, `useSubmission` → SuggestionOverlay
- Created API route stubs (`/api/search`, `/api/recommendations`)
- Fixed AI service imports and interface

### MySQL → Supabase Migration ✅ (session 6)
- Migration script: `scripts/migrate-mysql.ts`
- **627 users** migrated (email + display_name, no passwords)
- **1953 items** across 9 categories (books, movies, series, food, bars, recipes, hotels, theater, events)
- **1952 suggestions** with reflections and ratings
- **394 comments** linked to suggestions
- **953 ratings** linked to items
- K2 extra_fields → `metadata.extra_fields_raw` (numeric keys: 23=genre, 24=author, 27=language, 28=year, 200=cover)
- K2 subcategories → `metadata.tags[]`
- Slug format: `category/item-alias` (e.g., `books/paramythi-xoris-onoma`)

### Real Data Layer ✅ (sessions 6-7)
- All pages now query Supabase instead of mock data
- Server components fetch via `createClient()` from `lib/supabase/server.ts`
- Extension tables fully populated by migration's `buildExtensionRow` (845 books, 350 movies, 162 series, 234 food, 123 bars, 123 recipes, 32 hotels, 44 theater, 40 events)
- `types/database.ts` updated with all extension table type definitions

### Extension Table Data Fixes ✅ (session 8)
- Food: resolved K2 option IDs to names — `type` (230 rows) and `cuisine` (229 rows)
- Recipes: resolved `level` IDs to names (122 rows) and fixed `duration` prep/cook from option IDs to actual minute midpoints
- Theater: cleared `address` field that contained category type instead of real address (40 rows → null)
- BookDetail: publisher name now renders as clickable link using `metadata.publisher_url`
- Scripts: `scripts/fix-extension-tables.ts` (re-runnable), `scripts/check-extension-tables.ts` (diagnostic)

### Admin Panel ✅ (session 9)
- Full admin shell: sidebar navigation, layout, desktop-first
- Overview dashboard: stats cards, quick actions
- Categories: list table, drill-down, create/edit forms
- Suggestions: list table + full editor with category-specific ExtraFields for all 9 categories
  - Movies: country autocomplete (datalist), actor avatars, awards by type (Oscar/BAFTA/Golden Globe/Cannes), attributes, plot
  - Series: country autocomplete, streaming platforms, attributes, actors, awards
  - Books: author info card with photo, buy links, plot
  - Food: address+map, region/area, delivery links (efood/Wolt/Box), attributes
  - Bars: address+map, type radio, attributes
  - Hotels: address+map, type visual radio, amenities (3 columns), availability links
  - Recipes: ingredients table (drag-reorder), steps, tips, duration (prep+cooking hours/minutes), nutrition
  - Theater/Events: single/tour toggle, dates table, ticket/buy links, ads section
- Media section: category-aware tabs & modes (`getMediaConfig()`)
- Subcategory dropdown: dynamically populated per category from SUBCATEGORIES constant
- Trailer tab: YouTube + Vimeo URL inputs (not image)
- Extra Fields management: table per category with create/edit forms
- Collections: list with drag reorder + live mobile preview + create flow (Card/Carousel)
- Activities: table + new activity form + new category/type form
- Movies Tonight: table with inline edit/remove + new movie form (channel dropdown, date/time pickers)
- Filters: explorer (filter by attributes → see suggestion counts, Card/Carousel recommendation) + frontend filter config (quick filter chips vs bottom sheet toggles per attribute)
- Reviews: moderation table with actions
- Users: management table with role, status
- See `ADMIN.md` for full specification

### Tier 1 admin velocity tools ✅ (session 11)
Following the deep audit of admin daily-friction points, shipped 7 high-impact / low-effort improvements:

1. **Cmd+K command palette** (`<CommandPalette>`, `/api/admin/search`) — global jump-to-anything across suggestions/users/collections/activities/reviews. ⌘K toggles, ↑↓ navigate, Enter opens, Esc closes. Empty state shows recent jumps (localStorage) + 6 quick-create actions. Sidebar pill (`🔍 Search · ⌘K`) advertises the shortcut.

2. **Sidebar live counters** (`/api/admin/counters` + AdminSidebar polling) — red badge on Suggestions for unpublished, red on Reviews for reported, amber on Data Quality for items missing subcategory/cover. 60s polling + re-fetch on every route change so actions immediately reflect.

3. **Queue navigation in SuggestionEditor** (`/api/admin/suggestions/queue`) — when admin opens a suggestion via the list with `?queue=unpublished` or `?queue=all`, editor shows `← 5/47 →` position counter, prev/next arrow buttons, and `Save & next` primary action. Keyboard: `←/→` for prev/next, `⌘↵`/`Ctrl↵` for save & next.

4. **Unsaved-changes guard** (`hooks/useUnsavedGuard.ts`) — browser `beforeunload` blocks tab close/reload while form is dirty. `confirmIfDirty()` helper for in-app navigation. Wired into SuggestionEditor (with field-by-field snapshot diff), CollectionEditor, ActivityEditor (with stringified-form snapshot). Save button disabled when not dirty. Visible "● Unsaved" amber indicator.

5. **List keyboard shortcuts** (`hooks/useListKeyboard.ts`) — `J/K` or `↑↓` navigate rows, `Enter` opens, `/` focuses search, `Esc` blurs. SuggestionsTable: `P` toggles publish optimistically. ReviewsTable: `H` hide/show, `D` delete. Active row gets a zinc highlight + ring. Discoverability hint row above each table.

6. **"Open as user" button** (`<OpenAsUserButton>`) — wired into SuggestionEditor (deeplinks to `/{category}/{slug}`), CollectionEditor (only for Card type → `/collections/{alias}`), and ReviewEditor (labeled "See in context" → linked suggestion).

7. **Half-built routes cleanup** — built `/admin/suggestions/new` (real form + `/api/admin/suggestions/create` that atomically inserts item + suggestion + redirects to full editor); deleted dead `/admin/categories/new` and `/admin/extra-fields/new` routes plus their orphan components (CategoryForm.tsx, ExtraFieldForm.tsx, ExtraFieldsTable.tsx).

### MovieDetail rebuilt against Figma 8095-24269 ✅ (session 11)
Per audit finding that 8 of 9 detail components are on the legacy InfoCell layout instead of the Figma designs:
- **Awards** — full accordion grouped by type (ΟΣΚΑΡ / BAFTA / Χρυσές Σφαίρες / Cannes / Venice). Most-decorated type expanded by default. Each row: generic laurel-wreath SVG `<AwardBadge>` (renders any category dynamically — no per-image asset needed) + Greek translation (40+ entries: Best Picture → "Καλύτερης Ταινίας", Best Actor → "Α' Ανδρικού", etc.)
- **Actor avatars** — reads real `ext.actors[i].avatar` (admin's save shape `[{name, avatar}]`); placeholder color when no URL
- **Director(s)** — switched to plural `ext.directors[]`, falls back to legacy flat string. Each director gets real avatar if saved. Names split per-word for the Figma's multi-line layout
- Rating overview bar (middle of page) shows actual Oscar count or generic "Βραβεία" when present, suggestion count fallback otherwise

Still on legacy layout (Priority 1 remaining): Series, Food, Bars, Hotels, Recipes, Theater, Events.

### Image-URL safety + migration tolerance ✅ (session 11)
- `lib/image-url.ts::safeImageUrl()` — returns a `next/image`-compatible URL or null. Absolute and `/`-prefixed pass through; bare relatives (legacy K2 paths like `k2-legacy/movies/.../poster.jpg`) get a leading `/`; null/empty/`data:` return null so callers render placeholders. Wired at every data-layer boundary (home page fetchers, category page mapItem, detail page item normalization, `lib/collections.ts`, `lib/movies-tonight.ts`, `lib/notifications.ts`)
- `app/admin/suggestions/[id]/page.tsx` — tolerant retry pattern: full SELECT (with `items.images`) first; if Postgres returns 42703 (column does not exist), retry without `images` so admin editor still loads on databases where migration 009 hasn't run

### Lean Edge middleware ✅ (session 11)
- Vercel was returning `MIDDLEWARE_INVOCATION_FAILED` 500s. Root cause: `@supabase/ssr` import / `createServerClient` call crashing at Edge cold-start, before any try/catch could run.
- Rewrote middleware to drop the `@supabase/ssr` dependency entirely. It now only checks `request.cookies` for an `sb-*-auth-token` presence to decide redirects. JWT validation still happens at page-level (admin layout, etc.) with the full Supabase server client.
- Matcher now also excludes `/api/*` (route handlers do their own auth — middleware doesn't need to gate them).
- Whole body wrapped in try/catch as defense-in-depth: any throw passes through as guest, never 500s the site.

### Bookmark functionality ✅ (session 10)
- API: `/api/bookmarks` POST/DELETE/GET (auth-gated, RLS = own only)
- Schema: `012-bookmarks-unique.sql` adds UNIQUE(user_id, item_id) for upsert + RLS policies
- Hook: `hooks/useBookmark.ts` with optimistic UI, revert on failure, redirect to /login on 401
- Wired into all 9 detail components (movies/series/books/food/bars/hotels/recipes/theater/events) with initial state from server fetch
- Closes the loop with the movie_airing reminder trigger — bookmarks now actually exist for the trigger to fan out from

### Bookmarks list page ✅ (session 10)
- `/profile/[handle]/bookmarks` rebuilt as server component reading real bookmarks
- Grouped by category (icon + label + count) with 2-column grid per group
- Empty state with "Πάτησε το 🔖" CTA when no bookmarks; non-own profiles show empty due to RLS
- Click → deeplinks to item detail

### Achievement progress block ✅ (session 10)
- `<AchievementProgress>` reusable component per CLAUDE.md gamification spec
- Milestones: Verified (3) → Expert (10) → Gold (25) → Platinum (50)
- Auto-detects "unlock" state when count exactly hits milestone (animated badge); otherwise progress bar with remaining count
- Per-state messages: "πρώτη πρόταση", "καταπληκτική αρχή", "λίγο ακόμα", "πολύ κοντά"
- Wired into `Published.tsx` (post-publish state of suggestion overlay) — accepts `newSuggestionCount` prop

### Notification page — real data + type-aware ✅ (session 10)
- `lib/notifications.ts::fetchUserNotifications` — joins minimal item info for click-through
- `/notifications` page now server-rendered: redirects guests to login, groups by Νέες/Παλιότερες
- `<NotificationsPage>` rebuilt with type-aware rendering: movie_airing (📺 + channel + smart relative time "σήμερα στις 21:00", "αύριο στις 22:00"), rating, comment, follow, achievement, suggestion_published
- `/api/notifications/[id]` PATCH for mark-read; click-through marks read + navigates
- Body-scroll lock on lightbox; coral dot for unread; relative time formatting
- Empty state with friendly "🔕 Όλα ήσυχα" message

### Bulk enrichment script ✅ (session 10)
- `scripts/bulk-enrich.js` — walks items missing covers, calls `/api/admin/enrich`, picks first candidate, updates poster_url + backdrop_url + cover_url
- CLI: `--category=movies`, `--limit=50`, `--dry-run`; throttled 250ms
- `ENRICH_BASE_URL` env var for pointing at production deploy

### DEPLOY.md ✅ (session 10)
- Single-file production checklist: env vars, migrations 001-012 in order, seed scripts, admin user setup, post-deploy smoke test
- Operational toggles list (what admin can change without redeploy)
- Rollback notes; storage bucket / Nominatim / TMDB rate limit notes

### IS_REGISTERED + notification badge wired to real data ✅ (session 10)
- Layout `notificationCount` was hardcoded `2`; now reads real unread count from notifications table per session
- Audited remaining `isRegistered` references — all already wired to real Supabase session

### Movies Tonight bookmark reminders ✅ (session 10)
- DB trigger `notify_bookmarkers_of_airing` (`scripts/sql/011-movies-tonight-reminders.sql`)
- On insert into `movies_tonight` (when `is_published = true`), looks up the movie title and creates one row in `notifications` per user who bookmarked the item
- Notification payload includes `item_id`, `movie_title`, `channel`, `air_date`, `air_time`, `airing_id` so future type-aware UI can render rich entries with click-through
- `SECURITY DEFINER` so trigger runs with elevated permissions to write notifications

### Bulk geocoding script ✅ (session 10)
- `scripts/geocode-venues.js` — Nominatim-based, 1 req/sec rate limit, GR-bias
- CLI: `--table=item_food` to scope, `--limit=100` to cap
- Idempotent (skips items that already have lat/lng); processes food/bars/hotels/theater/events by default

### Items.images backfill script ✅ (session 10)
- `scripts/backfill-item-images.js` — populates `items.images = [{url: cover_url}]` for any item with a cover but empty gallery
- Page-paginated (500/batch); idempotent (skips items that already have images)

### Address+map in venue ExtraFields ✅ (session 10)
- `AddressMapSection` in SuggestionEditor refactored to accept address/lat/lng state props and use `<MapPicker>` (with Nominatim search)
- Wired into FoodExtraFields, BarsExtraFields, HotelExtraFields, TheaterExtraFields — admin can now click-set venue location for ALL category types, not just Activities

### Image enrichment (TMDB / Google Books / Places) ✅ (session 10)
- `/api/admin/enrich` endpoint dispatches by category; returns up to 8 candidates with poster/backdrop URLs + title/subtitle/description
- "✨ Auto-fetch cover" button in SuggestionEditor's Media section opens modal with grid of candidates → click to apply
- All three APIs degrade gracefully if env keys missing (returns `{ candidates: [], reason }`)
- Required env vars: `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY` (optional), `GOOGLE_PLACES_API_KEY`

### Address autocomplete in MapPicker ✅ (session 10)
- Nominatim (OpenStreetMap) integration — free, no API key, no rate limits at our scale
- Search box above the map (debounced 350ms, min 3 chars), GR-biased with Greek language preference
- Click a result → map re-centers + marker drops + lat/lng updated

### Production auth on /admin ✅ (session 10)
- Replaced NODE_ENV-based DEV bypass with explicit `ADMIN_DEV_BYPASS=1` env opt-in
- Auto-refused if NODE_ENV=production (defense in depth)
- Real path: requires Supabase session AND `users.role === 'admin'`; non-admins redirected
- Dev bypass UI shows a yellow notice banner so you know it's active

### Frontend item gallery rendering ✅ (session 10)
- `<ItemGalleryViewer>` reusable component: tab grouping + horizontal scroll strip + keyboard-navigable fullscreen lightbox (← → Esc)
- Wired into FoodDetail, BarsDetail, HotelDetail (food/bars use existing tab structure; hotel uses Δωμάτια/Κοινόχρηστοι/Εξωτερικά)
- Body scroll locked while lightbox open; image lazy-loaded after first 3
- Falls back to single cover_url hero when images empty (BarsDetail)

### Settings page ✅ (session 10)
- Schema: `app_settings (key, value jsonb, description, updated_at)` — `scripts/sql/010-app-settings.sql`
- Default keys seeded: `site_name`, `site_tagline`, `maintenance_mode`, `maintenance_message`
- Admin: `/admin/settings` form with sections (Maintenance mode toggle + message, Site identity, custom keys for advanced)
- Frontend: `<MaintenanceBanner>` rendered in `app/(main)/layout.tsx` when `maintenance_mode = true`
- API: `/api/admin/settings` (GET, PATCH bulk)
- Helper: `lib/app-settings.ts::fetchAppSettings(sb)` with safe defaults

### Collections — extension-field filters ✅ (session 10)
- `collections.filters` jsonb now matches against extension-table columns: `[{ field: "channel", value: "Netflix" }]`
- `lib/collections.ts` + `/api/admin/collections/preview` join `item_<source_category>!inner()` and apply `eq(table.field, value)` per filter row
- CollectionEditor: new "Φίλτρα πεδίων (advanced)" section with quick-pick field hints per category (movies → channel/country/language; food → cuisine/type; etc.) plus custom-field option
- Backwards-compatible: collections without filters work unchanged

### Filters v2 — add new + edit options ✅ (session 10)
- Admin can now add brand-new filter rows from UI: filter_id slug + label + widget type + placeholder
- Inline options editor (modal) for `segmented`, `platform-cards`, `icon-cards`, `checkboxes` widgets — add/remove/reorder { id, label } pairs
- Removes the "edit via DB only" limitation from v1

### Movies Tonight — bulk import ✅ (session 10)
- Paste textarea with format: `Title | Channel | YYYY-MM-DD | HH:MM`
- Two-phase: POST `/bulk` returns matched/unmatched (case-insensitive exact + contains fallback), PUT commits with `onConflict ignoreDuplicates`
- Modal preview shows matches (with cover) and unmatched titles separately

### Map picker ✅ (session 10)
- `<MapPicker>` component using Leaflet via CDN (no npm dependency); OpenStreetMap tiles
- Click anywhere → marker drops; drag marker to fine-tune
- Wired into ActivityEditor right below lat/lng inputs; bidirectional (typing in inputs updates marker)

### Item gallery mode ✅ (session 10)
- Schema: `items.images jsonb` (`scripts/sql/009-item-gallery.sql`)
- `<ImageGallery>` component: multi-upload via ImageUploader, optional tab grouping (Δωμάτια / Κοινόχρηστοι / Εξωτερικά for hotels), ▲▼ reorder within tab, alt text, primary indicator
- SuggestionEditor gallery mode now uses ImageGallery (food/bars/hotels)
- cover_url auto-mirrors first gallery image for legacy reads

### Category Filters — admin-curated ✅ (session 10)
- Schema: `category_filters` + `category_filter_settings` (`scripts/sql/008-category-filters.sql`); seeded from current `CATEGORY_FILTERS` constant so going live doesn't break anything
- Admin: rebuilt `FiltersManager` per-category list with ▲▼ reorder, inline label edit, is_quick chip toggle, publish toggle, delete; right rail with "Κοντά μου" toggle + live phone preview
- Frontend: `lib/category-filters.ts::fetchCategoryFilterConfig()`; `app/(main)/[category]/page.tsx` reads DB, passes as `filterConfig` prop to `CategoryPageShell`; falls back to constant if DB rows missing
- API: `/api/admin/category-filters` (CRUD) + `/reorder` + `/settings`
- Type: `CategoryFilters` exported from constants/filters.ts as the prop type
- v2 deferred: UI for adding new filter rows / editing widget+options jsonb (today via DB)

### SuggestionEditor media wiring ✅ (session 10)
- Single-mode tabs (Portrait/Landscape) now use `<ImageUploader>` instead of placeholder buttons
- Saves to `items.poster_url`, `items.backdrop_url`, with `items.cover_url` mirrored from the orientation-appropriate field for legacy reads
- Trailer tab YouTube/Vimeo URL inputs wired to `extData.trailer_url` (movies/series only)
- Gallery mode (food/bars/hotels multi-image) deferred — needs `items.images jsonb` schema first

### Image upload via Supabase Storage ✅ (session 10)
- Schema: `scripts/sql/007-storage-media-bucket.sql` creates a public `media` bucket + read policy
- API: `/api/admin/upload` (POST multipart, DELETE by path) — service-role; 5MB limit; validates content-type (JPG/PNG/WebP/GIF/SVG); slugifies filename; stores under `{prefix}/{uuid}-{name}.{ext}`
- Component: `<ImageUploader>` — drag-drop, click-to-upload, preview, inline errors, optional URL-paste fallback, configurable aspect ratio
- Wired into: CollectionEditor (logo, square aspect), ActivityEditor (cover photo, 16:9)
- SuggestionEditor's complex media area (multi-tab gallery, trailer URL) noted as next iteration — `<ImageUploader>` is reusable

### Movies Tonight — Curated TV airings ✅ (session 10)
- Schema: `movies_tonight (item_id FK, channel, air_date, air_time)` (`scripts/sql/006-movies-tonight.sql`)
- Admin: rebuilt `/admin/content/movies-tonight` with Today + This week sections, movie autocomplete picker, inline edit, publish toggle, delete
- Frontend: `<MoviesTonightSection>` on home page after CategoryTiles — renders today's airings as horizontal-scroll cards with time/channel/rating; null if empty
- API: `/api/admin/movies-tonight` (CRUD) + `/api/admin/movies-tonight/items` (autocomplete)
- Helper: `lib/movies-tonight.ts` for server-side fetching by date

### Hotel-side activity proximity ✅ (session 10)
- Helper: `lib/activities.ts` — Haversine-based proximity query (bounding-box DB pre-filter + JS exact filter + sort)
- Detail page fetcher (`app/(main)/[category]/[id]/page.tsx`) attaches `nearbyActivities` only for hotels with lat/lng
- HotelDetail's existing "Κοντινές Δραστηριότητες" section now reads from real DB data (not metadata stub)
- Cards show type icon + name + Greek-formatted distance ("1.2 χλμ" / "350 μ"); link out to website or Google Maps

### Activities — Hotels' nearby attractions ✅ (session 10)
- Schema: `activity_categories` + `activity_types` + `activities` (`scripts/sql/005-activities.sql`); 4 categories seeded
- Admin list: tabs by category, type filter chips, search, inline publish toggle, edit/delete
- Editor: cascading category→type select, address + lat/lng (with Google Maps verification link), website/social/phone, image URL
- Taxonomy manager: full CRUD for categories + types with inline edit-on-blur, publish toggle, delete with safety checks
- Geographic model (lat/lng) — frontend hotel pages will query by proximity, no manual hotel↔activity linking
- Routes: `/admin/content/activities` (list) + `/[id]` (edit) + `/new` + `/taxonomy`
- API: `/api/admin/activities` (CRUD) + `/api/admin/activity-categories` + `/api/admin/activity-types`
- Frontend hotel-side proximity rendering: pending (next session)

### Collection landing page ✅ (session 10)
- `/collections/[alias]` — server-rendered page Card collections link to
- Hero: title (with bold specific part) + image + tag chips + match count
- Body: portrait grid (movies/series/books) or landscape list (food/bars/hotels/recipes/theater/events)
- 404 on missing/unpublished/expired collections

### Collections — DB-driven home/category sections ✅ (session 10)
- Schema: `collections` + `collection_placements` (`scripts/sql/004-collections.sql`)
- Two visual formats: Carousel (auto-picks Portrait/Landscape based on source category) + Card (compact pill linking to filtered list)
- Admin UI: tab-per-placement list with ▲▼ reorder + publish toggle + live phone preview that runs the real filter via `/api/admin/collections/preview`; editor with sticky live preview, tag autocomplete, match-count chip
- Filter model v1: `source_category` + `tags[]` matched against `metadata.tags @> [...]`
- Audience-aware (`all` / `registered` / `guest`) + lifecycle window (`valid_from` / `valid_until`)
- Home page (`app/(main)/page.tsx`) reads via `lib/collections.ts`; falls back to existing hardcoded carousels when admin has 0 collections — no breaking change
- Empty collections silently dropped (no empty sections on the user's screen)
- API: `/api/admin/collections` (CRUD) + `/reorder` + `/preview` + `/tags`

---

## 2. IN PROGRESS

### Detail Page Figma Alignment
- BookDetail rebuilt to match Figma ✅
- MovieDetail rebuilt against Figma 8095-24269 ✅ (session 11) — full awards accordion, real actor/director avatars, Greek category translations
- Remaining 7 (Series, Food, Bars, Hotels, Recipes, Theater, Events) still on legacy `<InfoCell>` layout

### Collections — follow-ups
- ~~Image upload (currently URL-only) → wire Supabase Storage~~ ✅ done — `<ImageUploader>` wired in `CollectionEditor`
- ~~Frontend `/collections/[alias]` page (Card collections link there but page doesn't exist yet)~~ ✅ done — `app/(main)/collections/[alias]/page.tsx`
- ~~Extension-field filters beyond tags (e.g. `item_movies.channel = 'Netflix'`)~~ ✅ done — `collections.filters` jsonb + `<CollectionEditor>` "Φίλτρα πεδίων (advanced)"
- Migrate existing hardcoded home carousels into seed collections, then remove the hardcoded fallback in `app/(main)/page.tsx` (still pending)

---

## 3. WHAT NEEDS TO BE BUILT NEXT (in order)

### Priority 0 — Confidence-tiered conversational match (AGREED, not yet built — pick this up next session)

The TMDB scoring system from session-12 already labels matches as exact / prefix / substring / fuzzy. Time to surface that to the user instead of always auto-locking. Locked decision:

**Three tiers based on TMDB `scoreTitleMatch` result:**

| Tier | Score | UX |
|---|---|---|
| **High** | 100 (exact title match) | Auto-lock as today. Pill: *"🔒 Βρήκα: Κονκλάβιο (2024) ✓"* |
| **Medium** | 60–80 (substring/prefix match) | Lock + show subtle *"Όχι αυτό; →"* link → expands alternatives. Microcopy: *"Νομίζω είναι Κονκλάβιο. Σωστό;"* |
| **Low** | < 60 OR competing runner-up within 20pts | Don't auto-lock. Show 2-3 alternative cards (poster + title + year). User picks. Microcopy: *"Βρήκα μερικά. Ποιο εννοείς;"* |

**Implementation order:**
1. Compute the tier server-side from the score, return in `matchData.confidence_tier`. Data is already in the response (`alternatives` field already populated).
2. Add `<MatchAlternatives>` mini-component (3 small cards: thumbnail + title + year, tappable). Renders below the IntelligencePanel when tier ≠ high, or when user taps "Όχι αυτό".
3. Tapping an alternative → swap `analysis` to that candidate's data → state stays `match_found` with the new match. No new API calls (alternatives carry their own `match` payload server-side already).
4. The unlock "↺ Άλλαξε" button stays as the manual escape hatch.

Self-contained ~45 min work. No schema or new endpoints.

### Priority 1 — Search overhaul (after confidence tiers)

`/api/search` returns 3 hardcoded items per the audit. The "AI-driven search" pillar in CLAUDE.md is theatrical. Bigger initiative — comparable in scope to all of submission Pass 1+2 combined. After confidence tiers ship, full pivot to search.

### Priority 2 — Detail Pages Figma Alignment (2 of 9 done)
Done: BookDetail, MovieDetail. Fix remaining 7 (Series, Food, Bars, Hotels, Recipes, Theater, Events) to:
- Match Figma layout (read full spec via `get_figma_data` before writing code)
- Show suggester prominently above item info (not buried in reviews)
- Read from extension tables (data now clean and queryable)
- Use `safeImageUrl()` already wired at the data-layer boundary

### Priority 3 — Guest vs Registered Auth State
- Replace hardcoded `IS_REGISTERED` with real Supabase session check
- Bottom nav YOU tab: guest sees value-prop page, registered sees profile
- Conditional header (bell icon only for registered)
- FAB visibility based on auth state

### Priority 4 — Onboarding Flow (4 steps)
1. Welcome — show value
2. Interests — select 2+ categories
3. Your Feed (REWARD) — personalized content based on selections
4. Follow suggestions — skippable

### Priority 5 — AI Service (Real Anthropic)
- Mock `analyzeSubmission` already calls server-side `/api/ai/match` which uses TMDB. Quality coaching uses local heuristics (`lib/ai/quality.ts`).
- Real swap: build `lib/ai/anthropic.ts` implementing the same `AIService` interface; wire via `getAIService()` in `lib/ai/index.ts` based on `ANTHROPIC_API_KEY`.
- Anthropic adds value mainly for: (a) better quality coaching beyond keyword heuristics, (b) `analyzeSearchQuery` / pill extraction (search work).
- TMDB integration is already real — no longer needs to wait for AI swap.

### Priority 6 — Other-category enrichment
TMDB is wired for movies/series. The same architecture (`/api/ai/match` route → external API → enrich `items` + extension table) needs:
- **Books** — Google Books (free, no key for low volume)
- **Food / Bars / Hotels** — Google Places (already wired for admin; expose for user-side flow)
- **Theater / Events** — Ticketmaster (free tier)

Currently those categories accept the heuristic candidate without external verification (same as the old mock).

### Priority 7 — Polish backlog (numbered audit items 8-14)
- Cast avatars in PreviewScreen (TMDB returns avatar URLs; we store them but don't show in match preview)
- Trailer button (TMDB `/videos` endpoint)
- LIMIT on category page queries
- Drop `embedding` from detail page SELECT
- Search empty state CTA "Πρόσθεσέ το πρώτος →" (depends on search overhaul)
- Variable home feed shuffle per session
- Add `poster_url`/`backdrop_url` migration SQL (live DB has them; fresh deploys would break per DEPLOY.md §2 without it)
- Achievement unlock celebration animation (HOOKS.md §3)
- Undo toast after publish

### Priority 5 — Gamification Layer
- Achievement popups after suggestions
- Badge progression (Verified→Expert)
- Level progress on profile
- Leaderboard with real rankings

### Priority 6 — Notifications (Real)
- Wire notifications page to Supabase real-time
- Bell icon badge count
- Push notifications (when native app ready)

### Priority 7 — Admin Real Data
- Connect admin panel to Supabase (currently mock/state data)
- CRUD operations for all entities
- Settings page implementation
- Database schema updates for: awards (type+category+year), recipe duration (prep/cook hours/minutes), actor avatars, filter_configs table

---

## 4. DATA NOTES

### Extension Tables — POPULATED ✅
Extension tables are fully populated by the migration + fix script. Data is queryable:
- Books: writer, language, publication_year, publication (name), plot
- Movies: director, duration_min, release_date, country, actors[], trailer_url, plot
- Series: director, seasons, country, channel, actors[], trailer_url, plot
- Food: type (resolved name), cuisine (resolved name), address, telephone, plot
- Bars: type, address, telephone, plot
- Recipes: level (resolved name), duration (minutes), yields, ingredients[], steps[], tips
- Hotels: type, address, telephone, information (website/booking/airbnb), plot
- Theater: type, name_place, writer, director, actors[], dates[], plot (address=null, no real address in K2)
- Events: event_type, performers[], dates[], ticket_url, price, description

`metadata.extra_fields_raw` still exists on items for reference but is NOT needed by detail components.
`metadata.publisher_url` (books), `metadata.imdb_url` (movies/series), `metadata.website` (various) contain URLs for linked display.

**Extra fields key mapping (from K2) — reference only:**
- `23` = genre/type/category
- `24` = author/director/creator
- `25` = (varies)
- `26` = english title
- `27` = language
- `28` = year
- `29` = publisher/external URL
- `200` = cover image URL (proteino.gr hosted)

Detail components must read from `extra_fields_raw` with fallback to extension table fields.

### Slug Format
DB slugs include category prefix: `books/paramythi-xoris-onoma`
- Links use `stripPrefix()` to get just the item slug
- Detail page reconstructs full slug: `` `${category}/${params.id}` ``

---

## 5. KEY FILES

```
app/(main)/page.tsx                         ← Home (guest + registered, real data)
app/(main)/[category]/page.tsx              ← Category listing (real data)
app/(main)/[category]/[id]/page.tsx         ← Detail page router + data fetch
app/(main)/profile/[handle]/page.tsx        ← Profile (real data)
app/(main)/leaderboard/page.tsx             ← Leaderboard
app/(main)/notifications/page.tsx           ← Notifications
app/(main)/you/page.tsx                     ← Guest YOU page
components/detail/*.tsx                     ← 9 detail components
components/category/CategoryPageShell.tsx   ← Category page client shell
components/home/guest/SuggestionFeed.tsx    ← Guest feed with category tabs
components/admin/*.tsx                      ← 16 admin components
app/admin/layout.tsx                        ← Admin layout with sidebar
lib/supabase/server.ts                     ← Server-side Supabase client
scripts/migrate-mysql.ts                   ← MySQL→Supabase migration script
middleware.ts                              ← Edge-compatible auth middleware
CLAUDE.md                                  ← Full architectural spec
ADMIN.md                                   ← Admin panel specification
AI.md                                      ← AI service implementation spec
HOOKS.md                                   ← Engagement + gamification spec
```

---

## 6. DEV SETUP

```bash
npm run dev          # http://localhost:3000
npx tsc --noEmit    # TypeScript check (should be 0 errors)
```

Supabase keys configured in `.env.local` (connected to live project).
Figma MCP server configured — use `get_figma_data(fileKey, nodeId)` for designs.
Figma file key: `TFMtJVp6GKBftmBbvBixVN`
Deployed on Vercel — auto-deploys from `main` branch.
