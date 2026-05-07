# Proteino — Build Progress

Last updated: 2026-05-07 (session 16 — design system showcase completion: 16 tabs · ~110 components · per-tab file split)

---

## 0. WHERE WE LEFT OFF (read first when resuming)

**Current state — session 16 finished:**

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

### Phase A — Anthropic Claude Haiku integration (LOCKED, awaiting API key)

User is buying credits as Individual plan. Once `ANTHROPIC_API_KEY` lands in `.env.local`, this is the next session's work. Full architecture documented in **AI.md §12**.

**Why this is Priority 1:**
The regex-based extraction has hit its ceiling. Real user-reported failures that ONLY LLM solves:
- `νολαν` → 0 (Greek transliteration of Nolan)
- `leonardo di caprio` (with space) → 0 (DB stores "Leonardo DiCaprio" as one word)
- `γαλάτσι μπαρ` → silent fall-through (sub-region not in regions table, no clarifying question)
- `ωραία ταινία` reflection → generic regex tip vs. semantic "Πες ποια σκηνή σε άγγιξε"
- Mini-chat is theatrical — same regex search wrapped in chat UI

**Cost projection (locked):**
- Per-call: ~$0.0005 search / ~$0.004 submission with prompt caching
- At 100K DAU + 3 searches/day + 30K submissions/month: **~$3,500/month** (~3% of projected revenue)
- At 1K DAU starting point: ~$30/month
- Self-hosted analysis (rejected for now): worse Greek quality, 3-6 weeks setup, not worth it pre-50K DAU

**Build plan (4 days, sequential):**

**Day 1 — Foundation**
- `lib/ai/anthropic.ts` implementing existing `AIService` interface (mock is the contract — drop-in swap)
- `lib/ai/index.ts` updated to pick implementation by env var presence (`ANTHROPIC_API_KEY` → Anthropic, else Mock)
- Anthropic SDK (`npm install @anthropic-ai/sdk`)
- System prompt files in `lib/ai/prompts/` — one per task: searchIntent, submissionMatch, qualityCoach, conversation
- Prompt caching enabled by default (`cache_control: { type: "ephemeral" }` on system blocks)

**Day 2 — Search intent extraction (highest UX impact)**
- `/api/search` calls Haiku to extract `{ category, actors, directors, location, vibe, time, ambiguity_level }` from user query
- Replaces the regex-based extraction. Falls back to current regex if Anthropic call fails (graceful degradation).
- DB query uses structured filters (actors[] jsonb path, region_id, etc.) instead of ilike-on-title
- Solves: `νολαν`, `leonardo di caprio`, `films by Coppola starring De Niro`

**Day 3 — Submission match upgrade**
- Haiku reads full reflection text, extracts `{ title, category, year_hint, actor_hint, director_hint, mood, confidence }`
- TMDB / Books / Places confirms via existing enrichment helpers
- Better confidence calibration than heuristic scoring
- All categories (not just movies/series) get LLM-grade extraction

**Day 4 — Quality coach + conversational fallback + cost dashboard**
- Quality coach (`useSubmission` calls): replaces `lib/ai/quality.ts` regex with Haiku semantic understanding
- Real coaching dimensions: WHY / SPECIFIC / EMOTIONAL / ACTIONABLE with contextual next-prompt
- Conversational fallback: real LLM in the no-match mini-chat instead of theatrical regex
- Admin cost dashboard at `/admin/ai-usage` — daily token spend, top expensive queries, rate-limit indicator

**Decision points already locked:**
1. ✅ Individual plan + pre-paid credits
2. ✅ Set $30/month soft cap as initial budget alert
3. ⏳ Order: search-intent first (biggest UX impact)
4. ⏳ Caching: Postgres-based per-query cache table for hot queries (cheap, bypasses Anthropic for repeats)

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
