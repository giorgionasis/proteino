# Proteino — Project Intelligence File

This file is the source of truth for all architectural, design, and product decisions made for the Proteino project. Read this before every session.

**Last meaningful update:** 2026-05-07 (session 16 — design system showcase completion: 16 tabs · ~110 components · per-tab file split)

---

## 1. Project Overview

Proteino is a mobile-first, community-driven recommendation platform where users share and discover recommendations across: **Books, Movies, Series, Recipes, Theater, Events, Accommodation, Bars/Cafes, Food/Restaurants**.

### Core Differentiators
- **AI Submission Flow** — Users describe a recommendation in natural language. AI auto-identifies the item, category, and gives real-time quality feedback.
- **AI-Driven Search** — No traditional filters. Natural language search with real-time intent parsing, visual "pills" (VIBE / TYPE / LOC), and intelligent fallbacks.
- **Social + Gamification Layer** — Profiles, following, comments, ratings, bookmarks, leveling system, leaderboard.
- **Personalization** — Registered users get personalized home feed, AI-tuned recommendations, and smart notifications. Guests can browse only.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Mobile-first, PWA feel |
| Backend | Next.js API Routes (service layer pattern) | Extractable to separate backend later |
| Database | Supabase (PostgreSQL + pgvector + Auth + Storage) | Two schemas: `public` + `analytics` |
| AI Layer | Abstract `AIService` interface | Mock now → swap Anthropic/OpenAI later |
| Recommendations | Hybrid: pgvector similarity + LLM reranking | Offline batch (nightly) + online serving |
| Deployment | Vercel (frontend) + Supabase (hosted) | CDN via Cloudflare for storage |
| Admin | `/admin` route, same codebase, role-protected | Built later |

---

## 3. Architecture Decisions

### Database Schema Pattern
**Hybrid base + extension tables:**
- `items` — shared fields for ALL categories (title, slug, cover_url, avg_rating, embedding, etc.)
- `item_books`, `item_movies`, `item_series`, `item_food`, `item_recipes`, `item_bars`, `item_hotels`, `item_theater`, `item_events` — category-specific fields

**Why:** Enables cross-category AI search/recommendations via single `items` table while keeping structured, type-safe category data.

### Two Supabase Schemas
- `public` — online, real-time data (users, items, suggestions, ratings, etc.)
- `analytics` — offline processing, embeddings, activity logs, pre-computed recommendations (batch nightly updates)

### AI Service Abstraction
```typescript
// lib/ai/index.ts — interface never changes
interface AIService {
  analyzeSubmission(text: string): Promise<SubmissionAnalysis>
  analyzeSearch(query: string): Promise<SearchAnalysis>
  generateEmbedding(text: string): Promise<number[]>
  rerankRecommendations(userId: string, candidates: Item[]): Promise<Item[]>
}
// lib/ai/mock.ts — current implementation
// lib/ai/anthropic.ts — future implementation
```

### Recommendation System (3-layer architecture — locked in session 13)
- **Layer 1 — Embeddings:** every item + user has `embedding vector(1536)`. Items embedded from title + plot + tags + actors + reviews; users from rolling 30-day activity (bookmarks, ratings, suggestions, follows). Embedding provider TBD (OpenAI text-embedding-3-small at $0.02/1M tokens is the leading candidate).
- **Layer 2 — Offline batch:** Supabase Edge Function with cron at 04:00 daily. Recompute item embeddings for items with new activity (last 24h), recompute user embeddings, then for each active user run pgvector cosine-similarity top-50 → save to `analytics.precomputed_recs`. Home page reads from this in <100ms with no LLM at request time.
- **Layer 3 — LLM reranking (Haiku, on-demand):** for high-value moments (home hero, "Tailored for You" rail), Haiku reranks the 50 candidates → top-5 with 1-line reasoning ("Επειδή σου άρεσε X, αυτό έχει την ίδια vibe"). ~$0.001 per rerank, 1-2/user/day.
- **"Training":** the system gets smarter via RAG (context injected at runtime) + nightly embedding refresh. We do NOT fine-tune the LLM. See AI.md §12.1 for the rationale.
- Uses `pgvector` extension in Supabase — already provisioned (column exists on items + users).
- **Build order:** Phase B in PROGRESS.md §3 — comes AFTER Phase A (Anthropic in search + submission). 5 days estimated.

### Notification Dispatcher (hook-driven loops — locked in session 13)
- **Principle:** every passive user signal (bookmark, rating, follow, suggestion, search_log entry, location, last_login_at) × time-or-event trigger = personal moment. The platform "remembered" the user. See [memory file](.claude/projects/.../memory/feedback_hook_driven_mentality.md) for the full design principle + idea catalog.
- **Architecture:** Postgres triggers + Supabase Edge Function crons. No LLM at runtime — pure event matching. Notifications inserted into `public.notifications` table, read by `/notifications` page.
- **Already shipped (the prototypes):**
  - `notify_bookmarkers_of_airing` (migration 011 — bookmarked movie airs tonight on TV)
  - `trg_fanout_search_matches` (migration 013 — searched X but not in DB → notifies when matching item lands later)
- **Loops to build (each ~1 day):** TMDB new-season webhook for bookmarked series, dormant 14-day comeback, bookmarked event passed → rate prompt, streak protection, friend rated my bookmark, suggestion anniversary. See PROGRESS.md §3 Phase C.

---

## 4. Folder Structure

```
proteino/
├── app/
│   ├── (auth)/                   # login, register — no main layout
│   ├── (main)/                   # main layout with bottom nav
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Home
│   │   ├── search/
│   │   ├── profile/[handle]/
│   │   ├── [category]/           # /movies, /books, /food etc.
│   │   │   └── [id]/             # Detail page
│   │   └── submit/
│   └── admin/                    # Protected, role-based
├── components/
│   ├── ui/                       # Button, Card, Badge, Input, Modal
│   ├── ai/                       # ProteínoIntelligence panel, progress bar
│   ├── recommendation/           # Carousels, "Because you liked" cards
│   ├── submission/               # AI submission flow components
│   ├── search/                   # Smart search, pills, results
│   ├── profile/                  # Profile cards, stats, leaderboard
│   └── layout/                   # Header, BottomNav, PageWrapper
├── lib/
│   ├── ai/                       # AIService interface + implementations
│   ├── recommendations/          # RecommendationService + vector queries
│   ├── supabase/                 # client.ts, server.ts, admin.ts
│   └── utils/
├── hooks/                        # useSearch, useSubmission, useRecommendations
├── types/                        # Global TypeScript types
└── constants/                    # Categories, vibes, config
```

