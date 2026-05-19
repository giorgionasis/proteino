# Proteino — AI Implementation Guide

This file documents exactly how AI is implemented across the entire Proteino ecosystem.
AI is a visible, functional feature — not decoration. Every AI interaction must feel alive.
Place this file in the project root alongside CLAUDE.md and HOOKS.md.

**Last meaningful update:** 2026-05-19 (session 30 — Phase B day-by-day execution plan locked + cold-start handling. See §4.6.)

---

## OPERATIONAL STATUS (session 30)

| Surface | Status | Notes |
|---|---|---|
| Submission AI | ✅ Wired | Gemini Flash-Lite + cache. Live quality coach via `scoreDescriptionQuality`. |
| Search AI | ✅ Wired (v2) | Structured-filter engine. See §13 for the full schema. |
| Recommendation AI | 📋 Phase B planned (session 30), not started | pgvector + nightly batch + LLM rerank. **5-day day-by-day plan locked — see §4.6.** Decisions pending: embedding provider lock + backfill scope. |
| Books enrichment | 🔄 Migrating to Biblionet (session 30) | Smoke test infrastructure shipped — typed client + 8 endpoints validated. Google Books slated for removal. See CLAUDE.md §44. |

**🛑 Gemini billing not enabled** — free tier of `gemini-2.5-flash-lite` caps at **20 requests/day** (per-project, not per-key). Once exhausted, `analyzeSearchQuery` and `analyzeSubmission` return passthrough `{categories: []}` and the route falls through to title-only matching. Enable at https://aistudio.google.com → API key → Linked Google Cloud project → Billing. At our ~700-token prompts, paid tier is ~$0.0001 per call.

**✅ Migration 019 applied** (verified 2026-05-12) — `ai_query_cache` (77 hits) and `ai_usage_log` (111 rows) are live. `/admin/ai-usage` dashboard reads real data.

---

## Core Principle

> "The AI must be visible at every key interaction. Users should always know the AI is working for them."

Three AI surfaces:
1. **Submission AI** — analyzes what the user is submitting in real-time
2. **Search AI** — parses natural language and finds matches intelligently  
3. **Recommendation AI** — personalizes the entire experience silently in the background

---

## 1. AI Service Architecture

### The Abstraction Layer
All AI functionality goes through a single interface. This means swapping providers (mock → Anthropic → OpenAI) requires zero changes to the UI or business logic.

```typescript
// lib/ai/index.ts

export interface AIService {
  // Submission flow
  analyzeSubmission(input: SubmissionInput): Promise<SubmissionAnalysis>
  
  // Search flow  
  analyzeSearchQuery(query: string): Promise<SearchAnalysis>
  
  // Recommendations
  generateEmbedding(text: string): Promise<number[]>
  rerankCandidates(userId: string, candidates: Item[], context: string): Promise<RankedItem[]>
  explainRecommendation(userId: string, item: Item): Promise<string>
  
  // Content quality
  scoreDescriptionQuality(text: string): Promise<QualityScore>
}

// Current implementation: lib/ai/mock.ts
// Future implementation: lib/ai/anthropic.ts
```

### Provider Switch
```typescript
// lib/ai/factory.ts
export const getAIService = (): AIService => {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicAIService()
  if (process.env.OPENAI_API_KEY) return new OpenAIAIService()
  return new MockAIService() // always fallback, never crash
}
```

---

## 2. AI Submission Flow

### State Machine (locked)

```
IDLE → LISTENING → ANALYZING → MATCHED → LOCKED → SYNCING → PREVIEW → PUBLISHED
                                        ↓
                                    NO_MATCH → SUGGEST_MANUAL
```

Plus `DUPLICATE` and `ERROR` states added in session 12 — see CLAUDE.md §7 / §22.

### Behavioural rules

- **Debounce 600ms** in `hooks/useSubmission.ts`. Analyze as the user types, never wait for them to finish.
- **Confidence tiers** (from `/api/ai/match` via `computeTier`): `high` (≥100 exact + gap ≥20) → auto-lock · `medium` (60-80) → "Νομίζω είναι X. Σωστό;" Ναι/Όχι pills (NO auto-lock) · `low` (<60 OR runner-up within 20pts) → no-lock alternatives carousel "Ποιο εννοείς;"
- **Auto-unlock** when the matched title is removed from textarea (case + accent-insensitive substring on `analysis.title` + `tried_candidate`).
- **No match → never a dead end.** "Δεν μπόρεσα να αναγνωρίσω αυτό που περιγράφεις" + "Πρόσθεσέ το χειροκίνητα →" CTA.
- **Quality coach** runs on every keystroke independently of AI lock (local `assessQuality` in `lib/ai/quality.ts`). 8 coaching dimensions (length / why / emotion / scene / character / plot / polish / celebrate) with rotating phrasings keyed off `floor(len/10) % pool.length`.

