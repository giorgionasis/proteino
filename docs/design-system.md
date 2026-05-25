# Design System

Visual reference: tokens, typography, image pipeline, icon registry, motion, component catalog. Read on demand — CLAUDE.md carries the quick reference.

**Live truth:** `/admin/showcase` documents every reusable component (16 tabs, ~110 components). Open it before designing new variants.

---

## Theme

- **Base:** Light theme throughout — white background, zinc text scale, coral accent.
- **Exception:** Dark theme for the Syncing screen (brief takeover during AI enrichment) + the achievement-unlock modal celebration.
- **AI flows (Search + Submission + Published):** Light theme.
- **Published celebration:** Light theme — was dark in the original spec, moved to light for better hierarchy.

## Color palette (Figma-verified)

```
Coral-600:   #FE6F5E    primary accent, CTAs, AI elements, active states
Coral-700:   #E05A4A    hover
Coral-50:    #FFF5EC    light backgrounds, selected states
ios-gray:    #F2F2F7    search/pill input backgrounds (iOS-style)
Zinc-950:    #18181b    headings
Zinc-800:    #27272a    primary body text
Zinc-700:    #3f3f46    secondary text
Zinc-600:    #52525b    muted text
Zinc-500:    #71717a    labels, captions
Zinc-400:    #a1a1aa    placeholders, disabled
Zinc-200:    #e4e4e7    borders default
Zinc-100:    #f4f4f5    surface backgrounds
Zinc-50:     #fafafa    subtle backgrounds
Success:     #1D9E75
Danger:      #E24B4A
Warning:     #FF9123
Gold:        #F8D160    achievements
Badge-red:   #C51501    notification dot
```

**Coral gradient:** `#FE6F5E → #FF9980` (buttons, progress bars, FAB shadow).

## Typography

- **Font:** Open Sans (Google Fonts).
- **CSS gotcha:** `@import url(...google.com/fonts...)` MUST be at the TOP of `app/globals.css`, before `@tailwind` directives. Turbopack rejects `@import` after other rules (PostCSS expands tailwind in-place).
- **Weights:** 400 (body), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold), 900 (logo/display).
- **Labels:** UPPERCASE, letter-spacing 0.1px, weight 500-600.
- **Body:** 16px base, line-height 1.5.
- **Scale:** 9 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 26 / 32 / 36 px.

## Spacing + radius

- **Border radius:** 4px (micro) · 8px (cards, stat boxes) · 12px (auth inputs) · 16px (large cards) · 50px (search pill) · 9999px (avatars, icon buttons).
- **Borders:** 1px solid zinc-200 (default), 1.5px coral (focus).
- **Icon buttons:** 36px circle, zinc-100 background.

---

## Layout chrome

### Global

```
Header (sticky, z-30):
  Left:  Proteino• logo (text + coral dot)
  Right: Bell icon (registered) — guest sees nothing

Content area (scrollable)

FAB (fixed, z-30, bottom-right):
  Visible on: Home, category pages, item detail, profile
  Hidden on: Search overlay, suggestion overlay, auth pages
  56px circle, coral gradient, shadow-fab

Bottom Nav (sticky, z-40):
  3 tabs: HOME · SEARCH · YOU
  Active: coral icon + coral label
  Inactive: zinc-400 icon + zinc-400 label
```

### Full-screen overlays (cover header + content + bottom nav)

Both search and suggestion are `fixed inset-0 z-50` overlays that slide up from the bottom.

**Search overlay** (SEARCH tab):
- Custom header: search icon + "SMART SEARCH" + X
- X close → returns to previous page
- No bottom nav visible
- Light theme

**Suggestion overlay** (FAB):
- Custom header: waveform + "LISTENING LIVE" + X (changes to "LOCKED" badge on match)
- State machine: IDLE → LISTENING → ANALYZING → MATCHED → LOCKED → SYNCING → PREVIEW → PUBLISHED
- SYNCING + PUBLISHED states: dark theme exception

### YOU tab — Guest behavior

Renders value-proposition page (not login redirect):
- Preview of profile (blurred/dimmed)
- 3 bullet value props with icons
- CTA: "Δημιούργησε λογαριασμό" + "Έχω ήδη λογαριασμό →"

### Overlay state management

Zustand store (`useOverlay`):

```ts
{ overlay: 'search' | 'suggestion' | null,
  openSearch(), openSuggestion(), close() }
```

---

## Detail page composition rules

The 9 detail pages are visual variations of one archetype. CLAUDE.md has the briefing-level rules; full reference below.

### Hero + meta