---

## 5. Data Models

### Core Tables (public schema)

#### users
```sql
id uuid PK, email, handle, display_name, bio, avatar_url,
role (user|admin), gender, region, birthday,
points, level, suggestion_count, rating_count, avg_quality_score,
embedding vector(1536), is_private, is_verified,
created_at, last_login_at, last_suggestion_at, last_review_at
```

#### items (base table for ALL categories)
```sql
id uuid PK, category (movie|book|series|food|recipe|bar|hotel|theater|event),
title, slug, description_seo, cover_url,
avg_rating float, rating_count int, suggestion_count int,
is_published bool, embedding vector(1536),
created_at, modified_at
```

#### item_movies
```sql
item_id FK, director, duration_min, release_date, end_date,
country, language, channel, trailer_url, status_message,
plot text, actors jsonb, awards jsonb
```

#### item_series
```sql
item_id FK, director, seasons int, release_date, end_date,
country, language, channel, trailer_url, status_message,
plot text, actors jsonb
```

#### item_books
```sql
item_id FK, writer, publication, language, pages int,
publication_year int, plot text, is_trilogy bool, trilogy_name
```

#### item_food
```sql
item_id FK, cuisine, type, address, telephone,
lat float, lng float, delivery_links jsonb,
external_ratings jsonb, information jsonb, plot text
```

#### item_recipes
```sql
item_id FK, yields int, calories int, origin, level,
channel, duration jsonb, nutrition jsonb,
ingredients jsonb, steps jsonb, tips text
```

#### item_bars
```sql
item_id FK, type, address, telephone, lat float, lng float,
external_ratings jsonb, information jsonb, plot text
```

#### item_hotels
```sql
item_id FK, type, address, telephone, lat float, lng float,
price_range, facilities jsonb, information jsonb,
external_ratings jsonb, plot text
```

#### item_theater
```sql
item_id FK, name_place, address, lat float, lng float,
type, year int, writer, director, availability,
ticket_url, price, actors jsonb, dates jsonb, plot text
```

#### item_events
```sql
item_id FK, name_place, address, lat float, lng float,
event_type, availability, status, ticket_url, price,
performers jsonb, dates jsonb, description text
```

#### suggestions (the original submitter's text — 1 per item, K2-imported)
```sql
id uuid PK, user_id FK, item_id FK,
reflection text, rating float,
ai_quality_score float, ai_match_data jsonb,
content_hash (immutable, proof of authorship),
is_published bool, hidden_at, hidden_reason, hidden_by FK,
created_at, published_at, modified_at
```
**Semantic:** the description of whoever first added the item to the platform. NOT a review. Surfaces in the featured suggester block above the rating box on every detail page.

#### reviews — NEW (migration 016, single source of truth from session 15)
```sql
id uuid PK, user_id FK, item_id FK,
rating smallint NOT NULL CHECK (1..5),
reflection text NULL,
vote_up int, vote_down int, report_count int,
is_hidden bool, hidden_at, hidden_reason, hidden_by FK,
created_at,
UNIQUE (user_id, item_id)
```
**Semantic:** other users' ratings (mandatory) + optional text. Going forward, every user-on-item interaction is one row here. Powers the carousel below the rating box + the `/[category]/[id]/reviews` subpage. Detail-page server fetch recomputes `items.rating_count` + `items.avg_rating` from this on each request.

#### review_votes — NEW (migration 017)
```sql
user_id FK, review_id FK, vote smallint CHECK (-1, 1),
created_at, PRIMARY KEY(user_id, review_id)
```
Postgres trigger `trg_sync_review_votes` keeps `reviews.vote_up`/`vote_down` in sync. Self-vote blocked at the API layer.

#### ratings — LEGACY (frozen, not read by new UI)
```sql
id uuid PK, user_id FK, item_id FK, suggestion_id FK,
score float, vote_up int, vote_down int, created_at
```
Wiped clean by migration 016. Kept in schema for archive. Future cleanup: drop the table.

#### comments — LEGACY (frozen, not read by new UI)
```sql
id uuid PK, user_id FK, suggestion_id FK,
parent_id FK (for replies), body text, created_at
```
343 K2 rows. Kept in schema for archive. The new flow (reviews) replaces both `ratings` and `comments`.

#### bookmarks
```sql
id uuid PK, user_id FK, item_id FK,
category, status, created_at
```

#### follows
```sql
id uuid PK, follower_id FK, following_id FK, created_at
```

#### notifications
```sql
id uuid PK, user_id FK, type, name,
payload jsonb, email_enabled bool, push_enabled bool,
is_read bool, created_at
```

#### achievements + user_achievements
```sql
achievements: id, name, description, image_url
user_achievements: user_id FK, achievement_id FK, earned_at
```

#### badges + user_badges
```sql
badges: id, name, description, image_url
user_badges: user_id FK, badge_id FK, earned_at
```

#### devices
```sql
id uuid PK, user_id FK, os, browser, region,
device_image_type, login_at
```

#### categories
```sql
id uuid PK, name, alias, description_seo, parent_id FK
```

#### nearby_activities (admin-managed)
```sql
id uuid PK, item_id FK, title, type, lat float, lng float,
radius_km float, created_at
```

#### leaderboard_snapshots
```sql
id uuid PK, user_id FK, period, category, rank int,
score int, snapshot_at
```

### Analytics Schema Tables
```sql
analytics.user_embeddings     -- updated nightly
analytics.item_embeddings     -- updated nightly  
analytics.activity_log        -- every user action
analytics.precomputed_recs    -- nightly batch recommendations
analytics.search_log          -- search queries for improvement
```

---

## 6. Design System

