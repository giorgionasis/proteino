# Proteino — Admin Panel

> Route: `/admin` — protected via `public.users.role === 'admin'` (`ADMIN_DEV_BYPASS=1` for local skip)
> Last updated: 2026-05-15 (session 25 — admin IA + visual refresh + Reviews admin)

The admin panel is the back-office for managing all platform content, structure, metadata, and what users see on the frontend.

---

## Core Principle

> "The admin controls everything that appears on the platform —
> content, structure, metadata, and what users see on the front page."

Admins never touch code. Everything is managed through the admin UI.

---

## Implementation Status

| Section | Status | Real Data | Notes |
|---|---|---|---|
| Shell & Layout | ✅ | — | Sidebar, routing, dev auth bypass |
| Overview | ✅ | ✅ | Real Supabase stats (unpublished, last 24h, totals) |
| Categories list | ✅ | ✅ | Real counts per category |
| Category drill-down | ✅ | ✅ | Subcategory CRUD, reorder, publish toggle |
| Suggestions list | ✅ | ✅ | Filters: category/subcategory/author/published/search/sort |
| Suggestion editor | ✅ | ✅ | Saves items + suggestions + extension tables; DB-backed extra options; Portrait/Landscape image uploads + Trailer URL wired |
| Users | ✅ | ✅ | Search, sort, pagination, badges by level |
| Reviews | ✅ | ✅ | NEW (session 25). `/admin/reviews` — first-class moderation surface for the `reviews` table. Stats / filters / 7 sort options / inline hide-unhide with required reason. See CLAUDE.md §41. |
| Legacy Comments | ✅ | ✅ | Frozen K2-archive `comments` table (343 rows) — moderation surface for historic content. Moved from `/admin/reviews` → `/admin/legacy-comments` in session 25 (was confusingly labelled "Comments (Legacy)" sharing the canonical reviews route). |
| Review detail | ✅ | ✅ | Reports section, hide w/ reason, author flagged history |
| Extra Fields | ✅ | ✅ | Collapsed cards + wizard (paste options bulk) |
| Data Quality | ✅ | ✅ | NULL subcategory triage + inline subcategory creation |
| Content: Collections | ✅ | ✅ | DB-driven home/category sections; live preview; reorder; replaces hardcoded carousels |
| Content: Activities | ✅ | ✅ | Categories → Types → Activities taxonomy; admin form; hotel detail pages now show nearby activities by Haversine proximity |
| Content: Movies Tonight | ✅ | ✅ | TV airing curation; today/this-week sections in admin; "Απόψε στην TV" home section |
| Image upload | ✅ | ✅ | Reusable ImageUploader (drag-drop, preview, validation); Storage `media` bucket; wired into Collections + Activities + SuggestionEditor |
| Content: Filters | ✅ | ✅ | Per-category filter rows (drag-reorder, chip vs panel toggle, label edit, publish); add new + edit options jsonb via UI; seeded from constants |
| Item gallery | ✅ | ✅ | items.images jsonb + ImageGallery component (multi-upload, tab grouping, ▲▼ reorder, alt text); SuggestionEditor gallery mode wired |
| Map picker | ✅ | ✅ | Leaflet click-to-pick + drag-marker in ActivityEditor (loaded via CDN, no npm) |
| Movies Tonight bulk | ✅ | ✅ | Paste TV schedule "Title \| Channel \| YYYY-MM-DD \| HH:MM" → preview match/unmatch → commit |
| Settings | ✅ | ✅ | Key/value `app_settings` table; admin form for maintenance mode + site identity; banner consumed by main layout |
| Frontend gallery | ✅ | ✅ | `ItemGalleryViewer` renders `items.images` on food/bars/hotels detail pages with tabs + keyboard-navigable lightbox |
| Production auth | ✅ | ✅ | `/admin` requires session + `role=admin`; `ADMIN_DEV_BYPASS=1` for local skip (NODE_ENV-checked) |
| Map address search | ✅ | ✅ | Nominatim (OSM) autocomplete in MapPicker (no API key); GR-biased |
| Image enrichment | ✅ | ✅ | TMDB / Google Books / Places candidates surfaced via "✨ Auto-fetch cover" in SuggestionEditor |
| Address+map in venue ext | ✅ | ✅ | AddressMapSection now wires through state and uses MapPicker; food/bars/hotels/theater/events get click-to-set lat/lng + Nominatim search |
| Item gallery backfill | ✅ | — | scripts/backfill-item-images.js — populates items.images from cover_url |
| Bulk geocoding | ✅ | — | scripts/geocode-venues.js — Nominatim with rate limiting; supports --table/--limit |
| Movies Tonight reminders | ✅ | ✅ | DB trigger creates notifications for every user who bookmarked the movie on airing insert |
| Tier 1 velocity tools | ✅ | ✅ | Cmd+K command palette (`/api/admin/search`); sidebar live counters (`/api/admin/counters`, 60s poll); queue nav in SuggestionEditor (←/→, ⌘↵, position counter); unsaved-changes guard (browser + in-app); list keyboard shortcuts (J/K/Enter/P/H/D/`/`); Open-as-user button |
| Suggestions — New | ✅ | ✅ | Built (`<NewSuggestionForm>`) — minimal scaffold form + `/api/admin/suggestions/create` (atomic item + suggestion insert); redirects to full editor for ext-field details |
| Image-URL safety | ✅ | ✅ | `lib/image-url.ts::safeImageUrl()` at every data-layer boundary; bare relatives prefixed with `/`, invalid URLs return null; protects `next/image` from legacy K2 paths |
| Migration tolerance | ✅ | — | `app/admin/suggestions/[id]/page.tsx` retries SELECT without `items.images` on Postgres 42703; editor still loads on DBs missing migration 009 |
| Lean Edge middleware | ✅ | — | Dropped `@supabase/ssr` from middleware (Edge cold-start crash on Vercel); cookie-presence check only; whole body in try/catch; `/api/*` excluded from matcher |
| Categories — New | 🚫 | — | Deleted; subcategories managed via `/admin/categories/[id]`. Top-level categories are a fixed enum |
| Extra Fields — New | 🚫 | — | Deleted; superseded by wizard in `/admin/extra-fields` main page |
| Layout (page composition) | ✅ | ✅ | `/admin/layout` — DB-driven page composition via `page_sections` (migrations 032 + 033). Category + home pages support reorder, add, delete, audience toggle, mobile-frame iframe preview. See CLAUDE.md §37 |
| Related Sections (detail pages) | ✅ | ✅ | `/admin/related-sections` — admin-defined "More from {director|writer|actor}" carousels per category via `related_sections_config` (migration 034). Auto-hide when `min_items` threshold isn't met. See CLAUDE.md §38 |
| Moments | ✅ | ✅ | `/admin/moments` — DB-driven copy + timing + conditions for in-app moments (bookmark celebration, achievement modal, …). See PROGRESS.md session 21 |