- **No chips under hero by default.** If 2-3 inline metadata pairs are needed, surface them via `InfoCell` below the user reflection — NOT as chip row.
- **3-col stat bar is conditional.** Movies show ONLY when Oscar present + `avgRating ≥ 4.5`. Default = inline `<RatingLine>` (`★ X.XX · N αξιολογήσεις`).

### Suggester block

- **Unboxed** — avatar + name + badge + reflection text + date, no border or fill.
- **Mandatory on all 9 categories** (was missing on Bars + Series before session 24).
- Pattern: `UserAvatarWithPopup` + `UserBadge` + reflection.

### Lists + carousels

- **1-column list across all 9 categories.** New `<RowCard>` variant for portrait categories (movies/series/books) — small 88×132 poster left + title/meta/byline/rating right.
- **Carousels stay portrait** for movies/series/books.
- **Histogram + Top Rated** combine ratings from BOTH `ratings` table + `suggestions.rating`, deduped by user. Server-side computation. Overrides `item.rating_count + avg_rating`.

### Extras

- **`<ExtraRatingsRow>`** ("Άλλες βαθμολογίες") below review carousel — compact rows for users who rated but didn't write a suggestion. Common on K2-migrated items.
- **Own-suggestion behavior** — replaces rate card with `<OwnSuggestionActions>` (Edit + Delete). Comments stay open.

### Hard rules (session 24 locked)

- **Empty-state = hide, never "—".** Every InfoCell / row / banner / panel conditionally renders. If a metadata pair has both cells empty, hide the row INCLUDING its divider. If one cell is empty, render `<div className="flex-1" />` spacer so the visible cell keeps layout. Category-specific module (amenities, external ratings, venue block, performers) hides whole if no data.
- **No gray-circle placeholders for people.** Every actor/performer/director/writer bubble is `<PersonBubble name avatarUrl?>` — real image when available (`ext.actors[].avatar` / `.photo` / `.avatar_url` / `.image`), else deterministic colored-initial circle via `<AvatarImage>` palette hash. Two layouts: `stack` (vertical, used in actor carousels) and `inline` (horizontal, used in director rows).
- **No dead CTAs.** Every button/link goes somewhere real. Map → Google Maps (lat/lng if present, else `{title} {address}` search URL). Phone → `tel:`. Website → `https://` URL (auto-prefixed when admin entered bare domain). Trailer overlays → `ext.trailer_url`, hidden when absent. Removed: the fake recipe "Αγόρασε τα υλικά online" CTA.

---

## Sub-categories + filters

### Principle

- **Sub-categories** = what kind it IS (genre, cuisine, type) — fixed taxonomy via `categories.parent_id`.
- **Region/Location** = WHERE it is — always a filter attribute, never a sub-category.
- **AI search** = primary discovery tool.
- **Sub-category tabs + filter row** = secondary browsing tool.

### Primary tab dimension by category

| Category | Primary tab |
|---|---|
| Movies / Series / Books | Genre |
| Recipes | Type / Origin |
| Food | Type (establishment) — cuisine + region as filters |
| Bars | Type |
| Hotels | Destination (dynamic from data) |
| Theater / Events | City (dynamic from data) |

### Sub-categories per category

- **Movies:** Δράμα · Κωμωδία · Θρίλερ · Δράση · Sci-Fi · Ρομαντική · Animation · Ντοκιμαντέρ · Horror · Βιογραφική
- **Series:** Δράμα · Κωμωδία · Crime · Sci-Fi · Θρίλερ · Ρομαντική · Ντοκιμαντέρ · Mini-series · Animation
- **Books:** Μυθιστόρημα · Θρίλερ · Sci-Fi · Ιστορία · Αυτοβιογραφία · Ψυχολογία · Φιλοσοφία · Self-help · Ποίηση · Business · Παιδικά
- **Recipes:** Κυρίως Πιάτο · Ορεκτικά · Επιδόρπια · Breakfast · Ψητά · Σαλάτες · Σούπες · Γλυκά · Ψωμί & Ζύμες
- **Food:** Ταβέρνα · Μεζεδοπωλείο · Ψαροταβέρνα · Εστιατόριο · Ουζερί · Πιτσαρία · Ρακάδικο · Τσιπουράδικο · Κουτούκι · Παραδοσιακό Καφενείο · Μαγειρείο (computed dynamically from `item_food.type` distinct values). Cuisine is a bottom-sheet multi-select filter.
- **Bars:** Cocktail Bar · Wine Bar · Jazz Bar · Rooftop · Beach Bar · Coffee · Speakeasy · Pub · All-Day · Sports Bar
- **Hotels / Theater / Events:** Dynamic from data (destinations / cities)

