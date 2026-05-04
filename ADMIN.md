# Proteino — Admin Panel

> Route: `/admin` — protected via `public.users.role === 'admin'` (currently dev bypass enabled)
> Last updated: 2026-05-04

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
| Suggestion editor | ✅ | ✅ | Saves items + suggestions + extension tables; DB-backed extra options |
| Users | ✅ | ✅ | Search, sort, pagination, badges by level |
| Reviews list | ✅ | ✅ | Votes (▲/▼), report badges, hide/delete inline, filter modes |
| Review detail | ✅ | ✅ | Reports section, hide w/ reason, author flagged history |
| Extra Fields | ✅ | ✅ | Collapsed cards + wizard (paste options bulk) |
| Data Quality | ✅ | ✅ | NULL subcategory triage + inline subcategory creation |
| Categories — New | ⏳ | ❌ | Mock UI; rare use case |
| Suggestions — New | ⏳ | ❌ | Placeholder; rare (admin-created suggestions) |
| Content: Collections | ⏳ | ❌ | Mock UI built; needs real data layer |
| Content: Activities | ⏳ | ❌ | Mock UI built; needs schema + real data |
| Content: Filters | ⏳ | ❌ | Mock UI; needs `filter_configs` schema |
| Content: Movies Tonight | ⏳ | ❌ | Mock UI; needs schema |
| Extra Fields — New | 🚫 | — | Superseded by wizard in main page |
| Settings | ⏳ | ❌ | Placeholder |

Legend: ✅ done · ⏳ mock UI exists, needs data wiring · 🚫 deprecated

---

## 1. Navigation Structure

Fixed sidebar (`AdminSidebar`):

```
Proteino•
├── Overview          → /admin
├── Categories        → /admin/categories
├── Suggestions       → /admin/suggestions
├── Extra Fields      → /admin/extra-fields
├── Data Quality      → /admin/data-quality        [NEW]
├── Content
│   ├── Collections   → /admin/content/collections
│   ├── Activities    → /admin/content/activities
│   ├── Filters       → /admin/content/filters
│   └── Movies Tonight → /admin/content/movies-tonight
├── Reviews           → /admin/reviews
├── Users             → /admin/users
└── Settings          → /admin/settings
```

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

## 9. Content (Pending real data)

### 9A. Collections ⏳
**UI:** Mock built — list with category filter, drag-reorder, type sub-filter (Card/Carousel), live mobile preview panel.
**Pending:** DB schema (`home_sections` table per CLAUDE.md §19), real data wiring.

### 9B. Activities ⏳
Nearby activities for hotels (CLAUDE.md §11: admin-managed only).
**UI:** Mock built — list with category tabs (Αθλητικές/Εκπαιδευτικές/Ψυχαγωγικές/Αξιοθέατα), type filter chips.
**Pending:** Schema enhancement on `nearby_activities` table, real data wiring.

### 9C. Filters ⏳
Two-purpose explorer + frontend filter config.
**UI:** Mock built.
**Pending:** Schema for `filter_configs` (per-category quick filter visibility config).

### 9D. Movies Tonight ⏳
TV listings curation.
**UI:** Mock built — Today/This week sections, inline edit, channel dropdown.
**Pending:** New `movies_tonight` table.

---

## 10. Settings ⏳

Placeholder. To include:
- Site name/description/logo
- Email config
- Notification settings
- API keys (TMDB, Google Places, etc.)
- Maintenance mode

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

SQL migrations in `/scripts/sql/`:
- `001-create-subcategories-regions.sql`
- `002-create-extra-field-options.sql`
- `003-comments-votes-reports.sql`

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
```

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

### Critical (next priorities)
1. **Content: Collections** — DB schema + real data wiring for home feed sections
2. **Content: Activities** — Schema enhancement + real data
3. **Settings page** — actual implementation

### Less critical
4. **Content: Filters** — `filter_configs` schema and UI wiring
5. **Content: Movies Tonight** — schema + real data
6. **Categories — New** — admin can already manage subcategories via category detail; new top-level category is rare/schema-level
7. **Suggestions — New** — admin-created suggestions (rare; users normally submit)

### Cross-cutting
- **Re-enable production auth check** in `app/admin/layout.tsx` (currently `DEV_BYPASS_AUTH = true` in dev)
- **Image enrichment APIs** (CLAUDE.md §16): TMDB, Google Books, Google Places, Ticketmaster — currently 100% of items have only one image (poster OR backdrop), need both
- **Geocoding** for 386 venues (food/bars/hotels) without lat/lng
- **Google Books API** for 839 books missing pages

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