Legend: ✅ done · ⏳ mock UI exists, needs data wiring · 🚫 deprecated

---

## 1. Navigation Structure

Fixed sidebar (`AdminSidebar`) — regrouped in session 25 into 6 jobs-based sections with tone dots:

```
Proteino•
├── Overview                        → /admin

MODERATION  ● red
├── Reviews                         → /admin/reviews             [session 25 — NEW reviews table]
├── Reports                         → /admin/reports             [content_reports across all target_types]
├── Suggestions                     → /admin/suggestions
└── Data Quality                    → /admin/data-quality

CONTENT — what users see  ● blue
├── Layout                          → /admin/layout              [session 22]
├── Related Sections                → /admin/related-sections    [session 22]
├── Collections                     → /admin/content/collections
├── Movies Tonight                  → /admin/content/movies-tonight
└── Activities                      → /admin/content/activities

TAXONOMY — platform vocabulary  ● amber
├── Categories                      → /admin/categories
├── Regions                         → /admin/content/regions
├── Filters                         → /admin/content/filters
└── Extra Fields                    → /admin/extra-fields

ENGAGEMENT  ● violet
├── Moments                         → /admin/moments
└── AI Usage                        → /admin/ai-usage

PEOPLE  ● emerald
└── Users                           → /admin/users

PLATFORM  ● zinc
├── Settings                        → /admin/settings
├── Legacy Comments                 → /admin/legacy-comments     [session 25 — moved + renamed]
└── Showcase                        → /admin/showcase
```

Active link state: soft `bg-coral-50 text-coral-700` pill. All hrefs preserved (only `/admin/reviews` semantic changed — now the new reviews table; old comments archive moved to `/admin/legacy-comments`). See CLAUDE.md §41 for the full rationale.

---

## 2. Overview ✅

`/admin/page.tsx` — Server component.

**Real stats (live from Supabase):**
- Unpublished suggestions count (red badge)
- Last 24h suggestions count (green)
- Total users
- Total items
- Quick create buttons: Suggestion, Collection, Activity

---

## 3. Categories ✅

### Categories List (`/admin/categories`)
- All 9 categories with real counts: subcategories, items, suggestions
- Click → drill-down to category detail
- Client-side fetch via Supabase browser client

### Category Drill-down (`/admin/categories/[id]`)
- **Stats bar:** Subcategories count, Items, Suggestions, Distinct Users, **Unassigned items**
- Banner with link to `/admin/data-quality` if there are NULL-subcategory items
- **Subcategories table** with full CRUD:
  - Inline edit name (Enter to save, Esc to cancel)
  - Toggle Active/Inactive
  - Reorder via ▲▼ arrows (swaps `display_order`)
  - Delete with safety check (refuses if items still use it)
  - Inline create new subcategory with auto-slugified Greek-to-Latin slug