### Filter row layout

```
[⊞ Filters · N]  [Quick Filter 1 ▾]  [Quick Filter 2 ▾]  [📍 Κοντά μου]
                                                          ↑ food/bars only
```

Quick filters per category:
- Movies/Series: Platform, Εποχή
- Books: Γλώσσα, Σελίδες
- Food/Bars: Περιοχή, Τιμή
- Hotels: Τιμή/νύχτα, Αστέρια
- Events/Theater: Ημερομηνία, Τιμή
- Recipes: Δυσκολία, Χρόνος

Active filter chip: coral fill. Filter count badge on "⊞ Filters" when active.

---

## Image pipeline

### Two images per item

```sql
-- items table
poster_url   text,  -- Portrait 2:3  — lists, carousels, category grids
backdrop_url text,  -- Landscape 16:9 — detail hero, featured cards
```

### Orientation per category

```
Portrait (2:3)   → Movies, Series, Books      (posters, book covers)
Landscape (16:9) → Food, Bars, Hotels, Events, Theater, Recipes
```

### Sizes (Sharp auto-generates on upload)

```
thumbnail → 400x600px portrait  / 640x360px landscape    (lists, grids)
card      → 800x1200px portrait / 1280x720px landscape   (category pages)
hero      → 800x1200px portrait / 1280x720px landscape   (detail page)
og        → 1200x630px landscape always                  (social sharing)
```

### Storage

Supabase Storage with built-in CDN. Migrate to R2/CloudFront only at significant scale.

### Auto-fetch during submission (SYNCING phase)

```
Movies/Series → TMDB (poster_path + backdrop_path)
Books         → Google Books (thumbnail) — to be replaced by Biblionet
Food/Bars     → Google Places (photos[0] for both)
Events/Theater → Ticketmaster (images)
```

Admin can override via manual upload at any time.

### `items.images` dual-shape gotcha

See CLAUDE.md "Item images" invariant. Modern shape:

```json
{
  "poster":   { "s, m, l, xl": "..." },
  "backdrop": { "s, m, l, xl": "..." },
  "og":       "...jpg",
  "gallery":  [{ "url", "tab?", "alt?", "isDefault?" }]
}
```

Legacy K2 rows may store `images` as bare array. `extractGalleryImages` + `mergeGalleryIntoImages` in `lib/images/gallery.ts` normalise. **Don't `Array.isArray` narrow** — wipes modern shape. Session 31 wiped a real row via this exact bug.

The image-pipeline owns `poster` / `backdrop` / `og` slots; the admin editor owns `gallery`. Server-side merge in `/api/admin/suggestions PUT` re-reads current `images`, merges via `mergeGalleryIntoImages`, writes result. Client sends only `gallery: GalleryImage[]`.

---

## Icon system (session 14)

Single source of truth for all icon assets across frontend AND admin.

### File structure

```
public/icons/
├── brands/      # 16 — efood, box, booking, google, imdb, netflix, ...
├── nutrition/   # 5  — vegan, no-milk, sugar-free, ingredients, steps
├── amenities/   # 19 — hotel, breakfast, parking, pool, wifi, sea-view, ...
├── property/    # 5  — apartment, villa, camping, house, ...
├── awards/      # 4  — oscar-best-{actor,picture,screenplay,sound}
├── badges/      # 4  — verified, gold, expert, platinum
├── ui/          # 7  — star, pin, calendar, play, follow, ...
├── profile/     # 6  — leaves, suggestions, reviews-star, rating-leaves, thumb-up, ...
└── admin/       # 2  — placeholder-upload, link-card

lib/icons.ts             # Registry + type-safe IconName + catalogs/helpers
components/ui/Icon.tsx   # <Icon name="..." size={24} />
```

### Registry-driven

Add an icon: drop SVG in subfolder, register in `lib/icons.ts`, done.

```ts
import { Icon } from "@/components/ui/Icon";

<Icon name="vegan" size={48} />
<Icon name="amenity-wifi" size={32} />
<Icon name="booking-wordmark" width={140} height={32} alt="Booking.com" />
```

### Helpers (`lib/icons.ts`)

