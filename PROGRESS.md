# Proteino — Build Progress

Last updated: 2026-05-14 (session 23 — Phase A.6 + audit cleanup + Google rich-results SEO)

---

## 0. WHERE WE LEFT OFF (read first when resuming)

**Current state — session 23 (current) finished:**

This was a 4-arc consolidation session: closed the Phase A.6 deferred items, audited the codebase for logic/bug inconsistencies and fixed them in 3 batches, fixed redundant UI surfaces shown in inappropriate contexts (own-suggestion bookmark, self-follow), then shipped a full Google rich-results SEO layer.

**Phase A.6 — open design calls closed:**
- ✅ **postMessage scroll-to-section in the layout preview iframe.** Clicking a section row in `/admin/layout`'s middle column posts `{type:'scroll-to-section', sectionId}` to the iframe via `iframe.contentWindow.postMessage`. `components/preview/PreviewScrollListener.tsx` (mounted in `app/preview/layout.tsx`) catches the message and smooth-scrolls to the matching `[data-section-id]` element + applies a 1.6s `.section-highlight` coral ring fade (CSS in `globals.css`, respects `prefers-reduced-motion`). The data attribute is added at the render-bridge boundary (`renderHomeSection` + `CategoryPageShell.renderSection`) so production gets it too — harmless outside preview, origin-checked on the listener side. Action buttons in the row stop click propagation so toggle/edit/delete still work.
- ✅ **Static-carousel item-source picker.** Replaced the `item-source` placeholder ConfigField with a real picker in `SectionConfigDrawer`: debounced search-by-title input + ordered selected list with ▲▼ reorder + remove. Stored as `config.itemIds[]`. New `GET /api/admin/items/search?q=…&category=…&limit=…` (with `&ids=…` batch-lookup mode for hydrating already-selected ids). Resolver detects `static_carousel` rows with `config.itemIds` and pre-hydrates the items via `hydrateManualItems` in the admin's chosen order (≤30 cap, drops unpublished/missing silently). Both bridges (home + CategoryPageShell) check `section.items` first and fall back to the auto-source slice when not set. Empty array → undefined → reverts to auto. Admin can build "Editor's picks" carousels without going through Collections.
- ✅ **CLAUDE.md §37 / §38 edge-case audit + `item_detail` decision documented.** Added "Resolver behaviour notes" subsection (audience filter semantics, lifecycle filter, empty-collection drop, singleton enforcement at app layer, fixed-widget DELETE refusal, RLS shape) + "Static-carousel rendering contract" subsection (manual override vs. auto-source paths, portrait/landscape detection, dead-code call-out for `fetchStaticCarousel`) + Postmessage subsection. §38 gained a "two tables, not `context='item_detail'`" rationale subsection explaining why related sections are kept separate from `page_sections` and which three signals would justify revisiting.

**Audit-driven fixes (3 batches):**
- ✅ **Batch 1.1 — `/profile/[handle]/reviews` reads the right table.** Was querying the legacy `ratings` table (wiped by migration 016 → 0 rows for everyone). Switched to `reviews` + `is_hidden=false` filter. `ReviewsCategoryPage` DELETE call switched from `/api/ratings/[id]` to `/api/reviews?id=…`. Users clicking "Αξιολογήσεις" from their own profile now actually see their reviews.
- ✅ **Batch 1.2 — Report-on-review routing fix (migration 035).** `content_reports.target_type` CHECK was `('comment','suggestion')`; reports on reviews were being written with `target_type='suggestion'` (since reviews used to be derived from suggestions), and the admin `/admin/reports` lookup searched the `suggestions` table by review_id → every review report rendered as "(δεν βρέθηκε)". Migration 035 extends the enum to include `'review'` + heals historic misrouted rows in a single `UPDATE`. `ReportFlowModal` + `ReportLink` + `/api/reports` POST validation + admin reports page + admin resolution endpoint all branch on the new type. `ReviewCardFooter` now sends `targetType="review"`. Admin "Hide" on a review writes `is_hidden=true` + `hidden_at/_reason/_by` to the `reviews` table.
- ✅ **Batch 2.1 — Deleted dead code paths.** Six files removed (`hooks/useRating.ts`, `app/api/ratings/route.ts`, `app/api/ratings/[id]/route.ts`, `components/detail/CommentComposer.tsx`, `components/detail/CommentThread.tsx`, `app/api/comments/route.ts`) plus their empty directories. All had zero JSX/import consumers — the session-15 sweep had removed them from production but the hooks/APIs lingered. They POSTed into the legacy `ratings` + `comments` tables (already wiped/frozen by migration 016).
- ✅ **Batch 2.2 — Admin "Reviews" tab → "Comments (Legacy)".** Sidebar entry renamed, page H1 updated with a "see /admin/reports for new review moderation" callout, `counters.reportedReviews` key renamed to `reportedComments`. The route stays at `/admin/reviews` for back-compat with bookmarks. The page reads `comments` (343 frozen K2 rows) — accurate now that the label matches the data source. Real review moderation flows through `/admin/reports` (which understands `target_type='review'` after Batch 1.2).
- ✅ **Batch 2.3 — Deleted dead recommendation scaffold.** `lib/recommendations/index.ts` queried `analytics.precomputed_recs` (Phase B — never built, no migration creates the schema) + a non-existent `match_items` RPC. Zero consumers. Returns when Phase B actually ships.
- ✅ **Batch 3 — Doc + type hygiene.** `types/database.ts` patched: renamed `collection_placements` → `page_sections` with new columns + added `reviews`/`review_votes`/`content_reports`/`users.preferences`/`users.region_id`. ADMIN.md updated: collections data model section now references `page_sections`, sidebar map shows "Comments (Legacy)", §15 "Pending Work" rewritten to mark shipped items, implementation-status table row corrected. CLAUDE.md §5 corrected: the "not read by new UI" claim was false — `ratings` is now fully retired (no readers/writers) and `comments` is read only by the renamed admin Legacy tab. Pointer added to `/admin/reports` as the canonical review-moderation surface.

**Redundant-UI sweep (own-context bugs):**
- ✅ **Bookmark UI hidden on own-suggestion.** Bookmark IconButton in `<DetailHeaderActions>` accepts `showBookmark` prop (default true) → all 9 detail components pass `showBookmark={!mySuggestion}`. `<BookmarkStatusChips>` row above the rating box wrapped in `{!mySuggestion && …}`. A suggester has demonstrably experienced the item — wishlist/done states are nonsensical for them. Matches the established pattern where the rate-this-item card is replaced with `<OwnSuggestionActions>` (Edit/Delete) on own suggestions.
- ✅ **Stale `collection_placements` references killed.** Found during the audit run: `/api/admin/collections`, `/api/admin/collections/[id]`, `/api/admin/collections/reorder`, `/admin/content/collections/[id]/page.tsx`, `lib/collections.ts` all still queried the renamed table → every Section Picker modal "Collection" tab was 500ing. Mass-renamed via `replace_all`.
- ✅ **ProfilePopup self-detection.** Tapping your own avatar (in any carousel) now replaces the Follow button with a "Δες το προφίλ σου →" link via `useAuthStore` self-check.
- ✅ **Home `fetchTopUsers` excludes the viewer.** Top contributors carousel ("Χρήστες με Παρόμοιες Προτιμήσεις") no longer shows the viewer themselves with a non-functional Follow button. Over-fetches by 1 to keep result count stable.
- ✅ **`CategoryTopUsers` self-detection.** Featured #1 contributor + 4 contributor grid each get a Follow → "Δες το προφίλ σου →" / "Το προφίλ σου →" link when viewer matches.
- ✅ **`ReviewCardFooter` self-detection.** Own review now renders a compact static "η αξιολόγησή σου" footer (vote counts shown, but no clickable thumbs and no report link). Defaults `authorId` to `userData?.id` so all 9 detail consumers inherit the gate without prop-threading.
- ✅ **Broken Follow buttons fixed end-to-end.** Pre-existing bug: `<FollowButton>` in `SuggestedUsers` + `CategoryTopUsers` + `ProfilePopup` was uncontrolled — clicks toggled local state but never POSTed to `/api/follows`. Now each card owns a `useFollow(user.id, user.is_following ?? false)` instance and threads `following + onToggle` to the button. New helper `lib/follows.ts:getFollowedSet(sb, viewerId, candidateIds)` does one batch query to hydrate initial state. Server pages updated: home `fetchTopUsers` + category page top-5 (top user + 4 contributors) both populate `is_following` per card so the button doesn't flicker.

**SEO infrastructure — Google rich results + Open Graph + sitemap (all new this session):**
- ✅ **JSON-LD Schema.org per category.** `lib/seo/structured-data.ts` maps category → @type and emits Google-validator-friendly payloads. `components/seo/JsonLd.tsx` is a server-component script emitter with `<` escape for safety. Wired into `app/(main)/[category]/[id]/page.tsx` as a fragment alongside the detail component — all 9 categories covered:
  - **Movie** → `Movie` with name, alternateName, description, image[], genre, director (Person), actor[] (Person[]), datePublished, duration (ISO 8601), inLanguage, countryOfOrigin, **trailer (VideoObject with YouTube/Vimeo embedUrl resolution)**, **award[]** from item_movies.awards jsonb, aggregateRating (when ≥1 review), review[] (up to 8 most-recent text reviews).
  - **TVSeries** → same as Movie + numberOfSeasons, startDate, endDate.
  - **Book** → `Book` with author, publisher, numberOfPages, datePublished, inLanguage, isbn (when stored), bookFormat (defaults Paperback), sameAs (from metadata.publisher_url).
  - **Recipe** → `Recipe` with **author (Person from suggester) + datePublished (from suggestion.created_at) + keywords (from metadata.tags)**, recipeYield, recipeCuisine, recipeCategory, prepTime/cookTime/totalTime (ISO 8601), recipeIngredient[] (parsed from string-or-object), recipeInstructions[] (HowToStep with position), nutrition (calories + suitableForDiet for vegan/vegetarian/glutenFree).
  - **Food** → `Restaurant` with address (PostalAddress), geo (GeoCoordinates), telephone, servesCuisine.
  - **Bars** → `BarOrPub` (LocalBusiness subtype) — same fields minus servesCuisine.
  - **Hotels** → `Hotel` (LodgingBusiness subtype) with priceRange, amenityFeature[] (LocationFeatureSpecification from facilities jsonb).
  - **TheaterEvent** → `TheaterEvent` with location (Place), startDate/endDate (parsed from dates jsonb), eventStatus (EventScheduled default), eventAttendanceMode (OfflineEventAttendanceMode default), director (Person), performer[] (Person[] from actors), offers (Offer with ticket_url + price + EUR currency).
  - **Event** → `Event` — same as TheaterEvent except performer is `PerformingGroup` from the performers jsonb.
  - Every type emits AggregateRating (when ≥1 review) + up to 8 Review objects (text reviews only — rating-only reviews skipped to keep the payload tight).
  - `compact()` strips null/undefined/empty fields so the validator doesn't reject for empty optional values. Migration 035 + the rich-results gap fill (genre, trailer, award, sameAs, alternateName, eventStatus/AttendanceMode, recipe author/datePublished/keywords) brings coverage to all Google-recommended fields **except** what's actually unstored in the DB (contentRating, ISBN, numberOfEpisodes, hotel starRating, restaurant openingHours, event organizer).
- ✅ **Open Graph + Twitter Card metadata.** Per-detail-page `generateMetadata` extended with `og:title`, `og:description` (truncated 200 chars), `og:url` (canonical), `og:image` (1200×630, backdrop preferred over poster), `og:type` (`book` for books, `article` elsewhere), `og:locale="el_GR"`, `twitter:card` (`summary_large_image` when hero exists, `summary` otherwise), and `alternates.canonical`. Root `app/layout.tsx` upgraded with `metadataBase`, Greek title template `"%s — Proteino"`, default OG + Twitter + robots metadata.
- ✅ **`app/robots.ts`.** Allows everything except `/admin*`, `/api/`, `/auth/`, `/preview/`, `/onboarding`, `/settings`, `/forgot-password`, `/reset-password`, `/verify-code`. Points crawlers at `${siteUrl}/sitemap.xml`.
- ✅ **`app/sitemap.ts`.** Lists home + leaderboard + support + 9 category index pages + up to 5000 published items (sorted by `modified_at` desc). Defensive try/catch so DB hiccups never 500 the sitemap. `lastModified` per item from `modified_at`. Future work tracked: sitemap index when corpus passes 5K + image:image sitemap extension.
- ✅ **Migration 035 added to DEPLOY.md** migration list.
- ✅ **Env var:** `NEXT_PUBLIC_SITE_URL` (defaults to `https://proteino.gr`) used by JSON-LD `@id`, sitemap loc, canonical URLs, OG `og:url`. Set this on Vercel before deploying.

**Verified live (sample data via curl):**
- `/recipes/soypa-veloute-me-sparaggia` → full Recipe payload with `author: {@type: Person, name: "Nikos Avramidis", url: "/profile/nikos-avramidis"}`, `datePublished: "2018-05-11"`, `keywords: "συνταγές, σούπες"`, full ingredient + step arrays + nutrition.
- `/movies/dixasmenos` → Movie with `genre: "θρίλερ"`, director (Person), actor[] (3 People).
- `/series/lucifer` → TVSeries with full `trailer: {@type: VideoObject, name: "λούσιφερ — Trailer", embedUrl: "https://www.youtube.com/embed/...", contentUrl: ...}`.

**Open follow-ups (next session):**
- **Sitemap/indexing/old-URL redirects.** When ready: (a) decide sitemap index strategy if corpus grows past 5K, (b) add `noindex` meta to thin pages (empty category lists, profile pages with 0 suggestions, onboarding), (c) wire canonical URLs on category + profile pages, (d) build a 301-redirect map from the legacy K2 URLs (need sample of old URL format + ideally the K2 URL list to plan this). Middleware constraint from session 11 still applies — must stay lean and not import `@supabase/ssr`.
- **Add the few remaining structured-data fields** that need new admin form work: contentRating for movies/series, ISBN for books, numberOfEpisodes for series, hotel starRating, restaurant openingHours, event organizer. Infrastructure is fully there — one-line addition per field in `lib/seo/structured-data.ts` once admin can enter the data.
- **Phase B (pgvector recommendations)** — biggest user-visible leap left. 5 days. The corpus (1953 items) is finally rich enough.

---

## Previous sessions

**Session 22 — Admin-controlled page layouts + related sections + landscape list ✅ (2026-05-13):**