API: `/api/admin/subcategories` (POST, GET) + `/api/admin/subcategories/[id]` (PATCH, DELETE)

---

## 4. Suggestions ✅

### Suggestions List (`/admin/suggestions`)
Server component fetches authors (top 50 by suggestion count) and subcategories; client component handles interactivity.

**Filters:**
- Category tabs (all 9 + "All")
- Subcategory dropdown (filtered by selected category)
- Author dropdown
- Published / Unpublished toggle
- Has image / No image toggle
- Debounced search (300ms) on title

**6 sort options:** newest, oldest, by author, by category, etc.
**Pagination:** 20 per page

### Suggestion Editor (`/admin/suggestions/[id]`)
Full editor with category-specific extra fields. **All fields persist to DB on Save.**

**Save flow** (via `/api/admin/suggestions` PUT, service-role):
1. Update `items` table: title, slug, category, subcategory_id, description_seo
2. Update `suggestions` table: is_published, reflection, published_at
3. Upsert `item_${category}` extension table with all collected fields

**Each ExtraFields component:**
- Uses `forwardRef` + `useImperativeHandle` exposing `getData()` to parent
- Initializes state from passed `data` prop (the existing extension row)
- Receives `extraOptions` from DB (or falls back to hardcoded defaults if DB empty)

**Per-category extension fields:**

MOVIES (`item_movies`): director, country (comma-separated), duration_min, release_date, language, channel, trailer_url, plot, actors (JSON: `[{name, avatar}]`), awards (JSON: `[{type, category, year}]`)

SERIES (`item_series`): director, seasons, country, language, channel, trailer_url, status_message, plot, actors

BOOKS (`item_books`): writer, publication, language, pages, publication_year, plot, is_trilogy, trilogy_name

FOOD (`item_food`): cuisine, type, address, telephone, lat, lng, region_id, plot, delivery_links (JSON), information (JSON)

BARS (`item_bars`): type, address, telephone, lat, lng, region_id, plot, information

HOTELS (`item_hotels`): type, address, telephone, lat, lng, region_id, price_range, plot, facilities (JSON: `{facilities, room, extra}` arrays)

RECIPES (`item_recipes`): yields, calories, level, channel, origin, ingredients (JSON array), steps (JSON), tips

THEATER/EVENTS (`item_theater`/`item_events`): name_place, writer, director, year, address, lat, lng, ticket_url, price, availability, plot, region_id, dates (JSON), actors

**Subcategory + Region selectors** (server-fetched, passed as props).

---

## 5. Extra Fields ✅

`/admin/extra-fields` — Manages configurable option lists used by SuggestionEditor.

**Architecture:**
- DB table: `extra_field_options` with `(category, field_group, value, label, display_order, is_published)`
- Currently 295+ options seeded across 9 categories
- SuggestionEditor reads from DB on every render; falls back to hardcoded if empty

**UI: Collapsed cards by default**
- Each card shows: friendly name, count badge, "X hidden" badge, preview of first 5 options
- Click to expand → full edit list
- Inline option add/edit/reorder/delete/toggle publish
- "Delete Group" button (deletes all options in group)

**New Group Wizard (modal):**
- Friendly name input → auto-generates tech key (Greek-to-Latin transliteration)
- Manual override toggle for tech key
- Bulk paste options (one per line, e.g. `Pool\nBar\nRestaurant`)
- "Δημιουργία" creates all options in one batch

**Default seeded groups per category** (see `scripts/seed-extra-fields.js`):

- **Movies:** country (49), award_oscar (12), award_bafta (7), award_golden_globe (7), award_cannes (7), attributes (12)
- **Series:** country (49), streaming (6), attributes (6)
- **Books:** language (6), publication (8)
- **Food:** cuisine (13), attributes (12), delivery_provider (3), source (4)
- **Bars:** type (10), attributes (12), source (3)
- **Hotels:** type (5), amenities_facilities (7), amenities_room (7), amenities_extra (5), availability_provider (3)
- **Recipes:** unit (11), level (3), nutrition (7), common_ingredient (10)
- **Theater/Events:** availability (3)

API: `/api/admin/extra-fields` (GET, POST) + `/api/admin/extra-fields/[id]` (PATCH, DELETE)

---

## 6. Data Quality ✅ [NEW]

`/admin/data-quality` — Triage page for items without subcategory.

**Why it exists:**
After running auto-mapping on legacy data, ~48 items couldn't be cleanly assigned. This page lets admin manually resolve them.

**Categories of NULL items:**
- 24 "bars" that aren't actually bars (παγωτατζίδικα, escape rooms, παιδότοποι)
- 11 books with rare tags (μηχανική, αρχιτεκτονική, μαθηματικά)
- 6 food with placeholder data ("33") or unmapped cuisines
- Plus events/hotels/series with bad/missing tags