### Quality thresholds (`lib/ai/quality.ts`)

| Label | Range | Example |
|---|---|---|
| poor | 0-25 | "good movie" |
| fair | 25-50 | "really good movie with great acting" |
| good | 50-75 | "amazing cinematography, Nolan at his best" |
| excellent | 75-100 | personal story + specific details + emotion |

### Input modes (4 designed, only Text wired today)

Text · Scan (OCR camera) · Link (URL paste) · Voice (STT) · List (bulk paste). Buttons exist in the UI; only Text path is implemented end-to-end.

### Metadata enrichment dispatch (Syncing phase)

```typescript
const enrichers = {
  movie / series : TMDB              // ✅ wired user-side
  book           : Google Books      // admin-only today
  food / bar     : Google Places     // admin-only today
  hotel          : Google Places + Booking API stub
  theater / event: Ticketmaster      // admin-only today
  recipe         : none (user-generated)
}
```

Enrichment NEVER blocks submission. If API fails → publish anyway with user data only.

### ProteínoIntelligence panel
The panel must feel alive — varied, contextual messages. Implementation in `components/ai/ProteinoIntelligence.tsx`; copy variants per state live in code rather than spec'd here so they can iterate freely.

---

## 3. Smart Search AI

> Architecture + behaviour invariants live in CLAUDE.md §27 (Search v2). This section keeps the original UX principles + flow tier that still govern.

### Search analysis flow (timing rules)

`hooks/useSearch.ts`:
- **Every keystroke**: instant regex/folded-token pill extraction (no AI).
- **350ms debounce**: full Gemini `analyzeSearchQuery` + DB search in parallel via `/api/search`.
- **8s `AbortSignal.timeout`** per request, distinct `error` state with retry button (separate from `no_match`).
- **History persist**: 1.5s settle-debounced (not every keystroke). Dedup case + accent insensitive.
- **aria-live="polite"** on results; real progress signal (0→30→70→100) not `Math.random()`.

### Confidence tiers (mirrors submission)

From `tierFromScores(best, runnerUp)` in `app/api/search/route.ts`:
- **high** (≥500 + gap ≥100): FEATURED hero card on single-item match.
- **medium** (≥300): ranked list with "Άλλα αποτελέσματα · N".
- **low**: clarification chips + "Διαφορετική κατηγορία" picker + "Πρότεινέ το πρώτος" CTA.

### No-match strategy (never a dead end)

1. Expand location radius (Chalandri → Athens) — surfaces with **amber region-ghost banner** when fallback fires.
2. Relax one constraint at a time.
3. Show what exists nearby.
4. **Honest empty state**: when the user explicitly specified a location AND zero matches found, return 0 items + `region_fallback_used: true` rather than silently falling back to global popular (which was a confusing leak).
5. **Latent-intent log**: every no-match search inserts into `public.search_log`; DB trigger `trg_fanout_search_matches` fires `search_match` notifications when matching items publish later (migration 013).
6. **Submission deeplink**: "Πρόσθεσε X πρώτος →" opens suggestion overlay with the query pre-filled via `useOverlay.openSuggestion(prefill)`.

### Mini-chat fallback

Auto-escalates after 2 failed chip narrows. Real LLM call via `conversationalSearchFallback` (optional method on `AIService`) — generates contextual clarifying question + suggested chips. Falls back to canned chips if provider down.

---

## 4. Recommendation System

### Architecture Overview
```
User Activity → Activity Log → Nightly Batch → Embeddings + Pre-computed Recs
                                                          ↓
Home Feed ← Serving Layer ← pgvector similarity + LLM reranking
```

### Two-Phase Approach

**Phase 1 — Vector Similarity (fast, always on)**
```sql
-- Find items similar to what user has engaged with
-- Uses pgvector cosine similarity
SELECT i.*, 
  1 - (i.embedding <=> $user_embedding) AS similarity
FROM items i
WHERE i.category = ANY($preferred_categories)
  AND i.id NOT IN (SELECT item_id FROM bookmarks WHERE user_id = $user_id)
  AND i.id NOT IN (SELECT item_id FROM suggestions WHERE user_id = $user_id)
ORDER BY similarity DESC
LIMIT 50; -- candidates for Phase 2
```

**Phase 2 — LLM Reranking (when AI available)**
```typescript
// lib/recommendations/reranker.ts
// Takes 50 candidates, returns top 10 with explanations

const rerankWithLLM = async (
  userId: string,
  candidates: Item[],
  userProfile: UserProfile
): Promise<RankedItem[]> => {
  const prompt = buildRerankingPrompt(userProfile, candidates)
  const response = await aiService.rerankCandidates(userId, candidates, prompt)
  
  return response.map(item => ({
    ...item,
    explanation: item.explanation, // "Because you liked Interstellar"
    confidence: item.score
  }))
}
```