- `badgeIconForSuggestions(count): IconName | null` — null below 3, then verified / gold / expert / platinum at 3 / 10 / 25 / 50.
- `badgeLabelForSuggestions(count): string | null` — same thresholds.
- `badgeIconForLevel(level): IconName` — LEGACY, commented as unreliable post-K2 migration. Use suggestion-count variants.
- `platformIconForChannel(channel: string): IconName | null` — channel → streaming brand.
- `oscarIconForCategory(type, category): IconName | null` — award type+category → specific oscar.
- `getActiveAmenities(facilities: unknown): string[]` — handles array-of-strings OR object-of-booleans.

### Catalogs (admin form data)

- `HOTEL_AMENITY_GROUPS` — 3 groups (Παροχές / Θέα-Τοποθεσία / Extra) for `<IconToggleGrid>`.
- `RECIPE_NUTRITION_OPTIONS` — vegan / no-milk / sugar-free.
- `HOTEL_PROPERTY_TYPES` — visual radio cards.
- `FOOD_AMENITY_OPTIONS` — restaurant subset (parking/wifi/pet/...).

### Reusable primitives (session 14)

- **`<UserBadge>`** — suggestion-tier badge + label. Accepts `suggestionCount` (preferred — derives via `badgeLabelForSuggestions`) or legacy `level`. Returns `null` below 3 when suggestionCount supplied.
- **`<OutlinedPill>`** — pill button with arrow (Booking, Public, Delivery, Theater ticket).
- **`<IconToggleGrid>`** — visual checkbox grid in admin (icon + label, coral active state).
- **`<ReviewCardFooter>`** — vote up/down + αναφορά footer used by all 9 detail pages.
- **`<ExtraRatingsRow>`** — compact rating-only entries.

---

## Badge tier (canonical)

| Suggestions | Badge | Label |
|---|---|---|
| 0–2 | (none) | brand-new user shows no badge |
| 3–9 | Verified | Επαληθευμένος χρήστης |
| 10–24 | Gold | Έμπειρος χρήστης |
| 25–49 | Expert | Expert |
| 50+ | Platinum | Platinum |

Admin `UsersTable` has one extra NEW tier (< 3) so moderation column always labels something — different rule than public UI.

`<UserBadge>` contract: `kind` (explicit) → `suggestionCount` (preferred) → `level` (legacy). Renders `null` if `suggestionCount` < 3.

---

## Motion + animation system

### Foundations

- **`tailwindcss-animate`** installed → `animate-in / animate-out / fade-in / slide-in-from-bottom / zoom-in-* / duration-* / delay-*` utilities available.
- **`prefers-reduced-motion`** global override in `app/globals.css`: instant resolution for animations + transitions. Non-negotiable accessibility default.

### Named easings (`tailwind.config.ts`)

- **`ease-spring`** — `cubic-bezier(0.32, 0.72, 0, 1)` — iOS decel; bottom sheets, page transitions.
- **`ease-soft`** — `cubic-bezier(0.4, 0, 0.2, 1)` — Material-standard; general UI.
- **`ease-pop`** — `cubic-bezier(0.34, 1.56, 0.64, 1)` — overshoots 1.0; reward interactions (likes, bookmarks, achievements).

### Shipped effects

Overlay slides · card tap scale · FadeImage · bookmark/follow/star pop-in · SubCategoryTabs/BottomNav sliding indicators · search result stagger · AI panel slide-down · MATCH LOCKED zoom+pill · Toast slide-in · FAB scale-in · logo dot pulse · map pin tap · input focus transition · review-card-appear keyframe · bookmark orbit microinteraction · FLIP push-right for review carousel reorder.

### CSS gotchas locked in

- **Transformed ancestor → `position: fixed` containing block.** Any element with `transform`, `will-change-transform`, `filter`, or `perspective` becomes the containing block for fixed descendants, replacing the viewport. `FilterBottomSheet`, `Modal`, `ProfilePopup` ALL use `fixed inset-0`. If you animate a wrapper that contains them, they'll mis-position. Render fixed elements as siblings of the animated wrapper, or via portal to `document.body`.
- **Conditional mount kills exit animations.** `{open && <Popup>}` unmounts the popup instantly when `open` flips to false — exit animation never plays. Pattern: always render, let component manage its own `mounted` state with delayed unmount (`setTimeout` matching transition duration).
- **CSS animations need a property change to fire.** Setting `style={{ animation: 'slideUp …' }}` on first mount may not animate if property already applied. Use CSS transitions on a state-toggled property (`transform`, `opacity`); `requestAnimationFrame` gap between mount and "show" state lets browser commit the start frame.
- **`animate-in slide-in-from-bottom` (no suffix) has no translation.** From `tailwindcss-animate`, suffix-less variants don't translate by any specific distance. Use `slide-in-from-bottom-N` (Tailwind spacing) or the project's own `slideUp` keyframe (which animates `translateY(100%) ↔ 0`).