### Theme
- **Base:** Light theme throughout — white background, zinc text scale, coral accent
- **Exception:** Dark theme ONLY for the Syncing screen (brief takeover during AI enrichment)
- **AI flows (Search + Suggestion + Published):** Light theme — same design system. (Earlier spec had Published in dark; it's been moved to light for better hierarchy + breathing room.)
- **Primary accent:** Coral `#FE6F5E` — verified from Figma (replaces old `#D85A30`)
- **Gradient:** `#FE6F5E` → `#FF9980` (buttons, progress bars, FAB shadow)

### Color Palette (Figma-verified)
```
Coral-600:   #FE6F5E  (primary accent, CTAs, AI elements, active states)
Coral-700:   #E05A4A  (hover)
Coral-50:    #FFF5EC  (light backgrounds, selected states)
ios-gray:    #F2F2F7  (search/pill input backgrounds — iOS-style)
Zinc-950:    #18181b  (headings)
Zinc-800:    #27272a  (primary body text)
Zinc-700:    #3f3f46  (secondary text)
Zinc-600:    #52525b  (muted text)
Zinc-500:    #71717a  (labels, captions)
Zinc-400:    #a1a1aa  (placeholders, disabled)
Zinc-200:    #e4e4e7  (borders default)
Zinc-100:    #f4f4f5  (surface backgrounds)
Zinc-50:     #fafafa  (subtle backgrounds)
Success:     #1D9E75
Danger:      #E24B4A
Warning:     #FF9123
Gold:        #F8D160  (achievements)
Badge-red:   #C51501  (notification dot)
```

### Typography
- **Font:** Open Sans (imported via Google Fonts)
- **Weights used:** 400 (body), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold), 900 (logo/display)
- **Labels:** UPPERCASE, letter-spacing: 0.1px, weight 500–600
- **Body:** 16px base, line-height 1.5
- **Scale:** 9 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 26 / 32 / 36px

### Components
- Border radius: 4px (micro), 8px (cards/stat boxes), 12px (auth inputs), 16px (large cards), 50px (search pill), 9999px (avatars, icon buttons)
- Borders: 1px solid zinc-200 (default), 1.5px coral (focus)
- Icon buttons: 36px circle, zinc-100 background (header icons, close buttons)
- Bottom navigation: HOME / SEARCH / YOU (3 items only)
- FAB: coral gradient, 56px circle, bottom-right, `shadow-fab`

---

## 7. UI Flows (All Screens Designed)

### Auth Flow ✅
- **Register:** Email + Username + Password (real-time validation: 8 chars, uppercase, number) + Google/Facebook OAuth + Terms checkbox
- **Login:** Email + Password + OAuth + "Καλώς ήρθες πάλι!" personalized greeting
- **Forgot Password:** Email → reset link → new password form with same validation
- **Success states:** Animated checkmark, celebration copy

### Onboarding Flow ✅
4 steps, give-before-you-ask principle:
1. Welcome — show value (save time, AI, community) before asking anything
2. Interests — select 2+ categories (tappable grid, min 2 to proceed)
3. Your Feed (REWARD) — immediately show personalized content based on selections
4. Follow suggested users — skippable, based on shared interests

### AI Submission Flow ✅
8 states (post session-12 — `useSubmission` adds `duplicate` + `error`):
1. **Empty** — "Πες μας τι σου άρεσε. Ακούω." + 4 input modes (Scan/Link/List/Voice — buttons exist, not yet wired) + AI panel
2. **Typing** — Real-time AI analysis. IntelligencePanel shows live quality coaching ("Πες γιατί το προτείνεις") + colored badge (poor/fair/good/excellent). Server-side `/api/ai/match` hits TMDB for movies/series.
3. **Match Found** — "LOCKED" badge + "↺ Άλλαξε" reset link. Textarea **stays editable** so user adds their reflection. AI no longer re-analyzes. MATCH pill shows TMDB-canonical title.
4. **Syncing** — Dark screen, animated ring. ALSO does preflight duplicate check via `/api/suggestions/check`; routes to Duplicate state directly if matched item already has a suggestion.
5. **Preview** — Real TMDB poster/backdrop hero, title with year, director + first 3 cast, **mandatory** star rating, full reflection (no truncation), SHARE / EDIT. Share button shows inline "Δημοσίευση..." while POSTing — no syncing-screen flash.
6. **Published** — Dark celebration screen with: animated checkmark, hook moments (HOOKS.md §2B — "Είσαι ο Νος αυτή την εβδομάδα", "X ενδιαφέρονται για κατηγορία", "X σε ακολουθούν"), `<AchievementProgress>` block, "Δες την πρότασή σου →" deeplink, Κλείσιμο + Share Link buttons (`navigator.share()` + clipboard fallback)
7. **Duplicate** — HOOKS.md §8 — "Το έχεις ήδη προτείνει εσύ! 😄" / "Έχει ήδη προταθεί από @X" with rate/follow CTAs and "✏ Πρότεινε κάτι άλλο" reset
8. **Error** — Network/server failure. "Κάτι πήγε στραβά" + retry

### Confidence-tiered conversational match (PENDING — agreed for next session)
TMDB `scoreTitleMatch` already labels matches 0-100. Surface tier-aware UX:
- **High** (100, exact): auto-lock as today
- **Medium** (60-80, substring/prefix): lock + "Όχι αυτό; →" link → expands alternatives
- **Low** (<60 OR competing runner-up): no auto-lock, show 2-3 candidate cards, user picks

`matchData.alternatives` is already in the API response (top 2 next-ranked candidates with their full TMDB payload). Frontend just needs `<MatchAlternatives>` component + tier-aware microcopy. ~45 min self-contained work.

### AI Smart Search Flow ✅
5 states:
1. **Empty** — "Describe a vibe..." + Quick Jumps (personalized suggestions)
2. **Typing** — Real-time pill extraction (VIBE / TYPE / LOC), AI panel updating
3. **Analyzing** — Progress bar, contextual messages ("Scanning nightlife graph...")
4. **Results** — Cards appear BEFORE AI finishes (parallel loading), green success state
5. **No Match** — Never a dead end: "No direct matches for X. Showing best alternatives." + smart fallbacks + "Be the first to suggest it" CTA

### Home Screen ✅
**Registered:** Personalized greeting + category toggle tabs + "Tailored for You" carousel with "Because you liked X" reasoning + themed carousels (Oscar Movies, etc.) + Following activity + AI-personalized chips ("Sci-fi you haven't seen")
**Guest:** How it works (3 steps) + Popular now carousel + Registration CTA banner

### Category Page — Food ✅
- List view: filters (chip-based), sort, "Near me" banner, cards with social proof (who suggested it), delivery chips
- Map view: pins with rating, tap → bottom card with CTA, toggle between list/map
- No dead end: "Add new restaurant" CTA at bottom

### Movie Detail Page ✅
- Hero with poster + back/bookmark/share actions
- Quick actions: "Το είδα" / Watchlist / Trailer / Comments
- Metadata grid: director, year, duration, country, actors
- Platform chips (Netflix, HBO, Apple TV+)
- Rating breakdown (bar chart) + inline star rating
- Community suggestions with vote up/down
- "Add your suggestion" CTA — never a dead end
- Related movies carousel

---