### User Embedding Construction
```typescript
// analytics/buildUserEmbedding.ts — runs nightly

const buildUserEmbedding = async (userId: string) => {
  // Collect all user signals with weights
  const signals = [
    { items: await getSuggestedItems(userId), weight: 1.0 },      // strongest signal
    { items: await getRatedHighItems(userId, 4), weight: 0.8 },   // rated 4-5 stars
    { items: await getBookmarkedItems(userId), weight: 0.6 },     // saved
    { items: await getViewedItems(userId), weight: 0.2 },         // just viewed
    { items: await getSearchedItems(userId), weight: 0.3 },       // searched for
  ]
  
  // Average embeddings weighted by signal strength
  const embedding = computeWeightedAverage(signals)
  
  // Store in analytics schema
  await supabase
    .from('analytics.user_embeddings')
    .upsert({ user_id: userId, embedding, updated_at: new Date() })
}
```

### Explanation Generation
Every recommendation needs a human-readable reason:
```typescript
// This is what makes Proteino feel smart, not generic

const EXPLANATION_TEMPLATES = [
  "Επειδή σου άρεσε το {item}",           // similarity to liked item
  "Δημοφιλές στους χρήστες που ακολουθείς", // social signal
  "Trending στην {city} αυτή την εβδομάδα", // geo + trending
  "Κρυφό διαμάντι με {rating}★",            // high rating, low views
  "Νέα πρόταση από τον {user} που ακολουθείς", // social follow
  "{N} φίλοι σου το έχουν αποθηκεύσει",    // social proof
  "Επειδή ψάχνεις για {genre}",             // based on recent search
  "Συμπληρώνει τέλεια το {liked_item}",    // complementary content
]
```

### Personalized Home Feed Construction
```typescript
// lib/recommendations/homeFeed.ts

const buildHomeFeed = async (userId: string): Promise<HomeSection[]> => {
  const [
    tailored,      // AI-personalized, with explanations
    following,     // From people user follows
    trending,      // Platform-wide trending
    themed,        // Curated carousels (Oscar Movies, etc.)
    newInCategory, // New items in preferred categories
    discovery,     // One wild card — outside usual preferences
  ] = await Promise.all([
    getTailoredForUser(userId),
    getFollowingActivity(userId),
    getTrending(),
    getThemedCarousels(),
    getNewInPreferredCategories(userId),
    getDiscoveryItem(userId), // "Something different for you"
  ])
  
  // Shuffle section order for variable reward
  // (tailored always first, rest randomized)
  return [tailored, ...shuffle([following, trending, themed, newInCategory, discovery])]
}
```

### Cross-Category Recommendations
```typescript
// The "jazz bar after a movie" type of recommendation

const getCrossCategory = async (userId: string, recentItem: Item) => {
  // If user just suggested/viewed a movie set in Paris →
  // recommend French restaurants
  
  // If user bookmarks a cooking book →
  // recommend recipe suggestions
  
  // If user rates a jazz album →
  // recommend jazz bars
  
  const crossLinks = await aiService.findCrossLinks(recentItem, userId)
  return crossLinks.map(link => ({
    item: link.item,
    explanation: link.reason, // "Συνδέεται με το {recentItem}"
    type: 'cross_category'
  }))
}
```

---

### 4.6 Phase B execution plan — 5 days (locked session 30, not started)

Day-by-day plan, honors the locked offline-batch architecture (CLAUDE.md §3 layer 2): nightly Edge Function computes embeddings + `analytics.precomputed_recs`; online home reads precomputed in <100ms with zero LLM at request time. Haiku reranks only the hero rec on-demand, capped 2/user/day.