### Bookmark orbit (session 19)

On SAVE only (not on remove), the hero cover image clones and flies a quadratic Bezier arc into the bookmark IconButton. Tunable constants in `hooks/useBookmarkOrbit.ts`:

```ts
const DURATION_MS = 700;     // total flight time
const ARC_HEIGHT  = 220;     // px lift at the control point
const KEYFRAMES   = 24;      // path smoothness
const FADE_START  = 0.97;    // near-zero fade — shrinkage handles disappearance
const END_PX      = 1;       // final clone size at icon centre
```

DOM-based discovery: hero wrapper carries `data-orbit-source`, IconButton carries `data-orbit-target`. No React refs through props. Honours `prefers-reduced-motion` (200ms straight fade fallback).

### Bookmark bounce orchestration

`bookmark-bounce` keyframe in `tailwind.config.ts`: `1.0 → 1.35 → 0.88 → 1.08 → 1.0` over 520ms with `ease-pop`. Applied to the whole 36px IconButton circle, re-fired via `key={popKey}` increment.

SAVE orchestration: fly + toggle in parallel → await fly (~700ms) → flip icon (bounce plays) → await API → sleep 600ms → open `BookmarkSavedModal`. REMOVE is instant.

### FLIP push-right (`hooks/useFlipReorder.ts`)

Generic FLIP hook. Takes container ref + `data-*` attribute name + deps array. On every render: finds matching children, compares to prior `getBoundingClientRect()`, applies inverse `translate()` + `transition: none` to rewind, then on next frame removes transform with `transition: 480ms ease-spring`. Used by `<ReviewCard>` (via `data-review-id`) when a new review lands at carousel position 0.

---

## Components catalog (`/admin/showcase`)

Single source of visual truth. ~110 components across 16 tabs.

| Tab | Components | Count |
|---|---|---|
| **Primitives** | Button · Input · Textarea · Card · Badge · Avatar · AvatarImage · StarRating · IconButton · FilterChip · SortPills · Spinner · StatCard · FollowButton · WantToSeeButton · Skeleton | 15 |
| **Foundations** | UserBadge · OutlinedPill · Icon · AllReviewsButton | 4 |
| **Cards** | ReviewCard · SuggestionCardPortrait/Landscape · CarouselSection · RatingBox · SuggesterCard · BookmarkIcon | 7 |
| **Detail modules** | RatingCard · BookingAvailabilityCard · ActivityCard · PublicBookAd · AuthorCard · AmenitiesRow · NutritionRow · DurationCard · PlatformLinksCard · ReviewCardFooter · OwnSuggestionActions · UserAvatarWithPopup · DeliverySelector · PlatformSelector · ItemGalleryViewer · ExtraRatingsRow | 16 |
| **Profile** | ProfileCard · BadgeDisplay · Stats · ProfileScoreCard · ProfileVotesCard · CategoryStatCard · RowMenu · FollowersPopupCentered · ProfilePopup · BookmarkedCard · OwnSuggestionCard | 11 |
| **Category** | CategoryCard (4 variants) · FeaturedCard · SubCategoryTabs · FilterRow · FilterBottomSheet · CategoryHeroStats · CategoryTopUsers | 7 |
| **Home** | AIChips · MoviesTonightSection · SuggestedUsers · ContributionCTA · DailyPrompt · SupportSection · home/CategoryTiles · guest/SuggestionFeed · guest/HeroDiscover/Suggest/Personalise · guest/HowItWorks · guest/RegisterPromo · guest/CategoryTiles | 12 |
| **Submission/AI** | ProteínoIntelligence · AchievementProgress · ai/ProgressBar | 3 |
| **Recommendation** | Carousel · CarouselPortrait · CarouselLandscape · BecauseYouLiked · CollectionRenderer (link-only) | 5 |
| **Auth** | AuthHeader · AuthDivider · AuthTrustBadge · OAuthButtons · PasswordRuleList | 5 |
| **Layout** | Header · BottomNav · FAB · MaintenanceBanner · FullScreenOverlay · ReportLink (most link-only) | 6 |
| **Modal** | Modal · ConfirmDeleteDialog · DeleteSuccessDialog · ReportFlowModal (link) · EditSuggestionModal (link) | 5 |
| **Toasts** | Toast · useToast() hook | 2 |
| **Notifications** | NotificationCard (6 type variants) | 1 |
| **Admin** | IconToggleGrid · PropertyTypeSelector · ImageUploader · ImageGallery · LocationPicker (link) | 5 |
| **Patterns** | Empty state · Skeleton (placeholders for future) | 2 |

