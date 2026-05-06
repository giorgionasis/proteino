# Proteino — UI Audit (3 archetypes)

Audit of the actual rendered UI on 2026-05-06, before redesign. Reframe: there are **3 screen archetypes**, not 9 detail pages × N states. Variations per category are minor parameterizations.

| Archetype | Entry | Variations |
|---|---|---|
| **Home** | `app/(main)/page.tsx` | guest vs. registered |
| **Category** | `app/(main)/[category]/page.tsx` → `CategoryPageShell` | 9 categories (mostly tabs/filters differ) |
| **Item Detail** ("suggestions screen") | `app/(main)/[category]/[id]/page.tsx` → 9 files in `components/detail/*` | 9 categories — same skeleton, different field labels |

---

## 1. ITEM DETAIL — the "empty pages" complaint

### What renders (top → bottom, all 9 categories share this skeleton)

1. **InnerHeader** — back arrow + bookmark icon (toggles black) + share icon. No title in the header.
2. **Hero image** — fixed 228px tall, 12px radius, single image. Movies/Series get a fake play-button overlay (no real trailer wiring). Bars/Series fall back to emoji ☕ / 📺 when image missing.
3. **Title + chips row** — h1 (26px bold) + small zinc-200 outlined chips for [genre, year, duration, country / venue / cuisine / type, etc.]
4. **3-column stat bar** — boxed border, splits: avg_rating + stars · category-specific (awards count / seasons / Google rating / "—") · review count.
5. **Featured suggestion block** — first suggestion: avatar + name + badge + relative date + reflection text + "Περισσότερα" link (does nothing).
6. **External ratings card** (movies/food/bars/hotels) — IMDb / RT / Metacritic / Google / Booking / Tripadvisor in a `#F2F2F7` panel. **Hardcoded scores ("-") render when no data.**
7. **InfoCell grid** — repeated `[ZINC-500 UPPERCASE LABEL] / [zinc-800 bold value]` pairs separated by hairlines. The signature 2010s pattern. Hides nothing — empty cells render as **"—"**.
8. **Category-specific module:**
   - Movies/Series: hardcoded "Που θα την δεις" with **the SAME 3 platforms (Netflix, YouTube €3.99, Disney+ €3.99) on every movie** + Watchlist toggle.
   - Books: Author card with first-letter avatar + Read/Want toggle.
   - Food: Hardcoded "Delivery" panel with Efood + BOX (no real wiring).
   - Bars: Plain "Πληροφορίες" stack (address/phone/website).
   - Hotels: Price-range panel + Booking.com CTA + Nearby Activities carousel (real, when lat/lng exists).
   - Theater/Events: Venue block + availability banner + Ticket CTA.
   - Recipes: ingredients/steps (probably the most "alive" of the bunch).