## 8. UX Principles (NON-NEGOTIABLE)

### No Dead Ends — Ever
Every screen must have a next action. Examples:
- Empty search results → show alternatives + "Be the first to suggest it"
- Empty category → "Add the first suggestion"
- After publishing → share link or explore related

### Real-Time Results
- Search results appear AS the user types, not after
- AI analysis shows progress in real-time, results don't wait for 100%
- Never show a blank loading screen without feedback

### Give Before You Ask
- Onboarding shows personalized content BEFORE asking for follows
- Guest sees real content before registration prompt
- Registration incentives are obvious but never blocking

### Hook Mechanics (implement throughout)
- **Variable reward:** Home feed never looks the same twice
- **Social proof triggers:** "George and 2 others suggested this"
- **Progress mechanics:** Level progress bar always visible, "2 more suggestions to Level 3"
- **FOMO notifications:** "George Nasis just suggested something you might like"
- **Streak system:** Consecutive suggestion streaks
- **Achievement popups:** After every suggestion — show progress toward next badge
- **Personalization loop:** "The more you use it, the better it gets" — make this visible

### Achievement System (popup after each suggestion)
- Suggestion 1: "Μόλις έκανες την πρώτη σου πρόταση!" → progress 1/3 toward "Επαληθευμένος χρήστης"
- Suggestion 2: "Καταπληκτική αρχή!" → progress 2/3
- Suggestion 3: UNLOCK "Επαληθευμένος χρήστης" badge (green shield)
- Suggestion 7: New progress → "Έμπειρος χρήστης" (10 suggestions)
- Suggestion 9: "Είσαι πολύ κοντά!" → 1 more needed
- Suggestion 10: UNLOCK "Έμπειρος χρήστης" badge (blue star)

---

## 9. Notification System

### Type A — Social
- "X πρότεινε νέα ταινία"
- "X σε ακολούθησε"
- "Νέο comment στην πρότασή σου"
- "X βαθμολόγησε την πρότασή σου"

### Type B — Smart/Contextual
- "Βγαίνει αύριο η νέα σεζόν [series you bookmarked]"
- "Πρόσθεσε τις 3 αγαπημένες σου κλασικές ταινίες" (3-7 days after adding a classic)
- Location-based: nearby bar suggestion after restaurant visit (PARKED — requires native app)
- "Σειρές με πραγματικά γεγονότα από Netflix" (personalized content push)

---

## 10. Gamification & Levels