### File structure

```
app/admin/showcase/
├── page.tsx                  # 45 lines — composer
└── tabs/                     # 16 focused files, 100-700 lines each
    └── {Primitives,Foundations,Cards,DetailModules,Profile,Category,
         Home,SubmissionAI,Recommendation,Auth,Layout,Modal,Toasts,
         Notifications,Admin,Patterns}Tab.tsx

components/admin/showcase/
├── ShowcaseShell.tsx         # tabbed nav + active state
└── ShowcaseSection.tsx       # per-component wrapper + Variant cell
```

### Patterns

- **Variant cell:** `<Variant label="…" note?="…" dark?>` — preview surface, optional dark bg for light components.
- **Context links:** every section has `contextLinks={[{ label, href }]}` pointing to live pages where the component is used.
- **Link-only fallback:** components that need real server context (full overlays, fixed-position chrome, server components) get a description + "see live" link rather than a fake render. Used for Header / BottomNav / FullScreenOverlay / CollectionRenderer / LocationPicker / ReportFlowModal / EditSuggestionModal.
- **Per-tab file split:** one TS error in any tab no longer takes down the whole showcase.

### When to update

- New shared component → add a section to the matching tab.
- New visual variant → add a `<Variant>` cell.
- Component refactor → check if any showcase variant breaks (TypeScript catches it).
- Major redesign → review the showcase first, lock the variants, then ship the redesign.

---

## Admin UI primitives

`components/admin/ui/`:

```
├── AdminPageHeader.tsx     # Title + subtitle + meta + primary CTA
├── AdminPanel.tsx          # Bordered card with optional toolbar slot
├── AdminRow.tsx            # Generic list row — title / meta / actions slots
│                           # Actions hidden by default, revealed on
│                           # group-hover + focus-within. AdminActionButton
│                           # + AdminActionSelect sub-components.
└── AdminEmpty.tsx          # Icon + title + description + CTA empty state
```

### Patterns

- **Hover-revealed actions** — secondary controls (parent dropdown, delete, add-child) only appear on row hover. Reduces visual clutter.
- **Typographic hierarchy** — primary title 14-15px medium zinc-900 · metadata 12px muted zinc-400 · actions far-right 28px icon buttons.
- **Tree rendering** — `AdminRow` accepts `depth` (18px indent per level). Renders unbounded-depth tree without finder-style guide lines.

First showcase: `/admin/content/regions`. Same primitives can replace ad-hoc styling in `/admin/content/filters`, `/admin/content/activities`, `/admin/users`, `/admin/reports`, `/admin/reviews`, `/admin/categories` (~1h each).

---

## Admin IA + visual refresh

Session 25 regrouped the sidebar into 6 jobs-based sections:

```
Overview

MODERATION                     ← red dot
  Reviews                      (reviews + reports consolidated session 28)
  Suggestions
  Data Quality

CONTENT — what users see       ← blue dot
  Layout
  Related Sections
  Collections
  Movies Tonight
  Activities

TAXONOMY — platform vocabulary ← amber dot
  Categories
  Regions
  Filters
  Extra Fields

ENGAGEMENT                     ← violet dot
  Moments
  AI Usage

PEOPLE                         ← emerald dot
  Users

PLATFORM                       ← zinc dot
  Settings
  Legacy Comments
  Showcase
```

Active link state: soft `bg-coral-50 text-coral-700` pill.

### Overview = control room

- **Needs your attention** — 4 cards (Reports pending · Unpublished suggestions · Data quality · Maintenance mode binary). 14-day sparkline per card. Click-through to action page. All-clear: small green ✓ "All clear" (muted, not shouty).
- **Last 7 days** — 4 metric cards (New items / reviews / users / AI spend). Sparklines + tabular numerals.
- **Quick actions** — 4 pill buttons: New suggestion / New collection / New activity / Preview homepage.
- **Stagger entrance** — cards fade-in + slide-up 60ms stagger on first paint.

Fail-soft when `ai_usage_log` migration (019) not applied — AI spend defaults to $0.00.

### Audit log (session 25 + mig 040)

`<RecentChanges>` widget on `/admin` reads `modified_at` + `modified_by` from `moments`, `page_sections`, `collections`, `related_sections_config`, `category_filters`. Five PATCH endpoints stamp the columns via `lib/admin/audit.ts:executeWithAuditFallback` (degrades silently on `42703`).

---

