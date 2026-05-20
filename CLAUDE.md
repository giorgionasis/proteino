# Proteino — Project Intelligence File

This file is the source of truth for all architectural, design, and product decisions made for the Proteino project. Read this before every session.

**Last meaningful update:** 2026-05-20 (session 33 — admin gaps audit pass 1: subcategory delete-with-reassign dialog, full editor drawer (name + slug + SEO), combinatorial Explorer with live count + Card/Carousel recommendation; `matchesFilter` extracted to `lib/category-filters/match.ts` as the SSoT for public + admin filtering. CLAUDE.md §48 documents the admin gap-audit pattern.)

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

#### ratings — LEGACY (frozen, no longer written or read)
```sql
id uuid PK, user_id FK, item_id FK, suggestion_id FK,
score float, vote_up int, vote_down int, created_at
```
Wiped clean by migration 016 (0 rows). The hook (`useRating`), the API (`/api/ratings`), and the legacy `ReviewsCategoryPage` reader were all retired in session 23 — the table sits idle in the schema. Future cleanup: drop the table once the archive is confirmed unwanted.

#### comments — LEGACY (frozen, archive only)
```sql
id uuid PK, user_id FK, suggestion_id FK,
parent_id FK (for replies), body text, created_at
```
343 K2 rows. `CommentComposer` / `CommentThread` / `/api/comments` were all deleted in session 23 — no new comments are written. The admin surface has since moved to `/admin/legacy-comments` (renamed in session 25 + consolidated in session 28); the `reportedComments` counter still pings off this table since reports filed against the K2 rows are tracked via `comments.report_count`. New review moderation flows through `/admin/reviews` (which absorbed the dedicated `/admin/reports` page in session 28 and understands `target_type='review'` as of migration 035). The reviews + content_reports stack replaces both `ratings` and `comments`.

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
| Sub-category dimension | Type-first (food/bars/recipes/theater), destination-first (hotels/events), genre-first (movies/series/books) | Matches dominant browsing intent — Greek food browsing leads with establishment type (ταβέρνα/μεζεδοπωλείο), cuisine is a secondary filter |
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
| Food | Type (establishment) | Cuisine + region are prominent filters |
| Bars | Type | Region is prominent filter |
| Hotels | Destination | Dynamic from data, not fixed taxonomy |
| Theater | City | Dynamic from data |
| Events | City | Dynamic from data |

### Sub-Categories per Category

**Movies:** Δράμα · Κωμωδία · Θρίλερ · Δράση · Sci-Fi · Ρομαντική · Animation · Ντοκιμαντέρ · Horror · Βιογραφική

**Series:** Δράμα · Κωμωδία · Crime · Sci-Fi · Θρίλερ · Ρομαντική · Ντοκιμαντέρ · Mini-series · Animation

**Books:** Μυθιστόρημα · Θρίλερ · Sci-Fi · Ιστορία · Αυτοβιογραφία · Ψυχολογία · Φιλοσοφία · Self-help · Ποίηση · Business · Παιδικά

**Recipes:** Κυρίως Πιάτο · Ορεκτικά · Επιδόρπια · Breakfast · Ψητά · Σαλάτες · Σούπες · Γλυκά · Ψωμί & Ζύμες

**Food:** Ταβέρνα · Μεζεδοπωλείο · Ψαροταβέρνα · Εστιατόριο · Ουζερί · Πιτσαρία · Ρακάδικο · Τσιπουράδικο · Κουτούκι · Παραδοσιακό Καφενείο · Μαγειρείο (computed dynamically from `item_food.type` distinct values; admin can re-publish a single canonical list later). Cuisine (Ελληνική · Ιταλική · Ασιατική · Burger · Sushi · Fine Dining · Brunch · Vegan · Seafood · Street Food · Middle Eastern) is a bottom-sheet multi-select filter.

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

## 16-17. Metadata Enrichment + Navigation duplicates — **moved / merged**

- **Metadata Enrichment** spec lives in AI.md §11 (per-category API map + admin/user-side status + dispatch architecture).
- **Navigation & UI Structure** was a duplicate of §15. The unique bits — subcategory table model, category access points — are covered in §5 Data Models and §16 Sub-Categories & Filter System.

Note: the **session-17 regions hierarchy is N-level**, not two-level. See §28.

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

## 19. Dynamic Home Sections — **superseded**

The original `home_sections` CMS sketch has been superseded by the more general `page_sections` system in **§37 — Admin-controlled page layouts**. That table now drives both the home page and every category page; the admin surface is `/admin/layout`.

---

## 20. MySQL → Supabase Migration — **done**

K2/MySQL → Supabase migration completed in session 6 (627 users / 1953 items / 1952 suggestions / 953 ratings / 394 comments). Script lives at `scripts/migrate-mysql.ts`. Slug format `category/item-alias`. K2 extra_fields landed in `metadata.extra_fields_raw` (numeric keys: 23=genre, 24=author, 27=language, 28=year, 200=cover). Subcategories were back-filled separately (`scripts/assign-subcategories.js` + `fix-subcategories.js`).

---

## 21. Image Schema & Storage
> ✅ Shipped (core path) — `poster_url` + `backdrop_url` columns in `items`, types in `types/database.ts`, admin enrich route (`/api/admin/enrich`) auto-fetches from TMDB for movies/series + Google Books for books + Google Places for venues. Ticketmaster enrichment for theater/events is the open slot.

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
> ✅ SHIPPED (session 12) — `app/api/suggestions/check`, `<DuplicateScreen>` in `SuggestionOverlay`.

When AI matches an item during submission, `useSubmission.verify()` fires a preflight `GET /api/suggestions/check` between SYNCING and PREVIEW. If a suggestion already exists, jumps straight to the `duplicate` state.

### UX rules (load-bearing)
- **Check fires immediately after LOCKED state** — before SYNCING. Spares the user from typing a 200-char reflection POST would reject.
- **Never a dead end.** Always 2-3 alternative actions.
- **Own vs. other** branching:
  - Same user: "Το έχεις ήδη προτείνει εσύ! 😄" → `[Δες την πρότασή σου]  [Προτείνε κάτι άλλο]`
  - Other user: "Έχει ήδη προταθεί από @X" → `[★ Βαθμολόγησέ το]  [+ Ακολούθησε @X]  [Προτείνε κάτι άλλο]`
- **"Ακολούθησε" only shows when not already following.**
- **Session-scoped rejection set** (`useSubmission`): `dismissAndReject()` blacklists the matched item for the rest of the session so AI doesn't re-suggest it on the next keystroke — kills the duplicate-screen loop.
- Race-safe: POST `/api/suggestions` still catches duplicates that slip past the preflight.

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
- `<UserBadge>` — suggestion-tier badge + label. Accepts `suggestionCount` (preferred — derives tier via `badgeLabelForSuggestions`) or legacy `level`. Returns `null` for users with fewer than 3 suggestions. Replaces 3 legacy patterns: colored text pills, inline shield SVG, BadgeChip.
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

## 25. Detail Page Composition Rules (locked session 14, extended session 24)

The 9 detail pages are visual variations of one archetype. Rules locked from user feedback:

- **No chips under hero by default.** If a category truly needs 2-3 inline chips, surface them via the InfoCell table below the user reflection — NOT as a chip row. Movies/Series/Bars had chips in step 1; all stripped.
- **3-col stat bar is conditional, not default.** Movies show it ONLY when Oscar present + `avgRating ≥ 4.5`. Default = inline `<RatingLine>` (`★ X.XX · N αξιολογήσεις`).
- **Suggester block is unboxed.** Avatar + name + badge + reflection text + date, no border or fill. Books had a border; stripped.
- **Featured suggester block is mandatory on all 9 categories.** Was missing on Bars + Series before session 24 — now present everywhere via the same `UserAvatarWithPopup` + `UserBadge` + reflection pattern.
- **1-column list across all 9 categories.** New `<RowCard>` variant for portrait categories (movies/series/books) — small 88×132 poster left + title/meta/byline/rating right. Carousels stay portrait.
- **Histogram + Top Rated** combine ratings from BOTH sources (`ratings` table + `suggestions.rating` field), deduped by user. Server-side computation, override `item.rating_count + item.avg_rating` so visible count + avg match what's shown.
- **Extra ratings row** ("Άλλες βαθμολογίες") below review carousel — compact rows for users who rated but didn't write a suggestion. Common on migrated items.
- **Own-suggestion behavior** — when viewing your own suggestion, the rate-this-item card is replaced with `<OwnSuggestionActions>` (Επεξεργασία + Διαγραφή). Comments stay open.
- **Empty-state = hide, never render "—" (locked session 24).** Every InfoCell / row / banner / panel conditionally renders. If a metadata pair has both cells empty, hide the whole row including its divider. If one cell is empty, render an empty `<div className="flex-1" />` spacer so the visible cell keeps its layout. If a category-specific module (amenities, external ratings, venue block, performers carousel) has no backing data, hide the whole module. No `"—"` placeholder text anywhere.
- **No gray-circle placeholders for people (locked session 24).** Every actor / performer / director / writer bubble is `<PersonBubble name avatarUrl?>` — renders the real image when `ext.actors[].avatar` / `.photo` / `.avatar_url` / `.image` exists, otherwise a deterministic colored-initial circle via `<AvatarImage>`'s palette hash. No more `#3a4a5a` / `#5a4a3a` hardcoded fill blocks. Two layouts: `stack` (vertical, used in actor/performer carousels) and `inline` (horizontal, used in director / writer rows).
- **No dead CTAs (locked session 24).** Every button / link goes somewhere real. Map buttons → Google Maps (lat/lng if present, else `{title} {address}` search URL). Phone numbers → `tel:`. Website rows → `https://` URL (auto-prefixed when admin entered bare domain). Trailer overlays → `ext.trailer_url`, hidden when absent. The fake recipe "Αγόρασε τα υλικά online · Παραγγελία" CTA was deleted — admin can re-add via the `page_sections` widget system when an affiliate ships.

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
| **Profile** | 11 | ProfileCard · BadgeDisplay · Stats · ProfileScoreCard · ProfileVotesCard · CategoryStatCard · RowMenu · FollowersPopupCentered · ProfilePopup · BookmarkedCard · OwnSuggestionCard |
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

---

## 27. Search v2 — structured filters (session 17)
> ✅ Shipped (Gemini extraction + route filters); requires data backfill in some categories

Major rewrite of `app/api/search/route.ts` to handle structured queries beyond title ilike. Gemini's extraction schema (`types/index.ts:SearchAnalysis`) now carries:

| Field | Categories | Maps to |
|---|---|---|
| `type` | venues | `item_<cat>.type` / `item_food.cuisine` (refinement filter) |
| `genre` | non-venue | `subcategories.name` via `resolveSubcategoryIds` |
| `channel` | movies / series | `item_movies.channel` / `item_series.channel` ilike |
| `status` | series | `item_series.end_date IS NOT NULL` (completed) |
| `period` | events | jsonb date overlap, month-of-year matching |
| `duration_min/max` | movies | `item_movies.duration_min` range |
| `person` | all | jsonb actor/director/writer/performer search across movies/series/books/theater/events |
| `location` | venues | recursive descendant expansion through regions tree |

### Architecture
- **Venue branch** (food/bars/hotels/theater/events): pulls candidates (up to 800/cat when refinement tokens present), then JS-filters by address (location tokens) + title/cuisine/type (refinement tokens via `tokenMatches`). When a title anchor is found, surfaces contextually-similar items (Tier A: same type + same address area; Tier B fallback: same type anywhere).
- **Non-venue branch** (movies/series/books/recipes): `fetchByStructuredFilters` composes subcategory_id + channel + duration + status into a single Supabase query per category. If genre is set but doesn't resolve and other filters exist, drops the genre constraint rather than empty-returning.
- **People search**: extended from movies/series/books to theater + events. Runs both raw and accent-folded query variants to beat Postgres's accent-sensitive ilike.

