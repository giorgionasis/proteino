# Proteino — Build Progress

Last updated: 2026-04-30 (session 2)

---

## 1. COMPLETED

### Auth Flow (session 1)
- `/login` — email + password + Google/Facebook OAuth + "Καλώς ήρθες πάλι!" greeting
- `/register` — email + username + password with real-time validation (8 chars, uppercase, number) + Google/Facebook OAuth + terms checkbox
- `/forgot-password` — email input → reset link → new password form with same validation rules
- All auth forms: `react-hook-form` + `zod`, proper error states, success states
- Auth layout: `app/(auth)/layout.tsx` — no main nav, clean centered layout
- Auth components: `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `OAuthButtons`, `PasswordRuleList`, `AuthDivider`
- Supabase auth callback: `app/auth/callback/route.ts`
- Middleware: `middleware.ts` — protects routes, redirects unauthenticated users

### Design System — Full Overhaul (session 2, Figma-verified)
- **`tailwind.config.ts`** — complete rewrite with Figma-verified values:
  - Coral: `#FE6F5E` (was `#D85A30`, now correct from Figma)
  - Full zinc scale: zinc-50 (#fafafa) → zinc-950 (#18181b)
  - `ios-gray: #f2f2f7` — iOS-style input/search backgrounds
  - `badge-red: #c51501` — notification dot
  - `gold: #F8D160` — achievement color
  - Border radii: xs(4px), sm(8px), input(12px), card(16px), search(50px), full(9999px)
  - All 6 font weights (400–900) defined
  - `shadow-fab` updated to coral hex
  - Custom animations: slide-up, pop-in, scale-in, draw-check, shimmer, spin-slow, etc.
- **`app/globals.css`** — complete rewrite:
  - Google Fonts import (Open Sans 400–900)
  - All CSS variables updated to Figma-verified values
  - `gradient-coral` utility: `#FE6F5E → #FF9980`
  - `.theme-dark` class for SYNCING/PUBLISHED/Achievement screens
  - `-webkit-tap-highlight-color: transparent` for mobile feel
  - `overscroll-behavior: none` on `body`

### UI Components
Located in `components/ui/`:
- `Button` — variants: primary (coral gradient), secondary, ghost, danger; sizes: sm/md/lg; rounded-full
- `Input` — variants: default (border), search (pill/ios-gray bg)
- `Textarea` — auto-resize capable
- `Badge` — variants: coral, zinc, success, danger, warning, gold; `ReviewBadge` sub-component
- `Card` — base card with zinc-200 border
- `Modal` — with backdrop, escape close
- `Skeleton` — shimmer loading placeholder
- `Spinner` — coral animated spinner
- `StarRating` — interactive star rating component
- `Avatar` — circular, with fallback initials
- `FAB` — coral gradient, 56px circle, `shadow-fab`, hides when any overlay is open
- `IconButton` — 36px circle button (zinc-100 bg), optional badge
- `FilterChip` + `FilterChipRow` — active (coral) / inactive (zinc-200 border), horizontal scroll
- `StatCard` + `InlineStat` — profile stats boxes
- `FollowButton` — toggle follow/unfollow
- All exported from `components/ui/index.ts`

### Navigation Architecture
- **`components/layout/Header.tsx`** — 3 variants:
  - `Header` — logo left (Proteino•) + bell icon right (registered only, with badge-red dot)
  - `InnerHeader` — back button + title + optional right slot (category/detail pages)
  - `OverlayHeader` — icon + label + X close (search and suggestion overlays)
- **`components/layout/BottomNav.tsx`** — HOME / SEARCH / YOU:
  - HOME and YOU are `<Link>` components
  - SEARCH is a `<button>` that calls `openSearch()` — NOT a route
  - Active tab: coral icon + coral label; inactive: zinc-400
  - Fixed bottom with `pb-safe` for iOS toolbar
- **`components/ui/FAB.tsx`** — coral gradient, fixed bottom-right, opens `openSuggestion()`, auto-hides when any overlay is open

### Overlay System
- **`hooks/useOverlay.ts`** — Zustand store:
  ```
  { overlay: 'search' | 'suggestion' | null, openSearch, openSuggestion, close }
  ```
  Manages `document.body.style.overflow` lock on open/close.
- **`components/layout/FullScreenOverlay.tsx`** — GPU-accelerated slide-up container:
  - `fixed inset-0 z-50`, `translateY` animation (NOT top/bottom position)
  - `overscroll-contain` to prevent pull-to-refresh bleed
  - Body scroll lock (independent redundancy from `useOverlay`)
  - Escape key closes
- **`components/layout/OverlayManager.tsx`** — mounts both overlays in main layout
- **`app/(main)/layout.tsx`** — wires Header + BottomNav + FAB + OverlayManager

### SearchOverlay — Full Implementation
`components/search/SearchOverlay.tsx` — 5 interactive states:

| State | What renders |
|---|---|
| EMPTY | `Describe a vibe...` textarea + QUICK JUMPS (5 tappable presets) |
| TYPING | Textarea with text + instant pills + Intelligence panel animating from 0% |
| ANALYZING | Panel cycling through AI messages, progress continues |
| RESULTS | Cards appear in parallel at ~40% (before panel finishes) — "Theory Bar", "Jazz Point" |
| NO_MATCH | VIBE+LOC combo → "No direct matches for X in Y" + alternatives + "Be first to suggest it" CTA |

Key details:
- **Instant pill extraction** on every keystroke (regex, no debounce): `VIBE:` (coral), `TYPE:` (amber/warning), `LOC:` (success/green) — rendered as dark zinc-800 pills with color-coded labels
- **Parallel loading**: results appear at ~40% progress, panel continues to 100%
- **Intelligence panel**: dark card (zinc-900), coral "PROTEINO INTELLIGENCE" label, percentage, message, coral gradient progress bar
- **Quick Jumps**: tappable presets that trigger full analysis immediately
- Debounce: 700ms from last keystroke before analysis starts
- Auto-resize textarea (scrollHeight trick)
- Auto-focus on overlay open (350ms delay for animation)

### SuggestionOverlay — Full Implementation
`components/submission/SuggestionOverlay.tsx` — 6 states (full state machine):

| State | Theme | What renders |
|---|---|---|
| IDLE | Light | Textarea + Scan/Link/List/Voice buttons + Intelligence panel (0%, "I'm listening...") + VERIFY disabled |
| TYPING | Light | Textarea + Intelligence panel cycling messages + VERIFY disabled |
| LOCKED | Light | "LOCKED" pill in header, textarea disabled, panel at 100% + MATCH chip (green dot), VERIFY active (coral gradient) |
| SYNCING | **Dark** (zinc-950) | Spinning coral ring + step checklist auto-progressing, transitions to PREVIEW after 2.6s |
| PREVIEW | Light | "Preview Recommendation" title + enriched card (cover + "ENRICHED MATCH" badge + reflection) + SHARE/EDIT |
| PUBLISHED | **Dark** (zinc-950) | Coral checkmark circle (with glow) + "PUBLISHED" italic + context text + DISMISS/SHARE LINK |

Key details:
- LOCKED state: header completely replaces "LISTENING LIVE" with coral-bordered "LOCKED" pill badge
- VERIFY button: disabled (zinc-100) in IDLE/TYPING, active (coral gradient) in LOCKED only
- Input modes (Scan/Link/List/Voice): visible only in IDLE state, hide when typing starts
- SYNCING → PREVIEW transition: automatic after 2.6s (mock; real implementation will await API response)
- Mock match hardcoded to "Dune: Part Two (MOVIE)" — replaced by real AI when Anthropic key is added
- Debounce: 600ms from last keystroke before analysis starts
- Progress ticker: ~400ms interval, random increments, reaches 100% → LOCKED state

### Supporting Infrastructure
- **`hooks/useSearch.ts`** — stub (skeleton exists, not yet connected to SearchOverlay)
- **`hooks/useSubmission.ts`** — stub (skeleton exists, not yet connected to SuggestionOverlay)
- **`hooks/useRecommendations.ts`** — stub
- **`lib/ai/index.ts`** — `AIService` interface (matches AI.md spec)
- **`lib/ai/mock.ts`** — `MockAIService` implementation (keyword-based, returns hardcoded data)
- **`lib/supabase/client.ts`**, `server.ts`, `admin.ts` — Supabase clients
- **`lib/recommendations/index.ts`** — stub
- **`constants/categories.ts`** — category slugs + labels
- **`constants/vibes.ts`** — vibe list
- **`types/index.ts`** + `types/database.ts` — global TypeScript types
- **`components/ai/ProteínoIntelligence.tsx`** + `ProgressBar.tsx` — standalone AI panel components (exist but overlays use inline implementations)

### Route Stubs (compileable, empty)
- `app/(main)/page.tsx` — Home (comment placeholders only)
- `app/(main)/[category]/page.tsx` — Category page (reads CATEGORIES constant, 404s on unknown slug)
- `app/(main)/[category]/[id]/page.tsx` — Item detail
- `app/(main)/profile/[handle]/page.tsx` — Profile
- `app/(main)/search/page.tsx` — Search route (the actual search is the overlay, not this route)
- `app/(main)/submit/page.tsx` — Submit route
- `app/admin/page.tsx` — Admin (not protected yet)
- `app/showcase/page.tsx` — Component showcase/kitchen sink

### Build Status
- TypeScript: **0 errors** (`npx tsc --noEmit` passes cleanly)
- Next.js build: **passes** (13 pages compiled successfully)
- Bundle: first load JS ~87kB shared

---

## 2. IN PROGRESS

Nothing actively in progress. Session 2 ended cleanly after completing both overlays.

---

## 3. WHAT NEEDS TO BE BUILT NEXT (in order)

### Priority 1 — Home Page (`app/(main)/page.tsx`)
Two variants in the same file, conditioned on auth state:

**Guest variant:**
- "How Proteino works" section (3 steps with icons)
- "Popular Now" carousel (mock data)
- Registration CTA banner ("Δημιούργησε λογαριασμό" + "Έχω ήδη λογαριασμό")

**Registered variant:**
- Personalized greeting ("Καλημέρα, George!" based on time of day)
- Category toggle tabs (ALL + each category as horizontal scroll)
- "Tailored for You" carousel — with "Because you liked X" reasoning chips (from `useRecommendations`)
- Themed carousels (Oscar Movies, Trending Series, etc.)
- Following activity section
- AI-personalized chips ("Sci-fi που δεν έχεις δει")
- Hook mechanics: streak indicator, daily suggestion prompt (HOOKS.md §2C, §2H)

Key components needed: `Carousel`, `BecauseYouLiked`, category tabs — some stubs exist in `components/recommendation/`

### Priority 2 — Category Pages (`app/(main)/[category]/page.tsx`)
One layout that adapts per category:
- `InnerHeader` with category name + right slot (map toggle for food/bars)
- Sub-category tabs (horizontal scroll) — genre/type-first for most; destination-first for hotels/events/theater
- Filter row: `[⊞ Filters · N]` chip + 2 quick filter chips + "📍 Κοντά μου" (food/bars only)
- Item list/cards with social proof ("George and 2 others suggested this")
- Map view toggle for: food, bars, hotels, theater, events (map pin → bottom sheet card)
- Empty state: "Πρόσθεσε το πρώτο [category]" CTA
- "No dead ends" bottom CTA

Sub-categories per category are documented in CLAUDE.md §16.

### Priority 3 — Item Detail Pages (`app/(main)/[category]/[id]/page.tsx`)
Start with Movie detail (most complex, others are simpler):
- Hero with poster + gradient overlay + back/bookmark/share action buttons
- "Το είδα" / Watchlist / Trailer / Comments quick actions
- Metadata grid: director, year, duration, country, actors
- Platform chips (Netflix, HBO, Apple TV+)
- Rating breakdown (bar chart) + inline star rating (triggers modal → optional comment)
- Community suggestions list with vote up/down
- "Add your suggestion" CTA (opens SuggestionOverlay with pre-fill)
- Related movies carousel
- Social proof hooks: "👀 12 users viewed today", "George and 2 others suggested this"

### Priority 4 — YOU / Profile Page
Two sub-variants:

**Guest (no auth):**
- Blurred/dimmed profile preview
- 3 value proposition bullets with icons
- "Δημιούργησε λογαριασμό" CTA + "Έχω ήδη λογαριασμό →"
- This is at route `/you` or `/profile/guest` — NOT a login redirect

**Registered profile (`/profile/[handle]`):**
- Avatar + display name + handle + bio + follow button
- Stats row: ΠΡΟΤΑΣΕΙΣ / ΑΞΙΟΛΟΓΗΣΕΙΣ / ΑΚΟΛΟΥΘΟΙ / ΑΚΟΛΟΥΘΑ
- Level progress bar: "Level 2 · 8/10 suggestions → Level 3"
- Global rank chip in coral (#84 style)
- Streak indicator
- Tabs: Suggestions / Bookmarks / Ratings
- Settings access

### Priority 5 — Onboarding Flow (4 steps)
Triggered after registration. Give-before-you-ask principle:
1. **Welcome** — show value (save time, AI, community) before asking anything
2. **Interests** — select 2+ categories (tappable grid, min 2 to proceed)
3. **Your Feed (REWARD)** — immediately show personalized content based on step 2 selections
4. **Follow suggestions** — skippable, users with shared interests

### Priority 6 — Real Data Layer
Connect all mock UI to Supabase:
- Database migration (all tables from CLAUDE.md §5)
- API routes: `/api/items`, `/api/suggestions`, `/api/search`, `/api/recommendations`
- `useRecommendations` hook → real pgvector queries
- `useSearch` hook → real search (regex pills + DB query, no AI yet)
- `useSubmission` hook → real item lookup + suggestion creation
- Auth state across layout (currently `isRegistered={false}` hardcoded in main layout)

### Priority 7 — AI Service (Real)
Replace `MockAIService` when Anthropic key is ready:
- `lib/ai/anthropic.ts` — `AnthropicAIService` implementing `AIService` interface
- `lib/ai/factory.ts` — `getAIService()` that picks provider from env vars
- Update `analyzeSubmission` to return real title/category identification
- Update `analyzeSearchQuery` to return real pill extraction + intent
- Wire `useSubmission` and `useSearch` hooks to use the factory

External enrichment APIs to add (in parallel with AI):
- TMDB (movies + series metadata, covers, trailers)
- Google Books (books)
- Google Places (food, bars, hotels)

### Priority 8 — Gamification Layer
- Achievement popup system after each PUBLISHED suggestion (per HOOKS.md §3)
- Badge progression: Επαληθευμένος χρήστης (3 sug), Έμπειρος χρήστης (10 sug)
- Level progress visible on profile
- Leaderboard page

### Priority 9 — Notifications
- Notifications page (`/notifications`)
- Bell icon in Header actually links here
- All notification types from HOOKS.md §1 and §2

### Priority 10 — Admin Panel (`/admin`)
- Route protection: `role = 'admin'` check
- Item management (create/edit/publish items)
- Suggestion moderation
- Nearby activities management
- User management

---

## 4. IMPORTANT NOTES & DECISIONS

### Design System (Non-Negotiable)
- **Coral**: `#FE6F5E` — the TRUE primary (was `#D85A30` in session 1, corrected from Figma in session 2)
- **Font**: Open Sans (Google Fonts), loaded via `globals.css` — NOT system font stack
- **Dark theme**: ONLY for SYNCING, PUBLISHED, and Achievement unlock screens — everything else is light
- **AI panel (Intelligence)**: Always dark card (`bg-zinc-900`) even in light theme — this is intentional contrast
- **Zinc for everything**: all text and borders use zinc scale, NOT gray

### Navigation (Non-Negotiable)
- SEARCH tab = button → `openSearch()` — NOT a `<Link href="/search">`
- FAB = button → `openSuggestion()` — auto-hides when any overlay is open
- Overlays use `transform: translateY` animation — NEVER `top/bottom` changes
- Body scroll lock is managed by BOTH `useOverlay` store AND `FullScreenOverlay` component (double protection by design)

### Overlay Architecture
- Both overlays contain their entire state machine internally (no external state management for flow steps)
- Mock data is intentionally hardcoded inside overlays — real AI calls will replace the ticker simulation
- `SearchOverlay` pill regex only covers English terms currently — Greek terms from AI.md §3 pill patterns need to be added when connecting to real search
- `SuggestionOverlay` VERIFY button only activates when `state === "locked" && match !== null`

### PWA Rules (Mobile Browser)
- `active:` states are PRIMARY; `hover:` states are secondary (mobile doesn't reliably fire hover)
- `will-change-transform` on overlay containers — already in place
- `overscroll-behavior: contain` on overlay scroll containers — already in place
- `env(safe-area-inset-bottom)` handled in BottomNav (`pb-safe`) and FAB position

### Supabase / Environment
- `.env.local` currently has NO keys — the middleware throws a Supabase error on root route
- This does NOT block development of UI screens — you can build all screens with mock data
- When ready: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`

### Hooks vs Overlay Internal State
- `useSearch` and `useSubmission` hooks in `hooks/` are stubs — they exist but are NOT connected to `SearchOverlay` or `SuggestionOverlay`
- Both overlays currently manage ALL their own state internally (useState, useRef, timers)
- Decision: when real AI is connected, extract the analysis logic out of the overlays into the hooks, then pass results down as props

### File Locations to Know
```
hooks/useOverlay.ts                          ← overlay state (Zustand)
components/layout/FullScreenOverlay.tsx      ← slide-up container
components/layout/OverlayManager.tsx         ← mounts both overlays
components/search/SearchOverlay.tsx          ← full search UI (5 states)
components/submission/SuggestionOverlay.tsx  ← full submission UI (6 states)
app/(main)/layout.tsx                        ← main layout wiring
tailwind.config.ts                           ← all design tokens
app/globals.css                              ← fonts + CSS variables
CLAUDE.md                                    ← architectural decisions (source of truth)
AI.md                                        ← AI implementation spec
HOOKS.md                                     ← engagement + gamification spec
```