## Profile screen visuals

### Badge area

- Uses design-system `<Icon name="badge-verified">` hexagon.
- Flanked by leaf-wreath SVGs (`profile-leaves-left` + `profile-leaves-right`) — 127×134px, faded zinc-100 fill.
- Layout: `items-center justify-center` so badge sits centred between leaves.

### Stats row icons

- Suggestions: `profile-suggestions` (pencil SVG).
- Reviews: `profile-reviews-star`.
- Bookmarks: inline outline SVG.

### Score + votes cards

| Component | Title | Big number | Icon | Link |
|---|---|---|---|---|
| `ProfileScoreCard` | Συνολική Βαθμολογία | `score.toFixed(2)` | `profile-rating-leaves` (gold laurel) | "Δες και τις N τις βαθμολογίες" |
| `ProfileVotesCard` | Θετικές ψήφοι | `votes` (int) | `profile-thumb-up` | "Δες όλες τις αξιολογήσεις" |

Both have `ⓘ` info-icon next to title with optional `onInfo` callback. 260px min-width, scroll horizontally. Score from `users.avg_quality_score` ("—" when 0). Votes summed server-side from `reviews.vote_up`.

### Profile lists v2 (session 31)

`<ProfilePoster>` primitive in `components/profile/shared/`. Three modes:

| Mode | Use case | Portrait | Landscape |
|---|---|---|---|
| `thumb` | Inline cell (suggestions/reviews row) | `w-[76px] h-[114px]` (2:3) | `w-[120px] h-20` (3:2) |
| `hero` | Full-width stacked card top | `w-full aspect-[2/3]` | `w-full aspect-[3/2]` |
| `tile` | Grid cell (bookmarks grid) | `w-full aspect-[2/3]` | `w-full aspect-[3/2]` |

Three surfaces:
- **Suggestions** — single category, portrait → row card (thumb left + info right); landscape → stacked.
- **Bookmarks** — multi-category grouped grid. Portrait → 2-col 2:3 tiles; landscape → 1-col on mobile / 2-col on sm+ with 3:2 tiles.
- **Reviews** — heterogeneous list, each review's `item.category` drives orientation. Long text expand at 200 chars.

Page chrome: count strip is `text-2xl font-bold` (was 52px in zinc-100 pill). Sort pills bare `h-9 px-4 rounded-full`.

Legacy cards (`OwnSuggestionCard`, `BookmarkedCard`, `ReviewCard` 342-width) kept in-tree for showcase reference; no production code mounts them.

---

## Review writing flow visuals

### `<RateThisItem>` state machine

| Phase | Visible content | Trigger |
|---|---|---|
| **idle** | Question + 5 empty stars | First render no rating |
| **composing** | Stars (current filled) + calibration label + textarea + Άκυρο/Δημοσίευση | First star tap OR edit pencil |
| **saved** | Stars + "Η αξιολόγησή σου" + edit pencil | After publish, or initial with rating |

### Server interactions

- **First star tap** (idle→composing): instant POST `/api/reviews` `(rating, reflection: null)`. Parent NOT notified — `onPublished` reserved for explicit Publish.
- **Re-tap different star**: another instant POST.
- **Άκυρο**: collapse to saved if rating > 0, idle otherwise. Reset text. No server hit.
- **Δημοσίευση**: POST with reflection. Store in `pendingPublish`, transition to `saved`, open success modal.
- **Modal close**: fire parent's `onPublished` → setLiveReview → mergeLiveReview → carousel re-render with new review at position 0 (FLIP push-right). Auto-flips bookmark wishlist→done.

### Optimistic insertion

`lib/reviews/merge-live.ts:mergeLiveReview(serverReviews, live, currentUser)` filters out any server row by currentUser.id, prepends optimistic row built from publish result + `data.currentUser`.

Each `ReviewCard` gets `appearAnimation={!!liveReview && r.id === liveReview.id}` — only the just-published card animates.

### Animation primitive

`@keyframes review-card-appear` in `globals.css`: opacity 0→1 + `scale(0.92) translateY(8px) → identity` over 420ms ease-spring, `transform-origin: left center`.

---

## Submission flow — category chip + recipe wizard (session 38)

The free-text-first submission UX gained two surfaces this session. Architecture details in `docs/architecture.md` → "Recipe submission"; the visual contract below.

### Category override chip + picker

Below the textarea during `typing` / `match_found` states. Two visual states:

| State | Background | Border | Trailing affordance |
|---|---|---|---|
| AI-detected | zinc-50 | zinc-200 | `— Άλλαξε` muted hint |
| User manually picked | coral-50 | coral-200 | `Επιλέχθηκε` coral badge |