| Day | Goal | User-visible win |
|---|---|---|
| 1 | **Item embeddings backfill.** Lock provider: OpenAI `text-embedding-3-small` ($0.02/1M tokens, 1536-dim matches existing `items.embedding` column). New `lib/embeddings/openai.ts` + `scripts/embed-items.ts`. Compose input text per category (movies: title+plot+cast+director; books: title+author+plot+subjects from Biblionet; venues: title+cuisine+type+city; recipes: title+ingredients+origin). Cost: ~1953 items × 200 tokens avg = **$0.008 one-shot**. Wire `app/api/recommendations/similar/route.ts` with pgvector cosine. | None — infrastructure |
| 2 | **Item-to-item carousels on detail pages.** Replace hardcoded `<RelatedSections>` "Σχετικά" / "Από τον director" blocks (CLAUDE.md §38) with new `vector_similar` rule type — pulls `/similar` with cosine filter. Add `vector_similar` widget to `lib/layout/widgets.ts` for detail pages + `static_carousel` on home. Wire into all 9 detail components — existing `<CarouselPortrait>` / `<CarouselLandscape>` consume unchanged. | Every detail page on every category shows semantically related items. **Works for guests — no user activity required.** |
| 3 | **User embeddings + offline batch infrastructure.** Migration: `analytics.user_embeddings` (or column on `users.embedding`, already exists per CLAUDE.md §5). `lib/embeddings/user.ts` with three fallback tiers: (a) active users ≥3 bookmarks/ratings in last 30d → weighted avg of interacted items (rating ×3, bookmark ×2, suggestion ×3, view ×1); (b) low-activity → avg of top-N items in onboarding categories; (c) zero-activity legacy K2 users → "popular last 30d" cluster center. Supabase Edge Function `embed-users-cron` daily at 04:00. Backfill cost: 627 users × ~50 tokens = **$0.0006 one-shot**. Daily cron: ~$0.01/month. | None |
| 4 | **Precompute "Tailored for You" → online table.** Migration: `analytics.precomputed_recs` (`user_id`, `item_id`, `score`, `rank`, `reason_seed`, `computed_at`). Supabase Edge Function `precompute-recs-cron` daily at 04:30 (after user embeddings). For each user with `last_login_at` in last 30d → pgvector top-50 cosine, excluding bookmarked/rated/own-suggested. Writes ~50 rows per active user. Indexed on `(user_id, rank)` — `SELECT ... ORDER BY rank LIMIT 5` is <10ms. New `tailored_for_you` widget in `lib/layout/widgets.ts` (registered audience only). | Real personalized "Tailored for You" rail on home. Updates nightly. Page render still <100ms — no online compute. |
| 5 | **Haiku reranking + reasoning copy.** `app/api/recommendations/rerank/route.ts` takes `userId`, fetches their precomputed top-50 + last 5 high-rated items, sends to Haiku: "rerank these 50 to top-5 + 1-line Greek reasoning referencing user's taste". Cap: 2 calls/user/day. Cached in `analytics.rerank_cache` for 24h. Wire onto **first card only** of "Tailored for You" rail + the "AI-personalized chips" on home (CLAUDE.md §7). Cost: ~$0.001/rerank × 2/day × 1000 active users = **~$2/day at scale**. | Real "Επειδή σου άρεσε X" reasoning copy. AI-driven home complete. |

### 4.6.1 Cold-start handling (concern raised session 30 + resolved)

The concern: "users haven't interacted enough yet — recommendations won't have signal". Why it's resolved:

- **Day 1-2 wins are content-based, not collaborative.** Item-to-item similarity needs only item embeddings; no user activity required. The "more like Sapiens" carousel works the moment day 1 ships.
- **User embeddings have three fallback tiers** (above) — every user gets a usable embedding from day 3 forward, even brand-new ones (via onboarding interests).
- **Quality grows organically** as users bookmark/rate. The architecture starts simple and gets better.

### 4.6.2 Cost summary at 1000 DAU

| Item | Cost |
|---|---|
| Item embeddings backfill (one-shot) | $0.008 |
| User embeddings backfill (one-shot) | $0.0006 |
| Daily user embedding refresh | ~$0.01/month |
| Daily precompute cron | $0 (pure pgvector, no LLM) |
| Haiku reranking @ 2/user/day | ~$60/month |
| **Total monthly** | **~$60/month** |

Within the 3-5% revenue target from CLAUDE.md §14.

### 4.6.3 Decisions pending before day 1

1. **Embedding provider lock** — OpenAI text-embedding-3-small (recommended; matches `vector(1536)` schema) vs text-embedding-3-large (needs vector(3072) migration) vs Cohere multilingual (needs vector(1024) migration). User said decide later.
2. **Backfill scope** — production directly ($0.008, embeddings sit idle until day 2 wires them up) vs dev branch first then prod (~$0.016, validates "more like Sapiens" returns real similar books before any user sees it).

No code starts until these land.

---

## 5. AI Visibility Rules

AI must be VISIBLE at every key interaction. These are non-negotiable:

### Always Show the AI Panel
- **Submission flow** — ProteínoIntelligence panel visible from the moment user opens submission
- **Search** — ProteínoIntelligence panel visible from the moment user opens search
- **Panel never disappears** while user is typing — it's always present, updating

### Progress Must Feel Real
```typescript
// Never fake instant 100% — show real progress
// Never stay at 0% for more than 1 second
// Progress should feel like something is actually happening

const PROGRESS_STAGES = [
  { pct: 5,   delay: 200,  msg: "I'm listening..." },
  { pct: 15,  delay: 800,  msg: "Analyzing context..." },
  { pct: 35,  delay: 1200, msg: "Detecting category..." },
  { pct: 60,  delay: 1800, msg: "Searching database..." },
  { pct: 85,  delay: 2400, msg: "Cross-referencing metadata..." },
  { pct: 100, delay: 3000, msg: "Match found!" },
]
// Actual AI response overrides these at any point
```