9. **Plot section** — 140-char clip + "Περισσότερα".
10. **Community section** — gradient backdrop, 72px star + avg, 5-bar histogram (**rating_distribution comes from `metadata` jsonb that's never populated → all bars show 0%**), question card with 5-star input + "Αποθήκευσε βαθμολογία" black button.
11. **CommentComposer + CommentThread** (real, wired in session 12).
12. **Reviews carousel** — horizontal scroll of 310×323 cards with vote up/down + report (vote API not wired — clicks do nothing).
13. **Related items carousel** (movies only).

### Why pages feel empty

| Category | Why empty |
|---|---|
| **Series** | `country`/`language`/`director` often null → 4 InfoCells render "—". Single director with placeholder gray circle. No platform list. |
| **Theater** | `address` was nulled in session 8 fix → "—". Most rows missing `writer`, `dates`, `availability`. Actors render as colored gray circles (no avatar URLs in data). |
| **Events** | Same as theater. `performers` is jsonb that often parses to "—". |
| **Bars** | Only address + phone + Google score. The 3-col stat bar shows Google rating column with "—". External ratings panel hidden when "—" — but the stat bar's column doesn't hide. |
| **Hotels** | `rooms`/`breakfast`/`parking` from `information.*` mostly missing → 4 InfoCells "—". |
| **Recipes** | Less affected — ingredients/steps populated by migration. |
| **Movies/Books/Food** | Best-populated. Movies got the session-11 awards rewrite. |

### What's hardcoded fake

- **Movie platforms** — "Netflix Συνδρομή / YouTube Από €3.99 / Disney TV Από €3.99" — literal lines on every movie page.
- **Series platforms** — single hardcoded Netflix entry.
- **"Top 10%"** copy in community section — not computed, written into JSX.
- **Rating distribution bars** — read from `metadata.rating_distribution` which is never written. All movies/books/etc render 5 empty bars.
- **Vote buttons + report links** — not wired to any API.
- **External ratings logos** — render even when score is "—" (filtered correctly in panels but the 3-col stat bar shows them).
- **Watchlist "Την έχω δει / Θέλω να τη δω"** — local React state only, never persists.
- **HeroSuggest's testimonial** — "Η Κατερίνα πρότεινε την μεξικάνικη σαλάτα της" is hardcoded text on guest home.

### What feels 2010-2020

- **InfoCell pattern** — uppercase tracked-out zinc-500 labels above bold values, separated by hairlines. Bootstrap 2014.
- **Monochrome zinc palette** — entire detail page is white/zinc-50/zinc-200/zinc-800/black. Coral only on a single InfoCell value (Πληροφορίες URL). No tonal variety per category.
- **Black CTAs** (`bg-zinc-950 text-zinc-50`) on a light app — dark buttons in a light theme reads as a dashboard, not a content app.
- **Gray-circle placeholders for every avatar/photo** — actor circles, director circles, suggester rings on category cards. Every empty surface is the same "#3a4a5a" hex.
- **Hardcoded pixel widths** (`w-[342px]`, `w-[310px]`, `w-[323px]`) — Figma transcription residue. Won't reflow.
- **No motion** — no entrance, no skeleton, no shimmer, no microinteractions on bookmark/rating save.
- **Inline `style={{ fontSize: 26 }}`** sprinkled instead of a token scale — fragmented type system.
- **Same 9 detail layouts** read as visually identical at a glance. A hotel and a movie should not have the same vibe.

---

## 2. CATEGORY SCREEN — `CategoryPageShell`

### What renders

1. **InnerHeader** — back + category title + total count chip on the right.
2. **SubCategoryTabs** — sticky horizontal scroll under header. Computed from data (subcategories with ≥2 items, top 12 by count).
3. **FilterRow** — `[⊞ Filters · N] [Quick Filter ▾] [Quick Filter ▾] [📍 Κοντά μου]` — quick filters DB-driven via `category_filters` table.
4. **CategoryHeroStats** (food/bars/hotels/theater/events only) — count + map toggle.
5. **Items list** — 2-col portrait grid for movies/series/books, single-column landscape stack for others.
6. **Load more** button (10 items at a time).
7. **Primary carousel** — first 3 items as `CarouselLandscape` with title from `SECTION_TITLES`.
8. **CategoryTopUsers** — top contributor + 4 contributors row.
9. **CategorySuggestBox** — "Δεν βρίσκεις αυτό που ψάχνεις?" CTA.
10. **Secondary carousel** — items 3-6.
11. **FilterBottomSheet** — slide-up panel with full filter set.
12. **CategoryMapView** — full-screen replacement when map toggle on.

### Card design

| Variant | Used by | Layout |
|---|---|---|
| **PortraitCard** (2:3) | movies, series, books | Cover + title (line-clamp 2) + meta + tiny star |
| **LandscapeCard** (200px) | food, bars, hotels, theater, events, recipes | Cover + title + meta dots + star + delivery chips |

### Issues

- **Placeholder backgrounds for missing covers** — flat hex per category (`#3730a3`, `#9a3412`, etc.). Lots of cards show solid dark blocks because `cover_url` is null.
- **"Top rated" badge** — outlined `#EDEDED` chip with shadow looks like a 2015 sticker.
- **Suggester avatar ring** on landscape card — bottom-left circle is just a gray ring with `avatar_color` placeholder. Never shows a real avatar even when one exists.
- **Bottom sheet filter panel** — works but feels heavy. No instant-apply, no chip-style active filters at top of list.
- **Empty state** — single 🔍 emoji + 2 lines. No suggested action, no "be the first to suggest" CTA despite that being a CLAUDE.md UX principle.
- **Title section** above the list — basically just a count chip in the header. No hero image, no editorial intro per category.

---

## 3. HOME — `app/(main)/page.tsx`

### Guest

1. **HeroDiscover** — 733px hero with **9 hardcoded-position colored tiles** (absolute x/y/w/h coordinates per tile, every tile is a flat hex block, no imagery), then "Προτάσεις Πραγματικές" h1 + hardcoded "3.185 ΠΡΟΤΑΣΕΙΣ" stat + black CTA "Ανακάλυψέ τες".
2. **HeroSuggest** — 733px hero with warm gradient placeholder bg (no real photo) + "Η πρότασή σου έχει αξία" + **hardcoded fake testimonial** about Κατερίνα + black CTA.
3. **HeroPersonalise** — 733px hero with 3 absolutely-positioned chip cards around a coral blur + "Μάθε περισσότερα / Εγγραφή" buttons.
4. **CategoryTiles guest** — 3×3 grid of **just colored circles, no labels-on-image, no actual category illustrations.**
5. **MoviesTonightSection** — real data when present.
6. **SuggestionFeed** — guest-facing feed with category tabs.
7. **Curated collections** OR fallback carousels (Ταινίες, Νέες Συνταγές, Δημοφιλή Μαγαζιά, Σειρές, Top Βιβλία).
8. **HowItWorks** — 4 numbered steps in zinc circles, very 2018 onboarding.
9. **RegisterPromo** + **SupportSection** + **FooterMobile**.

### Registered

1. Greeting "👋 Γεια σου, {name}" — emoji + h1.
2. **MoviesTonightSection.**
3. "Ξεχωρίσαμε για σένα" landscape carousel (food).
4. **AIChips** — 2-col grid of 4 chips with thumbnail + count. Labeled "Εξατομικευμένα για σένα" but **the chips are just the top 4 categories by count — no AI involved.**
5. Curated collections OR fallback carousels.
6. **SuggestedUsers.**
7. **ContributionCTA** — pencil-icon circle + gray-circle avatar + black "Προτείνω" button.
8. **SupportSection** + **FooterMobile.**

### Issues

- **The 3 guest heroes are 733px each = ~2200px of static, hardcoded-position content before any real items appear.** Each hero is essentially a poster slide, not a working surface.
- **CategoryTiles (registered) has no imagery** — just colored circles with the category name underneath. Placeholders shipped as production.
- **"AIChips" lies** — the section header promises AI personalization, the implementation is `SELECT category, COUNT(*) ORDER BY count DESC LIMIT 4`. Once AI ships (Phase A), this needs to actually be AI-driven or rename it.
- **Greeting is decoration** — "👋 Γεια σου, X" is the only personalized signal at the top. No streak, no "you're 2 away from Verified", no "X friends just suggested" — none of the hook moments from HOOKS.md surface here.
- **Carousels alternate Portrait/Landscape** — visually busy, no clear hierarchy. 6 carousels stack identically.
- **No editorial structure** — no "Today" / "Tonight" / "This week" anchor for time-based content. Movies Tonight is the only time-aware block.

---

## 4. CROSS-CUTTING ROOT CAUSES

These show up on all 3 archetypes and account for most of the "2010s" feel:

1. **Empty-state strategy is "render '—'"** — it should be "hide the field" or "show a useful zero state". Detail pages especially.
2. **No imagery beyond cover_url** — actor avatars, director avatars, venue gallery, suggester avatars on cards: all gray circles. We have `items.images jsonb` for venue galleries but it's barely populated; `actors[].avatar` exists but rarely written.
3. **Black-CTA-on-white visual language** — dark buttons in a light app reads as utility/admin, not consumer/social. Every "primary action" is `bg-zinc-950`. Coral is reserved for AI / specific CTAs.
4. **No motion vocabulary** — no entrance animations, no skeleton loaders (the gallery has one shimmer only), no microinteractions, no haptic-feel on rate/bookmark.
5. **Type system is fragmented** — inline `style={{fontSize: 26}}` in JSX, hardcoded line-heights, no use of Tailwind text scale. Same with widths.
6. **Hardcoded mock data leaks** — Netflix/YouTube/Disney platforms, "Top 10%" copy, fake testimonial, "rating distribution" 0%-bars. Each one of these is a "this app is not real" moment.
7. **Variations don't compound** — the 9 detail variations should each lean into category personality (movie = cinematic dark hero, hotel = warm photographic, recipe = appetizing food photography). Today they all use the same 228px image + zinc panels.
8. **No use of color-per-category beyond placeholder backgrounds** — CategoryCard's `BG[category]` palette is hidden behind images when images load. Could be the foundation of category-themed pages.

---

## 5. WHAT TO DO WITH THIS

Three possible directions, in order of risk:

**A. Targeted fix pass** (lowest risk, ~3-4 days)
- Hide empty InfoCells instead of rendering "—".
- Strip the fake hardcoded platforms / testimonial / rating-distribution.
- Replace gray-circle avatar placeholders with colored-initials blocks (we already have `<AvatarImage>`).
- Add motion to bookmark/rating saves.
- Replace black CTAs with coral on key actions.
- Result: the "empty" complaint goes away, visual feels less like Bootstrap, but the bones are unchanged.

**B. Modernize the design language** (medium risk, ~1.5 weeks)
- Build a real type/color/motion token system.
- Redesign 3 archetypes with current best-in-class references (Letterboxd hero, Beli card density, Apple Music's editorial feel, Goodreads' book-shaped cards).
- Per-category visual identity (movie = cinematic, food = warm/photographic, book = paper/typographic).
- Skeleton loaders, entrance animations, real microinteractions.
- Result: feels like a 2026 product. Same data, new clothes.

**C. Both** — A first to clear the noise, then B with a clean slate. Recommended.

This file is a working map — mark up sections directly or in chat, and we'll build a redesign plan from it.