### `tokenMatches` semantics
Asymmetric Greek-inflection-aware match:
- `target.includes(token)` → match (data broadens query)
- Common prefix ≥ 4 chars AND within 2 of shorter side → match (inflection variants)
- `token.includes(target)` (token longer than target) → **NOT a match** (don't broaden via shorter substring)

So "ταβέρνα" matches "ψαροταβέρνα" (broadening allowed), but "μπακαλοταβέρνα" does NOT silently expand to all "ταβέρνα" venues (user being more specific is intentional).

### `resolveLocation` — multi-word matching
Region names are scored per query: a region matches only when **every word** of its name appears in the query (plus an optional slug-match bonus). Ties broken by name length (longer = more specific wins). Fixes "Νότια Προάστια" beating "Βόρεια Προάστια" on a "βόρεια προάστια" search (both share the word "Προάστια").

### Cache + prompt versioning
`lib/ai/cache-and-log.ts` carries `PROMPT_VERSION` (currently `v6`). Bump on any prompt change to invalidate all v_{prev} cache entries on next read. Cache key is `hash(provider|model|version|task|query)` with 30-day TTL.

### Quota
Free tier of `gemini-2.5-flash-lite` is **20 requests/day** (not RPM). Enable billing on Google Cloud Console to lift. At ~700 tokens/call (with taxonomy injection), paid cost ≈ $0.0001/search.

---

## 28. Regions admin & N-level hierarchy (session 17)
> ✅ Shipped — admin at `/admin/content/regions`, backed by `regions` table

The `regions` table has been self-referential via `parent_id` since migration 001 — but no admin UI existed. Session 17 added `/admin/content/regions` (`<RegionsManager>`) with inline rename, add-child, drag-to-reparent (via select), cycle prevention, recursive descendant collection.

### Frontend consumption (bottom-sheet picker)
`lib/regions.ts:fetchRegionTreeForCategory` returns `{ parents, childToParent, descendantsById }`. The picker (`<TwoStepListPicker>`) is **two steps maximum**: top-level region → leaves. **Intermediate prefecture-style regions are HIDDEN from the picker** (Βόρεια Προάστια, Ηράκλειο prefecture) — the user picks the specific neighborhood (Χαλάνδρι, Ελούντα) without thinking about which super-region it belongs to.

### Smart search still understands the full hierarchy
The intermediate level stays in the `regions` table so:
- Gemini taxonomy injection (`lib/ai/taxonomy.ts`) includes top-level regions in the prompt
- `resolveLocation` walks the full tree and returns `descendantIds` for any matched region
- Search query "ψαροταβέρνα στα βόρεια προάστια" resolves the intermediate region and expands to ALL descendants beneath it (including items tagged to Χαλάνδρι specifically)
- `matchesFilter` for the region filter expands selected region IDs to all descendants via `descendantsById`

### SuggestionEditor RegionSelect
Refactored from hardcoded 2-level (Region + Area selects) to **N cascading dropdowns**. Walks the tree from selected node up to root, renders one `<select>` per level. New deeper select appears automatically when the selected region has children. So Crete (3+ levels) gets `Κρήτη → Ηράκλειο prefecture → Ελούντα`; Attica still works as `Αττική → Βόρεια Προάστια → Χαλάνδρι`; bare regions (e.g. Σαντορίνη with no children) show a single select.

---

## 29. Multi-language item titles (session 17)
> ✅ Shipped (code); apply migration 020 in Supabase to activate

Items can carry both a localized `title` (e.g. "Λούσιφερ") and an `original_title` (e.g. "Lucifer"). The search route ilikes both columns (via `title_normalized` + `original_title_normalized` generated columns with Greek accent folding) so users find items in either language.

- Migration 020 (`scripts/sql/020-original-title.sql`) adds the column + generated normalized variant + btree index.
- Admin: `<SuggestionEditor>` shows the field for movies / series / books (hidden for other categories).
- Admin page query has a 3-tier fallback (with both new cols → without `original_title` → without `images` either) so the editor still loads on environments where migrations 009 or 020 aren't applied yet.

---

## 30. Admin UI primitives (session 17)
> ✅ Shipped — `components/admin/ui/` shared rhythm pattern

New design rhythm for admin pages (Linear / Vercel / Supabase Studio style). First showcase: `/admin/content/regions`.

```
components/admin/ui/
├── AdminPageHeader.tsx     # Title + subtitle + meta + primary CTA
├── AdminPanel.tsx          # Bordered card with optional toolbar slot
├── AdminRow.tsx            # Generic list row — title / meta / actions slots.
│                           # Actions hidden by default, revealed on
│                           # group-hover + focus-within. Includes
│                           # AdminActionButton + AdminActionSelect (sub-comp).
└── AdminEmpty.tsx          # icon + title + description + CTA empty state
```

### Patterns
- **Hover-revealed actions** — secondary controls (parent dropdown, delete, add-child) only appear on row hover. Reduces visual clutter — eyes scan to the primary info first.
- **Typographic hierarchy** — primary title 14-15px medium zinc-900; metadata 12px muted zinc-400; actions far-right 28px icon buttons.
- **Tree rendering** — `AdminRow` accepts a `depth` prop (18px indent per level). Combined with a small leading chevron/dot, it renders an unbounded-depth tree without drawing finder-style guide lines.

### Roll-out
`RegionsManager` is the only consumer today. Same primitives can replace ad-hoc admin styling in: `/admin/content/filters`, `/admin/content/activities`, `/admin/users`, `/admin/reports`, `/admin/reviews`, `/admin/categories`. Each is ~1 hour of careful refactor.

---

## 31. Motion + animation system (session 17)
> ✅ Foundations + Sprints 1-3 shipped

### Foundations
- `tailwindcss-animate` installed → `animate-in / animate-out / fade-in / slide-in-from-bottom / zoom-in-* / duration-* / delay-*` utilities are available.
- `app/globals.css` includes a `prefers-reduced-motion` global override: instant resolution for animations + transitions for users with vestibular sensitivity. Non-negotiable accessibility default.
- Named easings in `tailwind.config.ts:transitionTimingFunction`:
  - `ease-spring` — `cubic-bezier(0.32, 0.72, 0, 1)` — iOS decel; bottom sheets, page transitions
  - `ease-soft` — `cubic-bezier(0.4, 0, 0.2, 1)` — Material-standard; general UI
  - `ease-pop` — `cubic-bezier(0.34, 1.56, 0.64, 1)` — overshoots 1.0; reward interactions (likes, bookmarks, achievements)

### Shipped effects
Overlay slides, card tap scale, FadeImage, bookmark/follow/star pop-in, SubCategoryTabs/BottomNav sliding indicators, search result stagger, AI panel slide-down, MATCH LOCKED zoom+pill, Toast slide-in, FAB scale-in, logo dot pulse, map pin tap, input focus transition. See PROGRESS.md session 17 for the full per-sprint catalogue.

### CSS gotchas locked in (don't re-learn the hard way)
- **Transformed ancestor → `position: fixed` containing block.** Any element with `transform`, `will-change-transform`, `filter`, or `perspective` becomes the containing block for fixed descendants, replacing the viewport. `FilterBottomSheet`, `Modal`, `ProfilePopup` ALL use `fixed inset-0`. If you animate a wrapper that contains them, they'll mis-position. Workaround: render the fixed elements as siblings of the animated wrapper, or via portal to `document.body`.
- **Conditional mount kills exit animations.** `{open && <Popup>}` unmounts the popup the instant `open` flips to false — the exit animation never plays. Pattern: always render the component, let it manage its own `mounted` state internally with a delayed unmount (`setTimeout` matching transition duration).
- **CSS animations need a property change to fire.** Setting `style={{ animation: 'slideUp …' }}` on first mount may not animate if the property is already applied. Use CSS transitions on a state-toggled property (`transform`, `opacity`) instead — `requestAnimationFrame` gap between mount and "show" state lets the browser commit the start frame before applying the target.
- **`animate-in slide-in-from-bottom` (no suffix) has no translation.** From `tailwindcss-animate`, suffix-less variants don't translate by any specific distance — they're effectively just fades. Use `slide-in-from-bottom-N` (Tailwind spacing) or the project's own `slideUp` keyframe (which animates `translateY(100%) ↔ 0`).

---

## 32. Bookmark v2 + orbit microinteraction (session 19)
> ✅ Shipped — apply migrations 023 + 025 in Supabase to activate the status column + GRANT/RLS fix

Bookmarks are now a two-state model: **`wishlist`** ("I want to read/watch/visit") and **`done`** ("I read/watched/visited it"). Stored on `bookmarks.status` (CHECK constraint, default `'wishlist'`). Both states surface as always-visible mutually-exclusive chips below the hero on every detail page.

### Schema (`scripts/sql/023-bookmarks-status.sql`, `025-bookmarks-update-policy.sql`)
- 023 adds `bookmarks.status` enum (`'wishlist'`|`'done'`) + index on `(user_id, status)`.
- 025 adds the missing `GRANT SELECT/INSERT/UPDATE/DELETE ON public.bookmarks TO authenticated` + `bookmarks_own_update` UPDATE policy. Migration 012 originally created the table without GRANTs or a row-level UPDATE policy → every PATCH returned `permission denied for table bookmarks`. Root-cause fix.

### Behaviour rules
- **Default save = `wishlist`.** When the user taps the top-right bookmark IconButton, the item lands on the wishlist list. Their wishlist + done count is tracked separately per category.
- **Rating an item auto-flips wishlist → done.** `useReview`'s `onSaved` callback wakes a `setStatus('done')` on the bookmark controller. Matches the intuition "I rated it ⇒ I clearly experienced it." Reverse flip is never automatic; user must do it manually via the chips.
- **Chips are always visible.** Discoverability beats minimalism — first-time users see both states inline instead of having to discover them via menu. Active chip gets the heart icon (wishlist) or check icon (done); inactive chip is outlined.
- **Per-category labels.** `lib/bookmarks/labels.ts` maps `{ category }` → `{ wishlist, done }`. Books: "Θέλω να διαβάσω" / "Διάβασα". Movies/Series: "Θέλω να δω" / "Είδα". Food/Bars: "Θέλω να πάω" / "Πήγα". Recipes: "Θέλω να φτιάξω" / "Έφτιαξα".
- **Celebration on first save.** `BookmarkSavedModal` (portal-mounted slide-up) replaces the toast for the first bookmark. Shows the avatar stack of other bookmarkers (up to 9 + "+N"), category-specific headline, 5s auto-dismiss. On subsequent saves of the same item, no modal — the orbit + bounce + chip update suffice.

### `useBookmark` controller contract
```typescript
interface BookmarkController {
  status:     'wishlist' | 'done' | null;  // null = not bookmarked
  bookmarked: boolean;                      // = status !== null
  busy:       boolean;
  toggle():     Promise<{ ok: boolean; status: BookmarkStatus | null; context?: BookmarkContext }>;
  setStatus(s: BookmarkStatus): Promise<{ ok: boolean }>;
}
```
Toggle returns explicit status so callers don't have to derive it from optimistic state. Context carries the bookmarker avatar stack for the modal.

### Orbit microinteraction (`hooks/useBookmarkOrbit.ts`)
On SAVE only (not on remove), the hero cover image clones and flies a quadratic Bezier arc into the bookmark IconButton. Tunable constants:

```typescript
const DURATION_MS = 700;     // total flight time
const ARC_HEIGHT  = 220;     // px lift at the control point
const KEYFRAMES   = 24;      // path smoothness
const FADE_START  = 0.97;    // near-zero fade — shrinkage handles the disappearance
const END_PX      = 1;       // final clone size at icon centre — collapses to a point
```

Discovery is DOM-based: hero wrapper carries `data-orbit-source`, IconButton carries `data-orbit-target`. No React refs through props. Honours `prefers-reduced-motion` (falls back to 200ms straight fade).

### Bookmark bounce + orchestration

`bookmark-bounce` keyframe in `tailwind.config.ts`: `1.0 → 1.35 → 0.88 → 1.08 → 1.0` over 520ms with `ease-pop`. Applied to the **whole 36px IconButton circle**, re-fired via a `key={popKey}` that increments on every visual flip.

SAVE orchestration (in `DetailHeaderActions.tsx`): fly + toggle in parallel → await fly (~700ms) → flip icon to bookmark-added (bounce plays) → await API → sleep 600ms so bounce settles → open `BookmarkSavedModal`. REMOVE is instant, no orbit.

Detail-page integration (all 9 pages): wrap hero cover with `data-orbit-source`, render `<DetailHeaderActions onSaved={setSavedModal} />` in the header, `<BookmarkStatusChips />` above the rating box, `<BookmarkSavedModal />` at the end.

---

## 33. Profile screen visuals (session 19)
> ✅ Shipped — 6 SVGs in `public/icons/profile/`, 2 new card components

The profile hero badge + stats row + scoring cards were redesigned to match the Figma spec.

### Badge area
- Uses the design-system `<Icon name="badge-verified">` hexagon (replaces the previous inline `TealShieldIcon` SVG that was hand-coded on a one-off basis).
- Flanked by **two leaf-wreath SVGs** (`profile-leaves-left` + `profile-leaves-right`) — 127×134px each, faded zinc-100 fill. The previous hand-drawn dot-decoration columns are deleted.
- Layout switched from `items-end justify-start` to `items-center justify-center` so the badge sits visually centred between the leaves.

### Stats row icons
- Suggestions: `profile-suggestions` (pencil SVG from the Figma spec) — replaces an inline `<PencilIcon>` SVG.
- Reviews: `profile-reviews-star` — replaces the inline `<StarIcon>` SVG.
- Bookmarks icon kept (still uses an inline outline SVG; design didn't ship a new asset).

### Two new card components
| Component | Title | Big number | Icon | Link |
|---|---|---|---|---|
| `ProfileScoreCard` | Συνολική Βαθμολογία | `score.toFixed(2)` | `profile-rating-leaves` (gold laurel) | "Δες και τις N τις βαθμολογίες" |
| `ProfileVotesCard` | Θετικές ψήφοι | `votes` (int) | `profile-thumb-up` | "Δες όλες τις αξιολογήσεις" |

- Both expose an `ⓘ` info-icon next to the title with an optional `onInfo` callback — placeholder for future tooltip explaining how the score / vote count is computed.
- 260px min-width, identical visual rhythm, scroll horizontally in the stats strip.
- Score uses `avg_quality_score` from `users` (shows "—" when 0).
- Votes count is summed server-side from `reviews.vote_up` for the profile owner, passed as `voteUpCount` prop. New SELECT in `app/(main)/profile/[handle]/page.tsx`.

Both cards are covered in `/admin/showcase` → Profile tab with healthy / empty / extreme variants.

---

## 34. Onboarding flow (session 20)
> ✅ Shipped — 4 screens at `/onboarding`, gated server-side from `(main)/layout.tsx`

The give-before-you-ask onboarding spec from §7, finally built. Both new signups AND existing users go through it on next login.

### Gate
`app/(main)/layout.tsx` reads `users.preferences` in the same admin query it already uses for the avatar/displayName lookup. When `preferences.onboarded_at` is missing, `redirect("/onboarding")` fires. Safe against migration 022 not being applied (the SELECT failing falls through cleanly rather than trapping users).

### Stamping rule (critical)
`preferences.onboarded_at` is stamped ONLY on the **final** call to `/api/onboarding/complete`. Intermediate writes (step 2 → 3 transition saving interests) pass `final: false`. If `onboarded_at` were stamped mid-flow, any RSC re-render hitting `/onboarding`'s server entry (link prefetch, hot reload, router refresh anywhere) would see the stamp, redirect, and kick the user out of the flow before they reached step 4. The split flag keeps the user in the flow until they truly finish or skip.

### Storage location
All onboarding state lives under `users.preferences` jsonb (migration 022):
- `preferences.interests` — array of category slugs
- `preferences.onboarded_at` — ISO timestamp; presence = done
- (other top-level keys like `notifications`, `tour_seen` live alongside)

No new migration needed — `onboarded_at` is just another key in the existing prefs jsonb.

### Screens (`components/onboarding/`)
| File | Trigger | Key behavior |
|---|---|---|
| `HookScreen.tsx` | step 1 | 4-phase looping AI demo: typing → LISTENING → LOCKED → reset. Same visual grammar as the live submission flow. "Παράλειψη" stamps onboarded_at — never nag again. |
| `InterestsScreen.tsx` | step 2 | 3×3 emoji grid, ≥2 picks. Live counter. Discoverable coral pill expands an inline textarea: AI parses Greek/greeklish → matching cells animate-pop-in. |
| `RewardScreen.tsx` | step 3 | Horizontal carousels per picked category. Excludes user's own suggestions. Two-tier query (rated+covered preferred, cover-only fallback). Each card has a coral "Επειδή..." reason. |
| `PeopleScreen.tsx` | step 4 | Two sections: `tight` specialists + `broad` general contributors. Avatar tap → ProfilePopup. Canonical FollowButton wired through useFollow so follows actually persist. |
| `OnboardingSyncing.tsx` | finishing | 3-step checklist with live numbers from `/api/onboarding/numbers`. Animation timing fixed; numbers hot-swap in on fetch resolve. |

### APIs (`app/api/onboarding/`)
- `complete` — POST `{ interests?, final?, skipped? }`. Saves interests + conditionally stamps `onboarded_at`.
- `reward-feed` — GET `?categories=...`. Per-category carousels. Excludes user's own item_ids. Tier-A (rated + cover) with tier-B fallback.
- `suggested-users` — GET `?categories=...`. Returns `{ tight, broad }` ranked by `matched` count in scope. Each user carries a `taste` line ("78 βιβλία · 12 ταινίες"). Excludes viewer + already-followed.
- `numbers` — GET `?categories=...`. Three live counts for the syncing screen + a `totalSuggestions` for the skip path. Edge-cached 60s.
- `parse-interests` — POST `{ text }`. Two-tier extraction: Gemini's `extractInterests` first, deterministic accent-folded keyword matcher fallback.

### `extractInterests` on AIService
New optional method on the `AIService` interface. Gemini implementation lives in `lib/ai/gemini.ts:extractInterests`. The cache-and-log wrapper forwards optional methods (including `getSemanticQualityTip`, `conversationalSearchFallback`) only when the inner service implements them — keeps the wrapped object structurally consistent with the interface.

### Notes
- `<FollowButton>` is now properly controllable (added `useEffect(() => setActive(following), [following])`). Existing uncontrolled consumers (`SuggestedUsers`, `CategoryTopUsers`, `ProfilePopup`) are unaffected because they never mutate `following`.
- `/onboarding` needs its own `AuthProvider` wrap in the layout — it lives outside `(main)` so otherwise the auth store stays null and `useGuestGuard` fires the sign-in modal on follow tap.

---

## 35. Achievement celebration (session 20, DB-driven since session 21)
> ✅ Shipped — copy + timing now lives in the `moments` table (see §42), admin-editable via `/admin/moments`. Review-milestone variants added session 26 (counts 1/5/10/25/50 — see §42).

### Trigger schedule for suggestions
`/api/suggestions` resolves a moment with `trigger_event='suggestion_published'` against the user's new `suggestion_count`. Hits fire the modal.

| Tier | Counts |
|---|---|
| Verified (3) | 1, 2 → progress · 3 → tier_unlock |
| Έμπειρος (10) | 7, 9 → progress · 10 → tier_unlock |
| Expert (25) | 22, 24 → progress · 25 → tier_unlock |
| Platinum (50) | 47, 49 → progress · 50 → tier_unlock |

Two visual variants: `progress` (dots toward target, grey badge) and `tier_unlock` (colored badge + sparkles + ordinal subtitle). Tier colors: Verified `#1D9E75` · Έμπειρος `#3B82F6` · Expert `#7C3AED` · Platinum `#64748B`.

### Architecture
`<AchievementUnlockedModal>` portal-mounts to body, 3-phase mount, body-scroll lock, X + backdrop close. **No auto-dismiss** — achievements are intentional pauses. Fires **10s after** Published mounts (decided 2026-05-12) so the ✓ checkmark lands first.

Showcase coverage: `/admin/showcase` → Submission/AI tab → 10 interactive buttons portal-mounting the real modal (removes the need to reset `suggestion_count` for design review).

---

## 36. Badge tier source of truth (session 20)
> ✅ Shipped — derived from `suggestion_count`, not `users.level`

Root cause of the "everyone is Verified" bug: `users.level` is `1` for every MySQL-migrated user. The 9 detail components, the ProfilePopup, the admin UsersTable — they all keyed badge tier off `level`.

### Canonical helpers (lib/icons.ts)
- `badgeIconForSuggestions(count): IconName | null` — returns `null` below 3, then `badge-verified` / `-gold` / `-expert` / `-platinum` at 3 / 10 / 25 / 50.
- `badgeLabelForSuggestions(count): "Verified" | "Gold" | "Expert" | "Platinum" | null` — same thresholds.

The old `badgeIconForLevel(level)` is kept (commented as unreliable) for any legacy caller; new callers should always use the suggestion-count helpers.

### Tier thresholds (canonical, platform-wide)

| Suggestions | Badge | Label |
|---|---|---|
| 0–2 | (none) | brand-new user shows no badge |
| 3–9 | Verified | Επαληθευμένος χρήστης |
| 10–24 | Gold | Έμπειρος χρήστης |
| 25–49 | Expert | Expert |
| 50+ | Platinum | Platinum |

Admin `UsersTable` has one extra **NEW** tier (count < 3) so the moderation column always has a label — different rule than the public UI, where below-threshold users get no badge.

### `<UserBadge>` contract
Accepts: `kind` (explicit) → `suggestionCount` (preferred) → `level` (legacy fallback). When `suggestionCount` is supplied and falls below 3, the component renders `null`.

### Consumers (updated platform-wide this session)
- `<UserAvatarWithPopup>` derives popup badge from `suggestion_count`. Cascades to all 9 detail pages + onboarding popup + every carousel that uses it.
- All 9 detail components: local `getBadge(level)` → `getBadge(suggestionCount)` wrapping the central helper.
- `/[category]/[id]/reviews` subpage uses the central helper.
- Admin `UsersTable` uses suggestion-count thresholds.
- The detail-page TypeScript types for `suggestions[].user` and `reviews[].user` were extended with `suggestion_count`. The reviews SELECT was missing the column — added.

---

## 37. Admin-controlled page layouts (session 22)
> ✅ Shipped — both category pages and home page consume `page_sections` via `resolvePageLayout`; admin reorders/adds/removes via `/admin/layout`.

The composition of every category page and the home page is now DB-driven. The admin can reorder sections, add new ones, delete non-fixed ones, swap audience visibility, and preview the result in a phone-bezel iframe — without touching code.

### Architecture (three layers)

| Layer | File | Role |
|---|---|---|
| DB | `page_sections` (migration 032 renamed `collection_placements` + extended; migration 033 completed home seed) | Source of truth — one row per visible section per audience |
| lib | `lib/layout/{types,widgets,resolver,home-bridge}.ts` | Types, widget registry, server resolver, render bridges |
| UI | `CategoryPageShell`, `app/(main)/page.tsx`, `/admin/layout`, `/preview/...` | Map resolved sections to JSX |

### `page_sections` schema (migration 032)

```sql
-- Renamed from collection_placements
page_sections (
  id              uuid PK,
  section_type    text CHECK (collection | widget | divider),
  collection_id   uuid REFERENCES collections — nullable (NULL for widget/divider rows)
  widget_key      text — required when section_type='widget'; matches lib/layout/widgets.ts
  context         text CHECK (home | category | suggestions),
  category        text — NULL for home, required for category
  display_order   int,
  audience        text CHECK (all | registered | guest),
  config          jsonb — per-widget params (title, source, offset, limit, ...)
  is_active       bool,
  valid_from / valid_until  timestamptz — optional per-section lifecycle
  -- + type-ref consistency CHECK so widget/divider rows can't have collection_id
)
```

The old UNIQUE constraint on `(collection_id, context, category)` was DROPPED — widgets share `(NULL, context, category)` so multiple widgets per bucket would collide. Singleton enforcement (e.g. only one `filter_row` per bucket) moved to the application layer.

RLS rewritten: widgets/dividers visible if `is_active`; collections visible if their referenced collection is `is_published`.

### Widget registry (`lib/layout/widgets.ts`)

22 widgets, declared as **pure metadata** (no render functions — those live per-page so they can close over shell state). Each `WidgetSpec` carries: `key`, Greek `label`, allowed `contexts` + `categories` + `audiences`, `fixed: true` (admin can reorder but never delete — e.g. `filter_row`, `items_list`, `footer_mobile`), `singleton: true` (only one per bucket), and optional `configSchema` (the field schema the admin form auto-renders).

Widgets registered today:

| Bucket | Widget keys |
|---|---|
| Category chrome (fixed) | `welcome_header`, `sub_category_tabs`, `filter_row`, `items_list` |
| Category content | `movies_tonight` (movies only), `open_map_button` (venues only), `static_carousel`, `category_top_users`, `suggest_box` |
| Home guest | `hero_discover`, `hero_suggest`, `hero_personalise`, `category_tiles`, `suggestion_feed`, `how_it_works`, `register_promo` |
| Home registered | `greeting`, `ai_chips`, `suggested_users`, `contribution_cta` |
| Shared (any audience) | `support_section`, `footer_mobile` (fixed) |
| Repeatable | `static_carousel` (non-singleton — admin can place many; config carries title + source + category override + offset + limit) |

`static_carousel` is the workhorse: replaces the legacy "primary + secondary fallback carousels" with admin-editable rows. `source` presets: `top_rated`, `newest`, `most_bookmarked`, `most_reviewed`.

### Resolver (`lib/layout/resolver.ts`)

```ts
resolvePageLayout(sb, {
  context: 'home' | 'category' | 'suggestions',
  category: string | null,        // null for home
  viewerAudience: 'registered' | 'guest' | null,  // null = admin "show all"
  includeInactive?: boolean,      // admin: true; production: false
}) → Promise<RenderedSection[]>
```

Single query + parallel collection hydration. Returns a discriminated union `{ kind: 'collection' | 'widget' | 'divider', ... }`. Empty collections (after hydration) are dropped so the consumer never renders a zero-item carousel.

### Render bridges

- **Category** — `renderSection()` closure inside `CategoryPageShell.tsx` that has access to all the shell state (activeTab, filterValues, showMap, …). Bridges each widget key to its component.
- **Home** — `lib/layout/home-bridge.tsx:renderHomeSection(section, ctx)` because Next.js disallows extra exports from `page.tsx`. `ctx` carries the fetched data buckets (food / movies / series / books / recipes + topUsers / chips / feedItems / tonight).
- **Static carousel resolution** — for category pages: slices from the main `items` array using `config.offset` + `config.limit`. For home: picks the right bucket based on `config.category`, renders as `CarouselPortrait` if category ∈ {movies, series, books} else `CarouselLandscape`.

### Legacy fallback

Both pages render the previous hardcoded JSX (preserved verbatim) when `layoutSections.length === 0` — safety net for un-applied migrations or empty seeds. After production stabilises this can be deleted.

### Admin surface (`/admin/layout`)

Three columns: page picker (Αρχική + 9 categories) · dnd-kit Sortable section stack (drag handle / audience select / active toggle / pencil / delete-disabled-for-fixed) · iPhone-bezel iframe preview pointing at `/preview/...`. `SectionPickerModal` filters widgets via `compatibleWidgets()`, grays singletons. `SectionConfigDrawer` auto-renders from `WidgetSpec.configSchema` + audience + `valid_from/until`.

`/preview/category/[slug]` + `/preview/home` live outside `app/(main)/` to skip global chrome. `force-dynamic`. Audience override via `?audience=guest|registered|all`. Reuse the production bridges for byte-identical output.

### API

- `GET /api/admin/page-sections?context=...&category=...`
- `POST /api/admin/page-sections` — validates compatibility + enforces singleton (409 on duplicate)
- `PATCH /api/admin/page-sections/[id]` — only `is_active` / `audience` / `config` / lifecycle mutable; type/key/context/category are immutable post-create
- `DELETE /api/admin/page-sections/[id]` — refuses when widget is `fixed`
- `POST /api/admin/page-sections/reorder` — batch renumber to `(i+1)*10`

All writes call `revalidatePath`. Migrations 032 + 033 seed every bucket with widget rows that reproduce the previous hardcoded JSX exactly — day-1 render is visually identical.

### Resolver behaviour notes (locked invariants)

These are the small contracts the resolver + bridges already enforce. Calling them out explicitly so future changes don't break them silently.

- **Audience filter** — `viewerAudience='registered'` matches rows where `audience IN ('all','registered')`; `'guest'` matches `('all','guest')`. `null` (admin "show all" preview) skips the audience filter entirely. Lifecycle + `is_active` still apply in all three modes.
- **Lifecycle** — `valid_from > now` hides the row; `valid_until < now` hides. NULLs always pass. Computed in JS over the bounded row set, not as Postgres `WHERE`.
- **Empty collection drop** — collection rows whose hydration returns 0 items are silently filtered out of the resolver output, so the consumer never sees a zero-item carousel. Widget + divider rows pass through regardless of internal state.
- **Singleton enforcement** — `WidgetSpec.singleton` is enforced at the application layer in `POST /api/admin/page-sections` (409 on duplicate). No DB UNIQUE constraint covers this, by design — widgets share `(NULL collection_id)` so a unique index would over-fire.
- **Fixed widget delete** — `DELETE /api/admin/page-sections/[id]` refuses with 4xx when `isWidgetFixed(widget_key)`. Admin can mark fixed widgets `is_active=false` instead.
- **RLS shape** — widgets/dividers visible when `is_active=true`. Collection-backed sections additionally require `collections.is_published=true` (enforced both by RLS and by a defensive JS filter in the resolver — the JS filter handles the case where the join returns the row but the collection is unpublished).

### Static-carousel rendering contract

The `static_carousel` widget is repeatable (non-singleton). Its render path is **NOT** the same as a collection — there's no per-row DB query. The bridges slice from buckets the page already fetched at the top:

- **On home** (`lib/layout/home-bridge.tsx`): `config.category` selects which pre-fetched bucket to slice from (`ctx.movies/series/books/food/recipes`). When `config.category` is missing the fallback is `food`. `PORTRAIT_CATEGORIES = {movies, series, books}` decides whether to render `CarouselPortrait` or `CarouselLandscape`.
- **On category pages** (`CategoryPageShell.renderSection`): `config.category` is **intentionally ignored**. The slice is always taken from the page's own `items` array — so a `static_carousel` placed on `/movies` cannot accidentally surface bars. Portrait/landscape branching uses `isPortraitCategory(category)`.
- **`config.offset` + `config.limit`** apply `Array.prototype.slice(offset, offset+limit)` against the bucket. If the slice is empty (offset beyond bucket length, or bucket is empty) the bridge returns `null` and the section drops gracefully.
- **`config.source`** (top_rated / newest / most_bookmarked / most_reviewed) is currently a label hint — the buckets are already ordered when fetched at the page level, so source selection is effectively whatever order the live page chose. `lib/layout/resolver.ts:fetchStaticCarousel` exists for a future "source-aware per-section query" path but is **not wired** today; treat it as dead code until a configurable item-source picker lands.

### Postmessage iframe scroll (session 23)

`/admin/layout`'s section stack is fully interactive — clicking a section row posts `{type:'scroll-to-section', sectionId}` to the iframe via `iframe.contentWindow.postMessage`. The preview routes mount `PreviewScrollListener` (in `app/preview/layout.tsx`) which receives the message, scrolls the matching `[data-section-id]` element into view, and applies a 1.6s coral highlight ring. Origin is checked for safety. The wrapper that carries the attribute is added at the render-bridge boundary (`renderHomeSection` / `CategoryPageShell.renderSection`), so production gets the attribute too — it's harmless outside the preview iframe.

---

## 38. Admin-configurable "More from {axis}" detail-page sections (session 22)
> ✅ Shipped — `related_sections_config` table + 8 seeded rules + auto-hide on empty/insufficient.

Every detail page now renders a `<RelatedSections>` block below the reviews carousel, populated from admin rules in `related_sections_config`. Carousels auto-hide when the current item has no value for the configured axis OR fewer than `min_items` siblings share it.

### Schema (migration 034)

```sql
related_sections_config (
  id              uuid PK,
  category        text CHECK (one of 9 slugs),
  field           text,             -- 'writer', 'director', 'actors[0].name', 'performers[0]', ...
  title_template  text,              -- 'Άλλες ταινίες από {value}'
  min_items       int DEFAULT 2,
  item_limit      int DEFAULT 6,
  display_order   int,
  is_active       bool,
  UNIQUE (category, field)
)
```

### Field path syntax

Parsed by `lib/related-sections.ts:parseFieldPath`:

| Pattern | Example | SQL target |
|---|---|---|
| Scalar column | `writer` | `item_books.writer = ?` |
| Array element | `performers[0]` | `item_events.performers->>0 = ?` |
| Object key in array | `actors[0].name` | `item_movies.actors->0->>'name' = ?` |

### Default rules (seeded by migration 034)

| Category | Field | Title |
|---|---|---|
| books | writer | "Περισσότερα από {value}" |
| movies | director | "Άλλες ταινίες από {value}" |
| movies | actors[0].name | "Παίζει επίσης ο {value}" |
| series | director | "Άλλες σειρές από {value}" |
| series | actors[0].name | "Παίζει επίσης ο {value}" |
| theater | director | "Άλλες παραστάσεις από {value}" |
| theater | writer | "Άλλα έργα του {value}" |
| events | performers[0] | "Άλλες εμφανίσεις του {value}" |

food / bars / hotels / recipes start with no rules — admin can add via the preset picker (cuisine, level, origin, etc.).

### Fetcher + render contract

`fetchRelatedSections(sb, { itemId, category, extension }) → RelatedSection[]` (`lib/related-sections.ts`). Empty sections (no value / no siblings / threshold not met) silently dropped — user never sees a hollow section. `<RelatedSections>` renders `CarouselPortrait` (movies/series/books) or `CarouselLandscape` (rest); returns null when empty. Wired into all 9 detail components right before `GuestPromptModal`. `MovieDetail`'s hardcoded "Από {director}" block was deleted; the `director` rule replaces it.

### `/admin/related-sections`

Single-page grouped by category. Inline title-template / min-max / active-toggle / delete per rule. `+ Πρόσθεσε rule` opens an inline form with a field preset dropdown. The `field` value is immutable post-create — switch axis by deleting + recreating. API: `GET/POST /api/admin/related-sections` + `PATCH/DELETE /[id]`; all writes call `revalidateCategory`.

### When to use this vs. layout system (§37)

- **Use `page_sections` + `/admin/layout`** when the section is the same for every item on a page (chrome, carousels of curated content, hero blocks).
- **Use `related_sections_config` + `/admin/related-sections`** when the section content depends on the specific item being viewed (other books by *this* author, other movies by *this* director).

The two systems are intentionally separate — `page_sections` is layout (static composition per page); related sections are rules (dynamic content per item).

### Architectural decision: two tables, not `context='item_detail'` (locked session 22)

The forward-compatible alternative would have been to add `context='item_detail'` to `page_sections` and let related sections share the same row shape as home + category widgets. We considered it and explicitly chose two tables. The reasons:

- **Mental model mismatch.** A `page_sections` row says "section #N on this page is X". A related-sections row says "for every item in this category, derive a section from this rule". The first is static composition per page; the second is a function from item → sections. Folding them into one table forces admins to think about both meanings whenever they touch either surface.
- **Cardinality.** `page_sections` rows-per-page is bounded (≤ ~30 visible sections per bucket). Related sections rows-per-category are bounded by axes (writer / director / cast / …, ≤ ~6 per category in practice). The shapes coincidentally compress, but their growth rates don't.
- **Admin UX.** `/admin/layout` is dnd-kit + audience picker + iframe preview — heavy machinery justified for whole-page composition. `/admin/related-sections` is a grouped list with inline title-template edit + min/max number inputs — light. Cramming the latter into the former would force admins through audience selection and a preview that can't actually preview (no specific item to bind `{value}` to).
- **Query path.** Layout resolver does one parallel collection hydration per page request. Related-sections fetcher does one query per item view, filtered to a small per-category rule set. Different hot paths, different cache shapes.

**When to revisit:** if any of these signals appear, fold related sections into `page_sections` with `context='item_detail'`:

1. Admin asks to reorder related sections per-item (drag handles inside the carousels) — implies the rules need to behave like layout rows.
2. Admin asks for non-related-sections widgets on detail pages (e.g. "show this banner only when item.subcategory = X") — implies detail pages need a layout system of their own, at which point the two systems should merge.
3. The number of rule axes grows past ~30 per category and admins want pagination / filtering UI similar to the layout admin — implies the rules table has outgrown the simple list.

**Migration path if we ever do unify:** keep `related_sections_config` as the rules table, add `context='item_detail'` to `page_sections` for any per-detail-page widgets that aren't rules (none today). Don't merge until there's a concrete second widget type for detail pages — premature unification adds complexity without payoff.

---

## 39. Google rich-results SEO (session 23)
> ✅ Shipped — JSON-LD per category, sitemap.ts, robots.ts, Open Graph + Twitter Card metadata. Verified live on movie / series / recipe detail pages.

Every detail page emits a Schema.org JSON-LD payload matching Google's rich-results spec for the category's @type. Sitemap + robots wired at the App Router level. Per-page OG / Twitter / canonical metadata via `generateMetadata`.

### Architecture

| Layer | File | Role |
|---|---|---|
| Mapper | `lib/seo/structured-data.ts` | One function per category. Pure data → JSON. `compact()` strips nulls so the Google validator doesn't reject. |
| Emitter | `components/seo/JsonLd.tsx` | Server component. `<script type="application/ld+json">` with `<` escape. |
| Wiring | `app/(main)/[category]/[id]/page.tsx` | Calls `buildItemStructuredData(category, item, ext, reviews, ctx, suggester)` + renders `<JsonLd>` as a fragment sibling of the detail component. |
| Sitemap | `app/sitemap.ts` | Home + leaderboard + support + 9 category indexes + 5000 most-recent items. Defensive try/catch. |
| Robots | `app/robots.ts` | Allow / + disallow admin/api/auth/preview/onboarding/settings/auth-flow routes. Points crawlers at sitemap. |
| Root metadata | `app/layout.tsx` | `metadataBase`, Greek title template `"%s — Proteino"`, default OG + Twitter + robots. |

### @type per category

| Category | @type | Notes |
|---|---|---|
| Movies | `Movie` | director, actor[], trailer (VideoObject with YT/Vimeo embed), award[], genre, alternateName |
| Series | `TVSeries` | + numberOfSeasons, startDate/endDate |
| Books | `Book` | author, publisher, isbn, bookFormat (default Paperback), sameAs from metadata.publisher_url, alternateName |
| Recipes | `Recipe` | **author = suggester** (Person with URL), datePublished, keywords, recipeIngredient[], recipeInstructions[] as HowToStep, nutrition with suitableForDiet for vegan/vegetarian/glutenFree |
| Food | `Restaurant` | address (PostalAddress), geo (GeoCoordinates), servesCuisine |
| Bars | `BarOrPub` | LocalBusiness subtype — same fields minus servesCuisine |
| Hotels | `Hotel` | LodgingBusiness subtype + priceRange + amenityFeature[] from facilities jsonb |
| Theater | `TheaterEvent` | location (Place), startDate/endDate from dates jsonb, eventStatus + eventAttendanceMode, director, performer[], offers |
| Events | `Event` | Same as TheaterEvent except performer is PerformingGroup |

Every type emits `aggregateRating` (from items.avg_rating + rating_count, when ≥1) + `review[]` (up to 8 text reviews, rating-only entries skipped).

### Env var

`NEXT_PUBLIC_SITE_URL` (default `https://proteino.gr`) feeds `@id`, sitemap loc, canonical, and OG url. Set on Vercel before deploying so prod doesn't emit dev URLs.

### Gaps (admin data, not code)

Adding any of these is one-line code work + an admin form field:
- `contentRating` for movies/series (MPAA/IMDb age rating)
- `isbn` for books
- `numberOfEpisodes` for series
- `starRating` for hotels (as a number, not embedded in the type string)
- `openingHours` / `acceptsReservations` for restaurants/bars
- `organizer` for events
- `video` for recipes

### Operational follow-ups (next session)

1. **Sitemap index** when corpus passes 5K items. Google's per-file cap is 50K, total is 50M.
2. **Image sitemap extension** (`image:image`) for richer image indexing.
3. **`noindex` on thin pages**: empty category lists, profile pages with 0 suggestions, `/onboarding`. Robots blocks crawling but Google can still index URLs it learned about elsewhere; a `noindex` meta tag is stronger.
4. **Canonical URLs** on category + profile pages (only detail pages have them today).
5. **301 redirect map from legacy K2 URLs** — preserves incoming Google traffic + backlinks. Need a sample of the old URL format to design. Options: static `next.config.mjs` redirects (≤100 entries), middleware lookup against a Postgres `legacy_redirects` table loaded into an in-memory map at build time (necessary at scale, careful with the session-11 edge-middleware leanness constraint).

---

## 40. Review writing flow — inline composer + success modal + fade-in carousel insert (session 25)
> ✅ Shipped — `RateThisItem.tsx`, `lib/reviews/composer-copy.ts`, `lib/reviews/quality.ts`, `lib/reviews/merge-live.ts`, `review-card-appear` keyframe. All 9 detail pages migrated. FLIP push-right on the carousel reorder added in session 26 (see §42).

The Figma prototype used Smart Animate (cross-fade between modal and review card). Real CSS can't morph shape + children cleanly across two very different layouts. Settled on: fade out the modal, fade in the new review at carousel position 0 with the `review-card-appear` keyframe, let the others slide right via the FLIP hook (§42).

### State machine

`<RateThisItem>` is the trigger card on every detail page (replaces the old inline rate-this-item form + the deleted `useReview` hook). Three internal phases:

| Phase | Visible content | Trigger to enter |
|---|---|---|
| **idle** | Question + 5 empty stars | First render with no `initialRating` |
| **composing** | Stars (current rating filled) + calibration label + textarea + Άκυρο/Δημοσίευση buttons | User taps any star OR clicks edit pencil from "saved" |
| **saved** | Stars (filled) + "Η αξιολόγησή σου" + edit pencil link | After publish, or initial render with `initialRating` |

### Server interactions

- **First star tap** (idle → composing): instant POST to `/api/reviews` with `(rating, reflection: null)`. Server upserts the row. **Parent is NOT notified** — `onPublished` callback is reserved for explicit Publish.
- **Re-tap a different star** (composing → composing): another instant POST with the new rating.
- **Click Άκυρο**: collapses to saved if rating > 0, idle otherwise. Text resets to `initialReflection`. No server hit.
- **Click Δημοσίευση**: POST with `(rating, reflection)`. On success: store result in `pendingPublish` state, transition to `saved` phase, open the success modal. **Parent is still not notified** at this point.
- **Modal close** (X button / backdrop / CTA): `onClose` callback fires the parent's `onPublished` with the stored `pendingPublish` result. The parent's onPublished:
  - Updates local `savedRating` + `savedReflection`
  - Calls `setLiveReview({ id, rating, reflection })`
  - Triggers React re-render with the new review at carousel position 0 (via `mergeLiveReview`)
  - Auto-flips bookmark wishlist → done with category-specific toast

### `mergeLiveReview` — optimistic insertion

`lib/reviews/merge-live.ts` constructs the optimistic review row from the publish result + `data.currentUser`:

```ts
mergeLiveReview(serverReviews, live, currentUser)
  → filter out any server row by currentUser.id
  → prepend a new row built from live + currentUser
  → returns reviews[]
```

Used by every parent's `mergedReviews` derivation. The carousel maps this. Each `ReviewCard` gets `appearAnimation={!!liveReview && r.id === liveReview.id}` — only the just-published card animates on mount.

### Why `currentUser` is in `ItemDetailData`

To construct the optimistic review row, the merge needs the viewer's `{ id, handle, display_name, avatar_url, suggestion_count }`. These come from the page fetch in `app/(main)/[category]/[id]/page.tsx`. The session 25 fix split the auth check from the profile fetch — see "long-standing bug" below.

### Long-standing bug fixed in session 25

`page.tsx` was calling `sb.auth.getUser()` where `sb` was the service-role admin client. Service-role clients have no session attached, so `getUser()` silently returned `{ user: null }`. This meant for every logged-in viewer:

- `currentUserId` always null → `mySuggestion` detection never worked
- `bookmarkStatus` / `isBookmarked` never populated → bookmark icon always showed unsaved state
- `myReview` never prefilled → user's existing rating/text never showed up
- `myVoteByReview` always empty → vote thumbs flashed from neutral on every paint

Fix: introduce a cookie-aware auth client (`createClient` from `@/lib/supabase/server`) just for the `auth.getUser()` identity check. Keep the admin client for the actual data fetches (bookmark, review, votes) so RLS doesn't block. Two-line refactor in page.tsx. All four broken behaviors are now actually functional.

### Animation primitive

`@keyframes review-card-appear` in `app/globals.css`: opacity 0→1 + `scale(0.92) translateY(8px) → identity` over 420ms ease-spring, `transform-origin: left center` so the card grows from where existing reviews already were.

### Open polish item

**Gemini coaching overlay** on top of the char-count tiered praise — content-aware suggestions like "Πες ένα συγκεκριμένο σημείο που σε εντυπωσίασε" via `lib/ai/cache-and-log`. ~1 hour. (Push-right + achievement-modal-for-reviews both shipped in session 26 — see §42.)

---

## 41. Admin IA + visual refresh (session 25, consolidated session 28)
> ✅ Shipped — sidebar regrouped into 6 jobs-based sections, Overview rewritten as a control room, new `/admin/reviews` surface, legacy comments split. **Session 28 consolidation:** `/admin/reports` removed entirely; review-report moderation now lives inside `/admin/reviews` (top "Unresolved" section + REPORTS column with 3-state badge).

### Sidebar — 6 jobs-based sections

```
Overview

MODERATION                     ← red dot
  Reviews                      (handles both reviews + their reports)
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
  Legacy Comments              (renamed from "Comments (Legacy)")
  Showcase
```

Active link state: soft `bg-coral-50 text-coral-700` pill (replaces the earlier 3px emerald left border). All hrefs unchanged.

### Overview — control room

Three rows, server-rendered. Time-aware greeting ("Good morning, George") + soft radial coral gradient backdrop top-right.

- **Needs your attention** — 4 cards, each click-through to its action page:
  - Reports pending + oldest-age context
  - Unpublished suggestions + weekly delta
  - Data quality (NULL subcategory + missing cover breakdown)
  - Maintenance mode binary (red gradient panel when ON, pulsing red dot)
  - All-clear state: small green ✓ + "All clear" caption (muted, not shouty)
  - Each card carries a **14-day sparkline** of new activity (inline SVG, no dep)
- **Last 7 days** — 4 metric cards (New items / New reviews / New users / AI spend). Each with its own sparkline + tabular numerals. AI spend → `/admin/ai-usage`.
- **Quick actions** — 4 pill buttons: New suggestion / New collection / New activity / Preview homepage (opens `/preview/home` in new tab).
- **Stagger entrance** — cards fade-in + slide-up with 60ms stagger on first paint.

Fail-soft when `ai_usage_log` migration (019) isn't applied — AI spend defaults to $0.00.

### `/admin/reviews` — first-class moderation for the new reviews table

Reads from `reviews` directly (the route formerly pointed at the legacy K2 `comments` table). Stats strip (Total / Last 24h / **Unresolved** / Hidden — clickable as filters), text search on reflection, mode chips (all / with-text / rating-only / hidden), 1–5★ filter, per-category filter, 6 sort options. Inline hide/unhide via `POST /api/admin/reviews/[id]/hide` (admin-gated, service-role write, ≥5-char reason required, audit-trailed in `hidden_by` / `hidden_at` / `hidden_reason`).

### Consolidated reports flow (session 28)

User-reported reviews land in `content_reports` with `target_type='review'` (suggestions are admin-curated and can't be user-reported in practice). Previously these flowed through a separate `/admin/reports` page; that route was removed in session 28 and the moderation surface folded into `/admin/reviews`:

- **Unresolved section** at the top of the page — server-fetched on each request, lists every review with at least one pending report. Always visible, not paginated, sits above the main list.
- **REPORTS column** on every row, three states:
  - **Black filled circle with count** — unresolved reports. Click → opens a reports drawer.
  - **Green filled circle with count** — resolved-only history (some reports were filed, all dismissed/hidden). Visual context, no action needed.
  - **Plain "0"** — never reported, pristine.
- **Reports drawer** (per row, opens on badge click) — lists every pending report for that review with reason, description, reporter, timestamp. Headline: **"Είναι έγκυρη η αναφορά;"** + two answer buttons:
  - **Όχι — άσε το review** → resolves just this report via `PATCH /api/admin/reports/[id]` action='kept'; review stays visible. Other pending reports on the same review stay open.
  - **Ναι — απόκρυψη review** → soft-hides the review via `PATCH /api/admin/reports/[id]` action='hidden'; auto-resolves every pending report for that review with the same admin note.
- **Optional: warn the review author.** On the "Ναι" path, a checkbox under the admin note offers "Προειδοποίηση και στον συγγραφέα του review". When checked + submitted, after the hide lands a parallel `POST /api/admin/users/[author_id]/warn` writes a `{ kind: 'review_hidden', source_review_id, source_report_id, note }` entry to `users.admin_warnings` (migration 039). Append-only audit log — never removed even after the source review is unhidden.
- **Reporter abuse signal.** When the drawer opens, a thin browser-client query against `content_reports` derives per-reporter stats: `{ total, dismissed, hidden, pending }`. If `dismissed ≥ 2 && total ≥ 3 && dismissed/total ≥ 0.5`, a red "⚠ Reporter: N αναφορές · M απορριφθείσες (X%)" line surfaces under the "Από" row with a **"Σήμανε ως καταχραστή"** action. Clicking it `POST /api/admin/users/[reporter_id]/warn` with `{ kind: 'abusive_reporter', ... }` — appends to the same audit log. Independent of the keep/hide decision; admin can flag without resolving, or vice versa.

### Warnings visible in `/admin/users`

The audit log written by the warn endpoint is read in the users moderation table — new **Warnings** column with the same red filled badge / "0" plain visual language as the REPORTS column on `/admin/reviews`. Click → side drawer renders the audit log newest-first with kind chip (Review hidden / Abusive reporter / Manual), note, relative time, issuing admin (resolved client-side via a batched `users.display_name` lookup), and source pointers (`source_review_id` / `source_report_id`) when present. The drawer also exposes **"+ Πρόσθεσε manual προειδοποίηση"** — admin writes a free-form note, posts to the same `/api/admin/users/[id]/warn` with `kind='manual'`. Append-only — no delete affordance, audit integrity preserved.
- **Hide endpoint also auto-resolves** — `POST /api/admin/reviews/[id]/hide` (called from the row's hover action or keyboard shortcut) now mirrors the bulk-resolve path: hiding a review marks all its open `content_reports` rows resolved with `action='hidden'` and the same admin note. Keeps the two entry points behaviourally aligned.

The `PATCH /api/admin/reports/[id]` endpoint stays (audit trail, single-source-of-truth for resolution). The deleted bits: `app/admin/reports/page.tsx` + `components/admin/ReportsTable.tsx` + the sidebar entry + the `pendingReports` counter (renamed `pendingReviewReports` and now attached to the Reviews sidebar entry).

### Legacy comments split

Moved `app/admin/reviews/` → `app/admin/legacy-comments/` (component renamed `LegacyCommentsTable`). Sidebar entry "Legacy Comments" under Platform. The 343 K2 archive rows are read-only for historical moderation; new review moderation flows through `/admin/reviews`. Internal links in `CommandPalette` / `ReviewEditor` / `/api/admin/search` were repointed.

### Open polish items (admin)

- **✅ Audit log on Overview** — shipped (migration 040 + `<RecentChanges>` widget on `/admin`). Reads `modified_at` + `modified_by` from `moments`, `page_sections`, `collections`, `related_sections_config`, `category_filters`. Five PATCH endpoints stamp the columns via `lib/admin/audit.ts:executeWithAuditFallback` (degrades silently when the migration isn't applied — every per-table SELECT that errors with `42703` returns `[]`).
- **✅ Confirm-before-save on Settings/Layout** — shipped via new `<ConfirmDialog>` primitive. Settings opens the dialog only when maintenance_mode flips OFF → ON (other field saves proceed). Layout swapped its `window.confirm` for the modal on section delete.
- **⏳ `Last edited by X on Y` stamps on per-row UIs** — `MomentRow` type extended in `lib/moments/types.ts` to carry `modified_at` + `modified_by`. Render-side wiring on Moments/Layout/Filters/Collections rows still open.
- **⏳ POST routes don't stamp `modified_by` on initial create** — covered only by the PATCH path. Trivial follow-up.
- **⏳ Merge Reports + Data Quality into a single Inbox** — needs new UI scaffolding.

---

## 42. Review-milestone celebrations + FLIP push-right (session 26)
> ✅ Shipped — migration 036, `useFlipReorder` hook, `AchievementUnlockedModal.display.label_line1/2` overrides, `review_count_eq` predicate, all 9 detail components wired.

Parallel celebration for reviews using the same modal + Moments infra as suggestion milestones, plus a polish item: existing review cards slide right via FLIP when a new review lands at position 0 instead of snapping.

### Trigger schedule

`/api/reviews` POST counts the user's total non-hidden reviews **only when the upsert is a brand-new row** (first review on this item). Re-rating must NOT re-trigger. The route then resolves a `review_published` moment.

| Count | Tier visual | Label override | Title |
|---|---|---|---|
| 1   | verified (emerald)   | "Πρώτη / αξιολόγηση"    | "Πρώτη σου αξιολόγηση!" |
| 5   | verified (emerald)   | "5 / αξιολογήσεις"      | "Πέντε αξιολογήσεις!" |
| 10  | gold (blue)          | "Trusted / Reviewer"    | "Δέκα αξιολογήσεις!" |
| 25  | expert (violet)      | "Expert / Reviewer"     | "25 αξιολογήσεις — εντυπωσιακό!" |
| 50  | platinum (slate)     | "Top / Reviewer"        | "50 αξιολογήσεις!" |

All 5 use the `tier_unlock` variant. Tier visuals reuse existing badge icons; `display.label_line1/2` overrides disambiguate the semantic ("Πρώτη / αξιολόγηση" instead of "Επαληθευμένος / χρήστης" under the hex).

### Architecture

| Layer | File | Role |
|---|---|---|
| DB | `scripts/sql/036-moments-review-published.sql` | Extends `moments.trigger_event` CHECK + seeds 5 milestones |
| Predicate | `lib/moments/registry.ts:review_count_eq` | Same shape as `suggestion_count_eq`, registered separately so admin dropdown surfaces it under the right label |
| Display override | `AchievementUnlockedModal.tsx` | Honors `display.label_line1` + `display.label_line2` on top of the existing `TIER_LABEL[badge]` lookup (two-line change; suggestion milestones unaffected) |

`<RateThisItem>`'s `PublishResult` now carries `achievement: AchievementData | null`. Each detail component owns `achievement` state and schedules the modal mount after `display.delay_ms` (default **2s** — shorter than the 10s suggestion delay because the success modal already did a celebration beat). For the 5 venue-style components the local `CommunitySection.onPublished` prop type was widened to forward `achievement` up to the parent.

### FLIP push-right (`hooks/useFlipReorder.ts`)

Generic FLIP hook (`First, Last, Invert, Play`). Takes a container ref + a `data-*` attribute name + a deps array. On every render: finds matching children, compares each to its prior `getBoundingClientRect()`, applies inverse `translate()` + `transition: none` to rewind, then on next frame removes the transform with `transition: 480ms ease-spring` so the card animates back to identity. Captures destination rects subtracting any active translate so the next FLIP measures against the correct at-rest position mid-animation. Honors `prefers-reduced-motion`.

`<ReviewCard>` already carried `data-review-id` (from the session-25 morph attempt) — reused as the FLIP key. Hook invocation lives in the main component for pattern-A categories (Movies/Series/Books/Bars) and inside the local `CommunitySection` for pattern-B (Food/Hotel/Theater/Event/Recipe).

### Why `tier_unlock` and not a new "review_milestone" variant

Considered a separate flatter variant — but the existing modal anatomy (title + subtitle + decorated badge + body) already fit. Adding a new variant would have doubled modal surface area for marginal visual gain; `label_line1/2` gives enough distinction. When/if review milestones need a wholly different treatment (different shape, no hex), splitting then is cheap — the moment row sets a new `variant` key and the modal switches on it.

### Per-category review milestones — `category_review_count_eq` (session 32)

Single combined predicate so per-category milestones are one moment row, not two. Admin form auto-renders via the registry schema endpoint.

| Predicate arg | Meaning |
|---|---|
| `n` (int, required) | Target count — matches when the user's category-scoped review count strictly equals this |
| `category` (string, optional) | When set, also requires the just-published review's item to be in this category; when empty, fires at the same count in **any** category (one row covers all 9 — `{category}` placeholder resolves to whatever the user just reviewed) |

`/api/reviews` writes the matching payload (added session 32): the route resolves the item's category + counts the user's non-hidden reviews scoped to that category via `reviews INNER JOIN items` and writes both into `payload.category` + `payload.category_review_count`. `buildVars` receives `category` too, so admin copy can use `{category}`, `{category_noun}`, `{category_article}`, `{category_list_noun}` placeholders.

**Trigger combo:** `trigger_event = 'review_published'` + `predicate_key = 'category_review_count_eq'`. Not seeded by default — compose in `/admin/moments`.

### Streak-window review milestones — `reviews_this_week_eq` + `reviews_this_month_eq` (session 32)

Two predicates that fire when the user just hit the N-th review inside a trailing window. The route does the count (single timestamp fetch + JS bucketing) and stuffs the result into the payload — predicates stay pure.

| Predicate | Window | Payload key | Var |
|---|---|---|---|
| `reviews_this_week_eq` | now − 7 days | `payload.reviews_this_week` | `{week_count}` |
| `reviews_this_month_eq` | now − 30 days | `payload.reviews_this_month` | `{month_count}` |

`/api/reviews` now does one `SELECT created_at FROM reviews WHERE user_id = X AND is_hidden = false` and buckets into total + this-week + this-month counts in JS (cheaper than 3 round-trips for the typical N ≤ 50 reviews per user). All three are written to `payload`; `weekCount` + `monthCount` flow through `buildVars({ extra: { week_count, month_count } })` so admin copy can use `{week_count}` / `{month_count}` placeholders alongside `{count}` (still the total).

**Trigger combo:** `trigger_event = 'review_published'` + either predicate. Not seeded by default — admin composes via `/admin/moments`. Example use cases:

- "Hot streak — 5 αξιολογήσεις αυτή την εβδομάδα!" → `reviews_this_week_eq` with `n=5`.
- "Monthly grinder — {month_count} αξιολογήσεις αυτόν τον μήνα" → `reviews_this_month_eq` with `n=20`.

**Scaling note:** the `created_at` filter currently uses the existing `(user_id, item_id)` btree (covers `user_id = X`, then filters created_at row-by-row). At low N that's fine; if any single user passes a few hundred reviews, add an index on `(user_id, created_at)` to keep the timestamp fetch indexed.

---

## 43. Runtime upgrade — Node 22 + React 19 + Next 16 (session 27)
> ✅ Shipped — single commit, full triad. Build + dev + typecheck all green on the new runtime.

Straight off 14.2.35 / React 18 / Node 20, no intermediate stops. The breaking changes between Next 14 → 15 and 15 → 16 overlap heavily (async cookies/headers/params landed in 15, carry through 16) so doing both jumps in one branch was one audit pass instead of two.

### What moved

| Layer | Was | Now |
|---|---|---|
| Node engine | `>=18.17.0 <23` | `>=22.0.0 <25` |
| `@types/node` | `^20` | `^22` |
| `react` + `react-dom` | `^18` | `^19.2.6` |
| `@types/react` + `@types/react-dom` | `^18` | `^19` |
| `next` | `14.2.35` | `^16.2.6` (Turbopack default) |

### Codemod pass — what was automatic

`npx @next/codemod@canary next-async-request-api ./app ./lib --force` transformed **37 files**. Pattern in every dynamic route + page:

```ts
// before
interface Props { params: { id: string } }
export default async function Page({ params }: Props) { … params.id … }

// after
interface Props { params: Promise<{ id: string }> }
export default async function Page(props: Props) {
  const params = await props.params;
  … params.id …
}
```

Same shape for `searchParams`. Pages with `generateMetadata` got two awaits (one for the metadata call, one for the page render).

### Manual fixes — what the codemod couldn't see across module boundaries

- **`lib/supabase/server.ts`** — `cookies()` is now async and is wrapped inside the Supabase factory, so the codemod's scope (file-local `cookies()` calls) misses it. The factory itself became async: `export async function createClient() { const cookieStore = await cookies(); … }`.
- **45 caller sites** for `createClient()` from `lib/supabase/server` — every one needed `const sb = await createClient()`. Done via a single sed pass (`= createClient()` → `= await createClient()`) since the function lives inside an already-async route handler or RSC. One chained `await createClient().auth.getSession()` in `app/(main)/you/page.tsx` was split into two statements (sed wouldn't touch it because no `=` followed `await`).
- **`type SB = ReturnType<typeof createClient>`** in `app/(main)/page.tsx` resolved to `Promise<SupabaseClient>` after the async change — fetcher signatures broke. Switched to `Awaited<ReturnType<typeof createClient>>` so the page passes the resolved client and helpers keep their previous signature. Single line.

### React 19 type tightenings

Two API surface changes in `@types/react` broke compilation:

- **`useRef<T>(null)`** now returns `RefObject<T | null>` (was `RefObject<T>`). Affected hooks whose signatures asked for the strict variant:
  - `hooks/useFlipReorder.ts` — `RefObject<HTMLElement>` → `RefObject<HTMLElement | null>`
  - `hooks/useListKeyboard.ts` — `RefObject<HTMLInputElement>` → `RefObject<HTMLInputElement | null>`
  This unblocked ~12 caller files (all 9 detail components + 3 admin tables) without any caller-side casts.
- **Global `JSX` namespace** moved to `React.JSX`. Two files (`components/detail/BarsDetail.tsx`, `components/detail/FoodDetail.tsx`) used `JSX.Element` in a `SourceIconType` alias — both flipped to `React.JSX.Element`.

### Turbopack — new default bundler

Next 16 makes Turbopack the default for both `dev` and `build`. Two gotchas surfaced immediately:

- **Webpack config without Turbopack config = build error.** Our `next.config.mjs` had a webpack dev-cache disable hack (workaround for a webpack-only `PackFileCache` ENOENT bug). Dropped it and replaced with `turbopack: {}` to silence the warning. Turbopack uses different storage, so the original bug doesn't apply.
- **CSS `@import` placement is stricter.** Webpack tolerated `@tailwind` directives appearing before an `@import url(...)`; Turbopack rejects it per the CSS spec (`@import` must precede all other rules). After PostCSS expands the Tailwind directives, the Google Fonts `@import` ended up at line ~4768 of the generated output. Reordered `app/globals.css` so the `@import` sits at the very top, before `@tailwind base/components/utilities`.

### Speed wins (measured)

- **Dev boot:** 171ms (was 3–4s on webpack). Effectively instant.
- **HMR:** subjectively faster, not measured.
- **Prod build:** comparable on first run; expected to be ~30% faster with Turbopack's persistent build cache once it warms.

### What did NOT break (counted, then confirmed)

- ~~6 `forwardRef` usages — still supported in React 19 (deprecated, not removed). Left alone for a future cleanup pass when ref-as-prop becomes worth the churn.~~ **Swept in session 31** — all 15 occurrences across 6 files converted to React 19's ref-as-prop (the `SuggestionEditor` file accounted for 9 `useImperativeHandle` wrappers + the router). `displayName` boilerplate dropped throughout.
- 0 `defaultProps` on function components — TypeScript project, never used the pattern.
- 0 `propTypes` / string refs.
- `middleware.ts` — Next 16 prints a deprecation warning ("Please use 'proxy' instead") but the file still loads and runs. Build output even labels it `Proxy (Middleware)`. Rename to `proxy.ts` deferred until convenient.

### Known follow-ups (non-blocking)

1. **`middleware.ts` → `proxy.ts`** rename — the file convention changed in Next 16 but compat shim is in place. One-line move + verify the matcher config still applies under the new entry point.
2. **Two pre-existing Tailwind ambiguous-class warnings** (`duration-[350ms]`, `ease-[cubic-bezier(...)]`) — bracket syntax conflict, unrelated to the upgrade. Replace with escaped variants when touching those files.
3. ~~**React Compiler beta** — opt-in, can remove ~80% of the codebase's `useMemo` / `useCallback` boilerplate once enabled. ~2h trial run to evaluate.~~ **Trialled + enabled in session 31** (`babel-plugin-react-compiler@1.0.0`, top-level `reactCompiler: true` in `next.config.mjs` — Next 16 promoted the flag out of `experimental`). Build clean, no bailout warnings, 112 routes. Identified ~135 manual `useMemo`/`useCallback`/`React.memo` sites across 45 files that are now redundant; a future focused PR can delete them (harmless until then).
4. **PPR / Cache Components** for the 9 detail pages — Next 16's PPR can split static shell + dynamic content per route. Detail pages are the obvious candidate (cover/meta is static-able, reviews/bookmarks dynamic). Won't pursue until the current detail surface stabilizes.

### Rollback plan

Single commit (`44c6c7d`). `git revert 44c6c7d && git push` restores the entire prior state — package versions, codemod transforms, manual fixes, CSS reorder, all of it. Vercel will auto-redeploy the reverted state.

---

## 44. Biblionet integration — typed client + smoke test (session 30, in progress)
> ⏳ Smoke test shipped; production wiring (mirror + admin import + replacing Google Books) parked pending two design decisions. See [memory: feedback-books-data-source].

Biblionet (https://biblionet.gr/webservice/) is the Greek institutional book catalog and will become Proteino's sole books data source — Google Books is being dropped entirely. Session 30 shipped the typed client + smoke tests + subject discovery; no production code is touched yet because two design decisions are still parked.

### What's in the repo

| File | Role |
|---|---|
| `lib/enrichment/biblionet.ts` | Typed client. Wraps all 8 web-service methods (`get_month_titles`, `get_title`, `get_contributors`, `get_title_subject`, `get_person`, `get_company`, `get_subject`, `get_language`). Single canonical `BiblionetTitle` shape (35+ fields). Env-driven auth via `BIBLIONET_USERNAME` + `BIBLIONET_PASSWORD`. 6s timeout per call. Normalisation helpers: empty-string → null, whitespace collapse, absolute image URL prefix (`https://biblionet.gr`), ISBN 10/13 classification. |
| `scripts/test-biblionet.ts` | Smoke test. Exercises every endpoint: month firehose → title detail → contributors → subjects → person → company. Flags: `--year`, `--month`, `--isbn`, `--title-id`, `--raw`. |
| `scripts/test-biblionet-raw.ts` | Raw-JSON dumper for any endpoint. Used to discover undocumented fields. |
| `scripts/discover-biblionet-subjects.ts` | Subject discovery — paginates N months of book firehose, calls `get_title_subject` per book with concurrency cap, aggregates by DDC hundred. Produces `scripts/biblionet-subjects-sample.json`. |
| `scripts/biblionet-subjects-sample.json` | Design artifact — 82 distinct subjects across 150 books from last 3 months, sorted by DDC. Drives the subcategory decision below. |

### API findings (vs the docs)

- **Auth is `{ username, password, ... }` in POST JSON body** (not Basic). The docs hinted at GET-for-auth + POST-for-details — actually everything goes in a single POST JSON body. New endpoint is `https://biblionet.gr/webservice`; legacy `/wp-json/biblionetwebservice` still works.
- **`get_month_titles` returns the FULL detail payload** (Summary, PageNo, Price, Dimensions, Series, Contains, …), not just summary fields. One bulk page-call gets 50 books with complete metadata — mirror cost is dramatically lower than feared (~3 calls/book: page firehose amortized + `get_contributors` + `get_title_subject`).
- **Description field is `Summary`**, not `Description`/`Plot`/`Abstract`/`Synopsis` as initially guessed from the truncated docs example.
- **`Category` field is uniformly `"Γενικά βιβλία"`** for every book — useless for subcategory mapping. The granular taxonomy lives in `get_title_subject` (DDC-coded subjects like "Νεοελληνική ποίηση" DDC 889.1).
- **`PresentOrder` is always `"1"`** regardless of contributor position. Array index is the real ordering — exposed as `order` on `BiblionetContributor`; raw value kept as `present_order_raw` for transparency.
- **`ContributorFullName` contains double-spaces** ("Enrique  Papatino"). Normalised on read.
- **Cover paths use `/assets/images/books/book_NNN/<uuid>.jpg`** (not `/wp-content/uploadsTitleImages/...` as docs example showed). `absoluteImageUrl` helper handles both — prepends host when relative.
- **35+ bonus fields beyond the docs example:** `PageNo`, `Price`, `Cover` (binding type), `Dimensions`, `Weight`, `AgeFrom/To`, `FirstPublishDate/CurrentPublishDate/FuturePublishDate`, `EditionNo`, `LanguageID`/`LanguageOriginalID`/`LanguageTranslatedFromID`, `PlaceID`. All wired into the canonical interface.

### Locked design decisions

Saved to memory `feedback-books-data-source`:

- **Biblionet is the sole books data source.** Drop Google Books entirely (not even as fallback). All new books integration code goes through `lib/enrichment/biblionet.ts` only. `lib/enrichment/google-books.ts` and the books branches of `/api/ai/match` + `/api/admin/enrich` are slated for removal once the Biblionet path is shipped.
- **Subtitle concat into `items.title`** — `"${Title}: ${Subtitle}"` when non-empty. No separate subtitle field in the Proteino model. There is no bibliographic subtitle styling; the whole thing is the canonical title.
- **Multi-volume entirely in `metadata.volume.*`** — stop using `item_books.trilogy_name` / `is_trilogy` for Biblionet imports. Those two columns are effectively deprecated for new books.
- **Covers mirrored to Supabase Storage** on import (own the asset; ~30 KB/book × 200K books = ~6GB). Don't hotlink Biblionet — too fragile.
- **Subcategory comes from `get_title_subject` DDC subjects**, NOT the `Category` field (which is uniformly Γενικά). Auto-create the subcategory if missing.

### Subject distribution (from `scripts/biblionet-subjects-sample.json`)

3-month sample, 150 books, 82 distinct subjects. Maps to existing 11 subcategories cover ~75% of hits:

| Existing subcategory | Biblionet DDC subjects | Sample hits |
|---|---|---|
| Παιδικά | 899.91 (Μεταφρ. παιδικά), 889.91 (Ελλην. παιδικά), 372.8 (Παιδικές δραστηριότητες), 398.21 (Παραμύθια), 263.93 | 43 |
| Μυθιστόρημα | 889.3 (Νεοελλ. πεζογραφία — Μυθιστόρημα/Νουβέλα/Διήγημα), 833/843/853/863/813 (foreign translations) | 31 |
| Ποίηση | 889.1 | 16 |
| Ιστορία | 900-999 (Ιστορία, Ελλάς Επανάσταση 1821, …) | 14 |
| Ψυχολογία | 150, 155.4, 156, 150.195, 616.898 2 | 7 |
| Φιλοσοφία | 190, 181.9, 188 (Στωϊκή), 133.9 (Διαλογισμός), 104 | 6 |
| Αυτοβιογραφία | 920 | 3 |
| Self-help | 158, 303.34 (Ηγεσία) | 2 |
| Sci-Fi | 808.838 766 (Φανταστική), 808.838 738 (Λογοτεχνία τρόμου) | 2 |
| Θρίλερ | 808.838 72 (Αστυνομική) | 1 |
| Business | — | 0 |

Gaps in our taxonomy (~24% of sample, ~36 books):
- **Θέατρο** — 862, 889.2 (theater plays)
- **Δοκίμιο / Lectures** — 080, 889.4
- **Τέχνη / Αρχιτεκτονική / Μουσική / Κινηματογράφος** — 700, 720, 750, 780, 791
- **Πολιτική / Κοινωνία** — 300, 320, 327, 340, 303
- **Επιστήμη / Υγεία** — 516, 613
- **Γλώσσα / Λεξικά** — 480, 483
- **Θρησκεία** — 263, 294
- **Παιδαγωγική** — 370

### Parked design decisions

These block production wiring of the Biblionet path. User said "I'll decide later":

1. **Subcategory taxonomy shape.** Two options on the table:
   - **(a) Expand to ~18 subcategories** — add 7 new buckets (Θέατρο, Δοκίμιο, Τέχνη, Πολιτική/Κοινωνία, Επιστήμη/Υγεία, Γλώσσα, Θρησκεία). Category-page tabs split into 2 rows. Every Biblionet book has a home.
   - **(b) Two-tier UI** — 9 top tabs (Λογοτεχνία · Παιδικά · Ιστορία · Ψυχολογία · Φιλοσοφία · Τέχνη · Πολιτική · Επιστήμη · Self-help) + sub-genre chip filters within Λογοτεχνία (Μυθιστόρημα/Ποίηση/Θέατρο/Sci-Fi/Θρίλερ/Δοκίμιο).
   Both options work off the same DDC crosswalk; only UI differs.
2. **Architecture — local mirror vs admin-only.** Biblionet has NO text-search endpoint; the user-submission flow needs a local catalog mirror (paginated `get_month_titles` initial bulk + daily `lastupdate` delta) to enable fuzzy title search. Decision deferred until subcategory taxonomy is locked.
3. **`TitleType` filter** — proposed default: only `Βιβλίο` (skip `Περιοδικό`/`CD`/`DVD`). Not confirmed.
4. **Backfill strategy for 1953 existing books** — match by ISBN and enrich, or import fresh from Biblionet.

### Env vars

```
BIBLIONET_USERNAME=...
BIBLIONET_PASSWORD=...
BIBLIONET_BASE_URL=...   # optional — defaults to https://biblionet.gr/webservice
```

Already added to `.env.local` (gitignored). Will need to land in Vercel env when the path is wired up.

---

## 45. Phase B execution plan — pgvector recommendations (locked session 30, not started)
> 📋 5-day day-by-day plan. Honors locked offline-batch architecture from §3 layer 2: nightly Edge Function computes embeddings + `analytics.precomputed_recs`; online home reads precomputed in <100ms with zero LLM at request time.

Phase B is the biggest user-visible unblock left. Currently the platform is positioned as an "AI-driven recommendation platform" but the home page renders static carousels — Phase B fixes that. Plan locked after cold-start concerns surfaced in session 30 (legitimate concern; pgvector here is content-based, not collaborative, so item-item works day 1 with zero user activity).

### Day 1 — Item embeddings
**Goal:** every item has a 1536-dim embedding in `items.embedding`.

- Lock embedding provider: **OpenAI `text-embedding-3-small`** ($0.02/1M tokens, 1536-dim — matches existing schema column).
- New `lib/embeddings/openai.ts` — `embedText(text)` → `number[]`, batches up to 100 per call.
- New `scripts/embed-items.ts` — backfills all 1953 items. Composes input text per category:
  - Movies/Series: `title + original_title + plot + cast + genres + director`
  - Books: `title + author + plot + subjects` (Biblionet later)
  - Food/Bars: `title + cuisine + type + description + city`
  - Recipes: `title + ingredients + origin + tips`
- Cost: ~1953 items × 200 tokens avg = ~400K tokens = **$0.008 one-shot**.
- Wire `app/api/recommendations/similar/route.ts` — pgvector cosine, returns top-N.

### Day 2 — Item-to-item carousels on detail pages
**Goal:** day-1 user-visible win, works even for guests (no user activity required).

- Replace hardcoded "Σχετικά" / "Από τον ίδιο director" `<RelatedSections>` blocks (§38) with a new `vector_similar_items` rule type — pulls from `/similar` with cosine filter.
- Add `vector_similar` widget to `lib/layout/widgets.ts` for both detail pages and `static_carousel` on home.
- Wire into the 9 detail components. Existing `<CarouselPortrait>` / `<CarouselLandscape>` consume unchanged.

### Day 3 — User embeddings + offline batch infrastructure
**Goal:** every user has an embedding; nightly cron updates them.

- Migration: `analytics.user_embeddings` (one row per user, vector(1536), computed_at). Or column on `users.embedding` (already exists per §5).
- `lib/embeddings/user.ts`:
  - Active users (≥3 bookmarks OR ≥3 ratings in last 30d): weighted average of interacted-item embeddings (rating ×3, bookmark ×2, suggestion ×3, view ×1).
  - Low-activity users: average of top-N items in their onboarding categories — **cold-start fallback**.
  - Zero-activity / zero-onboarding legacy K2 users: fallback to "popular last 30d" cluster center.
- Supabase Edge Function `embed-users-cron`:
  - Daily at 04:00.
  - Recomputes embeddings for users with new activity in last 24h.
  - One-shot backfill for existing 627 users on first run.
- Cost: 627 users × ~50 tokens = ~30K tokens = **$0.0006 one-shot**. Daily cron ~$0.01/month.

### Day 4 — Precompute "Tailored for You" → online table
**Goal:** the offline → online handoff per the locked architecture.

- Migration: `analytics.precomputed_recs` (`user_id`, `item_id`, `score`, `rank`, `reason_seed`, `computed_at`).
- Supabase Edge Function `precompute-recs-cron`:
  - Daily at 04:30 (after user embeddings finish).
  - For each user with `last_login_at` in last 30d: pgvector top-50 cosine, excluding bookmarked/rated/own-suggested.
  - Writes ~50 rows per active user. Indexed on `(user_id, rank)` — `SELECT WHERE user_id=X ORDER BY rank LIMIT 5` is <10ms.
- New widget `tailored_for_you` in `lib/layout/widgets.ts`. Registered-audience-only. Reads from `precomputed_recs`.

### Day 5 — Haiku reranking + reasoning copy
**Goal:** the "Επειδή σου άρεσε X" subtitle becomes real (§3 layer 3).

- `app/api/recommendations/rerank/route.ts` — takes `userId`, fetches their precomputed top-50, fetches their last 5 high-rated items, sends to Haiku with prompt: "rerank these 50 to top-5 + 1-line Greek reasoning referencing user's taste".
- Cap: 2 calls/user/day. Cached in `analytics.rerank_cache` for 24h.
- Wire onto the **first card only** of "Tailored for You" rail + the "AI-personalized chips" on home.
- Cost: ~$0.001/rerank × 2/day × 1000 active users = ~$2/day at scale (~3-5% of revenue per the §3 cost target).

### Cost projection at 1000 DAU

| Item | Cost |
|---|---|
| Item embeddings backfill | $0.008 one-shot |
| User embeddings backfill | $0.0006 one-shot |
| Daily user embedding refresh | ~$0.01/month |
| Daily precompute cron | $0 (pure pgvector, no LLM) |
| Haiku reranking @ 2/user/day | ~$2/day → $60/month |
| **Total monthly** | **~$60/month** |

### Cold-start handling (concern raised + resolved)

The concern: "users haven't interacted enough yet; recommendations won't have signal". Resolution:
- **Day 1-2 wins are content-based, not collaborative.** Item-to-item similarity works with zero user activity. The "more like Sapiens" carousel needs only item embeddings.
- **User embeddings have three fallback tiers** (above) — every user gets a usable embedding from day 3 forward.
- **Quality grows organically** as users bookmark/rate. The architecture starts simple and gets better.

### Decisions pending before day 1

1. **Embedding provider lock** — OpenAI text-embedding-3-small (recommended, matches schema, $0.02/1M) vs text-embedding-3-large ($0.13/1M, needs migration to vector(3072)) vs Cohere multilingual ($0.10/1M, needs migration to vector(1024)).
2. **Backfill scope** — production directly ($0.008, embeddings sit idle until day 2) vs dev branch first then prod (~$0.016, validates similarity output before any user sees it).

Both parked — user said "decide later, will test later". No code starts until these land.

---

## 46. Image save path + dual-shape `items.images` JSONB gotcha (session 31)
> 🩺 Discovered + fixed a years-old bug that was silently wiping `items.images` on innocent admin saves. Recovery script in `scripts/restore-etouto-images.ts` (one-off — bulk damage scan deferred to next session).

`items.images` is a dual-shape JSONB column. The image pipeline (`lib/item-image-upload.ts`) writes an object with explicit slots:

```ts
{
  poster:   { s, m, l, xl },   // 2:3 portrait variants (movies/series/books)
  backdrop: { s, m, l, xl },   // 16:9 landscape variants
  og:       "...jpg",          // 1200×630 social-card image
  gallery:  [{ url, tab?, alt?, isDefault? }, ...]   // admin uploads
}
```

The admin-side editor (`SuggestionEditor`) only owns the `gallery` array; the pipeline owns the rest. Legacy K2-migrated rows may store `images` as a bare array (no `gallery` key) — `extractGalleryImages` and `mergeGalleryIntoImages` in `lib/images/gallery.ts` normalise across both shapes.

### The bug (silent for months)

`app/admin/suggestions/[id]/page.tsx` was coercing the prop:

```ts
images: Array.isArray(item.images) ? item.images : [],
```

The new dual-shape stores `images` as an **object**, not an array. Every modern row failed the `Array.isArray` check → editor received `[]` → admin opened the editor and saw "no gallery images" even when 4 photos existed in storage → any save called `mergeGalleryIntoImages([], [galleryImages])`, where `galleryImages` was the editor's local state (often empty if the admin wasn't intending to touch images). Result: `images = {}`, JSONB wiped, pipeline poster keys gone. The legacy `cover_url` / `poster_url` columns were mirrored separately and survived, so detail pages still rendered a cover — masking the bug for months.

### The three-prong fix

1. **`app/admin/suggestions/[id]/page.tsx`** — pass `item.images ?? null` through verbatim. The editor's `extractGalleryImages` already handles array OR object OR null.
2. **`components/admin/SuggestionEditor.tsx`** — prop type `images?: GalleryImage[]` → `images?: unknown`. The prop was lying about its type; downstream uses just hand it to `extractGalleryImages` which is shape-tolerant.
3. **`app/api/admin/suggestions/route.ts` PUT** — server-side gallery merge. Client now sends only the admin-edited `gallery: GalleryImage[]` (no pre-merged `images` blob). Server re-reads the row's current `images`, merges via `mergeGalleryIntoImages`, writes the result. Eliminates the stale-mount-time race that could re-wipe the row even after the page-route fix. Also strips any incoming `itemData.images` so two writers can't fight over the column.

### Recovery (one-off)

For `bars/etouto-ath1` specifically: `scripts/check-etouto.ts` confirmed all 9 storage files were intact (5 pipeline poster variants in `media/items/<id>/` + 4 admin gallery uploads in `media/items-bars/<uuid>-...`). `scripts/restore-etouto-images.ts` reconstructs the `images` JSONB from storage + writes it. Idempotent.

### How to spot this pattern in the future (audit checklist)

If you're consuming `items.images` anywhere, the value can be **any of**:

- `null` / `undefined` (row never had images)
- Plain array (legacy K2 row, gallery only — no pipeline keys)
- Object with some/all of `{ poster, backdrop, og, gallery }` keys (modern row)

**Don't** narrow with `Array.isArray(x) ? x : []` — that drops the modern object shape entirely. **Do** either:
- Use `extractGalleryImages(x)` from `lib/images/gallery.ts` if you want the gallery array.
- Use `pickCoverUrl(x, fallback)` if you want the cover URL.
- Pass it through unchanged if you're just plumbing it to a consumer that handles the dual shape.

### Damage scan (deferred)

The bug could have wiped any number of other rows the same way. PROGRESS.md §0 lists an audit-script follow-up: scan all items where `items.images IS NULL OR images = '{}'` but storage has gallery uploads keyed to the row's `items-<category>/` folder. Count first, decide on bulk-restore vs leave-alone after.

---

## 47. Profile lists v2 — orientation-aware cards (session 31)
> ✅ Shipped — `<ProfilePoster>` primitive + 3 redesigned surfaces.

The three profile sub-pages (`/profile/<handle>/suggestions/<category>`, `/bookmarks`, `/reviews`) used to render inline cards with portrait posters for every category. That looked wrong for venues, food, recipes — categories whose natural image orientation is landscape (CLAUDE.md §21). Session 31 consolidated around one shared primitive that respects orientation per the existing `isPortraitCategory` helper.

### The shared primitive

`components/profile/shared/ProfilePoster.tsx` — renders the item's cover with category-correct orientation. Three modes:

| Mode | Use case | Portrait dims (movies/series/books) | Landscape dims (food/bars/hotels/recipes/events/theater) |
|---|---|---|---|
| `thumb` | Inline cell next to text (suggestions row, reviews row) | `w-[76px] h-[114px]` (2:3) | `w-[120px] h-20` (3:2) |
| `hero` | Full-width top of a stacked card (venue suggestion card) | `w-full aspect-[2/3]` | `w-full aspect-[3/2]` |
| `tile` | Grid cell (bookmarks grid) | `w-full aspect-[2/3]` | `w-full aspect-[3/2]` |

Accepts `href` for link wrapping, `fallbackIcon` for the empty state, `overlay` slot for badges (top-rated chip, status indicator).

### The three surfaces

- **Suggestions** (`components/profile/suggestions/SuggestionsByCategoryPage.tsx`) — single category list, all items share `category`. Two card variants per `isPortraitCategory`: portrait categories get a row card (thumb left + info right); landscape categories get a stacked card (hero on top + info below).
- **Bookmarks** (`components/profile/bookmarks/BookmarksCategoryPage.tsx`) — multi-category grouped grid. Each section reads `category` and chooses grid template: portrait → 2-col 2:3 tiles; landscape → 1-col on mobile / 2-col on `sm+` with 3:2 tiles (avoids cramped 140px-wide landscape thumbs on phones). Row menu hover/focus-revealed via `group-hover:opacity-100`.
- **Reviews** (`components/profile/reviews/ReviewsCategoryPage.tsx`) — heterogeneous list, each review's `item.category` drives the thumb's orientation. Long review text gets an expand/collapse at 200 chars.

### Page chrome rhythm (now consistent across all 3)

- **Count strip**: previously a 52px font-bold number in a zinc-100 pill — too heavy. Now `text-2xl font-bold` next to a small label, just below the sticky back header. Reads at a glance without dominating the page.
- **Sort pills**: previously a "Ταξινόμηση ανά" preamble + a row of `px-5 py-3 rounded-full` over-padded pills. Now bare horizontal scroller of `h-9 px-4 rounded-full` zinc-100 / zinc-900 pills, matching the design system's existing pill rhythm.

### Legacy

`components/profile/suggestions/OwnSuggestionCard.tsx`, `components/profile/bookmarks/BookmarkedCard.tsx`, and `components/profile/reviews/ReviewCard.tsx` (the fixed-342-width one) are kept in-tree for showcase reference — they're Figma-spec reference components, but no production code mounts them. The list pages now own their own card rendering directly.


---

## 48. Admin gap-audit pattern + categories surface (session 33)
> ✅ Shipped — three closed gaps on `/admin/categories/<id>` + a new combinatorial Explorer at `/admin/filters` → Explorer tab.

### The pattern

When a user reports an admin bug, treat it as a sample of a class — not a singleton. The `feedback-admin-gaps-audit` memory captures the working rule: before fixing the reported symptom, audit the surrounding feature for dead controls, half-finished editors, inconsistent flows, and missing combinatorial views. Then call out the gaps in the response and ask which to prioritise — don't silently bundle. The user is building a platform a non-engineer must run on; gappy admin flows compound.

Session 33 was a clean example: one reported issue ("edit doesn't work") surfaced three distinct problems (dead Edit navigation, disabled-with-no-feedback Delete button, name-only inline rename) plus a missing combinatorial view on the Explorer. All four diagnosed before any patches landed.

### `/admin/categories/<id>` subcategory row — what each control does now

| Affordance | Behavior |
|---|---|
| Drag arrows ▲▼ | Patches `display_order` only (swap-with-neighbor in a single round-trip pair) |
| Published toggle (green/grey dot) | Patches `is_published` only |
| `Επεξεργασία` | Opens `<SubcategoryEditor>` drawer — name + slug + SEO description (see below) |
| `Delete` | Click always fires. If `itemCount === 0` → `confirm()` prompt → DELETE. If `itemCount > 0` → opens `<ReassignDialog>` with a target subcategory dropdown of the other subs in the same category; confirm calls reassign then DELETE in two visible steps. Single-subcategory edge case shows a "create another first" warning. |
| `· SEO` chip (next to name) | Surfaces whether `description_seo` is non-null — scan-the-table coverage indicator |

### `<SubcategoryEditor>` drawer (session 33)

Fields: `name` (Greek), `slug` (lowercase-kebab), `description_seo` (nullable textarea). The slug has a `↻ Δημιουργία από όνομα` button that runs the same Greek-to-Latin slugifier as the POST route (so admin renames don't drift). PATCH endpoint preflights slug uniqueness and returns the conflicting sibling's name on collision — a 23505 from PostgREST would be opaque ("duplicate key value violates unique constraint"); the preflight produces "slug 'X' already used by 'Y'" instead.

The inline name-only rename + `editName` / `editingId` state + `saveName` helper are gone. One editor, one place.

### `POST /api/admin/subcategories/[id]/reassign`

Body: `{ targetId }`. Validates both subs exist and share `category` (no cross-category moves). Returns `{ reassigned: number }`. Separate from the DELETE so the client can show two-step progress + degrade gracefully if either step fails. Not transactional — if reassign succeeds and delete fails the items are now under the new sub (acceptable outcome) and the source row stays; admin sees the error and can retry delete.

### Combinatorial Explorer (`/admin/filters` → Explorer tab)

Replaces the previous single-axis Explorer (subcategory + region counts as separate tables). Lets admin pick any combination of:

- **Subcategory** — auto-mapped to the right filter_id per category (`genre` for movies/series/books, `cuisine` for food, `event_type` for events, `type` for bars/hotels/theater/recipes). Source: `/api/admin/subcategories`.
- **Region** — top-level regions only (server expands to all descendants, matching the public picker). Venue categories only.
- **Min rating** — `0` / `≥ 3.5` / `≥ 4.0` / `≥ 4.5`.
- **Every published `category_filter`** for the current category, rendered as a chip-strip of its `options[]`. Free-text filters (`writer` / `publisher` / `director` / `actor` / `performer`) render as text inputs with `ciIncludes` matching. Complex filters (`awards` / `price` / `season` / `epoch`) surface as informational chips marked "skipped" — explicit rather than silently broken.

Live count debounces 250ms. Recommendation thresholds: `≥ 11 → Card`, `4–10 → Carousel`, `1–3 → too few`, `0 → no match`. Sample preview is a 3×4 grid of the top items by popularity (rating_count desc, avg_rating tiebreak), with title + ★ rating overlay and click-through to the public detail page.

**Save-as-Collection** — the button currently deeplinks `/admin/content/collections/new?source_category=<cat>` (pre-sets category only). Carrying picked filters + matched item IDs into the CollectionEditor is the natural follow-up; requires translating `category_filters`-style filter IDs into the CollectionEditor's `ExtFilter[]` shape (different vocabulary).

### `lib/category-filters/match.ts` — single source of truth

`matchesFilter`, `ciEq`, `ciIncludes` extracted from `CategoryPageShell.tsx` into a shared pure-function module so the public category page and the admin Explorer endpoint produce **byte-identical** filter results. Adding a new user-facing filter now means: add a case to `matchesFilter`, add a column to `CategoryItem` (built in `app/(main)/[category]/page.tsx:mapItem`), and the Explorer picks it up automatically once an admin publishes a `category_filters` row with the matching `filter_id`.

The admin endpoint (`POST /api/admin/explorer/query`) does its own slim `mapItem` over the same `EXT_SELECT` shape because the public page's mapper pulls suggester avatars + carousel hydration the Explorer doesn't need. If a third caller appears, extract the mapper too.

### What's still open on the categories surface

- **Category metadata editor** (gap C from the session 33 audit). The 9 category slugs (movies/books/food/…) are hardcoded in `CATEGORY_META` and `CATEGORY_NAMES`. The `categories` table exists in DB but no admin UI manages it. "Επεξεργασία" on `/admin/categories` just navigates to the subcategory list. Deferred — needs either a small migration to add label/icon columns or shifting CATEGORY_META into DB. Worth doing once admin needs a 10th category or localized labels.