Chip is `h-9 px-3 rounded-full` with `gap-2` icon + label. Hidden during the empty state (nothing to override) and during full-screen takeovers.

**`<CategoryPicker>`** — portal-mounted slide-up bottom sheet. 3×3 emoji grid using the resolver-overlaid category list (`{slug, labelEl, icon}[]`). Active selection is coral-bordered. Footer "Επανέφερε στο AI" link visible only when manual override is set. Uses the mounted-until-animation-done pattern (300ms ease-spring translate + backdrop fade); honours `Escape` close. The brand promise stays "type and we'll figure it out" — the chip is a quiet escape hatch, not a step in the flow.

### Recipe wizard

Replaces the textarea + IntelligencePanel area when `effectiveCategory === "recipes"`. Single scrollable screen with the header LOCKED-variant chrome (no-bottom-border, `"Συνταγή"` coral pill, "← Άλλαξε κατηγορία" link).

Sections in order:

1. **`<LinkImportBar>`** — collapsed default is a single text link `Έχω link από συνταγή ›`. Tap expands to URL input + Φόρτωση button + × dismiss. On success collapses to `✓ Εισαγωγή από <host>` pill (dismissible). On failure stays expanded with reason-specific copy + `συμπλήρωσε χειροκίνητα` hint.
2. **Title** — single text input, pre-filled from AI extraction.
3. **`<IngredientList>`** — stacked rows of `[# count] [qty input] [unit select] [name input + autocomplete] [× delete]`. Enter on name adds + focuses a new row. Last row's "+ Πρόσθεσε υλικό" link is coral. Empty list never — clearing the last row resets it instead of unmounting.
4. **`<StepList>`** — numbered steps. Number badge `w-7 h-7 bg-coral-600 text-white rounded-full`. Auto-grow textareas. Paste-block-friendly: pasting multi-line content into an empty step splits on `\n` and strips `1.` / `2)` numbering automatically.
5. **Reflection** — single textarea, pre-filled from the text typed before the wizard fired.
6. **Rating** — 5 stars, mandatory. Coral fill at active count, zinc outline beyond.
7. **Optional metadata** — collapsible (`▾` rotates). Two-col grid of NumberFields (yields / calories / prep / cook) with suffix labels (`άτομα` / `kcal` / `min`). Level chip group + Nutrition chip group (vegan / no_milk / no_sugar) — emerald-active vs zinc-default.

Publish CTA at the bottom — same gradient `linear-gradient(to right, #FE6F5E, #FF9980)` as the standard Verify button. Disabled until title + ≥1 ingredient + ≥1 step + rating > 0. Helper text below explains what's missing when disabled.

### `<UnitSelect>` dropdown

Closed-list `<select>` sourced from `/api/recipes/options`. When DB rows are present, renders as a flat list (admin's display_order wins). When falling back to static `RECIPE_UNIT_LABELS`, renders with `<optgroup>` headers: **Συνήθεις · Όγκος · Βάρος · Μέτρηση · Ειδικά**.

`useRecipeOptions()` hook fetches once on mount; returns the static fallback while loading so the wizard renders immediately.

---

## Achievement modal

`<AchievementUnlockedModal>` portal-mounts to body, 3-phase mount, body-scroll lock, X + backdrop close. **No auto-dismiss.**

- Fires 10s after Published mounts for suggestions (so ✓ checkmark lands first).
- Fires 2s after review publish (less ceremonial).

Showcase coverage: `/admin/showcase` → Submission/AI tab → 10 interactive buttons portal-mounting the real modal.

---

## PWA / mobile browser

Mobile-first web app. Runs in iOS Safari + Chrome Android. Must feel native.

### Critical implementation rules

- All overlays use `transform: translateY` (GPU-accelerated), never `top/bottom` position changes.
- When overlay open: `document.body.style.overflow = 'hidden'` to prevent scroll behind.
- Fixed bottom CTA uses `visualViewport` API to handle iOS keyboard push-up.
- Touch feedback: `active:` primary, `hover:` secondary.
- `overscroll-behavior: contain` on overlay content to prevent accidental close.
- Safe area insets via `env(safe-area-inset-*)` in `globals.css`.
- iOS Safari bottom bar: bottom nav uses `pb-safe`.
- No `:hover` for primary interactions — always provide `active:` equivalent.
- `will-change: transform` on slide-up overlays for smooth animation.
- `-webkit-overflow-scrolling: touch` on scroll containers.
