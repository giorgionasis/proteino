# Proteino — Project Intelligence File

This file is the source of truth for all architectural, design, and product decisions made for the Proteino project. Read this before every session.

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

### Recommendation System
- **Offline (nightly batch):** Compute embeddings, update user profiles, pre-compute personalized recommendations
- **Online (real-time):** Serve pre-computed recs, fast vector search for queries, log new activity
- Uses `pgvector` extension in Supabase — already provisioned

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

#### suggestions
```sql
id uuid PK, user_id FK, item_id FK,
reflection text, rating float,
ai_quality_score float, ai_match_data jsonb,
content_hash (immutable, proof of authorship),
is_published bool, created_at, published_at, modified_at
```

#### ratings
```sql
id uuid PK, user_id FK, item_id FK, suggestion_id FK,
score float, vote_up int, vote_down int, created_at
```

#### comments
```sql
id uuid PK, user_id FK, suggestion_id FK,
parent_id FK (for replies), body text, created_at
```

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
- **Exception:** Dark theme ONLY for Syncing + Published + Achievement unlock screens
- **AI flows (Search + Suggestion):** Light theme — same design system, NOT dark
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
6 states:
1. **Empty** — "Describe, scan, or paste..." + 4 input modes (Scan/Link/List/Voice) + AI panel: "I'm listening"
2. **Typing** — Real-time AI analysis, progress 0→100%, "LISTENING LIVE" indicator
3. **Match Found** — "LOCKED" state, input disabled, "MATCH: [ITEM] ([CATEGORY])", Verify button activates
4. **Syncing** — Dark screen, animated ring, step-by-step checklist (category identified ✓, match confirmed ✓, enriching...)
5. **Preview** — "ENRICHED MATCH" badge, reflection quote, star rating (embedded in suggestion), SHARE / EDIT
6. **Published** — Dark celebration screen, animated checkmark, "PUBLISHED", dismiss/share link

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
| AI provider | Abstracted (mock now) | No access yet, swappable |
| Recommendations | Vector + LLM hybrid | Speed + explainability |
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