**Features:**
- Items grouped by category with icons + counts
- Per-row: shows item + **the original tag/cuisine/type that triggered NULL**
- Inline subcategory dropdown OR "+ Νέα subcategory..." that opens inline form
- Auto-fills suggested name from the original tag (e.g. "μαθηματικά" → "Μαθηματικά")
- Items disappear from list once assigned/deleted
- Per-category hints (e.g. "Πολλά απ' αυτά δεν είναι bars")
- Delete button for items that should not exist at all

API: `/api/admin/items` (PATCH, DELETE)

---

## 7. Users ✅

`/admin/users` — List with search, sort, pagination.

**Columns:** Avatar, Name + level badge, Email, Suggestions count, Ratings count, Last login, Registered, Verified status

**Filters:**
- Sort: Recent registered, Old registered, Most suggestions, Recent login
- Search: name, email, handle (debounced)

**Badge system based on user level:**
- Level 0-1: NEW (zinc)
- Level 2-3: VERIFIED (emerald)
- Level 4-6: EXPERT (purple)
- Level 7-9: GOLD (amber)
- Level 10+: PLATINUM (blue)

---

## 8. Reviews ✅

Manages user comments. Comments include vote tracking (▲/▼) and report system.

### Reviews List (`/admin/reviews`)

**4 stats cards (clickable for filter):**
- Total Reviews
- Last 24h
- 🔴 **Reported** — urgent indicator (animated pulse) when > 0
- ⚫ **Hidden**

**Filter modes:** All / Reported / Hidden (toggle pills)

**5 sort options:**
- Πιο πρόσφατα / Παλαιότερα
- Περισσότερα reports
- Πιο controversial (most downvoted)
- Πιο popular (most upvoted)

**Table columns:**
- Comment body (truncated, line-through if hidden)
- Author + handle
- On (suggestion link with category icon)
- **Votes**: ▲ X / ▼ Y with net score (+5 / -3)
- **Reports**: badge (red ≥3, lighter for 1-2)
- Posted (relative time)
- Actions: Hide/Show toggle, Delete

Visual indicators:
- Red-tinted row if has reports
- Grey-tinted row if hidden
- "HIDDEN" badge

### Review Detail (`/admin/reviews/[id]`)

**3-column layout:**

**Left (2 cols):**
- The Comment card (with line-through if hidden, hidden reason banner)
- **Votes panel**: big numbers for upvotes / downvotes / net score
- **Reports section** (NEW):
  - Each report: reason chip, description, reporter, date, resolved status
  - Per-report actions: ✓ Keep, Hide
  - Bulk: "Mark all as kept"
  - Empty state with 🎉 if none
- The suggestion context (poster, title, reflection, rating)
- All comments on the same suggestion (with current highlighted)

**Right (1 col):**
- Author card (avatar, verified, **"Repeat offender" badge if >2 flagged comments**)
- Stats: email, suggestions, total comments, **flagged comments** (red highlight)
- Other comments by author with hidden/reports indicators (pattern detection)

**Actions:**
- Hide dialog with categorized reasons (Προσβλητικό, Spam, Παραπληροφόρηση, Παρενόχληση, Άλλο) + custom
- Big red Delete button → confirms → redirects to list

API: `/api/admin/comments` (PATCH for hide/unhide, DELETE) + `/api/admin/comment-reports/[id]` (PATCH)

---

## 9. Content

### 9A. Collections ✅
DB-driven curated sections that replace hardcoded home/category carousels.

**Why it exists:**
The home page (and category pages, eventually) had hardcoded carousels in
`app/(main)/page.tsx`. Marketing/admins couldn't curate seasonal/themed
content (Marvel movies, Netflix series, Oscar winners) without engineer +
deploy. Collections turns this into a CMS surface.

**Data model:**
- `collections` — what & how it looks (type, title, image, source_category, tags, audience, lifecycle)
- `page_sections` — where & in what order (context: home/category/suggestions; per-bucket display_order). Migration 032 renamed `collection_placements` → `page_sections` and extended it to also hold widgets + dividers; collection placements are stored as rows with `section_type='collection'`. See CLAUDE.md §37 for the full layout system.
- An item belongs to a collection if `items.category = source_category` (when set) AND `metadata.tags @> selected_tags`

**Two visual formats:**
- **Carousel** — horizontal scroll of 4–10 items. Picks Portrait or Landscape variant based on source category (movies/series/books = portrait, rest = landscape).
- **Card** — compact pill linking to a filtered list page (e.g. "Από το σύμπαν της MARVEL").

**Admin UX:**
- Tabs by placement (Αρχική + 9 categories) — admin sees what's currently shown in each context
- ▲▼ reorder per placement bucket (instant save)
- Inline publish toggle (instant)
- Live phone preview of the active placement bucket (renders real items)
- Editor: split form + sticky live preview + tag autocomplete (with item counts) + match-count chip ("✓ 47 items ταιριάζουν")
- Empty state explains the value: "curate without deploy"