- ✅ **Admin-controlled page layouts (category + home).** Page composition for both category pages AND the home page is now DB-driven via the new `page_sections` table (migration 032 renames `collection_placements`, adds `section_type` / `widget_key` / `config` / `audience` / `is_active` / lifecycle columns + seeds widget rows reproducing every hardcoded chrome block; migration 033 completes the home seed by splitting `movies_tonight` into audience-specific rows + adding the 5 fallback carousels per audience that 032 missed). One unified `page_sections` table holds: (a) collection placements — existing behaviour preserved — and (b) widget placements for chrome / static_carousel / divider sections.
- ✅ **`lib/layout/` is the architectural core** — `types.ts` (PageSectionRow, RenderedSection discriminated union, WidgetSpec, ConfigField), `widgets.ts` (registry of 22 widgets across category/home with compatibility + fixed + singleton flags + admin-form configSchema), `resolver.ts` (single-query fetch + parallel collection hydration + audience filter + lifecycle filter + optional `includeInactive` for admin), `home-bridge.tsx` (the per-page widget→component bridge for home — extracted from `page.tsx` because Next.js disallows extra exports there; consumed by both the live home page and `/preview/home`).
- ✅ **CategoryPageShell + home page both layout-driven; legacy JSX retained as fallback** — both pages compute `layoutSections` server-side and render via a `renderSection` switch only when the resolver returns rows. If migration 032 isn't applied or the seed is empty, the previous hardcoded JSX fires verbatim so the page never blanks out. Items list, filter row, welcome header etc. are `fixed: true` widgets the admin can reorder + toggle but never delete.
- ✅ **`/admin/layout` — full admin UI for layouts.** Three columns: (left) page picker for Αρχική + 9 categories, (middle) dnd-kit Sortable section stack with per-row drag-handle + active toggle + audience inline-picker + edit pencil + delete button (fixed widgets show 🔒 and disable delete), (right) phone-bezel iframe preview pointing at `/preview/...` with an audience selector (Όλοι / Εγγεγραμμένοι / Επισκέπτες). `+ Πρόσθεσε section` opens a picker modal with Widget tab (`compatibleWidgets()` filtered, singletons-already-placed grayed out) + Collection tab (search existing + "Δημιουργία νέου" link). Pencil opens a config drawer that auto-renders fields from `WidgetSpec.configSchema` (text / textarea / number / toggle / select / category / item-source) plus audience + lifecycle controls. All writes call `revalidatePath` so admin edits land instantly.
- ✅ **`/preview/category/[slug]` + `/preview/home`** — iframe-safe routes (live outside `app/(main)/` so no global header / bottom-nav / FAB chrome). `force-dynamic`, audience override via `?audience=guest|registered|all`. Lightweight per-category fetches (15 items each, no extension tables) — enough for layout review, not pixel-perfect. Both reuse the same renderHomeSection / category-shell bridges as production so what admin sees = what users see.
- ✅ **CategoryCard list always landscape.** The under-filter list on movies/series/books used to render `RowCard` (small poster left + info right); now it uses `LandscapeCard` like every other category — full-width cover on top + title + meta below. Carousels keep the portrait/landscape branch via `isPortraitCategory` (movies/series/books → portrait posters; rest → landscape) — that part stays.
- ✅ **Admin-configurable "More from {axis}" detail-page sections.** Migration 034 adds the `related_sections_config` table (one row per `(category, field)` rule with `title_template` + `min_items` + `item_limit` + `is_active`), seeded with 8 default rules: books → writer · movies → director, lead actor · series → director, lead actor · theater → director, writer · events → performer. Every detail page (all 9 categories) now renders `<RelatedSections>` below the reviews carousel; the sections auto-hide when the current item lacks a value for the axis OR when there are fewer than `min_items` siblings sharing it. MovieDetail's hardcoded "Από {director}" block was deleted — now driven by the same system. `/admin/related-sections` is a single grouped page with inline title/min/max editing, active toggle, delete, and a preset-driven "Πρόσθεσε rule" form per category. Sidebar entry between Layout and Moments.
- ✅ **`lib/related-sections.ts`** — fetcher parses field paths (scalar / `array[N]` / `array[N].key`), reads the current item's value from its extension row, queries siblings via PostgREST jsonb operators (`field->>'index'` / `field->index->>'key'`), filters sections below threshold, interpolates `{value}` into the title template. Result is just `{ ruleId, title, items[] }[]` — small surface area, easy for any future component to consume.
- ✅ **dnd-kit installed** — `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (~30 KB gzipped, touch-aware, accessible).

**Previous state — session 21 finished:**

- ✅ **AI submission funnel tracking — full data layer (migrations 030 + 031 + lib/funnel + instrumented useSubmission).** Authenticated-only event pipeline answers "where do users drop, what did they type, how long did each state take" without any URL-based analytics. Three tables: `submission_sessions` (one per overlay session, NOT NULL user_id, denormalised counters for fast headline funnel queries), `submission_events` (state transitions + decisions + AI heartbeats, jsonb payload), `submission_text_snapshots` (PII-masked text — emails/phones regex-stripped, 500-char cap, 90-day retention via `purge_old_text_snapshots()`). Single SQL ingest function (`ingest_funnel_batch`, SECURITY DEFINER) so the API never needs direct INSERT grants. Client tracker (`lib/funnel/tracker.ts`) buffers 2s, flushes via fetch, closes via `navigator.sendBeacon` so tab-close survives; localStorage retry queue for network failures. Instrumented states: `flow_started`, `state_enter` (every transition, with text_length_max counter + sanitised snapshot), `match_locked` / `match_rejected` / `alternative_chosen`, `rating_set`, `publish_attempted` / `succeeded` / `failed`, `flow_reset`, `flow_closed`. Sweep cron (`sweep_abandoned_funnel_sessions()`) marks 30+ min idles as `abandoned_idle`. Dashboard (`/admin/ai-usage/submission-funnel`) deferred until ~48h of real data accumulates.
- ✅ **Greek TV channel icons — 8 logos wired into 3 movie-only surfaces.** `public/icons/channels/{ert1,ert2,ert3,mega,skai,star,antenna,alphatv}.svg` registered in `lib/icons.ts`. `platformIconForChannel` matches Greek + Latin variants (`ΕΡΤ1`, `ERT1`, `Αντέννα`, `ANT1`, `ΣΚΑΪ`, `Skai`, …) via accent folding. Surfaces: (1) `/admin/content/movies-tonight` shows logo next to channel select in display row, edit row, and new-draft form; (2) home "Απόψε στην TV" carousel + the same carousel on `/movies` category page (threaded via `tonightAirings` prop into `CategoryPageShell`); (3) movie detail page — white pill strip under the hero with coral pulse-dot + "ΑΠΟΨΕ ΣΤΗΝ TV" + airtime + channel logo, **only when admin booked the movie for today** (server query filtered to `air_date = today`, self-clears at midnight). Strict scope split: `streamingIconForChannel` (Netflix/Disney/Prime/YouTube, used by SeriesDetail) vs. `platformIconForChannel` (full set, used by movie surfaces) so Greek TV channels can never leak into series rendering.
- ✅ **Profile progress + hero badge redesign.** `ProgressBar` rebuilt to match the user's spec: solid colored track from left tier badge → user avatar (animated `bob` vertical 4px), dashed dots from avatar → next tier badge (greyed + grayscale), tier labels under each badge, 4 twinkling sparkles around both badges (staggered, 2.2s `twinkle` keyframe). Tier ladder now uses all 4 tiers (Verified 3 / Έμπειρος 10 / Expert 25 / Platinum 50). Hero badge under the followers row is now **dynamic per tier** via `badgeIconForSuggestions(suggestionCount)` (bug fix — was hardcoded `badge-verified`/"Verified Member" regardless of actual count). Hero badge size enlarged to 104px + leaves 140×148. **Pulse animation** on the hero badge only (3s loop, scale 1.0 → 1.2 → 1.0, `ease-in-out`). Platinum users (≥50 suggestions): celebration line ("Έχεις κάνει N προτάσεις. Είσαι από τους κορυφαίους curators...") sits directly under the hero badge; the under-rating progress section is hidden entirely (no duplicate celebration, no redundant CTA — the FAB already covers suggesting). "Νέα πρόταση" button + motivational copy removed from the progress section globally.
- ✅ **User region (structured) — migration 028 + region picker in EditProfile + soft-sort.** `users.region_id` FK added; the legacy `users.region` text column stays populated by the API at save time with the resolved name (for back-compat). Edit profile replaces the free-text "Περιοχή" input with a cascading native `<select>` picker — picks any node in the regions tree (top-level / intermediate / leaf). On the home food carousel + every venue category page (food/bars/hotels/theater/events), items whose region matches (or descends from) the viewer's saved region float to the top — pure ordering, never excludes out-of-region items. Helper: `lib/regions.ts:getRegionMatchSet(sb, regionId)`. NOTE: the personalization makes both the home page and venue category pages effectively dynamic per-request (cookies are read); the existing `revalidate = 60` is a no-op for authed viewers. Acceptable trade-off — discovery beats caching for the user's most explicit ask.
- ✅ **Notifications system — fully implemented (migration 029 + UI redesign).**
  - **4 new Postgres triggers wired** in `scripts/sql/029-notifications-fanout.sql`:
    - `suggestion_rated` — on `reviews` INSERT → notify the suggestion's author (skips self-review)
    - `new_follower` — on `follows` INSERT → notify the followee
    - `new_suggestion_from_friend` — on `suggestions` INSERT (or UPDATE to published) → fan-out to every follower
    - `suggestion_bookmarked` — on `bookmarks` INSERT → notify the suggestion author when bookmark count crosses **5/10/25/50/100** (milestone-based; no per-bookmark spam)
  - **Preference gate** — central `should_notify(user_id, category)` SQL helper reads `users.preferences.notifications.<category>` + checks the master pause flag. All triggers (including retrofitted `movie_airing` from 011 and `search_match` from 013) consult it before INSERT. Toggle off "Δραστηριότητα στις προτάσεις σου" → no `suggestion_rated` rows hit the DB at all.
  - **Settings page redesigned** — replaces the placeholder 3-section × 2-row grid with **4 explicit categories** (Activity / Friends / Discoveries / System), each carrying push + email checkboxes. Added at top:
    - **Master pause** with optional auto-resume datetime ("παύση μέχρι ...")
    - **Quiet hours** with start/end pickers (default 23:00 → 09:00, enabled)
  - **Inbox renders all new types** — `NotificationsPage.tsx`'s `renderNotification()` got branches for `suggestion_rated`, `new_follower`, `new_suggestion_from_friend`, `suggestion_bookmarked`, `search_match`. Each with appropriate thumbnail + Greek copy + deeplink.
  - **Known limitations** — email delivery isn't wired (no SMTP/Resend infra yet; the email toggle is forward-looking and persists). Quiet-hours enforcement applies to the gate (no INSERT in window) — once push delivery exists, it'll respect this automatically. No realtime — the bell badge counts on every layout render, so new notifications appear on next nav.
- ✅ **Security settings wired to real backend.** `/profile/[handle]/settings/security` is no longer a hardcoded shell — it pulls real email + Supabase identities + device history server-side and renders interactive UI. New API routes:
  - `PATCH /api/auth/password` — verifies current password (re-auth via `signInWithPassword`) then updates. Validates min-8 / uppercase / digit, blocks reusing current as new.
  - `DELETE /api/auth/identities/[provider]` — unlinks a social identity. Lockout guard: refuses to remove the last remaining auth method.
  - `POST /api/auth/signout-all` — `auth.signOut({ scope: "global" })` revokes every refresh token; client redirects to `/login`.
  - Password change modal (inline form) with live rule-checks (✓/·). Provider list now derived from `user.identities` — only shows Facebook/Google when actually linked, with the provider email under the label.
  - Device history renders from `public.devices` (currently empty in prod — table isn't auto-populated by any auth hook yet; a future login-hook can fill it without UI changes).
  - Account deactivation button intentionally shows a "not yet available — write to support" toast since the soft-delete schema doesn't exist yet (`users.is_active` not present).
- ✅ **DB-driven moments system shipped end-to-end.** Every in-app celebration / nudge (achievement modal copy + 10s timing, bookmark celebration) is now stored as rows in `moments`, editable from `/admin/moments` without a code deploy. Hardcoded `TRIGGERS` table + client-side `buildCopy` switch ladder are gone.
- ✅ **Migration 026 + 027 applied** — `moments` + `moment_events` tables with RLS, indexes, updated_at trigger; 14 seed rows port the previous hardcoded copy verbatim so day-1 behaviour is unchanged.
- ✅ **`lib/moments/`** — types, registry of 7 predicate functions (`always`, `suggestion_count_eq`/`gte`, `bookmarkers_count_gte`/`zero`, `category_bookmark_count_eq`, `category_eq`) with admin-form arg schemas, resolver with variant-group selection + priority weighted random + audit logging to `moment_events`, placeholder renderer supporting `{count}` / `{remaining}` / `{ordinal}` / `{category_list_noun}` / `{handle}` / `{first_name}` + `**bold**` markdown.
- ✅ **Consumers refactored** — `app/api/suggestions/route.ts` calls `resolveOneMoment("suggestion_published", "achievement_modal", …)`; `app/api/bookmarks/route.ts` returns the resolved moment alongside the existing context; `AchievementUnlockedModal` + `BookmarkSavedModal` render directly from the moment's copy strings with inline `<Bold>` parser. `Published.tsx` reads the achievement modal delay from `moment.display.delay_ms` (admin-editable, defaults to 10s).
- ✅ **`/admin/moments` UI** — list grouped by trigger event with hover-revealed Active/Duplicate/Delete actions, "× fires / 7d" badge from `moment_events`, edit drawer with: identity / trigger + predicate (auto-renders the right input fields per predicate via the registry schema) / copy fields with placeholder reference / display knobs (delay, auto-dismiss, dark theme, variant, badge, target) / lifecycle (priority, variant_group, valid_from/until, is_active). Live preview pane on the right re-renders on every keystroke with category-aware sample data.
- ✅ **Admin API** — `GET/POST /api/admin/moments`, `GET/PATCH/DELETE /api/admin/moments/[id]`, `GET /api/admin/moments/stats` (last-7d aggregates), `GET /api/admin/moments/registry` (schemas for the form). Sidebar entry added between Users and AI Usage.
- ✅ **HOOKS.md backfilled** with current state — implementation-status table at the top + per-section ✅ LIVE / ❌ Not built tags + DB-driven §9 flipped to SHIPPED with the remaining hardcoded surfaces called out (duplicate hook, toasts, notifications copy, profile progress bar).

**Previous state — session 20 finished:**

- ✅ **Onboarding flow shipped at `/onboarding`** (4 screens). Hook → Interests → Reward → People → finish. Light theme throughout, no header/bottom-nav/FAB. Gated server-side from the (main) layout when `preferences.onboarded_at` is missing. Both new signups AND existing users hit it. Screens (`components/onboarding/`):
  - **HookScreen** — animated AI demo (looping `Mr. Robot` typing → LISTENING → LOCKED), social proof line, `Ξεκίνα →` + `Παράλειψη`.
  - **InterestsScreen** — 3×3 emoji-tile grid with live counter ("3 επιλεγμένα ✓"), `≥2 picks` to advance, **conversational expansion** (`✨ Ή πες μου με δικά σου λόγια →` link reveals inline coral textarea; Gemini + heuristic fallback parse → matching cells animate-pop-in).
  - **RewardScreen** — per-category horizontal carousels of items the user hasn't suggested, each with a coral `"Επειδή..."` reasoning subtitle (3 tiers: top-rated / star-rated / interest-based).
  - **PeopleScreen** — two sections: `tight` (specialists in user's categories, top 3 by matched count) + `broad` (rest of top contributors). Each card tappable → opens `ProfilePopup`. Canonical `<FollowButton>` (controllable now) wired through `useFollow` so follows actually persist.
  - **OnboardingSyncing** — 3-step checklist with live numbers from `/api/onboarding/numbers` (`"Διαβάσαμε 1.165 προτάσεις · Φιλτράραμε 1 με ★ 4+ · Συνδέουμε με 189 χρήστες σαν εσένα"`). Animation timing is fixed; numbers hot-swap in as fetch resolves.
- ✅ **Onboarding APIs** (`app/api/onboarding/`): `complete` (POST — saves interests + stamps `preferences.onboarded_at` only on `final` calls), `reward-feed` (excludes user's own items, 2-tier fallback), `suggested-users` (returns `{ tight, broad }` with `taste` line + excludes already-followed users), `numbers` (live counts), `parse-interests` (Gemini-first with deterministic Greek+English heuristic fallback that handles accent folding).
- ✅ **`extractInterests` added to AIService abstraction.** Gemini implementation + cache-and-log forwarding for optional methods (`extractInterests`, `getSemanticQualityTip`, `conversationalSearchFallback`). Mock + heuristic-only environments degrade gracefully.
- ✅ **Bug fix: `FollowButton` now controllable.** Was uncontrolled — `following` prop only seeded mount state. Added `useEffect(() => setActive(following), [following])` so external state changes flow in. Existing uncontrolled consumers unaffected because they never mutate the prop.
- ✅ **Bug fix: onboarding `AuthProvider` wrap.** `/onboarding` lives outside the (main) layout, so without an explicit `AuthProvider` wrapping the onboarding layout, `useGuestGuard` saw a null user → fired the sign-in modal on follow tap. Fixed.
- ✅ **Bug fix: `onboarded_at` only stamped on final call.** Original code stamped on the step 2 → 3 transition, which meant any re-render hitting the server entry on `/onboarding` would redirect users out of the flow mid-way. New contract: `final: true` flag controls stamping. Intermediate writes save interests only.
- ✅ **Badge system overhaul — platform-wide.** Root cause: `users.level` is `1` for every MySQL-migrated user, so the level-based `getBadge` painted everyone "Verified". Fix:
  - New `badgeIconForSuggestions(count)` + `badgeLabelForSuggestions(count)` in `lib/icons.ts` — canonical thresholds `3 / 10 / 25 / 50` (Verified / Gold / Expert / Platinum). Returns null below 3.
  - `<UserBadge>` accepts `suggestionCount?: number` (preferred input), falls back to legacy `level` for old callers.
  - `<UserAvatarWithPopup>` now derives the popup badge from `suggestion_count` — cascades to all 9 detail pages + onboarding popup.
  - All 9 detail components: local `getBadge(level)` replaced with `getBadge(suggestionCount)` that wraps the central helper. Every call site switched from `r.user.level` to `r.user.suggestion_count`.
  - Detail-page TS type for `suggestions[].user` + `reviews[].user` extended with `suggestion_count`. Reviews SELECT extended to fetch the column.
  - `/[category]/[id]/reviews` subpage uses central helper.
  - Admin `UsersTable` uses suggestion_count with one extra `NEW` tier (count < 3) so the moderation column never has a blank label.
  - Live verification: top suggesters now correctly show Platinum (was all "Verified"); `foodcouple_gr` (47 suggestions) shows Expert; etc.
- ✅ **Achievement celebration modal — matches Figma screens 1-6.** Triggers from `/api/suggestions` POST at counts `1 / 2 / 3 / 7 / 9 / 10 / 22 / 24 / 25 / 47 / 49 / 50` (per-count `TRIGGERS` table, server-side). Two variants:
  - **progress** — title ladder ("Μόλις έκανες την πρώτη σου πρόταση!" / "Καταπληκτική αρχή!" / "Τα πας περίφημα!" / "Είσαι πολύ κοντά!"), progress dots `[start..target]` with ✓/dashed-numbered states (formula `dotCount = max(3, remaining + 1)`), greyed badge under laurels with subtle sparkles.
  - **tier_unlock** — "Τα κατάφερες!" + ordinal subtitle, colored badge (110px) with 4 staggered pop-in sparkles, tier-colored two-line label (Verified emerald / Έμπειρος blue / Expert violet / Platinum slate).
  - Mirrors `BookmarkSavedModal` architecture (portal, 3-phase mount, body-scroll lock, **no auto-dismiss**).
  - Layered on top of Published screen (opens **10s after mount** so the ✓ moment lands and the user reads their own publish confirmation before the celebration takes over — chosen 2026-05-12, resolving session 20's open question).
  - Showcase entry at `/admin/showcase` → Submission/AI tab with **10 interactive buttons** so design QA doesn't require resetting `suggestion_count`.

**Previous state — session 19 finished (still all current):**

- ✅ **Bookmark orbit microinteraction — final tune.** Hero cover clones and flies a quadratic Bezier from its position into the bookmark IconButton at the top-right. **Shrinks continuously to ~1px at the icon centre** (`END_PX = 1` in `hooks/useBookmarkOrbit.ts`) — the clone collapses into a point rather than landing icon-sized. Bounce on landing is now the new `bookmark-bounce` animation (520ms, `1.0 → 1.35 → 0.88 → 1.08 → 1.0` with `ease-pop`), applied to the **whole 36px IconButton circle** (not just the inner icon). After the bounce, a **600ms beat** is held before the celebration modal slides up — gives the spring time to settle visually. Unbookmark stays instant.
- ✅ **Profile screen — badge + stats + cards redesign.** `UserProfile.tsx`:
  - Badge area now uses the design-system `badge-verified` hexagon flanked by the two leaf-wreath SVGs (`profile-leaves-left` + `profile-leaves-right`). Hand-drawn dot-decoration columns deleted.
  - Stats row icons swapped to the design SVGs: `profile-suggestions` (pencil) and `profile-reviews-star`.
  - Two new extracted components: **`ProfileScoreCard`** ("Συνολική Βαθμολογία" — score + gold leaves + "Δες και τις N τις βαθμολογίες") and **`ProfileVotesCard`** ("Θετικές ψήφοι" — sum of vote_up + thumbs-up + "Δες όλες τις αξιολογήσεις"). Both have an `ⓘ` info icon next to the title with an `onInfo` hook for future tooltips.
  - 6 new SVGs added to `public/icons/profile/` + registered in `lib/icons.ts`.
  - `app/(main)/profile/[handle]/page.tsx` now sums `reviews.vote_up` server-side and passes `voteUpCount` into the profile.
  - Dead inline helpers removed: `PencilIcon`, `FlameIcon`, `ThumbUpSmall`, `ThumbUpBigIcon`, `StarIcon`, `RatingBarRow`.
  - Both new cards added to `/admin/showcase` → Profile tab (3 variants each: healthy / empty / extreme).
- ✅ **Guest action gating across all 9 detail pages.** New `useGuestGuard` hook + `GuestPromptModal` (portal, slide-up). Wired on bookmark, rating-save, FollowButton (gates itself so every caller inherits). Submission flow is guest-gated at the FAB level.
- ✅ **Bookmarks v2 — wishlist/done two-state model.**
  - **Migration 023** adds `bookmarks.status` enum (`'wishlist' | 'done'`, default `'wishlist'`) + CHECK constraint + index on (user_id, status).
  - **Migration 024** adds `get_leaderboard(p_period, p_category, p_viewer)` RPC with fast unfiltered path + filtered aggregate path.
  - **Migration 025** adds `GRANT SELECT/INSERT/UPDATE/DELETE` on `bookmarks` + missing `bookmarks_own_update` RLS policy — root cause of the earlier "permission denied for table bookmarks" 500s.
  - **`BookmarkStatusChips`** below the hero on every detail page — always visible, mutually exclusive, heart icon on active wishlist, check icon on active done, per-category labels via `lib/bookmarks/labels.ts`.
  - **`BookmarkSavedModal`** — celebration card on first save with avatar stack of other bookmarkers + category-specific copy + 5s auto-dismiss. Replaces the old toast.
  - `hooks/useBookmark.ts` returns `{ status, bookmarked, busy, toggle, setStatus }` + action results carry `{ ok, status, context }`. API POST/PATCH fail-soft when status column missing (42703).
  - `useReview` `onSaved` callback now auto-flips bookmark wishlist → done when a user rates an item.
- ✅ **Leaderboard wired to real data.** `/api/leaderboard` reads the new RPC; viewer row gets coral fill + "Εσύ" pill. Provided SVGs for first/second/third + trophy added to `public/icons/leaderboard/`.

**Previous state — sessions 18 (parts 1 + 2):**

- ✅ **Session 18 part 1** — Admin write revalidation + ISR + `<ExpandableText>` sweep. Admin POST/PATCH routes call `revalidatePath` for affected detail pages so edits show up immediately on next nav. `<ExpandableText>` primitive built and rolled out across detail-page plot/description sections.
- ✅ **Session 18 part 2** — Avatar upload (Supabase Storage `avatars/` bucket + presigned URL flow), full personalization settings page (`/profile/[handle]/settings/personalization` — reuses `<InterestsSelector>` from onboarding), notifications settings page (per-type push/email toggles).
- ✅ **AI provider switched to Gemini Flash-Lite** through the same `AIService` abstraction. Search intent extraction + submission match + quality coach + conversational fallback all routed through Gemini. AI cache + usage log tables + cost dashboard at `/admin/ai-usage`. Phase A is effectively shipped — see PROGRESS §1 sessions 18-19 entries.

**Previous state — session 17 finished:**

- ✅ **Search v2 — structured-filter engine.** Gemini extraction extended with `genre`, `channel`, `status`, `period`, `duration_min/max`, `person` alongside the existing `type` + `location`. `app/api/search/route.ts` now composes these into per-category Postgres queries (`fetchByStructuredFilters`). 4 of 7 example queries work end-to-end (κωμωδίες netflix · παιδικά κάτω από 90 λεπτά · ολοκληρωμένες σειρές · sebastian fitzek). The other 3 are confirmed **data gaps**, not code: no theater plays carry "Μπέζος" actor, no events have `event_type` matching "συναυλία", no food items have `cuisine="Ιταλική"`. See §3 Phase A for next steps.
- ✅ **Multi-language title search.** Migration 020 adds `items.original_title` + generated `original_title_normalized` (Greek accent-folded) + index. Admin field added in `SuggestionEditor` for movies/series/books. Search `app/api/search/route.ts` ilikes both columns so "Lucifer" finds "Λούσιφερ" and vice versa.
- ✅ **Regions admin** — `/admin/content/regions` page with **N-level tree CRUD**. New `<RegionsManager>` component with inline rename, add-child, drag-to-reparent (via select), cycle prevention, recursive descendants. Migration 001 patched idempotent (`DROP POLICY IF EXISTS` before `CREATE POLICY`).
- ✅ **3-level region hierarchy** wired end-to-end. `lib/regions.ts` returns `descendantsById` map; `CategoryPageShell.matchesFilter` expands selected region IDs to all descendants — picking "Βόρεια Προάστια" matches items tagged "Χαλάνδρι" beneath it. SuggestionEditor's `RegionSelect` refactored to N cascading dropdowns (Region → Area → Sub-area …) — appears as deep as the tree goes per region. Search's `resolveLocation` rewritten to require ALL words of the region name to appear in query (fixed "Νότια Προάστια" winning a "βόρεια προάστια" search).
- ✅ **Bottom-sheet region picker shows leaves only.** Intermediate prefecture-style regions (Βόρεια Προάστια, Ηράκλειο prefecture) are hidden from the picker — user picks the leaf directly (Χαλάνδρι, Ελούντα, Κολωνάκι). Smart search still understands the intermediate level via Gemini taxonomy injection.
- ✅ **Food taxonomy flipped: subcategory tabs = TYPE not cuisine.** Migration 021 + code change. Food page tabs now show ταβέρνα · μεζεδοπωλείο · ψαροταβέρνα · εστιατόριο · …; cuisine demoted to a bottom-sheet multi-select filter. Greek browsing intent leads with establishment type, not cuisine — per user UX decision. CLAUDE.md §6 + §16 updated.
- ✅ **Admin Suggestion Editor — food taxonomy fix.** Subcategory dropdown hidden for food category; new dedicated Type + Cuisine `<select>` controls in `FoodExtraFields`, sourced from `extra_field_options` via the existing `getOpts` helper with `dedupePreserveCurrent` safety net. `original_title` admin input added for movies/series/books. Save button gated only on `saving` (was on `dirty` which never tracked extension-form state — now any edit can be saved).
- ✅ **Admin UI revamp** — new shared primitives at `components/admin/ui/`: `AdminPageHeader`, `AdminPanel`, `AdminRow` (with hover-revealed actions + `AdminActionButton` / `AdminActionSelect`), `AdminEmpty`. `RegionsManager` is the first showcase of the new rhythm — single typographic anchor, hover-revealed controls, no always-visible clutter. Pattern is ready to roll across other admin pages.
- ✅ **`tokenMatches` — Greek-inflection-aware fuzzy match.** Used in venue refinement filter + subcategory lookup. Handles "ιταλικό" ↔ "ιταλική", "συναυλιες" ↔ "συναυλια", "παιδικά" → "Animation" (via alias map). Asymmetric: tolerates inflection variants but does NOT broaden longer queries via shorter substrings ("μπακαλοταβερνα" no longer falsely matches "ταβερνα").
- ✅ **Smart-related results in search.** When a title match anchors a query (e.g. "Μπακαλοταβέρνα"), the venue refinement now appends contextually-similar items from the candidate pool: same type AND same address area (Tier A) — with a Tier B fallback to "same type anywhere" when Tier A is empty.
- ✅ **Detail-page sweep with `DetailHeaderActions`.** All 9 detail components (Food, Bars, Hotels, Movies, Series, Books, Recipes, Theater, Events) now use a shared `<DetailHeaderActions>` (built on the `IconButton` primitive) instead of inline bookmark + share buttons. ~120 lines of duplicate markup gone. Bookmark icon scale-pops on every toggle.
- ✅ **Suggester avatar wired everywhere.** `lib/collections.ts:HydratedItem` carries `suggestions[].users` with the full profile. `LandscapeItem.suggester` populated by `toLandscapeItem` + `fetchFoodLandscape` + `fetchRecipes` + the category-page `mapItem`. `CarouselLandscape` and `CategoryCard.LandscapeCard` render `<UserAvatarWithPopup>` when present (falls back to initials in a colored ring otherwise). Tapping the avatar opens `ProfilePopup` without navigating to the item.
- ✅ **ProfilePopup smooth.** Rendered via portal to `document.body` (cuts the React parent chain so events stay inside). 3-phase mount: `mounted` (DOM presence) + `visible` (transform target), with `requestAnimationFrame` between to trigger the transition. 320ms `translateY(100%) ↔ 0` slide, 200ms opacity. Close button + backdrop click both work cleanly. Avatar size 120px, badge icon swapped to the canonical `/icons/badges/*.svg` set.
- ✅ **Motion foundations — Sprint 1.** `tailwindcss-animate` installed. `globals.css` carries `prefers-reduced-motion` global override (instant resolution for vestibular accessibility). Named easings in `tailwind.config.ts`: `ease-spring`, `ease-soft`, `ease-pop`.
- ✅ **Motion Sprint 1 effects shipped.** All overlays (`Modal`, `FilterBottomSheet`, `FullScreenOverlay`, `ProfilePopup`) animate cleanly. Cards have `active:scale-[0.97]` tap feedback (CategoryCard / CarouselLandscape / CarouselPortrait / RowCard / search ResultCard). `<FadeImage>` primitive for image opacity-on-load. Bookmark scale-pops. `SubCategoryTabs` has a measured **sliding coral underline**; `BottomNav` has a top-edge sliding indicator.
- ✅ **Motion Sprint 2 effects shipped.** Star rating: cascading scale-pop with 50ms left-to-right stagger. Follow button: icon + label re-mount with `animate-pop-in` on state flip. Submission MATCH LOCKED badge: `animate-in zoom-in-95` + ✓ Κλειδωμένο pill slides in from the right 150ms later. Proteino Intelligence panel: slide-down + fade-in on first activation. Search ResultCard: 40ms stagger slide-in-from-bottom + fade-in (capped at 10 items).
- ✅ **Motion Sprint 3 effects shipped.** FAB scale-in entrance (re-fires every time overlay closes). Toast slide-in from edge. Input focus uses explicit 200ms ease-soft border-color transition. `<ExpandableText>` primitive built (max-height animation) — available for plot show-more retrofits. Logo coral dot: 4s subtle opacity pulse, paused on hover. Map pin tap: classList-toggled `pin-pop` animation (scale 1 → 1.18 → 1, ease-pop). "Search this area" pill: slide-in from top.
- ⚠ **Map ↔ list transition reverted to instant swap.** Multiple attempts at smooth reveals (cross-fade, slide-up, layered drop-down) each introduced subtle breakage — most painfully the transform on the page wrapper made `FilterBottomSheet`'s `fixed` position become wrapper-relative (CSS containing-block rule), causing the filter to appear half-open on /food load. Currently uses the original instant `if (showMap) … else …` branch swap. **Open question — see §3 Phase D**: build a proper "drop-down reveal" (map descends from above, list pushed down) that requires both views simultaneously mounted + an outer overflow:hidden wrapper. Needs structural refactor of `CategoryMapView` (currently uses hardcoded viewport-relative height).

**Operational blockers (require user action):**

- 🛑 **Gemini paid tier not enabled** — free tier is 20 requests/day on `gemini-2.5-flash-lite`. Today's testing burned through it. Search returns `categories=[]` and falls through to popular when quota is exhausted. Enable billing at https://aistudio.google.com → API key settings. At our prompt size (~700 tokens/call), paid cost is ~$0.0001/search.
- ✅ **Migrations 019-025 all applied** (verified 2026-05-12 via `scripts/check-migrations.mjs` + `pg_policies` query for 025). `ai_query_cache` already serving 77 hits, `ai_usage_log` carrying 111 rows, `bookmarks.status` live, food filter flip live, `get_leaderboard` RPC callable, `users.preferences` live, `items.original_title` live, `bookmarks_own_update` policy present.
- 🛑 **Data gaps for the 3 unmatched search examples** — admin needs to populate:
  - Theater: `item_theater.actors` jsonb with cast (so "θέατρο μπέζος" works)
  - Events: set `event_type = "Συναυλία"` on concert items + valid `dates` jsonb (so "συναυλίες καλοκαίρι αττική" works)
  - Food: set `cuisine = "Ιταλική"` on Italian restaurants + tag them to a Βόρεια Προάστια descendant region (so "ιταλικό βόρεια προάστια" works)

**Previous state — session 16 finished:**

- ✅ **Design system showcase is complete.** `/admin/showcase` now documents every reusable component in the codebase — ~110 components across 16 tabs. The single 1582-line monolith from session 15 has been split into per-tab files under `app/admin/showcase/tabs/` (16 files, 100-700 lines each). Default tab: Primitives. Full tab list + responsibilities in CLAUDE.md §26.
- ✅ **3 batches shipped this session:**
  - **Batch 1 — Primitives tab** (15 atoms): Button · Input · Textarea · Card · Badge · Avatar · AvatarImage · StarRating · IconButton · FilterChip · SortPills · Spinner · StatCard · FollowButton · WantToSeeButton · Skeleton (with helpers).
  - **Batch 2 — 4 new tabs** (~30 components): Profile (9) · Category (7) · Submission/AI (3) · Recommendation (5). Plus 7 detail extras added to the existing Detail modules tab (ReviewCardFooter · OwnSuggestionActions · UserAvatarWithPopup · DeliverySelector · PlatformSelector · ItemGalleryViewer · ExtraRatingsRow).
  - **Batch 3 — 3 new tabs** (~20 components): Home (12 — including 3 scaled-down 733px guest heroes) · Auth (5 atoms) · Layout (5 chrome + ReportLink, mostly link-only since they're fixed-position).
- ✅ **`npx tsc --noEmit` → 0 errors** across all three batches. The showcase is now a typecheck canary — any breaking refactor of a shared component fails CI before it ships.
- ✅ **Link-only fallback pattern documented** for components that need real server context (Header / BottomNav / FullScreenOverlay / CollectionRenderer / LocationPicker / ReportFlowModal / EditSuggestionModal). Description + "see live" link beats faking a render.

**Previous state — session 15 finished (still all current):**

- ✅ **Reviews architecture rewritten cleanly.** Migration 016 created the new `reviews` table (rating mandatory + reflection optional, one row per (user, item), UNIQUE constraint). Migration 017 created `review_votes` with sync trigger (mirror of comment_votes). Legacy `ratings` table wiped + `comments` table left untouched as archive — no `is_legacy` flag, clean break. All `items.rating_count` + `avg_rating` reset to 0 globally.
- ✅ **Detail-page server fetch sources from `reviews` table** instead of suggestions.slice(1) + ratings union. Histogram, avg, count all computed fresh per request from non-hidden reviews.
- ✅ **Per-viewer vote state** fetched server-side (1 query, in-clause on review_ids) so thumb buttons render in the active state on first paint — no client-side flash.
- ✅ **9 detail components migrated**: useRating → useReview, suggestions.slice(1) → data.reviews, textarea added below stars (appears after 1st click), CommentComposer + CommentThread + ExtraRatingsRow removed entirely.
- ✅ **Vote stack**: `POST /api/reviews/[id]/vote` with self-vote prevention. `useReviewVote` hook with optimistic counter delta + revert on error. ReviewCardFooter now actually clickable, ενεργό thumb gets coral fill.
- ✅ **`/reviews` subpage** (`app/(main)/[category]/[id]/reviews/page.tsx`): full list of reviews using `<ReviewCard variant="list">`. Empty state CTA "Πρόσθεσε αξιολόγηση" → back to detail. Filters out the original suggester (suggestions.slice(1) logic, since suggester ≠ review).
- ✅ **`<AllReviewsButton>`** — outlined "Εμφάνιση X αξιολογήσεις" CTA below the carousel on every detail page → `/reviews`.
- ✅ **`<ReviewCard>`** shared component (carousel + list variants) with truncate at 4 lines + Περισσότερα expand. Hides the text block when reflection is empty (rating-only review).
- ✅ **FK ambiguity sweep** (root-cause fix from migration 015): added disambiguators (`users!suggestions_user_id_fkey` / `users!comments_user_id_fkey`) in 12 broken queries — fixed empty category pages, empty `/admin/reviews`, missing featured-suggester block, and empty admin search. Same bug class won't bite again.
- ✅ **K2 aggregate gracefully retired**: detail page no longer falls back to `items.rating_count = 67` social proof. Going forward, the headline reflects only real reviews.
- ✅ **TMDB image host wired** in `next.config.mjs` (anora/dune were 500ing).

**Design system shipped at `/admin/showcase`** — 8 tabs · 27+ real components:

| Tab | Components |
|---|---|
| Foundations | UserBadge · OutlinedPill · Icon · AllReviewsButton |
| Cards | ReviewCard · SuggestionCardPortrait · SuggestionCardLandscape · CarouselSection · RatingBox · SuggesterCard · BookmarkIcon |
| Detail modules | RatingCard · BookingAvailabilityCard · ActivityCard · PublicBookAd · AuthorCard · AmenitiesRow · NutritionRow · DurationCard · PlatformLinksCard |
| Modal | Modal · ConfirmDeleteDialog · DeleteSuccessDialog · ReportFlowModal (link) · EditSuggestionModal (link) |
| Toasts | Toast (new component) · useToast() hook |
| Notifications | NotificationCard (extracted from NotificationsPage — 6 type variants) |
| Admin | IconToggleGrid · PropertyTypeSelector · ImageUploader · ImageGallery (+ LocationPicker link) |
| Patterns | Empty state, Skeleton (still placeholders) |

Most reusables are **brand new** (extracted from inline detail-component code). Inline implementations replaced by the new components in HotelDetail, RecipeDetail, FoodDetail, TheaterDetail, BookDetail.

**Decision locked but not yet built (Phase A — still pending):**
- Anthropic Claude Haiku 4.5 integration in **Search + Submission**. Architecture documented in AI.md §12. Cost projections: ~$3.5K/mo at 100K DAU + 3 searches + 30K submissions, ~3% of projected revenue. Awaiting `ANTHROPIC_API_KEY` (user buying credits as Individual plan).

**Known follow-ups from session 15 (small):**
- LocationPicker / AddressMapSection still inline in SuggestionEditor (~174 lines). Extract to standalone reusable in a future round if you want it interactive in the showcase.
- `CategoryCard` (used in /movies, /food etc lists) has NOT been migrated to use the new SuggestionCardPortrait/Landscape — separate sweep when ready.
- Empty state + Skeleton primitives still placeholders in showcase Patterns tab. Both used inline in 5+ places — would benefit from extraction.
- A2 platform logos: still only wired in SeriesDetail's "ΔΙΚΤΥΟ" InfoCell. MovieDetail has no spot.
- Recipe suggester not rendering for kotopoulo recipe — still pending screenshot from user.

**Two future systems mapped but not started (Phases B + C):**
- Phase B: pgvector recommendations + nightly batch (5 days)
- Phase C: Notification dispatcher with hook-driven loops (6 days)

See §3 for the full ordered roadmap.

---

## 1. COMPLETED

### Session 22 — Admin-controlled page layouts + related sections + landscape list ✅ (2026-05-13)

The "give the admin the keys" session. Page composition, both for category pages and the home page, is no longer hardcoded — `page_sections` is the table of truth and `/admin/layout` is the surface for editing it. Detail pages get a parallel mechanism for related-item carousels via `related_sections_config`.

**Layout system (migrations 032 + 033)**

Three architectural layers — DB, lib, UI.

- **`page_sections` table** (migration 032 renames `collection_placements` and extends it). New columns: `section_type` (collection / widget / divider), `widget_key`, `config jsonb`, `audience` (all / registered / guest), `valid_from` / `valid_until` (per-section lifecycle), `is_active`. The old UNIQUE constraint dropped because widgets share `(NULL collection_id)`; singleton enforcement moved to the application layer. RLS rewritten to handle the new shape — widgets / dividers visible if active, collections visible if their referenced row is published. Seed populates every (context, category, audience) bucket with widgets that reproduce the previous hardcoded layout exactly.
- **`lib/layout/`** — types (`PageSectionRow`, `RenderedSection` discriminated union, `WidgetSpec`, `ConfigField`), widget registry (22 widgets across category + home with compatibility / fixed / singleton metadata + admin-form `configSchema`), server-side resolver (single query + parallel collection hydration + audience filter + lifecycle filter + optional `includeInactive`), and a per-page render bridge for home (`home-bridge.tsx`) because Next.js disallows extra exports from `page.tsx`. The category bridge lives inside `CategoryPageShell` since the shell already owns all the relevant state.
- **`CategoryPageShell` + `app/(main)/page.tsx`** both compute `layoutSections` server-side and map via a `renderSection` switch. Legacy hardcoded JSX retained as fallback when the resolver returns nothing — guarantees the page never blanks out during a misconfigured migration. Fixed widgets (filter_row, items_list, footer_mobile, welcome_header, sub_category_tabs) can be reordered but never deleted; the application layer enforces this on the DELETE API.
- **Migration 033** completes what 032 missed for home: splits `movies_tonight` from audience='all' (which collided with the registered ordering — current JSX renders it right after Greeting at order 5, but guest needs it after CategoryTiles at order 40) into audience-specific rows, and seeds the 5 fallback carousels per audience (Ταινίες / Νέες Συνταγές or Δημοφιλή Γλυκά / Δημοφιλή Μαγαζιά / Ολοκληρωμένες Σειρές / Top Βιβλία) so day-1 rendering matches the previous hardcoded JSX exactly.

**`/admin/layout` — the surface**

Three columns: page picker (Αρχική + 9 categories) on the left, dnd-kit sortable section stack in the middle, audience selector + phone-bezel iframe preview pointing at `/preview/...` on the right. Each section row has drag handle + active toggle + per-row audience inline-select + edit pencil + delete (disabled with 🔒 for fixed widgets). `+ Πρόσθεσε section` opens a picker modal with Widget tab (filtered via `compatibleWidgets()`, singletons-already-placed grayed out) + Collection tab (search existing + create-new link). Pencil opens a side drawer that auto-renders fields from the widget's `configSchema` (text / textarea / number / toggle / select / category / item-source) plus audience + lifecycle controls. All writes call `revalidatePath` for the affected page.

**`/preview/category/[slug]` + `/preview/home`** — iframe-safe routes outside `app/(main)/` so they don't inherit the global chrome. `force-dynamic`, audience override via query param, lightweight per-category fetches (15 items each, no extension tables — enough for layout review). Same renderHomeSection / category-shell bridges as production, so admin's iframe is byte-identical to what users see.

**`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** added (~30 KB gzipped, touch-aware, accessible).

**Category list always landscape**

The under-filter list on movies/series/books used to render `RowCard` (small poster left + info right) while every other category used `LandscapeCard`. Now every category list uses `LandscapeCard` — full-width cover on top + title + meta below. Carousels keep the portrait/landscape branch via `isPortraitCategory` (movies/series/books → portrait posters; rest → landscape) so the visual rhythm of "carousel = cinema-style posters for narrative categories" is preserved.

**Admin-configurable detail-page related sections (migration 034)**

Every detail page now renders a `<RelatedSections>` block below the reviews carousel, populated from admin rules in the new `related_sections_config` table. Each row defines `(category, field, title_template, min_items, item_limit, is_active)`. The fetcher reads the current item's value for the configured field — supports scalar columns (`writer`, `director`), array index (`performers[0]`), or array-of-object key (`actors[0].name`) — and queries published siblings via PostgREST jsonb operators. Sections auto-hide when the value is null OR fewer than `min_items` siblings exist. Title interpolates `{value}` so a single Greek template renders correctly per item.

Seeded with 8 default rules: books → writer · movies → director, lead actor · series → director, lead actor · theater → director, writer · events → performer. Food / bars / hotels / recipes start empty — admin can add rules via the preset picker (cuisine, level, origin, etc.).

`/admin/related-sections` is a single grouped page per category with inline title/min/max editing, active toggle, delete, and a preset-driven "Πρόσθεσε rule" form. Sidebar entry between Layout and Moments.

The hardcoded "Από {director}" carousel in `MovieDetail` was deleted — now driven by the same generic system (the `director` rule in the seed produces the same carousel; the `actors[0].name` rule adds a second one for the lead actor).

### Session 20 — Onboarding + achievement celebration + badge overhaul ✅ (2026-05-12)

The "make it feel alive" session. Three tightly-related shipments: a real onboarding flow with conversational AI, a 12-trigger achievement celebration system designed to match the user's Figma mocks, and a platform-wide badge correction so every tier finally reflects real activity instead of stuck-at-1 `users.level`.

**Onboarding flow at `/onboarding` (4 screens)**

The give-before-you-ask spec from CLAUDE.md §7, finally built. Light theme throughout, no header / bottom-nav / FAB — the flow owns the viewport. Server-side gate in `app/(main)/layout.tsx` redirects logged-in users without `preferences.onboarded_at` to `/onboarding`. Both new signups and existing migrated users go through it on next login.

- **HookScreen** — animated 4-phase AI demo (typing → LISTENING → LOCKED → reset). Uses the same `ProteínoIntelligence` panel grammar as the live submission flow so the user recognises it the first time they hit the FAB. `Ξεκίνα →` advances; `Παράλειψη` stamps `onboarded_at` so we never nag again.
- **InterestsScreen** — 3×3 emoji grid, ≥2 picks required, live counter ("3 επιλεγμένα ✓"). Below the counter: discoverable coral pill `✨ Ή πες μου με δικά σου λόγια →` that expands an inline coral textarea on the same screen (no new step, no modal). 700ms debounced parse → `/api/onboarding/parse-interests` → matching grid cells animate-pop-in. Mode indicator at the bottom: `Διαβάζω…` / `Διάβασα: Ταινίες · Βιβλία · Θέατρο` / `Proteíno Intelligence`. Two-tier parsing: Gemini-first via `extractInterests` on the `AIService` abstraction (added this session); deterministic Greek+English keyword matcher fallback handles accent folding via `stripDiacritics`.
- **RewardScreen** — per-category horizontal carousels of the platform's top items in the user's picked categories, with two important rules: (1) excludes items the user has already suggested (returning users wouldn't be impressed by "your top picks: things you yourself added"), (2) two-tier query — rated-with-cover preferred, cover-only fallback when a category is sparse. Each card has a coral `"Επειδή..."` reasoning subtitle: "Top rated από την κοινότητα" (rating ≥ 4.5 + ≥ 3 raters), "Με ★ X.X · N ψήφους" (rating ≥ 4.0), or "Επειδή επέλεξες σινεμά" (interest fallback). 128×192px posters.
- **PeopleScreen** — two sections returned by `/api/onboarding/suggested-users`:
  - **tight** — top 3 specialists in the user's picked categories by `matched` count (suggestions in scope). Section heading: "ΜΕ ΒΑΣΗ ΤΑ ΕΝΔΙΑΦΕΡΟΝΤΑ ΣΟΥ".
  - **broad** — top 6 general contributors who didn't make the specialist cut. Heading: "ΚΑΙ ΑΛΛΟΙ ΑΠΟ ΤΗΝ ΚΟΙΝΟΤΗΤΑ".
  - Each user has a `taste` line computed server-side from their suggestion category breakdown ("78 βιβλία · 12 ταινίες"). Tapping the avatar/name opens the canonical `ProfilePopup` (portal, body-scroll lock, full stats). The follow CTA below uses the design-system `<FollowButton>` wired through `useFollow` so follows actually persist.
  - Both lists exclude the viewer + anyone the viewer already follows.
- **OnboardingSyncing** — 3-step checklist with live numbers from `/api/onboarding/numbers`. Step labels use `{N}` placeholders: "Διαβάσαμε **1.165** προτάσεις στις κατηγορίες σου · Φιλτράραμε **1** με ★ 4+ για σένα · Συνδέουμε σε με **189** χρήστες σαν εσένα". Step durations are fixed; numbers fetch races the animation and hot-swaps in on resolve. Light theme to match the rest of the flow.

**Important architectural note: `onboarded_at` only stamps on `final` calls.** Original implementation stamped it on the step 2 → 3 transition, which meant any RSC re-render touching `/onboarding`'s server entry (link prefetch, hot-reload, router.refresh anywhere) would re-evaluate the gate, see the stamp, and `redirect("/")` — kicking the user out of the flow before they reached step 4. Fixed: the `/api/onboarding/complete` POST has a `final: boolean` flag. Intermediate writes (step 2 → 3) save interests only; finishing (people → home) or skipping from hook stamps `onboarded_at`. Robust against re-renders mid-flow.

**Bug fixes (onboarding):**
- `FollowButton` was uncontrolled — `following` prop only seeded mount state. Added `useEffect(() => setActive(following), [following])` so external state changes flow in. Existing uncontrolled consumers unaffected because they never mutate the prop. Critical for onboarding's PeopleScreen where each card drives its own `useFollow`.
- `/onboarding` lives outside the `(main)` layout, so the auth store stayed empty for client hooks (`useGuestGuard`, `useFollow`). Tapping Follow fired the sign-in modal even though the user was authed. Fixed by wrapping the onboarding layout with `AuthProvider`.
- Reward feed was showing items the user had already suggested. Added `ownIds` exclusion to both query tiers.

**Achievement celebration modal — matches Figma screens 1-6**

The user provided 6 mock screens (counts 1, 2, 3, 7, 9, 10) for the milestone celebration. Built to match them pixel-for-pixel; extrapolated the same `[T-3, T-1, T]` pattern for Expert (22/24/25) and Platinum (47/49/50).

- **Server** (`/api/suggestions`) — replaced threshold-crossing logic with a per-count `TRIGGERS` table. 12 trigger counts: `1, 2, 3, 7, 9, 10, 22, 24, 25, 47, 49, 50`. Payload reduced to `{ variant: "progress" | "tier_unlock", count, target, badge }` — minimal by design, all copy lives client-side so wording can iterate without API churn.
- **Modal** (`components/submission/AchievementUnlockedModal.tsx`) — mirrors `BookmarkSavedModal` architecture (portal-mounted to body, 3-phase mount, body-scroll lock, X + backdrop close). **No auto-dismiss** — achievements are intentional pauses.
- **Progress variant** (screens 1, 2, 4, 5):
  - Title ladder driven by count + target + remaining: `"Μόλις έκανες την πρώτη σου πρόταση!"` (count=1) → `"Καταπληκτική αρχή!"` (target=3, rem=1) → `"Τα πας περίφημα!"` (target≥10, rem>1) → `"Είσαι πολύ κοντά!"` (target≥10, rem=1).
  - Progress dots formula: `dotCount = max(3, remaining + 1)`, dots span `[target - dotCount + 1 .. target]`. Position `n` is `done` if `n ≤ count` else `todo` (rendered as dashed circle with the number inside).
  - Greyed badge (filter: grayscale + opacity-50) under the laurel SVGs (`profile-leaves-left/right` from session 19 at 30% opacity) with subtle slate-300 sparkles.
- **Tier-unlock variant** (screens 3, 6):
  - `"Τα κατάφερες!"` + ordinal subtitle (`"Το πρώτο επίτευγμα είναι δικό σου"` / `"Απέκτησες και δεύτερο επίτευγμα"`).
  - Colored badge at 110px with the tier color, 4 staggered pop-in sparkles, tier-colored two-line label.
  - Tier colors: Verified `#1D9E75` (emerald), Έμπειρος `#3B82F6` (blue), Expert `#7C3AED` (violet), Platinum `#64748B` (slate).
- **Layering** — opens 350ms after the Published screen mounts so the ✓ moment lands first, then the badge celebration on top.
- **Showcase entry** — `/admin/showcase` → Submission/AI tab → 10 interactive buttons portal-mounting the real modal. Removes the need to reset `suggestion_count` for design QA.

**OPEN QUESTION (deferred):** when to display the modal relative to publishing. Currently fires 350ms after Published mounts. Alternatives the user wants to discuss next session: 30s delay (less interruptive), bell icon notification (passive), or surface on next home-page visit.

**Badge system overhaul — platform-wide fix**

Root cause: every MySQL-migrated user has `users.level = 1`. The 9 detail components, the popup, the admin users table — they ALL keyed badge tier off `level`, so everyone showed up as "Verified" regardless of activity. Fixed end-to-end this session.

- **New source of truth** in `lib/icons.ts`:
  - `badgeIconForSuggestions(count)` — returns null below 3, then verified / gold / expert / platinum at 3 / 10 / 25 / 50.
  - `badgeLabelForSuggestions(count)` — same thresholds, returns "Verified" / "Gold" / "Expert" / "Platinum" / null.
  - The old `badgeIconForLevel` is kept but commented as unreliable; new callers should always use the suggestion-count helper.
- `<UserBadge>` accepts `suggestionCount?: number` (preferred), falls back to legacy `level`. Returns null when `suggestionCount < 3` — brand-new users get no badge rather than a misleading "Verified".
- `<UserAvatarWithPopup>` derives popup badge from `suggestion_count` — cascades to all 9 detail pages + onboarding `PeopleScreen` popup + carousel cards everywhere.
- **9 detail components swept**: each local `getBadge(level)` replaced with `getBadge(suggestionCount)` wrapping the central helper. Every call site changed from `r.user.level` to `r.user.suggestion_count ?? 0`.
- **Data-layer type fix**: `app/(main)/[category]/[id]/page.tsx` extended both `suggestions[].user` and `reviews[].user` types with `suggestion_count`. The reviews SELECT query was missing the column — added. Suggestions SELECT already had it.
- `/[category]/[id]/reviews` subpage uses the central helper.
- Admin `UsersTable` uses suggestion_count with one extra `NEW` tier (count < 3) so the moderation column always has a label (hiding it would leave a blank cell in a table — different rule than the public-facing badge).
- **Live verification**: top suggesters now correctly show Platinum (was all "Verified"); `foodcouple_gr` (47 suggestions) shows Expert; etc.

### Session 19 — Guest guard + bookmark v2 + orbit + profile redesign ✅ (2026-05-11)

The session that finally made the platform *feel* — every action has weight and reward.

**Guest action gating (new `useGuestGuard` + `GuestPromptModal`).** A single hook that gates anonymous users from any logged-in action and shows a contextual "Πρέπει να συνδεθείς για να …" modal with a Login/Register CTA pair. Wired across:
- Bookmark save (`DetailHeaderActions`)
- Rating save (all 9 detail page rate-this-item forms)
- Follow (`FollowButton` gates itself so every consumer inherits)
- Submission FAB (already gated, modal is now consistent)

The modal is portal-mounted, slide-up, dismissible by tap-outside or close button.

**Bookmarks v2 — wishlist/done two-state model.**

The mental model: bookmark = the user's relationship to an item. For books that's "want to read" vs "read it"; for movies "want to watch" vs "watched"; for restaurants "want to go" vs "went". Two states, per-category labels, mutually exclusive, both surfaced inline.

- **Migration 023** — `bookmarks.status` enum (`'wishlist' | 'done'`, default `'wishlist'`).
- **Migration 025** — `GRANT SELECT/INSERT/UPDATE/DELETE on bookmarks TO authenticated` + missing `bookmarks_own_update` RLS policy. Migration 012 had created the table without GRANTs or an UPDATE policy → every PATCH returned "permission denied for table bookmarks" 500. Root-cause fix.
- **`BookmarkStatusChips`** — always-visible chip pair above the rating box on all 9 detail pages. Heart icon on the active wishlist chip, check icon on the active done chip. Labels per-category via `lib/bookmarks/labels.ts` (Θέλω να δω / Έχω δει for movies, Θέλω να διαβάσω / Διάβασα for books, etc.).
- **`BookmarkSavedModal`** — celebration card on first save. Shows the avatar stack of other bookmarkers (up to 9 + "+N"), category-specific headline, 5s auto-dismiss. Replaces the toast on save.
- **`hooks/useBookmark.ts`** — controller now exposes `{ status, bookmarked, busy, toggle, setStatus }`. Action functions return `{ ok, status, context }` where `context` is the bookmarker avatar stack for the modal.
- **API `app/api/bookmarks/route.ts`** — POST returns the new status + context. PATCH for status transition with upsert fallback. Both fail soft when the status column is missing (Postgres error 42703 → ignore status, treat as wishlist).
- **`useReview` `onSaved`** auto-flips bookmark `wishlist → done` whenever the user rates an item — matches the "I rated it ⇒ I clearly experienced it" intuition.

**Bookmark orbit microinteraction.** The hero cover image clones, flies a parabolic Bezier path into the bookmark IconButton at the top-right of the header, and **shrinks continuously to ~1px at the icon centre** so it collapses into a point rather than landing icon-sized.

- `hooks/useBookmarkOrbit.ts` — element discovery via `data-orbit-source` (hero wrapper) + `data-orbit-target` (IconButton); no React refs needed. Web Animations API. Quadratic Bezier with `ARC_HEIGHT = 220px` lift. Five tunable constants at the top of the file.
- `DURATION_MS = 700`, `KEYFRAMES = 24`, `FADE_START = 0.97` (near-zero fade — shrinkage handles the disappearance), `END_PX = 1` (shrink-to-point).
- `tailwindcss-animate` keyframe `bookmarkBounce`: `1.0 → 1.35 → 0.88 → 1.08 → 1.0` over 520ms with `ease-pop`. Applied to the **whole 36px IconButton circle** via a `key`'d wrapper that re-mounts on the visual flip.
- `DetailHeaderActions.tsx` orchestration: `setOrbiting(true)` → kick off `fly()` + `toggle()` in parallel → await orbit → `setOrbiting(false)` (triggers icon flip + bounce) → await API result → **wait 600ms** so the bounce plays out → open `BookmarkSavedModal`. Unbookmark skips the orbit entirely.
- Respects `prefers-reduced-motion` — falls back to a 200ms straight-line fade.

**Leaderboard wired to real data.**

- **Migration 024** — `get_leaderboard(p_period text, p_category text, p_viewer uuid)` RPC. Fast unfiltered path reads `users.suggestion_count`; filtered path aggregates `suggestions` joined to `items`. Returns the requesting viewer's row + the top N around them.
- New leaderboard icons: `leaderboard-first` / `-second` / `-third` / `-trophy` from user's SVG set, registered in `lib/icons.ts`.
- `components/leaderboard/LeaderboardPage.tsx` removed mocks; fetches `/api/leaderboard`; viewer row gets coral fill + "Εσύ" pill.

**Profile screen redesign.** `UserProfile.tsx`:

- Badge area: **design-system `badge-verified` hexagon** (no more inline `TealShieldIcon` SVG) flanked by **two leaf-wreath SVGs** (`profile-leaves-left` + `profile-leaves-right`). The old hand-drawn dot-decoration columns are deleted.
- Stats row: suggestions/reviews icons swapped to design-spec SVGs (`profile-suggestions` + `profile-reviews-star`).
- **Two new extracted components**:
  - **`ProfileScoreCard`** — "Συνολική Βαθμολογία" with score + `profile-rating-leaves` gold-laurel icon + "Δες και τις N τις βαθμολογίες" link.
  - **`ProfileVotesCard`** — "Θετικές ψήφοι" with sum-of-vote_up + `profile-thumb-up` icon + "Δες όλες τις αξιολογήσεις" link.
  - Both include an `ⓘ` info icon next to the title with an `onInfo` callback for future tooltips.
- Server-side: `app/(main)/profile/[handle]/page.tsx` now SELECTs `reviews.vote_up` for the profile owner and sums them into `voteUpCount`.
- Dead inline helpers removed (`PencilIcon`, `FlameIcon`, `ThumbUpSmall`, `ThumbUpBigIcon`, `StarIcon`, `RatingBarRow`).
- Both cards added to `/admin/showcase` Profile tab with 3 variants each (healthy / empty / extreme).
- 6 new SVGs added: `public/icons/profile/{leaves-left,leaves-right,suggestions,reviews-star,rating-leaves,thumb-up}.svg`.

### Session 18 — Admin revalidation + avatar upload + personalization + Gemini integration ✅ (2026-05-09)

**Part 1 — Admin write revalidation + ISR + ExpandableText sweep.**
- Admin POST/PATCH routes now call `revalidatePath('/<category>/<slug>')` on save so edited detail pages reflect the change immediately on next navigation. No more "I edited it but the site still shows the old text."
- `<ExpandableText>` primitive built (max-height animation, "Περισσότερα" toggle) + rolled out across plot / description sections on all 9 detail pages.

**Part 2 — Avatar upload + personalization + notifications.**
- Avatar upload wired to Supabase Storage `avatars/` bucket. Upload UX in `/profile/[handle]/settings/edit` — drag/drop or tap to pick + preview + crop.
- Personalization settings page reuses `<InterestsSelector>` from onboarding (different header/footer).
- Notifications settings page — per-type push/email toggles persisted to `user_notification_preferences` jsonb.

**Gemini integration (across both halves of session 18).**
- `lib/ai/gemini.ts` implementation of the existing `AIService` interface. Drop-in swap via `getAIService()` (picks Gemini when `GEMINI_API_KEY` is set, falls back to mock otherwise).
- Search intent extraction routed through Gemini Flash-Lite — full structured `SearchAnalysis` schema (category, genre, channel, status, period, duration, person, type, location).
- Submission match upgrade: Gemini extracts `{ title, category, year_hint, actor_hint, … confidence }` from the full reflection text; TMDB / Books / Places confirms.
- Quality coach + conversational fallback both wired through Gemini.
- AI cache table (migration 019) + usage log + cost dashboard at `/admin/ai-usage` showing daily token spend + top expensive queries.
- Prompt versioning via `PROMPT_VERSION` constant (currently `v6`); bumping invalidates all stale cache entries.
- Free tier: 20 requests/day on `gemini-2.5-flash-lite`. Paid tier needed for production — enable billing at https://aistudio.google.com.

This effectively **shipped Phase A** (the original "Anthropic Claude Haiku integration") through Gemini instead. Cost is even lower than the original projection (~$0.0001/search at paid tier vs ~$0.0005 with Anthropic). Decision logged in §3.

### Session 16 — Design system completion ✅ (2026-05-07)

Closed the loop on the showcase started in session 15. Goal was simple: every reusable component in the codebase should appear in `/admin/showcase` with realistic variants. End state — ~110 components, 16 tabs, 0 typecheck errors.

**Architectural refactor: per-tab file split**
- Session 15 left `/admin/showcase/page.tsx` as a 1582-line monolith with 30 components. One TS error in any tab took down the whole page; reviewing/editing was painful at that size.
- Refactored to `app/admin/showcase/tabs/*.tsx` — 16 focused files, 100-700 lines each. `page.tsx` is now a 45-line composer that imports each tab. `ShowcaseShell` updated to enumerate the new tab list.
- Each tab is a `"use client"` component with its own imports, state hooks, and sample data — fully isolated. A breaking change to e.g. `ProfileCard` only fails `ProfileTab.tsx`'s typecheck.

**Batch 1 — Primitives tab (15 UI atoms)**
The most glaring gap from session 15: `components/ui/` had 15 atoms with zero coverage. Added `PrimitivesTab.tsx` with realistic variants for each:
- Button (6 variants × 3 sizes + loading + icons + fullWidth)
- Input (auth + search variants + password reveal + error/success/hint/loading/disabled)
- Textarea (label + char count + autoResize + error)
- Card (default/elevated/flat/outlined + pressable + Header/Body/Footer)
- Badge + ReviewBadge (9 variants × 2 sizes + dot)
- Avatar (5 sizes + verified + image)
- AvatarImage (URL + 4-color initials fallback)
- StarRating (read-only + interactive + half-star + sizes + showValue)
- IconButton (3 variants × 3 sizes + badge dot/count)
- FilterChip + FilterChipRow (interactive group + horizontal scroll + leading icon)
- SortPills · Spinner · StatCard + InlineStat
- FollowButton (default + dark + sizes + already-following)
- WantToSeeButton · Skeleton + helpers (SkeletonText/Avatar/Card/Suggestion)

Made `Primitives` the default tab. The 15 atoms now have first-class showcase coverage above the older Foundations tab.

**Batch 2 — 4 new tabs + Detail modules expansion**
Composed pieces that needed realistic mocks but no server context:
- **Profile** (9 components): ProfileCard (own/other/no-bio) · BadgeDisplay (4 tiers all-earned/mixed/none) · Stats (mid/new/past-milestone) · CategoryStatCard · RowMenu (interactive 3-action) · FollowersPopupCentered · ProfilePopup · BookmarkedCard (3-state machine) · OwnSuggestionCard.
- **Category** (7): CategoryCard (RowCard + LandscapeCard variants per category) · FeaturedCard · SubCategoryTabs · FilterRow · FilterBottomSheet (full-screen filter panel, opens for movies + hotels) · CategoryHeroStats · CategoryTopUsers (full layout with hero #1 user + 4 contributors).
- **Submission/AI** (3): ProteínoIntelligence (idle/listening/matched/syncing color states) · AchievementProgress (8 milestones from 1st suggestion through Platinum unlock at 50) · ai/ProgressBar (with interactive drag).
- **Recommendation** (5): Carousel · CarouselPortrait (with platform badges + live indicator) · CarouselLandscape (hotel + portrait flag) · BecauseYouLiked · CollectionRenderer (link-only — server component).
- **Detail modules expanded** with 7 extras: ReviewCardFooter · OwnSuggestionActions · UserAvatarWithPopup · DeliverySelector · PlatformSelector · ItemGalleryViewer (with tabs) · ExtraRatingsRow.

**Batch 3 — 3 final tabs (Home, Auth, Layout)**
- **Home** (12 components): AIChips · MoviesTonightSection · SuggestedUsers · ContributionCTA · DailyPrompt · SupportSection · home/CategoryTiles · guest/SuggestionFeed · guest/HeroDiscover/Suggest/Personalise · guest/HowItWorks · guest/RegisterPromo · guest/CategoryTiles. The 3 hero screens are 733px tall — rendered at `scale(0.55)` so they fit the showcase grid.
- **Auth** (5 atoms): AuthHeader · AuthDivider · AuthTrustBadge · OAuthButtons (login + register modes) · PasswordRuleList (interactive type-to-validate + 3 fixed states + hidden).
- **Layout** (5 chrome + ReportLink): Header · BottomNav · FullScreenOverlay use the link-only pattern (fixed-position / require overlay context). FAB has a static visual approximation. MaintenanceBanner shows real renders. ReportLink is fully interactive (default + comment target + custom label with reported counter).

**Decisions locked**
- **Link-only fallback pattern** for any component that fakes a render: write a one-paragraph description + "see live" link instead. Faking server context (overlays, fixed-position chrome, server components) is brittle and misleading.
- **Default tab is Primitives** — atoms first, compositions second. Mirrors how a designer would scan the system.
- **Per-tab files** are the right granularity — folder-of-files beats single-file at this size.
- **Showcase is a typecheck canary** — every breaking refactor of a shared component fails `tsc --noEmit` before it ships, because the showcase imports them.

**Tooling notes**
- `ShowcaseShell` tab list lives in `components/admin/showcase/ShowcaseShell.tsx` — adding a new tab needs an entry there + a new tab file + a render in `page.tsx`. 3-line ceremony.
- `ShowcaseSection` accepts `name`, `filePath`, `description`, `contextLinks?`. `Variant` accepts `label`, `note?`, `dark?`. Both unchanged from session 15.
- Sample data is inline per-tab — no shared fixtures, no DB calls.

**What's left (small, deferred):**
- LocationPicker / AddressMapSection still inline in SuggestionEditor (~174 lines). Extract → standalone reusable so it can render interactively in the showcase Admin tab.
- Empty state primitive — shown as placeholder in Patterns tab. Used inline in 5+ places, would benefit from extraction.
- Skeleton roll-out — primitive exists + is showcased, but only used on item gallery currently. Wire into category pages + profile + /reviews on initial load.
- CategoryCard sweep — old card still in use; migrate to SuggestionCardPortrait/Landscape from session 15 across all 9 category pages.

### Session 15 — Reviews architecture + design system showcase ✅ (2026-05-07)

The biggest architectural cleanup so far. Consolidated the messy ratings/suggestions/comments triangle into a single `reviews` table, fixed the FK ambiguity bug class introduced by migration 015, and stood up `/admin/showcase` as the canonical design-system surface.

**Reviews architecture rewrite**
- **Migration 016** (`scripts/sql/016-reviews-table.sql`, applied to live DB): new `reviews` table with `rating smallint NOT NULL CHECK (1..5)` + `reflection text NULL` + vote/report/hidden columns + `UNIQUE (user_id, item_id)`. RLS: anyone reads non-hidden, users CRUD their own, admin role policy for moderation. Hot-path index on `(item_id, created_at DESC) WHERE is_hidden = false`. **Wipes** all rows from legacy `ratings` table + resets `items.rating_count` / `avg_rating` to 0 across all 1000 items.
- **Migration 017** (`scripts/sql/017-review-votes.sql`): `review_votes` table mirroring `comment_votes` from migration 003. PK on (user_id, review_id). Postgres trigger `trg_sync_review_votes` keeps `reviews.vote_up`/`vote_down` in sync on INSERT/UPDATE/DELETE. Self-vote blocked at the API layer.
- **Legacy tables stay frozen, untouched** — no `is_legacy` flag, no schema mutations on `comments` / `ratings`. The new UI reads only from `reviews`. Future cleanup: drop `ratings` table once we're confident.
- Per the user's decision: a "review" = rating (mandatory) + optional text. The original submitter's `suggestions` row is NOT a review — it stays as the featured suggester block above the rating box, never inside the carousel or `/reviews` page.

**API + hooks**
- `app/api/reviews/route.ts` — POST (upsert), GET `?item_id=…` (own review prefill), DELETE (own only). Recomputes `items.rating_count` + `avg_rating` after every write so the detail page reflects the new aggregate immediately.
- `app/api/reviews/[id]/vote/route.ts` — POST `{ vote: 1 | -1 | null }`. Self-vote returns 403. Trigger handles counter sync.
- `hooks/useReview.ts` — replaces `useRating`. Manages busy/savedRating/savedReflection state.
- `hooks/useReviewVote.ts` — optimistic counter delta on click + revert on API error. `toggleUp` / `toggleDown` helpers.

**Detail page server fetch rewritten** (`app/(main)/[category]/[id]/page.tsx`)
- Replaced the dual-source fetch (ratings table + suggestions.rating union, with K2-aggregate fallback + synthesized histogram) with a single query against `reviews`.
- `ItemDetailData.reviews[]` typed shape includes `my_vote` per row — fetched server-side via 1 extra `review_votes` query (user_id + in-clause on review_ids) so vote thumbs render in the active state on first paint.
- `ItemDetailData.myReview` (rating + reflection) for prefilling the rate-this-item form.
- `ratingDistribution` + `isTopRated` recomputed from real reviews; histogram hidden when no per-user data.
- Old `synthesizeRatingDistribution` heuristic + K2 aggregate fallback **removed** (no longer needed — table is the source of truth).

**Detail components migration sweep (9 files)**
- `useRating(item.id, data.userRating)` → `useReview(item.id, data.myReview)` + new `userText` state.
- Save button calls `saveReview(rating, userText.trim() || null)` with both rating + optional text.
- Carousel review source: `suggestions.slice(1).map(s => …)` → `data.reviews.map(r => …)`. Each review → `<ReviewCard variant="carousel" myVote={review.myVote} />`.
- **Textarea added** below the stars in the rate-this-item form (renders after first star click). 6 multi-line files + 3 single-line files patched via Python regex.
- **CommentComposer + CommentThread JSX removed** from all 9 — no more comments going forward.
- **`<ExtraRatingsRow>` removed** — no longer needed (review = rating, no separate "rating-only" concept).
- Bug fixed during sweep: 8 files had `dislikes: r.vote_up` (should be `vote_down`) — unrelated dev-time mistake from earlier sed, dislike count was equal to like count.

**FK ambiguity sweep (root-cause fix)**
- Migration 015 (session 14) added `suggestions.hidden_by` FK → `users.id`, creating a 2nd FK from suggestions to users. Postgres + PostgREST then refused every embed `users(...)` from `suggestions` with `PGRST201` ambiguous-relationship — silently breaking 12 queries. Same bug class on `comments` (which has `comment_votes` many-to-many).
- Fixed all sites with explicit FK disambiguators:
  - `users!suggestions_user_id_fkey` in 8 places (category list, detail page, /reviews, /admin/reports, /admin/suggestions table, command palette, /api/suggestions, /api/suggestions/check, /api/debug/me)
  - `users!comments_user_id_fkey` in 2 places (admin/reports comment query, admin/reviews list table)
- Symptoms cleared: empty category pages, missing featured suggester, `/admin/reviews` empty list, broken admin search.

**`/reviews` subpage** (`app/(main)/[category]/[id]/reviews/page.tsx`)
- Server component, lists all visible reviews using `<ReviewCard variant="list">`.
- Filters out the original suggester (suggestions.slice(1) logic at API level).
- Empty state: "Καμία αξιολόγηση ακόμα · Πρόσθεσε αξιολόγηση" CTA back to detail.
- Per-viewer vote state same approach as detail page (server-side prefetch).

**`<AllReviewsButton>`** (`components/detail/AllReviewsButton.tsx`)
- Outlined CTA "Εμφάνιση X αξιολογήσεις" (singular/plural) below the carousel on every detail page → links to `/[category]/[id]/reviews`.
- Hidden when count = 0.
- Wired into all 9 detail components (Python script + per-file Edit for sub-component variants — Food/Theater/Recipe/Hotel/Event have a `<CommunitySection>` sub-comp that needed `itemSlug` added as a prop).

**Design system showcase (`/admin/showcase`)**
- New admin route, gated by existing admin layout. 8 tabs: Foundations, Cards, Detail modules, Modal, Toasts, Notifications, Admin, Patterns.
- Tabbed shell (`ShowcaseShell`) — sticky nav, instant client-side switch.
- `<ShowcaseSection>` wrapper per component: header (name, file path, description, "view in context" links) + grid of `<Variant>` cells with label + preview.
- 27+ real components documented with multiple variants each. New reusables built this session:
  - **Detail modules** (extracted from inline JSX in HotelDetail/TheaterDetail/BookDetail): RatingCard (Google/Booking unified) · BookingAvailabilityCard · ActivityCard · PublicBookAd · AuthorCard · AmenitiesRow · NutritionRow · DurationCard · PlatformLinksCard (unified for Food delivery + Movie/Series watch platforms).
  - **Cards**: ReviewCard · SuggestionCardPortrait · SuggestionCardLandscape · CarouselSection · RatingBox · SuggesterCard · BookmarkIcon.
  - **UI primitives**: Toast + useToast() hook (replaces 9+ inline `"✓ Αντιγράφηκε"` patterns).
  - **Notifications**: NotificationCard extracted from NotificationsPage (6 type variants).
- Sidebar entry "Showcase" added to AdminSidebar with palette icon.

**TMDB image host fix**
- Added `image.tmdb.org` to `next.config.mjs` `images.remotePatterns` — anora and dune detail pages were 500ing on TMDB-saved poster URLs.

### Session 14 — UI redesign + icon system + reports + admin polish ✅ (2026-05-06)

The biggest single session. Started with a UI audit complaint that the platform "felt like 2010-2020" and ended with a fully icon-driven design system, the αναφορά flow built end-to-end, and 6 Figma screenshots shipped for hotel/recipe/book/theater/food.

**UI audit + foundation** (`UI_AUDIT.md`)
- Wrote a complete inventory of the 3 screen archetypes (Home / Category / Item Detail) — 6k lines audited, identified InfoCell pattern as the dominant 2010s tell, hardcoded mock content (Netflix on every movie / "Top 10%" lies / all-zero rating bars), monochrome zinc palette as the visual language gap. Noted gray-circle placeholders standing in for every avatar/photo as the systemic "looks unfinished" issue.
- User reframe locked: 3 archetypes, not 9 detail pages × N states. Variations per category are minor parameterizations.

**Step 1 — Strip chips from detail pages**
- Movies: removed `[genre, year, duration, country]` chip row under hero. Title now stands alone above the rating line.
- Series: removed `[genre, year, seasons, network]` chips. Cleaned up orphaned `yearLabel` + `endYear` vars.
- Bars: removed `[type, address]` chips.
- Books / Food / Hotels / Theater / Events / Recipes: untouched (had no chips).

**Step 2 — Kill dead/fake content**
- New `hooks/useShareLink.ts` — `navigator.share` + clipboard fallback + ✓ Αντιγράφηκε flash. Wired share button across all 9 detail pages (was a `<button>` with no onClick before).
- Removed watchlist toggle ("Την έχω δει / Θέλω να τη δω") from Movies, Series, Books — was `useState` only, never persisted.
- Removed hardcoded Netflix/YouTube €3.99/Disney €3.99 platform list from MovieDetail + SeriesDetail.
- Removed "Top Rated" + "Η ταινία ανήκει στο top 10%" hardcoded copy (later restored when real data became available — see histogram fix below).
- Hid empty rating-distribution bars (later restored).
- Removed dead vote up/down buttons from review cards (later restored as visual via `<ReviewCardFooter>`).
- Removed orphaned `Περισσότερα` decoration links across 9 files; kept the real plot/description expand-collapse links.
- αναφορά link kept in place for proper wiring later (now done — see Reports system below).

**Icon system** — 62 SVGs from user's `icons.rar`, organized into 8 categorized subfolders under `public/icons/`:
- `brands/` (16): efood, box, booking + booking-wordmark, google + google-pin, public, airbnb, imdb, rotten-tomatoes, metacritic, netflix + netflix-wordmark, disney, prime, youtube
- `nutrition/` (5): vegan, no-milk, sugar-free, ingredients, steps
- `amenities/` (19): hotel, three-star, rooms, suites, breakfast, free-parking, swimming-pool, wifi, bar, restaurant, sea-view, mountain-view, transfer, disabilities, pet-friendly, vegan-menu, playground, on-the-sea, roof-garden
- `property/` (5): apartment, apartment-alt, villa, camping, house
- `awards/` (4): oscar-best-actor, oscar-best-picture, oscar-best-screenplay, oscar-best-sound
- `badges/` (4): verified, expert, gold, platinum
- `ui/` (7): star, star-rating-hero, pin, calendar, play, follow, followed
- `admin/` (2): placeholder-upload, link-card

Wiring:
- `lib/icons.ts` — registry mapping `IconName` → file path. Plus catalogs: `AMENITY_ICON_MAP` + `AMENITY_LABELS`, `HOTEL_AMENITY_GROUPS`, `RECIPE_NUTRITION_OPTIONS`, `HOTEL_PROPERTY_TYPES`, `FOOD_AMENITY_OPTIONS`. Helpers: `badgeIconForLevel(n)`, `platformIconForChannel(s)`, `oscarIconForCategory(type, category)`, `getActiveAmenities(facilities)`.
- `components/ui/Icon.tsx` — single rendering primitive: `<Icon name="vegan" size={48} />`. Plain `<img>` with explicit width/height. Used everywhere (frontend + admin).
- `components/ui/OutlinedPill.tsx` — reusable pill button (white fill + zinc-400 border + arrow). Used by delivery, availability, theater ticket, Public book ad.
- `components/ui/UserBadge.tsx` — derives from level OR explicit kind. Renders `badge-{verified,gold,expert,platinum}` icon + optional label. Replaces 3 legacy patterns spread across 9 detail files.
- `components/admin/IconToggleGrid.tsx` — visual checkbox grid (icon + label + active=coral border). Used by hotel facilities, recipe nutrition, food amenities admin forms.

**Step 3 — Consistency fixes** (3a + 3b + 3c + 1-col list)
- 3a: Movies/Series 3-col stat bar made conditional. Movies show it ONLY when `awardsByType["Oscar"]?.length > 0 && avgRating ≥ 4.5`. Series always uses inline RatingLine (no awards data anyway).
- 3b: BookDetail suggester block stripped of `border + bg-white p-5` — now matches the unboxed pattern of the other 7 categories.
- 3c: New `components/detail/OwnSuggestionActions.tsx` — replaces the rate-this-item card when current user has an existing suggestion on this item. Uses existing `EditSuggestionModal` + `ConfirmDeleteDialog` from session 13. Server fetches `currentUserId` and adds to `ItemDetailData`. Wired in all 9 detail components.
- 1-col list across all categories: `getListClass` now always returns flex-col (was 2-col grid for movies/series/books). New `<RowCard>` variant in CategoryCard for portrait categories — small 88×132 poster left + title/meta/byline/rating right (Letterboxd-style row). Carousels untouched (still portrait).

**Six screenshot designs shipped end-to-end**
- Recipe nutrition row in `RecipeDetail` — under the user reflection. 3 illustrated icons (Χωρίς γάλα · Vegan · Χωρίς ζάχαρη). Reads `ext.nutrition.{vegan, dairy_free|milk|no_milk, sugar_free|sugar|no_sugar}`.
- Hotel amenities row — 4-col grid or h-scroll if more than 4. Reads `ext.facilities` (handles array or object-of-booleans). Uses line-art amenity icons.
- Hotel rating cards (Google + Booking side-by-side) — replaces stacked Βαθμολογίες panel. Real `google-pin` + `booking` icons. Score/scale (`/5` or `/10`) + count + arrow chip. Google card links to Maps search. Supports both legacy plain string AND new `{score, count}` jsonb shape.
- Hotel availability card — lavender bg, real `booking-wordmark` icon, `<OutlinedPill>` to Booking.com search.
- Theater Public book ad — cross-promo when the play has a book version. Reads `metadata.related_book`. Renders only when `title` is set. Public wordmark + book cover + title/author/page count + outlined pill "Δες το →".
- Author card in `BookDetail` — REDESIGNED + MOVED AFTER reviews (engagement-first per user). Reads `metadata.author_photo_url / author_birth_year / author_book_count / author_bio`. Photo as 76×76 rounded square OR first-letter placeholder. Big bold name + age + book count meta. Bio with expand/collapse.
- Food delivery card — uses real efood + BOX wordmark logos via `<Icon>`. Each row only renders when its `delivery_links.{efood,box}` URL is set.

**Pass A — Frontend icon coverage gaps**
- MovieDetail external ratings: replaced inline placeholder squares (`ImdbLogo`/`RtLogo`/`MetacriticLogo`) with real `imdb`/`rotten-tomatoes`/`metacritic` SVG logos. Removed orphaned helper functions.
- MovieDetail awards accordion: when `oscarIconForCategory(type, category)` returns a match (Best Picture/Actor/Screenplay/Sound), render the specific oscar icon. Falls back to generic laurel `<AwardBadge>` for other Oscar categories or non-Oscar awards.
- `<UserBadge>` rolled out across all 9 detail pages — replaces colored text pills (`BADGE_STYLE` + inline span), inline shield SVG (`<VerifiedBadge>+text`), and `<BadgeChip>` function calls. Cleaned up 3 different orphaned patterns + ~30 lines of duplicate definitions per file.

**Pass B — Admin form gaps + foundation**
- API `/api/admin/suggestions` PUT now accepts `metadataPatch`, fetches existing `items.metadata`, deep-merges, and updates. Preserves other metadata keys.
- `ExtFieldsHandle` interface adds optional `getMetadataPatch()` so any ExtraFields component can write to metadata. SuggestionEditor save flow pulls both `getData()` (extension table) and `getMetadataPatch()` (items.metadata) and sends both.
- HotelExtraFields amenity form: was completely broken (text-only checkboxes with no `checked`/`onChange`). Replaced with 3 grouped `<IconToggleGrid>` (Παροχές / Θέα-Τοποθεσία / Extra) saving to `ext.facilities`. Pass-through reads + saves now actually work.
- HotelExtraFields property type radio: was broken placeholder SVGs. Now visual radio with real `property-*` icons (apartment / villa / camping / house / hotel) + coral active state. Wires to `type` state + saves.
- HotelExtraFields external_ratings: NEW section. Google + Booking each get score + count inputs. Saves as `{ google: { score, count }, booking: { score, count } }` jsonb — matches the shape HotelDetail's rating cards expect.
- RecipeExtraFields nutrition form: was broken (no state, no save). Added `nutrition` state, persistence in `getData()`, and `<IconToggleGrid>` with the 3 illustrated nutrition icons.
- BookExtraFields: NEW author profile section. Photo URL + birth year + book count + bio textarea. Saves to `metadata.author_*` keys via `getMetadataPatch()`.
- TheaterExtraFields: NEW related_book section. Title / author / pages / cover URL / Public buy link. Saves under `metadata.related_book` jsonb. Empty form clears the key (so admins can remove the cross-promo).
- MovieExtraFields awards row: shows the matching oscar icon when category resolves via `oscarIconForCategory` — admin sees the same icon that'll render on the frontend.

**Food amenities (new field)**
- Schema: stored under existing `ext.information.amenities` jsonb (no migration). New `FOOD_AMENITY_OPTIONS` catalog (parking, wifi, pet, vegan menu, playground, ΑΜΕΑ, sea view, παραλιακό, roof garden).
- Admin: FoodExtraFields' broken Attributes checkboxes replaced with `<IconToggleGrid>`.
- Frontend: FoodDetail renders amenities row under user reflection (4-col grid or h-scroll), same pattern as HotelDetail.

**A2 + A5 — Smaller polish**
- A2: `platformIconForChannel(channel)` helper. New `<InfoCellWithIcon>` variant in SeriesDetail. "ΔΙΚΤΥΟ" InfoCell now renders Netflix / Disney / Prime / YouTube logo when channel matches.
- A5: `<FollowButton>` now uses real `follow` / `followed` icons from registry (was inline `AddUserIcon` SVG).

**Reports system (full implementation)**
- Migration `scripts/sql/015-content-reports.sql` — APPLIED to live DB. Generalized `content_reports` table: `target_type ∈ {comment, suggestion}`, 4-reason enum (`inaccurate / fraud / offensive / other`), `resolution_action ∈ {kept, hidden}`, `resolution_note` (admin justification), `resolved_by`, `resolved_at`. Unique index `(reporter_id, target_type, target_id, reason)` for idempotency. `suggestions` table gets `hidden_at / hidden_reason / hidden_by` columns mirroring what `comments` already had from migration 003. RLS: users insert + select own reports; admin role policy for full access.
- API `POST /api/reports` — accepts `{ target_type, target_id, reason, description }`. Description required (≥10 chars). Idempotent on (reporter, target, reason). Returns `{ ok, report_id, already_reported?, self_report? }`.
- API `PATCH /api/admin/reports/[id]` — admin role check. Note required (≥5 chars). On `kept`: only this report resolves. On `hidden`: also writes `hidden_at/by/reason` on target row + auto-resolves all sibling pending reports for the same target with the same note.
- `<ReportFlowModal>` (`components/report/`) — 3-step state machine matching user's screenshots exactly: reason → description → confirmation. Reason-aware step-2 headlines + placeholders. Disabled "Επόμενο" button until validation passes.
- `<ReportLink>` wrapper — small αναφορά text-link with embedded modal state. Used inline on review cards + comment cards.
- Wired in all 9 detail pages: replaces the previously-dead αναφορά button on review carousel cards with `targetType="suggestion"`. Wired in CommentThread: replaces legacy 5-reason kebab+chips with `targetType="comment"`.
- Detail page query filters `hidden_at IS NULL` so admin-hidden suggestions disappear from frontend.
- Admin `/admin/reports` page (`components/admin/ReportsTable.tsx`) — list of unresolved reports grouped by target. Per-row: reason chip, target excerpt, reporter description, Dismiss/Hide buttons (both open inline note textarea). Optimistic remove after resolve. Auto-removes sibling reports when Hide is chosen.
- Sidebar Reports tab with red badge from `/api/admin/counters` (new `pendingReports` key). New `IconFlag` SVG.

**Histogram + Top Rated restoration** (after step 2 stripped them)
- Detail page server-side now fetches scores from BOTH `ratings` table AND `suggestions.rating` field. Dedupes by `user_id` (ratings table wins on collision). Buckets into 1..5 stars, computes percentages, computes avg from combined source.
- Overrides `item.rating_count + item.avg_rating` with combined-source totals so the visible count matches reality (was previously stale on migrated items where ratings live in `suggestions.rating`).
- `ratingDistribution` always renders when `totalScored > 0`. "Top Rated" + descriptive copy renders when `avg ≥ 4.5 && totalScored ≥ 5`. Per-category noun: Η ταινία / Η σειρά / Το βιβλίο / Το εστιατόριο / Το μαγαζί / Το ξενοδοχείο / Η παράσταση / Η εκδήλωση / Η συνταγή.
- `<ReviewCardFooter>` shared component re-introduces vote up/down buttons (visual; counts hardcoded to 0 until `suggestion_votes` schema lands) + αναφορά link. One source of truth used by all 9 detail pages.
- `<ExtraRatingsRow>` — compact rating-only row below the review carousel. Server-side fetches users from `ratings` table whose `user_id NOT IN (suggester user_ids)` for the same item. Each row: avatar + name + stars + relative date. Solves the "X αξιολογήσεις but no review cards visible" gap on migrated items where 1 suggester + N rating-only users is the norm.

### Session 13 — Search overhaul + audit fixes ✅ (2026-05-05)

**Search backend rewrite** (`app/api/search/route.ts`)
- Replaced 3-item mock with real ranked Postgres query (~2k items corpus)
- Intent extraction: Greek+Latin category keywords, Greek transliterations (μπέργκερ, σούσι, πίτσα, μπρανς, μιούζικαλ), accent-folded regex tests via `foldGreek()` helper
- Region resolver: pre-fetches all regions (small table) and folds diacritics on both sides — "αθηνα"/"αθήνα"/"ΑΘΗΝΑ" all match "Αθήνα Κέντρο"
- Title query: ilike on new generated `items.title_normalized` column (migration 014) for accent-insensitive matching, with graceful fallback to plain title ilike when migration not yet applied
- Confidence tiers: `tierFromScores(best, runnerUp)` → high (≥500 + gap ≥100) / medium (≥300) / low; drives FEATURED hero card vs. ranked list vs. clarification chips
- Cross-column search: `actors::text ilike` + director ilike + writer ilike (Joomla K2 pattern, no LLM) — `scorsese`/`tarantino`/actor surnames now find their films across `item_movies`/`item_series`/`item_books`
- Address-text venue fallback: when region resolves to nothing OR has 0 region_id matches, JS-filter the per-category venue pool by `foldGreek(address).includes(token)` — catches Athens neighborhoods like "Χαλάνδρι"/"Παγκράτι" that don't have their own region rows
- Stopword-filtered location tokens: `μπαρ`/`καφέ`/`hotel` etc. NEVER treated as address fragments — kills the leak where "γαλάτσι μπαρ" returned Kerkyra venues
- Honest empty state: when user explicitly specified a location AND zero matches found, returns 0 items + `region_fallback_used: true` instead of falling back to global popular (which was the leak)
- Latent-intent log: every no-match search inserts into `public.search_log` (migration 013); DB trigger `trg_fanout_search_matches` fires `search_match` notifications when matching items publish later

**Search hook + UI** (`hooks/useSearch.ts`, `components/search/SearchOverlay.tsx`)
- Confidence tier + featured + user hits + fallback suggestions surfaced from API
- Tappable removable pills (VIBE / TYPE / LOC / **CATEGORY** new); CATEGORY pill X sets `no_category_filter=1` on re-run; other pills strip via `looseStrip()` (escaped + diacritic-folded)
- Debounce timer leak fixed: cleared on text-empty, on removePill, on unmount via `cancelInflight()`
- 350ms input debounce + 8s `AbortSignal.timeout` per request → distinct "error" state with retry button (separate from "no_match")
- History dedup case + accent insensitive (`Anora`/`anora`/`αθήνα`/`αθηνα` collapse to one); 1.5s settle-debounced persist instead of every keystroke
- Empty state: history rail + 3 seasonal prompts (`constants/searchPrompts.ts`)
- FEATURED hero card on high-confidence single-item match
- No-match chips: `Διαφορετική κατηγορία` opens a 9-chip category picker (uses `pickCategory(slug)` hook method); `Πρότεινέ το πρώτος` closes search and opens suggestion overlay with the query pre-filled via `useOverlay.openSuggestion(prefill)`
- Mini-chat auto-escalates after 2 failed chip narrows
- aria-live="polite" + aria-busy on results; real progress signal (0→30→70→100) instead of `Math.random()`
- Result count + per-section labels: `"✓ Βρήκα ακριβώς αυτό · 1 αποτέλεσμα"`, `"Άλλα αποτελέσματα · 12"`, `🎬 Ταινίες · 5` per group
- Mixed-category grouping: when results span 2+ categories, render grouped by category with per-group count + "+N ακόμα" link, capped at 5 per group
- Honest region-ghost banner: amber `"Λίγα στη συγκεκριμένη περιοχή. Δείχνω δημοφιλέστερα συνολικά."` when fallback fired; LOC pill suppressed when it would lie
- X clear button inside textarea
- Dead files deleted: `SearchResults.tsx`, `SearchPill.tsx`, `SmartSearch.tsx` (never imported)

**Confidence tiers in submission** (`app/api/ai/match`, `hooks/useSubmission.ts`, `components/submission/SuggestionOverlay.tsx`)
- Server `computeTier(best, runnerUp)`: high (≥100 exact + gap ≥20) / medium (60-80) / low (<60 OR runner-up within 20pts)
- Each alternative carries its full TMDB payload (`match_data`) so picking one needs zero round-trips
- High → auto-lock; medium → `<MatchConfirmCard>` "Νομίζω είναι X. Σωστό;" with Ναι/Όχι pills (NO lock, fixes the lock+ask contradiction); low → no-lock alternatives carousel "Ποιο εννοείς;"
- New hook methods: `confirmMatch()` promotes medium → high lock, `rejectMatch()` demotes to low + shows alternatives, `chooseAlternative(idx)` picks from low-tier carousel and locks
- Auto-unlock when matched title is removed from the textarea (case+accent insensitive substring check on `analysis.title` AND `tried_candidate`)
- Preflight duplicate check fires the moment we lock (any path) — `useEffect` watching `state==="match_found"`. If duplicate, jumps straight to `<DuplicateScreen>` without making the user click Verify
- `dismissAndReject()` adds the matched item to a session-scoped rejection set so AI doesn't re-suggest it on next keystroke (kills the duplicate-screen loop)
- Local quality coach: `useSubmission` runs `assessQuality()` on every keystroke (independent of AI), surfaces fresh `quality` field that the panel reads. Lock no longer freezes coaching.
- Quality coach itself rewritten: 8 coaching dimensions (length / why / emotion / scene / character / plot / polish / celebrate) with rotating phrasings keyed off `floor(len/10) % pool.length` — feels alive instead of stuck

**TMDB enrichment fixes** (`app/api/ai/match/route.ts`, `app/api/suggestions/route.ts`)
- Genres + countries + language now extracted from TMDB detail call
- Subcategory mapping via stable TMDB genre IDs (878=Sci-Fi, 18=Drama, etc.) — locale-independent
- Silent insert failure killed: dropped the unknown `directors` (plural) column from extension table inserts; surfaces errors via `console.error` instead of swallowing
- Existing-item enrichment: when a re-suggestion hits an item missing extension data, backfills it from the fresh TMDB payload (also fills subcategory_id if null)
- Lowercase candidate extraction: stopword-aware token-runs catch "i just watched dune" → "dune" candidate. Bilingual title extraction with `\p{Lu}`/`\p{L}` Unicode property classes
- Backfilled Anora's missing `item_movies` row + `subcategory_id`

**DuplicateScreen redesign** (`components/submission/SuggestionOverlay.tsx`)
- Verification flow: shows item card (poster + title + year + suggester/own-flag) → asks "Είναι αυτή η πρόταση που εννοείς;" with Ναι/Όχι pills
- Ναι → context-aware CTAs: own → [Δες την πρότασή σου, Πρότεινε κάτι άλλο]; other → [★ Βαθμολόγησέ το, Δες παρόμοια, Πρότεινε κάτι άλλο]
- Όχι → blacklists this match for the session, drops the lock, returns to typing — preserves the textarea content

**PreviewScreen + PublishedScreen polish**
- Cast row: horizontal scroll of circular avatars + names (up to 6) using TMDB `cast[].avatar` URLs
- PublishedScreen: light theme (was dark), animated coral checkmark with halo glow, item card centerpiece (poster + title + stars + reflection in coral-bordered blockquote), hook-moments cards (`weeklyCount` / `categoryAudienceCount` / `myFollowersCount`), AchievementProgress milestone, "Επόμενο βήμα" CTA pair (🔥 Πρότεινε ακόμα μία / 🎬 Δες παρόμοια)
- IntelligencePanel: prominent coral "✓ Κλειδωμένο · CATEGORY · TITLE" banner when locked (replaces the small MATCH chip that was easy to miss)

**Profile real data + edit/delete** (`/profile/[handle]/...`)
- Suggestions index: real per-category groups + counts + 3 most-recent cover thumbnails (server component aggregating from `suggestions` join `items`)
- Per-category suggestions list: real data with poster, title, rating, reflection, date + `<RowMenu>` (View/Edit/Delete) on each row
- Reviews: real `ratings` join `items`, per-row delete with confirm
- Bookmarks (was already real): added `<RowMenu>` for explicit Remove action
- New API endpoints: `DELETE /api/suggestions/[id]`, `PATCH /api/suggestions/[id]`, `DELETE /api/ratings/[id]` (owner-only, RLS-aware)
- `<EditSuggestionModal>` preloads reflection + rating, posts PATCH on save
- `<ConfirmDeleteDialog>` (coral trash icon, danger-confirm)
- `<DeleteSuccessDialog>` (matches user's Figma success-state mockup): coral-50 circle + coral-700 trash icon, "Επιτυχής διαγραφή" headline, contextual subtitle, auto-dismiss after 1.8s
- Bookmarks tile added to profile GeneralStats (3-cell layout: ΠΡΟΤΑΣΕΙΣ / ΑΞΙΟΛΟΓΗΣΕΙΣ / ΑΓΑΠΗΜΕΝΑ — own profile only, RLS hides others')

**Admin panel polish**
- Save Location button on AddressMapSection (food/bars/hotels/theater extension forms): explicit save endpoint `/api/admin/items/[id]/location` writes ONLY address+lat+lng. Drag-pin no longer bleeds into global Save. Snapshot tracking + dirty flag + "↺ Επαναφορά" + "✓ Αποθηκεύτηκε" success state.
- Removed keyboard shortcut hint chips above SuggestionsTable + ReviewsTable (visual decluttering — shortcuts still active via `useListKeyboard`)
- Filters Explorer tab restored as second view alongside "Frontend Config" — real-data per-subcategory + per-region item counts with Card/Carousel recommendations (>10 → Card, 4-10 → Carousel, <4 → don't display). Endpoint: `/api/admin/filters/counts?category=X`
- MoviePicker autoFocus race fixed (single search input, click-outside detection — was an inner `autoFocus` input stealing focus from the trigger and triggering its onBlur close timer)
- TMDB API key wired in `.env.local`, validated against live API

**Geocoding + venue location wiring**
- 3-script geocoder pipeline: v1 (raw address → Nominatim, $200K), v2 (with region context — failed because most rows had `region_id=null`), v3 (fragment-based: walks comma-separated address fragments back-to-front + adds ", Greece") — recovered 196/209 v1 failures
- Final: **411/424 venues geocoded** (97% of those with addresses); 13 still-failed are addresses too vague even for fragment extraction; 46 had no address at all (mostly theater rows from earlier data fix)
- `scripts/geocode-venues-v3.js` (the working one), v1/v2 obsolete

**Two new SQL migrations applied to live DB:**
- `scripts/sql/013-search-log.sql` — `public.search_log` table + `trg_fanout_search_matches` trigger + `public.search_log_normalize(text)` function. Hook-driven loop: no-match queries → notification when matching item lands later. Lives in `public` (not `analytics` — Supabase PostgREST exposure + permissions made the original analytics path bumpy).
- `scripts/sql/014-items-title-normalized.sql` — `items.title_normalized text generated stored` column with btree index. Greek-accent-stripped + lowercased copy of title. Search route uses it for accent-insensitive title matching.

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

### Phase A — LLM integration ✅ SHIPPED (via Gemini, not Anthropic)

Originally specced for Anthropic Claude Haiku 4.5. Pivoted to **Gemini Flash-Lite** during sessions 17-18 — same `AIService` interface, drop-in swap, ~5× cheaper at the per-call level (~$0.0001/search at paid tier). All four targeted user-reported failures (νολαν / leonardo di caprio / γαλάτσι μπαρ / generic-reflection coaching) are resolved.

**Shipped:**
- `lib/ai/gemini.ts` (matches the `AIService` interface; mock + anthropic stubs remain swappable)
- Search intent extraction → structured `SearchAnalysis` schema with category/genre/channel/status/period/duration/person/type/location
- Submission match upgrade — full-text Gemini extract → TMDB/Books/Places confirm
- Quality coach + conversational fallback
- Cache table (migration 019) + usage log + `/admin/ai-usage` cost dashboard
- Prompt versioning (`PROMPT_VERSION = "v6"`)

**Still pending under Phase A:**
- ✅ **Migrations 019-025 all applied** (verified 2026-05-12).
- 🛑 **Enable paid Gemini tier** — free tier is 20 req/day. Cost at paid tier ~$0.0001/search.
- ⏳ Other-category external API match (#16): Google Books for books, Google Places for food/bars/hotels (admin side wired; user-side submission flow still falls back to heuristic), Ticketmaster for theater/events.

### Phase A.5 — Immediate audit-gap punch list (post-session 20)

After session 20's onboarding + achievement celebration + badge overhaul, the remaining items are:

1. ~~**Onboarding flow**~~ ✅ DONE (session 20). 4 screens shipped at `/onboarding` with conversational expansion. Gated server-side from the (main) layout.
2. ~~**Achievement unlock celebration**~~ ✅ DONE (session 20). 12-count `TRIGGERS` table → modal at every meaningful step toward a tier. Two variants matching Figma screens 1-6 exactly. **Timing resolved 2026-05-12: 10s delay after Published mount** — gives the user breathing room to read their own confirmation before the celebration takes over.
3. ~~**Security settings page**~~ ✅ DONE (session 21). Real password change, social unlink, sign-out-from-all-devices, device history from `public.devices`. Three new API routes (`PATCH /api/auth/password`, `DELETE /api/auth/identities/[provider]`, `POST /api/auth/signout-all`). Device list reads real data but `devices` table currently isn't auto-populated by any auth hook — future login-hook to fill it.
4. **Admin moderation polish** — (a) admin suggestions queue filter (#29: filter by status / category / hidden), (b) reports queue priority sort (#30: oldest unresolved first), (c) bulk ops on items (#28: bulk publish/unpublish/delete).
5. **Drop legacy `ratings` + `comments` tables** (#25/#26). All UI now reads from `reviews` (migration 016). Two migrations: `029-drop-ratings.sql` (data already wiped) + `030-archive-comments.sql` (export to JSON file in scripts/sql/ first, then DROP).
6. **Map ↔ list drop-down reveal** (Phase D below — kept separate since it's a structural refactor, not a quick fix).
7. ~~**CategoryCard migration sweep**~~ ✅ PARTIAL (session 22). Category-page LIST standardised on `LandscapeCard` for every category (movies/series/books no longer render `RowCard` in the under-filter list). Carousels still use the portrait/landscape branch — that part is correct. The deeper migration to `SuggestionCardPortrait` / `SuggestionCardLandscape` from session 15 is no longer needed since the existing `LandscapeCard` is doing the job.
8. **Geographic distance ranking** — solution #3 from the "nearby" design call (session 21). Add `regions.lat` + `regions.lng` (centroids) so we can compute Haversine from `item.lat/lng` to viewer's region centroid for soft sort. Replaces the current binary in-region / not-in-region split with a real-distance gradient — Γαλάτσι resident sees Αμπελόκηποι items as "near" even when the parent tree disagrees. Admin work: one centroid per region (~100 Athens neighborhoods, ~30 min lookup). Code: extend `lib/regions.ts:getRegionMatchSet` into a `getRegionDistanceMap(centerRegionId): Map<regionId, km>`; soft sort by km ascending.
9. **Browser geolocation opt-in** — "What's near me right now" toggle. Use the W3C Geolocation API to grab viewer's lat/lng on permission grant, then sort items by direct Haversine from their device. Best for "open now near me" use cases, complements #8 (which is for taxonomy-locked home base). Needs UI: toggle on home + a one-tap "use my location" chip on category pages. Stretch: cache the last grant to avoid re-prompting on every visit.
10. ~~**Admin-controlled page layouts**~~ ✅ DONE (session 22). `/admin/layout` with dnd-kit + audience picker + mobile-frame iframe preview. Both category pages AND home page consume the layout array via `page_sections`. See CLAUDE.md §37 for the full architecture.
11. ~~**Admin-configurable detail-page related sections**~~ ✅ DONE (session 22). `/admin/related-sections` with per-category rule list (writer / director / actor / performer / etc.). Auto-hides when `min_items` threshold isn't met. See CLAUDE.md §38.

### Phase A.6 — Open design calls ✅ ALL SHIPPED (session 23)

The four items deferred in session 22 are all closed:

- ✅ **postMessage scroll-to-section in the layout preview iframe.** `LayoutManager` posts `{type:'scroll-to-section', sectionId}` to the iframe on row click; `components/preview/PreviewScrollListener.tsx` (mounted in `app/preview/layout.tsx`) catches the message, scrolls the matching `[data-section-id]` element into view, and applies a 1.6s `.section-highlight` coral ring (defined in `globals.css`, respects `prefers-reduced-motion`). The `data-section-id` wrapper is added at the render-bridge boundary (`renderHomeSection` + `CategoryPageShell.renderSection`) so production gets the attribute too — harmless outside preview. Origin check guards against rogue cross-origin posts.
- ✅ **`item_detail` context in `page_sections` vs. separate table — decision locked + documented.** CLAUDE.md §38 now carries a "two tables, not `context='item_detail'`" subsection with the four reasons (mental-model mismatch, cardinality, admin UX, query path) and three concrete signals to watch for that would justify revisiting. Migration path documented for when/if we unify.
- ✅ **Static-carousel item-source picker.** Replaced the `item-source` placeholder ConfigField with a real picker: search-by-title input (debounced 300ms) + ordered selected list with ▲▼ reorder + remove. New API: `GET /api/admin/items/search?q=…&category=…&limit=…` (with `&ids=…` batch lookup for hydrating already-selected ids). Resolver detects `static_carousel` rows with `config.itemIds` and pre-hydrates the items via `hydrateManualItems` (preserves admin's order, drops unpublished/missing silently). Bridge prefers `section.items` when present, falls back to the auto-source slice otherwise. Empty selection (`itemIds=[]`) collapses to `undefined` so the row reverts to auto.
- ✅ **CLAUDE.md §37/§38 edge-case audit.** Added "Resolver behaviour notes" (audience filter, lifecycle, empty collection drop, singleton enforcement, fixed-widget delete refusal, RLS shape) and "Static-carousel rendering contract" (manual override path, auto-source slice path, portrait/landscape detection, dead-code call-out for `fetchStaticCarousel`). Plus a "Postmessage iframe scroll" subsection covering the new wiring.

### Phase B — Recommendations (pgvector + nightly batch + LLM rerank)

**3-layer architecture, ~5 days:**

**Layer 1: Embeddings**
- Each item → `embedding vector(1536)` from title + plot + tags + actors + reviews via OpenAI text-embedding-3-small ($0.02/1M tokens) or Anthropic alternative
- Each user → `embedding vector(1536)` from their last 30-day activity (bookmarks, ratings, suggestions)
- Items column already provisioned in schema; users column too

**Layer 2: Offline batch (Supabase Edge Function + cron, runs at 04:00)**
- Recompute item embeddings for items with new activity in last 24h
- Recompute user embeddings from rolling 7-day activity window
- For each active user → pgvector top-50 cosine-similarity search → save to `analytics.precomputed_recs`
- Home page reads from `precomputed_recs` for sub-100ms personalized feed (no LLM at request time)

**Layer 3: LLM reranking (Haiku, on-demand)**
- For high-value moments (home hero, "Tailored for You" rail), rerank top-50 candidates → top-5 with 1-line reasoning
- "Επειδή σου άρεσε X, αυτό έχει την ίδια vibe" — explanation visible in UI
- ~$0.001 per rerank, 1-2 reranks/user/day → ~$0.06/user/month

### Phase C — Notification dispatcher with hook-driven loops

**Already saved as memory** ([feedback_hook_driven_mentality.md](.../memory/)). 6 days work. Pure event-matching, no LLM at runtime.

**Already shipped (the prototypes):**
- `notify_bookmarkers_of_airing` trigger (migration 011 — movies tonight) ✅
- `trg_fanout_search_matches` trigger (migration 013 — search log) ✅

**Loops to build (each ~1 day):**

| Trigger | Signal | Notification |
|---|---|---|
| TMDB new-season webhook | bookmarks of series | "Σύντομα: Severance S3" |
| Cron: dormant 14d | activity log + follows | "5 νέες προτάσεις από φίλους σου" |
| Bookmarked event date passed | event_dates + bookmark | "Πώς ήταν το χθεσινό concert; Βαθμολόγησε" |
| Streak threshold hit | last_suggestion_at + cron | "6 εβδομάδες σερί — μη σπάσεις" |
| Friend rated my bookmark | rating insert + bookmark on same item | "@George βαθμολόγησε το X (στα bookmarks σου)" |
| Anniversary of suggestion | suggestion.published_at + cron | "Πριν 1 χρόνο πρότεινες X — N άνθρωποι το βαθμολόγησαν" |

### Phase D — Map ↔ list "drop-down reveal" transition (deferred, ~3-4 hours)

User-requested but reverted in session 17 after several attempts broke `FilterBottomSheet` positioning. The CSS gotcha: any ancestor with `transform` / `will-change-transform` / `filter` becomes the containing block for `position: fixed` descendants, replacing the viewport. So animating the page wrapper makes `fixed inset-0` elements (bottom sheets, modals, popups) compute their position relative to the wrapper, not the viewport — they appear in the wrong place.

**What the user wants:** map descends from above (revealed from behind the global header), pushing the list down off the bottom. Reverse on close. Same map (no internal visual changes to `CategoryMapView`).

**Why it's not a 30-minute fix:**

1. **Both views must mount simultaneously** during the transition (and remain mounted after, for state preservation). Currently `CategoryPageShell` uses early-return — list and map render as alternative branches.
2. **`CategoryMapView` has hardcoded viewport-relative height** (`calc(100dvh - 64px)`) and a `marginBottom` overflow hack. To layer it correctly inside a transformed wrapper, it needs to size to its parent (`h-full`), not the viewport.
3. **`FilterBottomSheet` must move outside the transformed wrapper** (proven by the session-17 bug). Either render via portal (preferred) or position as a fragment-level sibling.
4. **`CategoryWelcomeHeader` uses `position: sticky`** which interacts with parent transforms in fragile ways — may need to become `fixed` or be hoisted outside the animated area.
5. **Body scroll lock** required while the map is open (otherwise the off-bottom list extends the document and scroll-bleeds past the map).

**Recommended approach when revisiting:**

- Refactor `CategoryMapView` to use `h-full` (and drop the marginBottom hack). Standalone visual unchanged — it always renders inside a constrained content area anyway.
- Portal `FilterBottomSheet` to `document.body` (mirrors the ProfilePopup fix that worked in session 17).
- In `CategoryPageShell`, render BOTH layers inside a `position: relative; overflow: hidden;` wrapper with the content-area height (`calc(100dvh - 64px)`). Map layer + list layer absolutely-positioned with `inset: 0`. Both translate together: `transform: translateY(showMap ? 0 : -100%)` on the map, `translateY(showMap ? 100% : 0)` on the list.
- Lazy-mount the map (don't run MapLibre on pages where the user never opens the map). Once mounted, keep.

Estimated: 3-4 hours of careful work + verification across all 5 venue categories.

### Sequencing rationale

A first because:
- It's interactive — the user feels the change immediately
- It unblocks several search/submission failures that no amount of regex fixes
- Smallest scope (4 days)
- Lowest risk (drop-in via AIService interface; graceful fallback to regex)

B second because:
- Recommendations need a content corpus to be meaningful (we have 1900+ items now — enough)
- Builds on Phase A (Haiku for reranking already integrated)
- Needs offline infra (Supabase Edge Functions) — fresh complexity layer

C last because:
- Most loops need historical user activity to be meaningful (90+ days of platform usage)
- Cheapest cost-wise but biggest "feels alive" payoff
- Pattern is established (we have 2 working triggers already); scaling to more is straightforward

### Older priorities (still relevant, deferred behind Phase A/B/C)

**Design system migration sweep** — CategoryCard (used in /movies, /food etc lists) still on legacy implementation. Migrate to use the new SuggestionCardPortrait/SuggestionCardLandscape from session 15. Single sweep across all 9 category pages.

**Inline cleanup follow-ups from session 15:**
- Extract `AddressMapSection` from SuggestionEditor (~174 lines, used in 4+ admin extension forms) into a standalone reusable so it can render in `/admin/showcase` interactively. Currently shown as a placeholder + link to live admin.
- Extract empty-state primitive — used inline in 5+ places (search, /reviews, bookmarks, profile suggestions, category list). Single reusable would unify the pattern (icon + headline + body + CTA).
- Extract Skeleton primitives — `components/ui/Skeleton.tsx` exists but is barely used. Roll out to category pages, profile, /reviews on initial load.
- Replace 9+ inline `"✓ Αντιγράφηκε"` toast patterns with the new `<Toast>` + `useToast()` hook (session 15). Mostly mechanical sweep.

**Detail Pages Figma Alignment (2 of 9 done)** — Series, Food, Bars, Hotels, Recipes, Theater, Events still on legacy InfoCell layout (the original archetype). Note: session 15 already extracted most of the modules used here (RatingCard, AmenitiesRow, etc.) so the remaining work is layout/composition, not new components.

**Region backfill via reverse geocoding** — bigger fix for the venue-location problem. Use existing 411 lat/lng + Nominatim reverse → admin levels → match against regions table → backfill `region_id`. Can be done independently or as part of Phase B prep.

**Submission-flow auth state cleanup, onboarding flow, achievement celebration animation, etc.** — same priority as before, just queued behind A/B/C.

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