- **Level progression:** Based on suggestion count only (simple, transparent)
- **Points:** Tracked but secondary to levels
- **Badges:** Επαληθευμένος χρήστης (3 suggestions), Έμπειρος χρήστης (10), etc.
- **Leaderboard:** Global rank, filterable by period (all time / last month / last week) and category
- **Global Rank:** Shown on profile with coral color (#84 style)

---

## 11. Content & Categories

### Category-Specific Features
| Category | Map | Trailer | Delivery | Ticket Link | Price Range | Nearby Activities |
|---|---|---|---|---|---|---|
| Movies | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Series | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Books | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Food | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Bars/Cafes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recipes | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hotels | ✅ | ❌ | ❌ | ✅ (Booking) | ✅ | ✅ |
| Theater | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Events | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |

### Rating System
- Every suggestion has an **embedded rating** (first rating from suggester)
- Other users can add their own rating → item avg_rating = average of all
- Ratings include vote_up / vote_down on suggestions
- Rating triggers a modal for optional comment

### Recipes
- User-generated (write from scratch) OR discovered (paste from elsewhere)
- Fields: ingredients (with quantity/unit), steps, tips, nutrition (vegan/milk/sugar), duration (prep/baking/total), level, origin, yields, calories

### Events & Theater
- Have expiry dates but remain as archive after expiry
- Both have ticket links and price

---

## 12. Monetization (Greek Market)

### Phase 1 (launch)
- Affiliate links: efood, Wolt, Box (food delivery), Booking.com (hotels), Public (books)
- Commission: 3-8% per conversion
- Implementation: `affiliate_clicks` table + UTM parameters (add later, non-breaking)

### Phase 2
- Local business "Verified Listing" — €30/month per business
- Target: restaurants, bars, hotels

### Phase 3
- Premium subscription (~€4/month): advanced AI search, unlimited lists, early access
- Sponsored carousels (requires significant traffic first)

---

## 13. Business Rules

- **Guests:** Can browse all content. Cannot suggest, bookmark, rate, comment, or get personalized content.
- **Registration incentives:** Always visible, never blocking. Value exchange must be obvious.
- **Content hash:** Every suggestion gets an immutable `content_hash` on creation (proof of authorship, no blockchain needed).
- **Admin panel:** `/admin` route, same Next.js app, protected by `role = 'admin'` check.
- **Nearby activities:** Admin-managed only (not user-generated).
- **Location notifications:** Parked until native app decision.
- **Revenue sharing:** Parked (legal complexity). Architecture ready when needed.

---

## 14. Key Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Items table | Hybrid base + extensions | Cross-category AI + structured data |
| Database | Single Supabase + 2 schemas | Simple now, extractable later |
| AI provider | Anthropic Claude Haiku 4.5 | Greek quality + cost + speed; locked session 13 (see AI.md §12) |
| Self-hosted AI? | No, until 50K+ DAU | Greek quality drop on 7-13B open models, 3-6w setup, eng cost |
| Fine-tune LLM? | Never | RAG > fine-tune for diverse tasks; Anthropic doesn't offer it on Individual plan anyway |
| Anthropic plan | Individual + pay-per-use credits | $20 starter, $30/mo soft cap |
| Recommendations | Vector + LLM hybrid (3 layers) | Embeddings = "training" via user activity; precomputed_recs nightly; Haiku reranks on-demand |
| AI cost as % of revenue (target) | 3-5% | At 100K DAU: ~$3.5K cost vs ~€122K revenue projected |
| Theme | Light + coral accent | Content-heavy screens need light |
| Dark theme | Syncing + Published + Achievement only | AI flows stay light |
| Levels | Suggestion count only | Simple, transparent, no confusion |
| Admin | Same codebase /admin | Simplicity, role-based access |
| Recipes | User-generated + discovered | Both use cases are valid |
| Events | Archive after expiry | Historical value preserved |
| Blockchain | Not needed | content_hash achieves same goal |
| Revenue sharing | Parked | Legal complexity |
| Location tracking | Parked | Requires native app |
| Primary coral | #FE6F5E | Verified from Figma (replaced #D85A30) |
| Font | Open Sans | Verified from Figma (replaced system stack) |
| Search/Suggestion UI | Light theme, full-screen slide-up | Consistent with design system |
| Category filters | Sub-category tabs + filter row | AI search is primary, filters secondary |
| Sub-category dimension | Type/cuisine-first (food/bars), destination-first (hotels/events/theater), genre-first (movies/books) | Matches dominant browsing intent per category |
| Filter access | Inline quick-filters + "⊞ Filters" chip → bottom sheet | One tap away, never competing with FAB |

---

## 15. Navigation Architecture

### Global Layout
```
Header (sticky, z-30):
  Left:  Proteino• logo (text + coral dot)
  Right: Bell icon (registered users only) — guest sees nothing

Content area (scrollable)

FAB (fixed, z-30, bottom-right):
  Visible on: Home, category pages, item detail, profile
  Hidden on: Search overlay, suggestion overlay, auth pages

Bottom Nav (sticky, z-40):
  3 tabs: HOME · SEARCH · YOU
  Active tab: coral icon + coral label
  Inactive: zinc-400 icon + zinc-400 label
```

### Full-Screen Overlays (cover header + content + bottom nav)
Both search and suggestion are `fixed inset-0 z-50` overlays that slide up from the bottom.

**Search overlay** (triggered by SEARCH tab):
- Custom header: search icon + "SMART SEARCH" label + X close button
- X close → returns to previous page, dismisses overlay
- No bottom nav visible
- Light theme throughout

**Suggestion overlay** (triggered by FAB):
- Custom header: waveform + "LISTENING LIVE" label + X close button (changes to "LOCKED" badge when match found)
- X close → returns to previous page, dismisses overlay
- No bottom nav visible
- Light theme throughout
- State machine: IDLE → LISTENING → ANALYZING → MATCHED → LOCKED → SYNCING → PREVIEW → PUBLISHED
- SYNCING + PUBLISHED states: dark theme (exception)

### YOU tab — Guest behavior
Renders a value-proposition page (not a login redirect):
- Preview of what a profile looks like (blurred/dimmed)
- 3 bullet value props with icons
- CTA: "Δημιούργησε λογαριασμό" + "Έχω ήδη λογαριασμό →"

### Overlay State Management
Managed via Zustand store (`useOverlay`):
```typescript
{ 
  overlay: 'search' | 'suggestion' | null,
  openSearch: () => void,
  openSuggestion: () => void,
  close: () => void,
}
```

---

## 16. Sub-Categories & Filter System

### Principle
- **Sub-categories** = what kind it IS (genre, cuisine, type) — fixed taxonomy via `categories.parent_id`
- **Region/Location** = WHERE it is — always a filter attribute, never a sub-category
- **AI search** = primary power tool (handles all filtering via natural language)
- **Sub-category tabs + filter row** = secondary discovery/browsing tool

### Primary Tab Dimension by Category
| Category | Primary tab | Notes |
|---|---|---|
| Movies | Genre | No location dimension |
| Series | Genre | No location dimension |
| Books | Genre | No location dimension |
| Recipes | Type / Origin | No location dimension |
| Food | Cuisine | Region is prominent filter |
| Bars | Type | Region is prominent filter |
| Hotels | Destination | Dynamic from data, not fixed taxonomy |
| Theater | City | Dynamic from data |
| Events | City | Dynamic from data |

### Sub-Categories per Category

**Movies:** Δράμα · Κωμωδία · Θρίλερ · Δράση · Sci-Fi · Ρομαντική · Animation · Ντοκιμαντέρ · Horror · Βιογραφική

**Series:** Δράμα · Κωμωδία · Crime · Sci-Fi · Θρίλερ · Ρομαντική · Ντοκιμαντέρ · Mini-series · Animation

**Books:** Μυθιστόρημα · Θρίλερ · Sci-Fi · Ιστορία · Αυτοβιογραφία · Ψυχολογία · Φιλοσοφία · Self-help · Ποίηση · Business · Παιδικά

**Recipes:** Κυρίως Πιάτο · Ορεκτικά · Επιδόρπια · Breakfast · Ψητά · Σαλάτες · Σούπες · Γλυκά · Ψωμί & Ζύμες

**Food:** Ελληνική · Ιταλική · Ασιατική · Burger · Sushi · Fine Dining · Brunch · Vegan · Seafood · Street Food · Middle Eastern

**Bars:** Cocktail Bar · Wine Bar · Jazz Bar · Rooftop · Beach Bar · Coffee · Speakeasy · Pub · All-Day · Sports Bar

**Hotels:** Dynamic destinations (top cities from data: Αθήνα · Κρήτη · Θεσσαλονίκη · Σαντορίνη · Μύκονος · Ρόδος)

**Theater:** Dynamic cities (from data)

**Events:** Dynamic cities (from data)

### Filter Row Layout
```
[⊞ Filters · N]  [Quick Filter 1 ▾]  [Quick Filter 2 ▾]  [📍 Κοντά μου] ← food/bars only
```

Quick filters per category:
- Movies/Series: Platform, Εποχή
- Books: Γλώσσα, Σελίδες
- Food: Περιοχή, Τιμή
- Bars: Περιοχή, Τιμή
- Hotels: Τιμή/νύχτα, Αστέρια
- Events/Theater: Ημερομηνία, Τιμή
- Recipes: Δυσκολία, Χρόνος

Active filter chip: coral fill. Filter count badge on "⊞ Filters" when active.

---

## 17. PWA / Mobile Browser Considerations

This is a **mobile-first web app**, not a native app. Runs in mobile browsers (iOS Safari, Chrome Android). Must feel native.

### Critical implementation rules
- All overlays use `transform: translateY` (GPU-accelerated), never `top/bottom` position changes
- When overlay is open: `document.body.style.overflow = 'hidden'` to prevent scroll behind
- Fixed bottom CTA in suggestion flow uses `visualViewport` API to handle iOS keyboard push-up
- Touch feedback: `active:` states are primary, `hover:` states are secondary
- `overscroll-behavior: contain` on overlay content to prevent accidental close
- Safe area insets already handled via `env(safe-area-inset-*)` in globals.css
- iOS Safari bottom bar: bottom nav uses `pb-safe` to account for varying toolbar height
- No `:hover` for primary interactions — always provide `active:` equivalent
- `will-change: transform` on slide-up overlays for smooth animation
- `-webkit-overflow-scrolling: touch` on scroll containers


---

## 16. Metadata Enrichment
> ✅ SHIPPED admin-side (session 10) — `/api/admin/enrich` + "✨ Auto-fetch cover" button in SuggestionEditor + `scripts/bulk-enrich.js`. User-facing submission-flow SYNCING integration still pending.

During the SYNCING phase of the submission flow, after AI locks an item,
fetch rich metadata from external APIs. See AI.md Section 11 for full code.

### APIs per category
- Movies/Series → TMDB (free, themoviedb.org)
- Books → Google Books API (free)
- Food/Bars/Cafes/Hotels → Google Places API (free tier)
- Theater/Events → Ticketmaster API (free tier)
- Recipes → No enrichment (user-generated)

### Key principle
Enrichment NEVER blocks submission. If API fails → publish anyway with user data only.

### Env vars needed (add when implementing)
TMDB_API_KEY, GOOGLE_BOOKS_API_KEY, GOOGLE_PLACES_API_KEY, TICKETMASTER_API_KEY

---

## 17. Navigation & UI Structure
> ✅ IMPLEMENTED — Documents decisions already built. Do not rebuild.

- Header registered: Logo (left) + Notification bell (right)
- Header guest: Logo only
- Bottom nav: HOME / SEARCH / YOU (3 items)
- SEARCH = button → openSearch() — NOT a route link
- FAB: coral gradient, fixed bottom-right, opens submission flow, hides when overlay open

### Category Page Filters (✅ built as FilterRow + SubCategoryTabs)
- Level 1: Genre chips horizontal scroll
- Level 2: ⚙ Φίλτρα button → slide-up panel with advanced filters

### Subcategories → Proper Table (✅ revised decision)
Subcategories are a proper `subcategories` table (id, category, name, slug, description_seo, display_order, is_published).
Items reference via `subcategory_id` FK. Subcategory = genre/type for ALL categories (never location):
- Movies/Series/Books: genre (Δράμα, Κωμωδία, Θρίλερ...)
- Food: cuisine (Ελληνική, Ιταλική, Ασιατική...)
- Bars: type (Cocktail Bar, Wine Bar, Jazz Bar...)
- Hotels: accommodation type (Ξενοδοχείο, Διαμέρισμα, Camping...)
- Theater: genre (Θέατρο, Μιούζικαλ, Stand-up...)
- Events: type (Συναυλία, Festival, Έκθεση...)
- Recipes: type (Κυρίως Πιάτο, Ορεκτικά, Επιδόρπια...)
Location filtering uses the `regions` table (id, name, slug, parent_id, display_order) — two-level hierarchy: Region → Area.
Frontend category page tab dimension is independent of the DB model (can tab by city OR by subcategory per category).

### Category Access Points (✅ built)
1. Home screen "Εξερεύνησε" grid
2. Search screen empty state

---

## 18. Profile Page Structure
> ✅ IMPLEMENTED — Documents decisions already built. Do not rebuild.
> Profile, Settings groups, Leaderboard, GuestYouPage all exist in codebase.

### Own Profile structure (built)
1. Avatar + Name + Followers/Following
2. Badge
3. Stats + **Leaderboard button** below stats
4. Activity card
5. Level progress bar
6. Settings groups at bottom (scrollable):
   - "ΛΟΓΑΡΙΑΣΜΟΣ": Επεξεργασία Προφίλ, Σύνδεση & Ασφάλεια
   - "ΠΡΟΤΙΜΗΣΕΙΣ": Ειδοποιήσεις, Προσωποποιημένη Εμπειρία
   - "ΥΠΟΣΤΗΡΙΞΗ": Κέντρο Βοήθειας, Επικοινωνία
   - Standalone: Αποσύνδεση (red)

### Support Footer
- Section at bottom of Home page ✅ (SupportSection built)
- Also accessible inside Settings menu ✅

### Personalized Experience
- Reuses onboarding InterestsSelector component with different header/footer ✅

---

## 19. Dynamic Home Sections (CMS)
> ⏳ PENDING — Currently hardcoded. Will be built during Priority 6 (Real Data Layer).

Home feed sections should come from database, not hardcoded in code.

```sql
CREATE TABLE home_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text,
  filter_query jsonb,
  display_order int NOT NULL,
  is_active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  target_audience text DEFAULT 'all', -- 'all' | 'registered' | 'guest'
  created_at timestamptz DEFAULT now()
);
```

Future: Admin panel to manage sections + AI suggestions.

---

## 20. MySQL → Supabase Migration Plan
> ⏳ PENDING — Will be done after Auth is complete (Priority 6).

### Source
MySQL DB with: users, items/objects (categories + subcategories), suggestions, comments, ratings.

### Mapping
- categories → constants/categories.ts (static, no migration needed)
- subcategories → subcategories table (id, category, name, slug, display_order, is_published)
- items/objects → items + category extension tables
- suggestions → suggestions table
- comments → comments table
- ratings → ratings table
- users → public.users (passwords cannot migrate — users will reset via email)

### Order
1. Auth setup first (Supabase Auth users must exist before data)
2. Custom Node.js migration script: MySQL read → transform → Supabase insert
3. Connect home feed to real data


---

## 21. Image Schema & Storage
> ⏳ PENDING — Implement during submission flow + migration.

### Two images per item
Every item stores two images for different display contexts:

```sql
-- Add to items table
poster_url   text,  -- Portrait (2:3)  — lists, carousels, category grids
backdrop_url text,  -- Landscape (16:9) — detail page hero, featured cards
```

### Orientation per category
```
Portrait (2:3)   → Movies, Series, Books
                   (posters, book covers — natural format)

Landscape (16:9) → Food, Bars/Cafes, Hotels, Events, Theater, Recipes
                   (venue photos, food shots — natural format)
```

### Sizes generated on upload (via Sharp)
```
thumbnail → 400x600px portrait  / 640x360px landscape  (lists, grids)
card      → 800x1200px portrait / 1280x720px landscape (category pages)
hero      → 800x1200px portrait / 1280x720px landscape (detail page)
og        → 1200x630px landscape always                (social sharing)
```

One file uploaded → Sharp auto-generates all sizes.

### Storage
Supabase Storage with built-in CDN — sufficient up to millions of requests.
Migrate to Cloudflare R2 or AWS S3 + CloudFront only if needed at scale.

### Auto-fetch during submission (SYNCING phase)
```typescript
// poster_url + backdrop_url fetched automatically from:
// Movies/Series → TMDB (poster_path + backdrop_path)
// Books         → Google Books (thumbnail)
// Food/Bars     → Google Places (photos[0] for both)
// Events/Theater → Ticketmaster (images)
```

### Admin can override
Admin panel can replace auto-fetched images with manual upload at any time.
See admin panel spec (TBD).

---

## 22. Duplicate Submission Handling
> ⏳ PENDING — Implement during submission flow (after Auth + real data).

When AI matches an item during submission, check if it already exists in the platform.

### Scenario A — Item exists, suggested by others (or same user forgot)
```
"Το [item] έχει ήδη προταθεί!"
→ [Βαθμολόγησέ το ★]  [Ακολούθησε τον @[user]]  [Προτείνε κάτι άλλο]
```

Extra check — if the current user is the original suggester:
```
"Το έχεις ήδη προτείνει εσύ! 😄"
→ [Δες την πρότασή σου]  [Προτείνε κάτι άλλο]
```

### Scenario B — Item does not exist in platform
→ Continue submission flow normally

### Implementation
```typescript
// In useSubmission hook, after AI match is confirmed (LOCKED state):
const checkDuplicate = async (itemId: string, userId: string) => {
  const { data } = await supabase
    .from('suggestions')
    .select('id, user_id, users(handle)')
    .eq('item_id', itemId)
    .limit(1)
    .single()

  if (!data) return { isDuplicate: false }

  return {
    isDuplicate: true,
    isOwnSuggestion: data.user_id === userId,
    originalSuggester: data.users,
  }
}
```

### UX Rules
- Check happens immediately after LOCKED state — before SYNCING starts
- Never a dead end — always show 2-3 alternative actions
- "Ακολούθησε" CTA only shows if user doesn't already follow the suggester

---

## 23. Icon System
> ✅ SHIPPED (session 14)

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
└── admin/       # 2  — placeholder-upload, link-card

lib/icons.ts             # Registry + type-safe IconName + catalogs/helpers
components/ui/Icon.tsx   # <Icon name="..." size={24} />
```

### Registry-driven
Add an icon: drop SVG in subfolder, register in `lib/icons.ts`, done. Both frontend and admin import from same place.

```typescript
import { Icon } from "@/components/ui/Icon";

<Icon name="vegan" size={48} />
<Icon name="amenity-wifi" size={32} />
<Icon name="booking-wordmark" width={140} height={32} alt="Booking.com" />
```

### Helpers (in lib/icons.ts)
- `badgeIconForLevel(level: number): IconName` — user level → badge icon
- `platformIconForChannel(channel: string): IconName | null` — channel name → streaming brand icon
- `oscarIconForCategory(type, category): IconName | null` — award type+category → specific oscar icon
- `getActiveAmenities(facilities: unknown): string[]` — handles array-of-strings OR object-of-booleans

### Catalogs (admin form data)
- `HOTEL_AMENITY_GROUPS` — 3 groups (Παροχές / Θέα-Τοποθεσία / Extra) for `<IconToggleGrid>`
- `RECIPE_NUTRITION_OPTIONS` — vegan / no-milk / sugar-free
- `HOTEL_PROPERTY_TYPES` — visual radio cards for hotel admin form
- `FOOD_AMENITY_OPTIONS` — restaurant amenity subset (parking/wifi/pet/...)

### Reusable primitives
- `<UserBadge>` — level badge + label (replaces 3 legacy patterns: colored text pills, inline shield SVG, BadgeChip)
- `<OutlinedPill>` — pill button with arrow used by Booking, Public, Delivery, Theater ticket cards
- `<IconToggleGrid>` — visual checkbox grid in admin (icon + label, coral active state)
- `<ReviewCardFooter>` — vote up/down + αναφορά footer used by all 9 detail pages
- `<ExtraRatingsRow>` — compact rating-only entries (users who rated but didn't suggest)

---

## 24. Reports / Moderation System
> ✅ SHIPPED (session 14, migration 015 applied)

Generalized content reporting + admin moderation. Same flow used for both reviews/suggestions and comments.

### Schema (`scripts/sql/015-content-reports.sql`)
```sql
content_reports (
  id uuid PK,
  target_type text  CHECK ('comment' | 'suggestion'),
  target_id uuid,
  reporter_id uuid FK users,
  reason text       CHECK ('inaccurate' | 'fraud' | 'offensive' | 'other'),
  description text  NOT NULL,                  -- ≥10 chars; required for ALL reasons
  resolved boolean DEFAULT false,
  resolution_action text CHECK ('kept' | 'hidden'),
  resolution_note text,                        -- admin's justification (required ≥5 chars)
  resolved_by uuid FK users,
  resolved_at timestamptz,
  created_at timestamptz
)

-- UNIQUE INDEX (reporter_id, target_type, target_id, reason) — idempotency
-- INDEX on (target_type, target_id) WHERE resolved = false — moderation queue lookup

suggestions  -- gets these columns to mirror what comments already had
  + hidden_at timestamptz
  + hidden_reason text
  + hidden_by uuid FK users
```

### User-facing flow (`<ReportFlowModal>`)
3-step state machine, designed from user's `Desktop/report/*.png` screenshots:
1. **Reason picker** — 4 radio options (Είναι ανακριβής ή λανθασμένη / απάτη / προσβλητική / κάτι άλλο). "Επόμενο" disabled until selection.
2. **Description** — required textarea (≥10 chars). Reason-aware headline + placeholder example.
3. **Confirmation** — "Λάβαμε την αναφορά σου" thank-you. OK button closes.

Posted via `POST /api/reports`. Idempotent on (reporter, target, reason).

### Admin moderation (`/admin/reports`)
- Lists unresolved reports across both `target_type`s
- Per-row: reason chip + target excerpt + reporter description + Dismiss/Hide buttons
- Both actions REQUIRE an admin note (≥5 chars) — audit trail per product decision
- `kept` — only this report resolves; sibling pending reports stay open
- `hidden` — also writes `hidden_at/by/reason` on target row + auto-resolves all sibling pending reports for the same target with same note

### Wiring
- Frontend review carousel cards (all 9 detail pages) → `<ReportLink targetType="suggestion" targetId={review.id} />`
- Comment thread → `<ReportLink targetType="comment" targetId={c.id} />`
- Detail-page suggestion query filters `hidden_at IS NULL`
- Sidebar Reports tab with red badge from `/api/admin/counters` (key `pendingReports`)

### Decisions locked
- Description always required for the user (not optional, not just for "other")
- Admin note always required (audit trail)
- Multiple reports per target supported (separate rows, individually resolvable; auto-batch on `hidden`)
- Never hard-delete — full history preserved, soft-hide via `hidden_at`
- Old `comment_reports` table from migration 003 stays for historical data; new flow writes only to `content_reports`
- Ban deferred (no `users.role='banned'` introduced yet)

---

## 25. Detail Page Composition Rules (locked session 14)

The 9 detail pages are visual variations of one archetype. Rules locked from user feedback:

- **No chips under hero by default.** If a category truly needs 2-3 inline chips, surface them via the InfoCell table below the user reflection — NOT as a chip row. Movies/Series/Bars had chips in step 1; all stripped.
- **3-col stat bar is conditional, not default.** Movies show it ONLY when Oscar present + `avgRating ≥ 4.5`. Default = inline `<RatingLine>` (`★ X.XX · N αξιολογήσεις`).
- **Suggester block is unboxed.** Avatar + name + badge + reflection text + date, no border or fill. Books had a border; stripped.
- **1-column list across all 9 categories.** New `<RowCard>` variant for portrait categories (movies/series/books) — small 88×132 poster left + title/meta/byline/rating right. Carousels stay portrait.
- **Histogram + Top Rated** combine ratings from BOTH sources (`ratings` table + `suggestions.rating` field), deduped by user. Server-side computation, override `item.rating_count + item.avg_rating` so visible count + avg match what's shown.
- **Extra ratings row** ("Άλλες βαθμολογίες") below review carousel — compact rows for users who rated but didn't write a suggestion. Common on migrated items.
- **Own-suggestion behavior** — when viewing your own suggestion, the rate-this-item card is replaced with `<OwnSuggestionActions>` (Επεξεργασία + Διαγραφή). Comments stay open.

---

## 26. Design System Showcase
> ✅ COMPLETE (session 16) — `/admin/showcase` documents every reusable component in the codebase. ~110 components across 16 tabs.

The single source of truth for visual review + design QA. Open `/admin/showcase` in admin to see live variants of every reusable.

### Tabs (16, in order)
| Tab | Components | Purpose |
|---|---|---|
| **Primitives** | 15 atoms | Button · Input · Textarea · Card · Badge · Avatar · AvatarImage · StarRating · IconButton · FilterChip · SortPills · Spinner · StatCard · FollowButton · WantToSeeButton · Skeleton |
| **Foundations** | 4 | UserBadge · OutlinedPill · Icon · AllReviewsButton |
| **Cards** | 7 | ReviewCard · SuggestionCardPortrait/Landscape · CarouselSection · RatingBox · SuggesterCard · BookmarkIcon |
| **Detail modules** | 16 | RatingCard · BookingAvailabilityCard · ActivityCard · PublicBookAd · AuthorCard · AmenitiesRow · NutritionRow · DurationCard · PlatformLinksCard · ReviewCardFooter · OwnSuggestionActions · UserAvatarWithPopup · DeliverySelector · PlatformSelector · ItemGalleryViewer · ExtraRatingsRow |
| **Profile** | 9 | ProfileCard · BadgeDisplay · Stats · CategoryStatCard · RowMenu · FollowersPopupCentered · ProfilePopup · BookmarkedCard · OwnSuggestionCard |
| **Category** | 7 | CategoryCard (4 variants) · FeaturedCard · SubCategoryTabs · FilterRow · FilterBottomSheet · CategoryHeroStats · CategoryTopUsers |
| **Home** | 12 | AIChips · MoviesTonightSection · SuggestedUsers · ContributionCTA · DailyPrompt · SupportSection · home/CategoryTiles · guest/SuggestionFeed · guest/HeroDiscover/Suggest/Personalise · guest/HowItWorks · guest/RegisterPromo · guest/CategoryTiles |
| **Submission/AI** | 3 | ProteínoIntelligence · AchievementProgress · ai/ProgressBar |
| **Recommendation** | 5 | Carousel · CarouselPortrait · CarouselLandscape · BecauseYouLiked · CollectionRenderer (link-only — server component) |
| **Auth** | 5 | AuthHeader · AuthDivider · AuthTrustBadge · OAuthButtons · PasswordRuleList |
| **Layout** | 6 | Header · BottomNav · FAB · MaintenanceBanner · FullScreenOverlay · ReportLink (most chrome is link-only — fixed-position) |
| **Modal** | 5 | Modal · ConfirmDeleteDialog · DeleteSuccessDialog · ReportFlowModal (link) · EditSuggestionModal (link) |
| **Toasts** | 2 | Toast · useToast() hook |
| **Notifications** | 1 | NotificationCard (6 type variants) |
| **Admin** | 5 | IconToggleGrid · PropertyTypeSelector · ImageUploader · ImageGallery · LocationPicker (link) |
| **Patterns** | 2 | Empty state · Skeleton (placeholders for future extraction) |

### File structure
```
app/admin/showcase/
├── page.tsx                  # 45 lines — composer
└── tabs/                     # 16 focused files, 100-700 lines each
    ├── PrimitivesTab.tsx
    ├── FoundationsTab.tsx
    ├── CardsTab.tsx
    ├── DetailModulesTab.tsx
    ├── ProfileTab.tsx
    ├── CategoryTab.tsx
    ├── HomeTab.tsx
    ├── SubmissionAITab.tsx
    ├── RecommendationTab.tsx
    ├── AuthTab.tsx
    ├── LayoutTab.tsx
    ├── ModalTab.tsx
    ├── ToastsTab.tsx
    ├── NotificationsTab.tsx
    ├── AdminTab.tsx
    └── PatternsTab.tsx

components/admin/showcase/
├── ShowcaseShell.tsx         # tabbed nav + active state
└── ShowcaseSection.tsx       # per-component wrapper + Variant cell
```

### Patterns
- **Variant cell:** `<Variant label="…" note?="…" dark?>` — preview surface, optional dark bg for light components.
- **Context links:** every section has `contextLinks={[{ label, href }]}` pointing to live pages where the component is used in production.
- **Link-only fallback:** components that need real server context (full overlays, fixed-position chrome, server components) get a description + "see live" link rather than a fake render. Used for Header / BottomNav / FullScreenOverlay / CollectionRenderer / LocationPicker / ReportFlowModal / EditSuggestionModal.
- **Per-tab file split:** one TS error in any tab no longer takes down the whole showcase. Each tab loads its own imports lazily via React.

### When to update
- New shared component → add a section to the matching tab.
- New visual variant → add a `<Variant>` cell.
- Component refactor → check if any showcase variant breaks (TypeScript catches it; the showcase is a typecheck canary).
- Major redesign → review the showcase first, lock the variants, then ship the redesign.