### AI Badge on Recommendations
Every AI-recommended item shows a subtle indicator:
```
[✦ AI] — small coral badge, top-left of card
```

### Personalized Chips (Registered Users Only)
On home screen, below category tabs:
```
[Sci-fi που δεν έχεις δει] [Νέες προτάσεις από GN] [Trending στην Αθήνα]
```
These chips are AI-generated, personalized, and rotate each session.

---

## 6. Mock + provider implementations
> ✅ Production runs on Gemini Flash-Lite via `lib/ai/gemini.ts`. Mock retained as the fallback when no provider key is set.

`MockAIService` (in `lib/ai/mock.ts`) simulates realistic latency + keyword-based matches so the UI flows can be developed without an API key. Returns `confidence: 0.95` for `dune` / `interstellar` keywords, medium confidence for any input > 30 chars, low otherwise. Quality scoring is length-based (linear ramp to 100). Random 1536-dim vectors for embeddings.

`GeminiAIService` (in `lib/ai/gemini.ts`) implements the same `AIService` interface against Google's Gemini 2.5 Flash-Lite. Wrapped by `cache-and-log.ts` which adds 30-day Postgres-backed query cache + per-call usage logging.

To swap providers: add `lib/ai/{provider}.ts` implementing the interface, register in `lib/ai/factory.ts:getAIService()` with the env-var key, ship. UI doesn't change.

### Env vars
```bash
GEMINI_API_KEY=...            # active (set up via Google AI Studio)
TMDB_API_KEY=...              # movies + series cover enrichment
GOOGLE_BOOKS_API_KEY=...      # books (optional)
GOOGLE_PLACES_API_KEY=...     # food / bars / hotels venue photos
ANTHROPIC_API_KEY=...         # placeholder — not wired today
```

---

## 8. Database AI Functions

### pgvector Setup (already in migration)
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Items table has embedding column
ALTER TABLE items ADD COLUMN embedding vector(1536);

-- Users table has embedding column  
ALTER TABLE users ADD COLUMN embedding vector(1536);

-- HNSW index for fast similarity search
CREATE INDEX items_embedding_idx ON items 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Similarity Search RPC
```sql
-- Already in migration as match_items()
CREATE OR REPLACE FUNCTION match_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    id, title, category,
    1 - (embedding <=> query_embedding) AS similarity
  FROM items
  WHERE 
    (filter_category IS NULL OR category = filter_category)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

---

## 9. Analytics Schema (Offline Batch)

```sql
-- analytics.activity_log — every user action
CREATE TABLE analytics.activity_log (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL, 
  -- 'view', 'search', 'suggest', 'rate', 'bookmark', 'follow', 'share'
  target_id uuid,
  target_type text, -- 'item', 'user', 'suggestion'
  context jsonb,   -- search query, referrer, session info
  created_at timestamptz DEFAULT now()
);

-- analytics.user_embeddings — updated nightly
CREATE TABLE analytics.user_embeddings (
  user_id uuid PRIMARY KEY,
  embedding vector(1536),
  updated_at timestamptz DEFAULT now()
);