**Frontend behavior:**
- Home page reads home-placed collections via `lib/collections.ts` → `fetchHomeCollections(sb, isRegistered)`
- If admin has 0 home collections → falls back to existing hardcoded carousels (no breaking change)
- If admin has ≥1 → curated content replaces the carousel block; heroes/footer/CTAs stay
- Audience filter respects `target_audience`: 'all' / 'registered' / 'guest'
- Lifecycle filter: `valid_from` / `valid_until` enforced server-side
- Empty collections (0 matching items) silently dropped — no empty sections shown

**API:** `/api/admin/collections` (GET, POST), `/api/admin/collections/[id]` (GET, PATCH, DELETE), `/api/admin/collections/reorder` (POST), `/api/admin/collections/preview` (POST — runs the filter live), `/api/admin/collections/tags` (GET — autocomplete).

### 9B. Activities ✅
Nearby attractions for hotels (CLAUDE.md §11: admin-managed only).

**Why it exists:**
Hotel detail pages were dead-ends — a user looking at a hotel had no way to know what to do nearby. Admin curates a global database of activities (skiing in Καλάβρυτα, rafting in Παρνασσός, museums in Αθήνα). Frontend (next pass) shows them on hotel detail pages via geographic proximity to the hotel's lat/lng.

**Data model (3 tables):**
- `activity_categories` — top-level (Αθλητικές / Εκπαιδευτικές / Ψυχαγωγικές / Αξιοθέατα). Seeded with 4. Admin can add/edit.
- `activity_types` — children of categories (ΣΚΙ, RAFTING, MUSEUM…). Admin-managed.
- `activities` — actual entries with name, type_id, lat/lng, address, description, website/social/phone, image_url, is_published.

**Why geographic, not explicit FK:**
Original schema used `nearby_activities (item_id FK)` — every new hotel would need manual linking. Geographic proximity (lat/lng) means a new hotel automatically gets nearby activities, and one activity surfaces at every hotel within range. Scales.

**Admin UX:**
- `/admin/content/activities` — list with category tab + type filter chips + search
- Inline publish toggle, edit, delete
- Empty state explains the value: "Πρόσθεσε δραστηριότητες για να εμφανίζονται στις σελίδες ξενοδοχείων κοντά τους"
- `/admin/content/activities/[id]` (and `/new`) — full editor with cascading category→type select, lat/lng with `<MapPicker>` (click-to-pick + drag-marker, Nominatim address search), Google Maps verification link, publish toggle, social links, `<ImageUploader>` (drag-drop, validation, Supabase Storage)
- `/admin/content/activities/taxonomy` — full CRUD for the categories/types taxonomy with inline edit (blur to save), publish toggle, delete with safety check

**Frontend:**
- `lib/activities.ts::nearbyActivities()` — Haversine proximity query (bounding-box DB pre-filter + JS exact filter + sort by distance)
- `app/(main)/[category]/[id]/page.tsx` attaches `nearbyActivities` for hotels with lat/lng
- `HotelDetail`'s "Κοντινές Δραστηριότητες" section renders cards with type icon + name + Greek-formatted distance ("1.2 χλμ" / "350 μ"), linking out to website or Google Maps

API: `/api/admin/activities` (CRUD) + `/api/admin/activity-categories` (CRUD) + `/api/admin/activity-types` (CRUD).

### 9C. Filters ✅
Per-category filter configuration. Curates which filters appear on category pages, in what order, as chips or in the bottom-sheet panel.

**Why it exists:**
Filter rows on category pages were hardcoded in `constants/filters.ts`. Marketing/admins couldn't change which filters show, where they appear, or their order without engineer + deploy.

**Data model:**
- `category_filters` — per-category filter rows: `(category, filter_id, label, widget, placeholder, options jsonb, is_quick, display_order, is_published)`
- `category_filter_settings` — per-category metadata: `(category, has_nearby, sort_options jsonb)`

**Seeded:** Migration `008-category-filters.sql` inserts the current `CATEGORY_FILTERS` constant values verbatim — going live doesn't break anything.

**Admin UX:**
- `/admin/content/filters` — tabs by category, per-tab list of filters
- ▲▼ reorder (instant save), inline label edit on blur, is_quick chip toggle, publish toggle, delete
- Live phone preview shows the chip row + bottom-sheet panel with current settings
- Right rail: "Κουμπί Κοντά μου" toggle (saves to `category_filter_settings.has_nearby`)
- Empty state explains the seed migration

**Frontend:**
- `lib/category-filters.ts` provides `fetchCategoryFilterConfig(sb, category)` which builds a `CategoryFilters` shape compatible with the existing `CategoryPageShell` prop
- `app/(main)/[category]/page.tsx` fetches DB config and passes as prop; falls back to constant if DB has no rows (transitional safety)