-- analytics.precomputed_recs — nightly batch output
CREATE TABLE analytics.precomputed_recs (
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  score float NOT NULL,
  explanation text,
  rec_type text, -- 'tailored', 'trending', 'social', 'discovery'
  computed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- analytics.search_log — for improving search
CREATE TABLE analytics.search_log (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  query text NOT NULL,
  pills jsonb,
  result_count int,
  clicked_item_id uuid,
  created_at timestamptz DEFAULT now()
);
```

### Nightly Batch Job (runs via cron/edge function)
```typescript
// supabase/functions/nightly-batch/index.ts

const runNightlyBatch = async () => {
  console.log('Starting nightly batch...')
  
  // 1. Get all active users (logged in last 30 days)
  const activeUsers = await getActiveUsers()
  
  // 2. For each user, rebuild embedding from activity
  for (const userId of activeUsers) {
    await buildUserEmbedding(userId)
  }
  
  // 3. Compute recommendations for each user
  for (const userId of activeUsers) {
    const candidates = await getVectorCandidates(userId, 50)
    const ranked = await rerankWithAI(userId, candidates) // or mock
    await storePrecomputedRecs(userId, ranked)
  }
  
  // 4. Update trending scores
  await updateTrendingScores()
  
  console.log(`Batch complete. Processed ${activeUsers.length} users.`)
}
```

---

## 10. AI Error Handling & Fallbacks

### Never let AI failure break the UX
```typescript
// Every AI call is wrapped in try/catch with graceful fallback

const safeAnalyze = async (text: string): Promise<SubmissionAnalysis> => {
  try {
    return await aiService.analyzeSubmission({ text })
  } catch (error) {
    console.error('AI analysis failed:', error)
    // Fallback: allow manual submission without AI match
    return {
      confidence: 0,
      match: null,
      quality: { score: 50, label: 'fair', suggestions: [] },
      progressMessage: 'Συνέχισε χειροκίνητα →',
      fallback: true
    }
  }
}
```

### Fallback UI States
- AI analysis fails → show "Πρόσθεσέ το χειροκίνητα" with category selector
- Search AI fails → fall back to simple text search
- Recommendations fail → show trending/popular instead
- Embedding generation fails → skip personalization, show general feed

### Latency Budget
```
Submission analysis:    < 2000ms (user is typing, can wait)
Search pills:           < 100ms  (instant, regex-based)
Search full analysis:   < 800ms  (debounced 500ms + 300ms AI)
Recommendation serving: < 200ms  (pre-computed, just a DB read)
Embedding generation:   < 5000ms (background, not user-facing)
```

---

*This file governs all AI implementation decisions.
When in doubt: AI should be visible, fast, and never block the user.*

---

## 11. Metadata Enrichment APIs

> ✅ Admin-side wired across all 9 categories via `/api/admin/enrich`. User-facing submission: only **movies/series via TMDB** today. Books / food / bars / hotels / theater / events still fall back to local heuristic in `/api/ai/match` — same architecture, just need per-category branches.

### Admin-side (session 10)

`/api/admin/enrich` dispatches by category and returns up to 8 candidates (poster/backdrop URLs + title/subtitle/description). "✨ Auto-fetch cover" button in `SuggestionEditor` opens a modal grid → click to apply. All three APIs degrade gracefully if env keys missing (returns `{ candidates: [], reason }`). `scripts/bulk-enrich.js` walks items missing covers, picks the first candidate, updates `poster_url` + `backdrop_url` + `cover_url`.

### User-side movies/series (session 12)

`/api/ai/match?text=...` is the public match endpoint:
- Extracts candidate titles via `\p{Lu}` + `\p{L}` Unicode property classes (handles Greek + Latin), tries each against TMDB concurrently, scores by string similarity to the candidate.
- Stops Greek opening verbs ("Είδα") from beating real titles via TMDB's fuzzy matching.
- Returns canonical title (Greek-localized when TMDB has it), year, director, full cast with avatars, plot, runtime, poster, backdrop. `PreviewScreen` renders all of it.
- **Refuses to pretend** when TMDB returns nothing — "Δεν βρήκα τον τίτλο" instead of garbage in the DB.
- `/api/suggestions` writes the TMDB metadata into `items` (poster_url, backdrop_url, description_seo, metadata.tmdb_id) + `item_movies`/`item_series` (director, directors[], actors[] with avatars, plot, release_date, duration_min) on first publish. Admin's suggestion editor reads these columns — user submission appears in `/admin/suggestions` with full metadata, no admin work needed.

### API map

| Category | API | Cost | Key data |
|---|---|---|---|
| Movies / Series | TMDB | Free | Poster, director, cast, trailer, year, runtime; series adds seasons + network |
| Books | Google Books | Free | Cover, author, publisher, pages, ISBN |
| Food / Bars / Hotels | Google Places | Free tier ($200/mo credit) | Photos, hours, phone, address, price level |
| Theater / Events | Ticketmaster | Free tier | Poster, dates, venue, prices |
| Recipes | none | — | User-generated, no enrichment |

### Dispatch architecture (`lib/enrichment/index.ts`)

```typescript
enrichItem(category, match) → switch on category → enrichFromTMDB / GoogleBooks / GooglePlaces / Ticketmaster
safeEnrich(category, match) → wraps enrichItem in try/catch — NEVER blocks submission on failure
```

Implementation per provider lives at `lib/enrichment/{tmdb,googleBooks,googlePlaces,ticketmaster}.ts`. Standard pattern: search → details + credits/photos in parallel → return normalised shape `{externalId, coverUrl, ...categorySpecific}`.

### Quality coaching (session 12)

`lib/ai/quality.ts::assessQuality(text)` returns `{score, label, tip, badge}`. Real-time text analysis: length, "γιατί/why" markers, emotional language, specificity, sentence count. Drives the IntelligencePanel — tip becomes message, colored badge replaces bare progress %. Gemini implementation can populate the same shape — UI unchanged on swap.

### Env vars

```bash
TMDB_API_KEY=...              # themoviedb.org — free
GOOGLE_BOOKS_API_KEY=...      # console.cloud.google.com — free tier
GOOGLE_PLACES_API_KEY=...     # console.cloud.google.com — $200/month free credit
TICKETMASTER_API_KEY=...      # developer.ticketmaster.com — free tier
GEMINI_API_KEY=...            # aistudio.google.com — active provider
```

### UX during syncing

Rotate "Εμπλουτίζουμε τα στοιχεία…" / "Βρίσκουμε φωτογραφίες…" / "Φορτώνουμε πληροφορίες…" / "Σχεδόν έτοιμο…" in the SYNCING screen. Enrichment is timeboxed — if it doesn't finish in N seconds, publish anyway with what we have.

---

## 12. Provider decisions + cost model (Phase A shipped via Gemini)

Phase A originally planned around Anthropic Haiku 4.5; pivoted to **Gemini 2.5 Flash-Lite** in session 18 before Anthropic credits were activated. Implementation lives at `lib/ai/gemini.ts`. The original Anthropic decision rationale still applies (most of it is provider-agnostic) — the deltas vs. Haiku are: Gemini paid pricing is ~3× cheaper per call, free tier is hard-capped at 20 requests/day per project, and the Greek language quality has held up across our integration points.

### Provider decision summary (still load-bearing)

- **Why not self-hosted (Llama / Mistral / Meltemi):** Greek quality drops dramatically on 7-13B open models. Engineering setup 3-6 weeks. Server cost €200-800/mo doesn't pay back until ~50K DAU. **Revisit only at 50K+ DAU sustained.**
- **Why not fine-tuning:** Frontier providers don't expose it on self-serve tiers. Requires 10K+ labeled examples we don't have. RAG (runtime prompt context) achieves the same outcome for diverse tasks, faster to iterate.
- **Account plan:** Individual / pay-per-use credits, no monthly fee.

### Four integration points (all live)

1. **Search intent extraction** — replaces regex in `/api/search`. Solves transliteration (`νολαν` → Nolan, `leonardo di caprio` → DB lookup) + multi-word location resolution.
2. **Submission match** — augments `/api/ai/match`. LLM extracts candidate title from the full reflection, TMDB / Google Books / Places confirms. All categories supported.
3. **Reflection quality coach** — replaces `lib/ai/quality.ts` regex. 4 dimensions (WHY / SPECIFIC / EMOTIONAL / ACTIONABLE). Outputs `{ score, label, next_prompt }` for the IntelligencePanel.
4. **Conversational fallback** — replaces canned chip choices in the no-match mini-chat. Generates contextual clarifying questions.

### Cost framework

Original Haiku projections (preserved for sanity-checking the Gemini reality):

| Task | Input tokens | Output tokens | Cost/call (Haiku) |
|---|---|---|---|
| Search intent extraction | 180 cached + 10 user | 70 | $0.000378 |
| Submission match | 400 cached + 100 user | 120 | $0.001 |
| Quality coach (per call) | 150 cached + 50 user | 60 | $0.0004 |
| Conversational fallback | 600 cached + 200 user | 200 | $0.0016 |

At 100,000 DAU × 3 searches/day + 30K submissions/month under Haiku pricing: **~$3,520/month** (≈ €3,250). Gemini paid runs ~3× cheaper at our prompt sizes. AI as a % of projected revenue (€122K at 100K DAU): 1-3%. Healthy margin.

Scaling table:

| DAU | Haiku-pricing monthly | Gemini-pricing monthly |
|---|---|---|
| 1,000 | $30 | ~$10 |
| 10,000 | $350 | ~$120 |
| 100,000 | $3,520 | ~$1,200 |

### Caching (shipped — `lib/ai/cache-and-log.ts`)

Postgres `ai_query_cache` table keyed by `hash(provider|model|version|task|query)` with **30-day TTL**. `PROMPT_VERSION` constant (currently `v6`) is appended to the cache key — bump it on any prompt change to invalidate all prior entries cleanly. `ai_usage_log` records every call with token counts + latency for the `/admin/ai-usage` dashboard.

### Failure modes + safeguards (architectural — still apply for Gemini)

- **Provider down or rate-limited:** every call wrapped in try/catch with 8s timeout. On error → fall back to regex/mock. User sees same UI, degraded intelligence.
- **Free-tier quota exhaustion (current operational blocker):** Gemini Flash-Lite free tier caps at 20 req/day per project. When hit, `analyzeSearchQuery` returns `{categories:[]}` and the route falls through to title-only matching. Enable billing at https://aistudio.google.com to lift.
- **Cost spike defense (deferred — when needed):** per-user rate limit via Postgres counter table, 429 with friendly Greek message.
- **Hallucination prevention:** LLM only suggests queries; DB is source of truth. We run the actual SQL query the LLM proposes. Empty results surface as honest empty states — never invent. This grounding pattern prevents 99% of hallucination problems.
- **Privacy:** user queries go to the LLM provider. Privacy policy mentions this. No personal identifiers (user_id, email) attached. Providers we use don't train on API data by default.

### Decision log

| Decision | Choice | Reason | Date |
|---|---|---|---|
| Provider | Anthropic Haiku 4.5 → **Gemini 2.5 Flash-Lite** | Greek quality + cost + speed; Gemini paid is ~3× cheaper per call than Haiku, decision pivoted before Anthropic credits were activated | 2026-05-05 / 2026-05-09 |
| Self-hosted? | No, until 50K+ DAU | Greek quality drop on small open models | 2026-05-05 |
| Fine-tune? | No, ever | RAG > fine-tune for diverse tasks | 2026-05-05 |
| First integration | Search intent | Highest UX impact | 2026-05-05 |
| Cache strategy | Provider native + Postgres (30-day) | Layered, both cheap | 2026-05-05 |

---

## 13. Search v2 — additional implementation reference

> Architecture + behaviour invariants live in CLAUDE.md §27. This section keeps the parts AI.md is the natural home for: the full TypeScript schema, the `tokenMatches` body, the people-search column list, and the outstanding data gaps.

### 13.1 Extended `SearchAnalysis` schema

`types/index.ts`:

```typescript
export interface SearchAnalysis {
  intent: string;
  vibe: string | null;
  type: string | null;       // venue establishment / cuisine / hint
  location: string | null;
  categories: CategorySlug[];
  query: string;
  // Extended (session 17):
  genre?: string | null;     // canonical subcategory name ("Κωμωδία", "Animation")
  channel?: string | null;   // "Netflix" / "HBO" / "Mega" / …
  status?: "completed" | "ongoing" | null;  // series only
  period?: string | null;    // "summer" / "december" / "weekend"
  duration_min?: number | null;  // minutes
  duration_max?: number | null;  // minutes
  person?: string | null;    // actor / director / writer / performer
  decade?: string | null;    // legacy, still used
  price?: "budget" | "mid" | "high" | null;  // legacy
}
```

Prompt-version `v6` (in `lib/ai/cache-and-log.ts`). Bump on any prompt change to flush cache entries.

### 13.2 `tokenMatches` — Greek inflection

Asymmetric match used for cuisine / type / subcategory-name comparisons:

```typescript
function tokenMatches(token: string, target: string): boolean {
  if (token === target) return true;
  if (target.includes(token)) return true;              // broadens query
  let i = 0;
  while (i < token.length && i < target.length && token[i] === target[i]) i++;
  return i >= 4 && i >= Math.min(token.length, target.length) - 2;
  // NOT a match: token.includes(target) — don't broaden longer queries
}
```

- `tokenMatches("ταβέρνα", "ψαροταβέρνα")` → true (target longer)
- `tokenMatches("ιταλικο", "ιταλικη")` → true (common prefix 6 of 7)
- `tokenMatches("μπακαλοταβερνα", "ταβερνα")` → **false** (token longer, asymmetric rule)

### 13.4 People-search v2

`fetchPeopleMatches` runs **both raw and accent-folded** variants through every ilike (Postgres ilike is case-insensitive but NOT accent-insensitive). Covers:

- `item_movies.actors` (jsonb cast to text) + `item_movies.director`
- `item_series.actors` + `item_series.director`
- `item_books.writer`
- `item_theater.actors` + `item_theater.director` + `item_theater.writer`  ← session-17 addition
- `item_events.performers` (jsonb)  ← session-17 addition

Dedup by `item_id`. People hits in the venue branch are kept only when their category is in `venueCatsForFilter`.

### 13.5 Period → month-set

`periodToMonths(period)` returns a `Set<number>` of month indices. `summer` → `{5,6,7}`. `december` → `{11}`. Year-agnostic — an event matches "summer concerts" if any of its scheduled dates falls in June-August, regardless of which year. This correctly surfaces both archival and forward-looking events. `weekend` is a separate day-of-week predicate.

### 13.6 7 example queries — status as of session 17

| Query | Status | Notes |
|---|---|---|
| κωμωδίες netflix | ✅ Works | genre + channel structured filter |
| παιδικά κάτω από 90 λεπτά | ✅ Works | genre alias → Animation, duration_max range |
| θέατρο μπέζος | ⚠ Data gap | Code finds theater plays via people search, but no theater item in DB has "Μπέζος" in `actors` |
| ολοκληρωμένες σειρές | ✅ Works | status=completed → `end_date IS NOT NULL` |
| sebastian fitzek | ✅ Works | People search hits `item_books.writer` |
| συναυλίες καλοκαίρι αττική | ⚠ Data gap | No `item_events.event_type` matches "συναυλία" in DB |
| ιταλικό βόρεια προάστια | ⚠ Data gap | location resolves correctly; no `item_food.cuisine` matches "ιταλικ" in DB |

Action: admin populates the missing data, no further code work needed.

### 13.7 Multi-language titles

Migration 020 adds `items.original_title` (e.g. "Lucifer" for the Greek-stored "Λούσιφερ"). The search route ilikes both `title_normalized` and `original_title_normalized` (generated accent-folded columns) so users find items in either language. Triple-fallback `or(...)` query so the route still works on environments where migration 020 isn't applied.