**v2 shipped (session 10):** Admin can add brand-new filter rows from the UI (filter_id slug + label + widget type + placeholder); inline modal options editor for `segmented`, `platform-cards`, `icon-cards`, `checkboxes` widgets — add/remove/reorder `{id, label}` pairs.

### 9D. Movies Tonight ✅
TV listings curation. Curated airings of movies on Greek TV, surfaced on the home page.

**Why it exists:**
Greeks watching TV at night need to know which good movies are airing — TV listings change daily. Admin manually curates "tonight's picks" linked to existing movie items in the catalog.

**Schema (`scripts/sql/006-movies-tonight.sql`):**
```sql
movies_tonight (id, item_id FK→items, channel, air_date, air_time, is_published)
UNIQUE(item_id, channel, air_date, air_time)
```

**Admin UX:**
- `/admin/content/movies-tonight` — Today + This week sections (auto-derived from air_date)
- Inline edit (channel/date/time; movie can't change — delete+recreate for clarity)
- Movie autocomplete (queries `items` where category=movies)
- Inline publish toggle, delete
- Empty states inside each section

**Frontend:**
- `<MoviesTonightSection>` — horizontal-scroll cards, time badge top-right, channel chip, rating
- Renders only when there are airings (no empty state for users)
- Appears for both guest + registered, after CategoryTiles

API: `/api/admin/movies-tonight` (CRUD) + `/api/admin/movies-tonight/items` (movie autocomplete) + `/api/admin/movies-tonight/bulk` (paste-import preview/commit).

**Bulk import (shipped):** Paste textarea with format `Title | Channel | YYYY-MM-DD | HH:MM` → POST `/bulk` returns matched/unmatched (case-insensitive exact + contains fallback) → PUT commits with `onConflict ignoreDuplicates`. Modal preview shows matches (with cover) + unmatched titles separately.

**Bookmark reminders (shipped):** DB trigger `notify_bookmarkers_of_airing` (`011-movies-tonight-reminders.sql`) — on insert into `movies_tonight` (when `is_published = true`), creates one `notifications` row per user who bookmarked the movie. Payload includes `item_id`, `movie_title`, `channel`, `air_date`, `air_time`, `airing_id` for type-aware UI rendering.

---

## 10. Settings ✅

`/admin/settings` — key/value config consumed across the app, editable without redeploy.

**Schema (`scripts/sql/010-app-settings.sql`):**
```sql
app_settings (key text PRIMARY KEY, value jsonb, description text, updated_at timestamptz)
```
Default keys seeded: `site_name`, `site_tagline`, `maintenance_mode`, `maintenance_message`.

**Admin UX (`<SettingsManager>`):**
- **Maintenance mode** — toggle + message; when on, every page renders `<MaintenanceBanner>` from `app/(main)/layout.tsx`
- **Site identity** — site name + tagline
- **Custom keys** — advanced section to add/edit any other key/value pair (jsonb)

**Frontend consumption:**
- `lib/app-settings.ts::fetchAppSettings(sb)` — cached read with safe defaults; never throws
- `<MaintenanceBanner>` rendered site-wide when `maintenance_mode = true`

API: `/api/admin/settings` (GET, PATCH bulk).

**Not yet covered (future iterations):** email config, notification toggles, API key management UI (today via env vars).

---

## 11. Database Schema (managed via this admin)

### Tables created during this work:

**`subcategories`**
```sql
id uuid PK, category text, name text, slug text, description_seo text,
display_order int, is_published boolean, created_at timestamptz
```
Currently 88 subcategories across 9 categories.

**`regions`** (2-level hierarchy: Region → Area)
```sql
id uuid PK, name text, slug text, parent_id uuid, display_order int
```
Seeded with 78 Greek regions/areas.

**`extra_field_options`**
```sql
id uuid PK, category text, field_group text, value text, label text,
display_order int, is_published boolean, icon text, metadata jsonb,
UNIQUE(category, field_group, value)
```
295+ options seeded.

**`comment_votes`** + counter columns on `comments`
```sql
comment_votes (user_id, comment_id, vote int CHECK IN(-1,1), PRIMARY KEY(user_id, comment_id))
comments.vote_up int, comments.vote_down int  -- maintained by trigger
```

**`comment_reports`** + counter on `comments`
```sql
comment_reports (id, comment_id, reporter_id, reason, description,
                 resolved boolean, resolution_action text, resolved_at, created_at)
comments.report_count int  -- maintained by trigger (only counts unresolved)
comments.is_hidden boolean, comments.hidden_reason text, comments.hidden_at timestamptz
```

### Columns added to existing tables:
- `items.subcategory_id` (FK to subcategories)
- `item_food.region_id`, `item_bars.region_id`, `item_hotels.region_id`, `item_theater.region_id`, `item_events.region_id`

### Triggers (PostgreSQL):
- `sync_comment_vote_counts()` — keeps `comments.vote_up/vote_down` in sync with `comment_votes`
- `sync_comment_report_counts()` — keeps `comments.report_count` in sync with unresolved `comment_reports`

---

## 12. Scripts (one-shot data ops)

Located in `/scripts/`:

| Script | Purpose | Status |
|---|---|---|
| `assign-subcategories.js` | Initial mass-assignment of subcategories from legacy genre/cuisine/type fields | ✅ Done (1894/1942 items resolved) |
| `seed-regions.js` | Seed 78 Greek regions/areas | ✅ Done |
| `audit-data.js` | Report NULL subcategories + extension table coverage + missing critical fields | Active tool |
| `fix-subcategories.js` | Strict re-mapping with --apply flag | ✅ Run (37 reassignments + new subcategories) |
| `seed-extra-fields.js` | Seed 290+ option rows from hardcoded SuggestionEditor arrays | ✅ Done |
| `backfill-item-images.js` | Populate `items.images` from `cover_url` so legacy items render in the gallery | Run after `009-item-gallery.sql` |
| `geocode-venues.js` | Nominatim-based bulk geocoding (1 req/sec); fills lat/lng for venues missing it | Run as needed; supports `--table=item_food --limit=100` |

SQL migrations in `/scripts/sql/`:
- `001-create-subcategories-regions.sql`
- `002-create-extra-field-options.sql`
- `003-comments-votes-reports.sql`
- `004-collections.sql`
- `005-activities.sql`
- `006-movies-tonight.sql`
- `007-storage-media-bucket.sql`
- `008-category-filters.sql`
- `009-item-gallery.sql` ← **adds items.images jsonb for multi-image gallery**
- `010-app-settings.sql`
- `011-movies-tonight-reminders.sql`
- `012-bookmarks-unique.sql` ← **adds UNIQUE constraint + RLS for bookmarks; needed for the bookmark API**

---

## 13. API Routes (all use service-role key, server-side only)

```
/api/admin/suggestions           PUT     (save item + suggestion + ext table)
/api/admin/items                 PATCH, DELETE  (single item update/delete)
/api/admin/subcategories         GET, POST     (list, create)
/api/admin/subcategories/[id]    PATCH, DELETE (rename, reorder, toggle, delete)
/api/admin/extra-fields          GET, POST     (list, create option)
/api/admin/extra-fields/[id]     PATCH, DELETE (rename, reorder, toggle, delete)
/api/admin/comments              PATCH, DELETE (hide/unhide, delete)
/api/admin/comment-reports/[id]  PATCH         (resolve report)
/api/admin/collections           GET, POST     (list/filter by placement; create + placements)
/api/admin/collections/[id]      GET, PATCH, DELETE  (read; update + diff placements; delete cascades)
/api/admin/collections/reorder   POST          (batch display_order within a placement bucket)
/api/admin/collections/preview   POST          (run filter, return matching items + count)
/api/admin/collections/tags      GET           (tag autocomplete from items.metadata.tags)
/api/admin/activities            GET, POST     (filterable list; create)
/api/admin/activities/[id]       GET, PATCH, DELETE
/api/admin/activity-categories   GET, POST     (taxonomy: top-level)
/api/admin/activity-categories/[id]  PATCH, DELETE  (refuses if any types still reference)
/api/admin/activity-types        GET, POST     (taxonomy: children of categories)
/api/admin/activity-types/[id]   PATCH, DELETE  (refuses if any activities still reference)
/api/admin/movies-tonight        GET, POST     (filterable by from/to date; create airing)
/api/admin/movies-tonight/[id]   PATCH, DELETE
/api/admin/movies-tonight/items  GET           (movie autocomplete — searches items)
/api/admin/upload                POST, DELETE  (multipart upload to media bucket; returns { url, path })
/api/admin/category-filters           GET, POST     (filterable by category; create new row)
/api/admin/category-filters/[id]      PATCH, DELETE (label/widget/options/is_quick/publish)
/api/admin/category-filters/reorder   POST          (batch display_order within a category)
/api/admin/category-filters/settings  GET, PATCH    (per-category has_nearby + sort_options)
/api/admin/movies-tonight/bulk        POST, PUT     (preview match/unmatch; commit insert with dedup)
/api/admin/settings                   GET, PATCH    (key/value app_settings)
/api/admin/enrich                     POST          (TMDB / Google Books / Places candidates)
/api/admin/search                     GET           (Cmd+K cross-entity search: suggestions/users/collections/activities/reviews)
/api/admin/counters                   GET           (sidebar live badge counts)
/api/admin/suggestions/queue          GET           (queue navigation: prev/next + position/total within filter)
/api/admin/suggestions/create         POST          (atomic item + suggestion insert from `/admin/suggestions/new`)
```

**Required env vars (optional, all features degrade gracefully if missing):**
- `TMDB_API_KEY` — for movies/series cover/backdrop enrichment (free at themoviedb.org)
- `GOOGLE_BOOKS_API_KEY` — books (optional; small-volume works without)
- `GOOGLE_PLACES_API_KEY` — food/bars/hotels venue photos
- `ADMIN_DEV_BYPASS=1` — local-only; skip /admin auth check (refused in production NODE_ENV)

---

## 14. Architecture Decisions

**Server vs client component split:**
Pages that need write actions split into server (initial data fetch via `createAdminClient` service-role) + client (interactivity, paginated re-fetch via `createBrowserClient` anon-key). Service-role key never touches browser.

**RLS strategy:**
- `subcategories`, `regions`, `extra_field_options`: public read (frontend reads them for filters/dropdowns)
- `comment_votes`, `comment_reports`: users can only see/insert their own
- All admin writes go through `/api/admin/*` routes using service-role

**Foreign key disambiguation:**
After adding `comment_votes` (which also FK's to users), the implicit `users!inner` join became ambiguous. Explicit aliases now used: `users!comments_user_id_fkey(...)`.

**Counter denormalization via triggers:**
`comments.vote_up/vote_down/report_count` are maintained by Postgres triggers on the source-of-truth tables (`comment_votes`, `comment_reports`). Single read on `comments` gives all stats; no aggregation queries needed.

**Default fallback pattern:**
SuggestionEditor's hardcoded option arrays were kept as fallbacks. If DB has no entries for a `field_group`, the hardcoded list is used. This makes the admin's database-driven workflow non-blocking.

**Greek transliteration:**
Custom map (`α→a`, `β→v`, etc.) used for slug generation across subcategories, regions, extra-field tech keys.

---

## 15. Pending Work

The session-11 audit list below is preserved for posterity, but most items have shipped. Live "what's next" is in PROGRESS.md §3.

### From the session-11 audit — current state
1. ~~User-action persistence~~ — ✅ shipped session 12 (suggestions / ratings → reviews / follows / bookmarks / reports all persist).
2. ~~Replace mock `/api/search` and `/api/recommendations`~~ — ✅ `/api/search` rewritten end-to-end in session 17 (Search v2 with structured Gemini filters). `/api/recommendations` is intentionally deferred until Phase B (pgvector recs).
3. ~~Real leaderboard~~ — ✅ shipped session 19 (RPC `get_leaderboard` + real ranking).
4. ~~Onboarding flow~~ — ✅ shipped session 20 (4 screens at `/onboarding`, gated server-side from the `(main)` layout).
5. ~~**Detail pages Figma alignment**~~ ✅ DONE (session 24). All 9 detail components share the Figma-aligned template. New `<PersonBubble>` extracted. CLAUDE.md §25 codifies the rules (empty-state hide, no gray placeholders, no dead CTAs).
6. **Migration consolidation** — `scripts/sql/*` is the source of truth; consolidation into `supabase/migrations/` hasn't happened. `items.poster_url` / `backdrop_url` are present in production (added by deployment scripts) but no `scripts/sql/` file owns the ADD COLUMN. Not blocking but worth tidying.
7. **Hooks from HOOKS.md** — partial: migration 029 added rating / follow / suggestion / bookmark-milestone triggers + the moments table (sessions 21). Still TBD: TMDB new-season webhook, dormant-14d, event-passed, streak threshold, anniversary.

### Open follow-ups (current)
- **Item gallery on FoodDetail / BarsDetail / HotelDetail** — `<ItemGalleryViewer>` is wired; verify on detail pages.
- **Tags editor in SuggestionEditor** — admin can fix subcategory but not `metadata.tags`.
- **Filters v3** — admin can edit existing filter rows; widget-config UI (drop-zone, segmented, price-range options) needs richer UI.
- **Drop legacy `ratings` + `comments` tables** — both tables are no longer written to; the user-facing surfaces that read from them have been retired. Final cleanup migration once admin has reviewed the archive.

### Known data quality issues (manual review)
- 24 "bars" miscategorized in source data (παγωτατζίδικα, escape rooms, παιδότοποι, soccer academies)
- 11 books with single-of-a-kind exotic tags
- 6 food with "33" placeholder cuisine
- 3 events untagged
- 2 hotels with bad data ("bbbb", empty)
- 2 series with only generic tag
All visible and manageable from `/admin/data-quality`.

### Known data quality issues (manual review)
- 24 "bars" miscategorized in source data (παγωτατζίδικα, escape rooms, παιδότοποι, soccer academies)
- 11 books with single-of-a-kind exotic tags
- 6 food with "33" placeholder cuisine
- 3 events untagged
- 2 hotels with bad data ("bbbb", empty)
- 2 series with only generic tag
All visible and manageable from `/admin/data-quality`.

---

*Admin gives full control over content, categorization, and moderation. Frontend reads filters/options/structure from the same DB the admin writes to — no code changes needed for content updates.*
