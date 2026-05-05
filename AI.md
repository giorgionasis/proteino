# Proteino — AI Implementation Guide

This file documents exactly how AI is implemented across the entire Proteino ecosystem.
AI is a visible, functional feature — not decoration. Every AI interaction must feel alive.
Place this file in the project root alongside CLAUDE.md and HOOKS.md.

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

### Overview
User types freely → AI analyzes in real-time → identifies item + category → enriches with metadata → user previews → publishes.

### Input Modes
The submission accepts 4 types of input:
- **Text** — free description ("I want to add dune two a very good movie")
- **Scan** — camera scan of book/movie cover (OCR → text → analyze)
- **Link** — URL paste (scrape title/metadata → analyze)
- **Voice** — speech to text → analyze
- **List** — bulk paste (multiple items at once)

### State Machine
```
IDLE → LISTENING → ANALYZING → MATCHED → LOCKED → SYNCING → PREVIEW → PUBLISHED
                                        ↓
                                    NO_MATCH → SUGGEST_MANUAL
```

### Real-Time Analysis Flow
```typescript
// hooks/useSubmission.ts

// Trigger analysis after user stops typing for 600ms (debounce)
// Do NOT wait for user to finish — analyze as they type

const analyzeDebounced = debounce(async (text: string) => {
  if (text.length < 10) return updateState({ pct: 5, msg: "Keep going..." })
  
  const analysis = await aiService.analyzeSubmission({ text })
  
  if (analysis.confidence > 0.85) {
    updateState({
      state: 'MATCHED',
      pct: 100,
      match: analysis.match,
      category: analysis.category,
      quality: analysis.quality,
      msg: `Description quality is ${analysis.quality.label}. Metadata found.`
    })
    // Enable "Verify with AI" button
  } else if (analysis.confidence > 0.4) {
    updateState({
      pct: Math.round(analysis.confidence * 100),
      msg: analysis.progressMessage, // "Detecting category...", "Analyzing context..."
    })
  }
}, 600)
```

### SubmissionAnalysis Type
```typescript
interface SubmissionAnalysis {
  confidence: number          // 0-1, how sure the AI is
  match: {
    title: string
    category: Category
    externalId?: string       // TMDB id, ISBN, Google Places id etc.
    coverUrl?: string
    metadata: CategoryMetadata
  } | null
  quality: {
    score: number             // 0-100
    label: 'poor' | 'fair' | 'good' | 'excellent'
    suggestions: string[]     // e.g. ["Add why you recommend it", "Too short"]
  }
  progressMessage: string     // Human-readable status for the UI panel
  alternativeMatches?: Match[] // If confidence is medium, show alternatives
}
```

### Quality Scoring Logic (Mock → Real)
```typescript
// Mock implementation scores based on text length + keywords
// Real implementation uses LLM to evaluate:
// - Does it explain WHY they recommend it? (most important)
// - Is it specific enough to identify the item?
// - Does it add value beyond what metadata provides?
// - Is it authentic/personal vs generic?

const QUALITY_THRESHOLDS = {
  poor:      { min: 0,  max: 25  }, // "good movie"
  fair:      { min: 25, max: 50  }, // "really good movie with great acting"
  good:      { min: 50, max: 75  }, // "amazing cinematography, Nolan at his best"
  excellent: { min: 75, max: 100 }, // Personal story + specific details + emotion
}
```

### Metadata Enrichment (Syncing Phase)
After match confirmed, fetch rich metadata from external APIs:
```typescript
// lib/enrichment/index.ts
const enrichers = {
  movie:   () => fetchFromTMDB(match.externalId),
  series:  () => fetchFromTMDB(match.externalId),
  book:    () => fetchFromGoogleBooks(match.externalId),
  food:    () => fetchFromGooglePlaces(match.externalId),
  bar:     () => fetchFromGooglePlaces(match.externalId),
  hotel:   () => fetchFromBookingAPI(match.externalId),
  recipe:  () => null, // user-generated, no external enrichment
  theater: () => fetchFromTicketmaster(match.externalId),
  event:   () => fetchFromTicketmaster(match.externalId),
}
```

### No Match Fallback
```typescript
// If AI cannot identify the item:
if (!analysis.match) {
  updateState({
    state: 'NO_MATCH',
    msg: "Δεν μπόρεσα να αναγνωρίσω αυτό που περιγράφεις.",
    fallback: {
      action: 'MANUAL_ENTRY',
      cta: 'Πρόσθεσέ το χειροκίνητα →',
      // Open category selector + manual form
    }
  })
}
```

### ProteínoIntelligence Panel Messages
The panel must feel alive. Use varied, contextual messages:

```typescript
const PANEL_MESSAGES = {
  idle:       ["I'm listening. Tell me what you experienced."],
  analyzing:  [
    "Keep going, I'm analyzing context...",
    "Detecting category...",
    "Searching the database...",
    "Processing your description...",
  ],
  nearMatch: [
    "Almost there...",
    "Finalizing match...",
    "Cross-referencing metadata...",
  ],
  matched: [
    "Description quality is excellent. Metadata found.",
    "Perfect match found. Ready to verify.",
  ],
  searching: { // Search-specific
    nightlife: "Scanning nightlife graph for matches...",
    food:      "Searching restaurant database...",
    movies:    "Browsing film catalog...",
    books:     "Searching library...",
    default:   "Analyzing semantic intent...",
  }
}
```

---

## 3. Smart Search AI

### Overview
User types natural language → AI parses intent in real-time → extracts semantic tags (pills) → searches database → shows results BEFORE AI finishes → handles no-match gracefully.

### Search Analysis Flow
```typescript
// hooks/useSearch.ts

// Trigger on EVERY keystroke (no debounce for pills)
// Trigger full search on 500ms debounce
const handleInput = async (query: string) => {
  // 1. Instant: extract pills from query (regex + simple NLP)
  const quickPills = extractPillsInstant(query)
  updatePills(quickPills)
  
  // 2. Start showing results immediately (skeleton cards)
  if (query.length > 3) showSkeletonResults()
  
  // 3. Debounced: full AI analysis + search
  debouncedSearch(query)
}

const debouncedSearch = debounce(async (query: string) => {
  // AI analysis in parallel with DB search
  const [analysis, quickResults] = await Promise.all([
    aiService.analyzeSearchQuery(query),
    searchDatabase(extractPillsInstant(query)) // fast, no AI
  ])
  
  // Show quick results first
  updateResults(quickResults)
  
  // Then enhance with AI-ranked results
  const rankedResults = await rerankWithAI(analysis, quickResults)
  updateResults(rankedResults)
  updatePills(analysis.pills)
  updatePanelMessage(analysis.message, analysis.pct)
}, 500)
```

### SearchAnalysis Type
```typescript
interface SearchAnalysis {
  pills: SearchPill[]          // Extracted semantic tags
  intent: SearchIntent         // What the user is looking for
  pct: number                  // Analysis progress 0-100
  message: string              // Panel message
  hasDirectMatches: boolean
  fallbackMessage?: string     // If no matches: "No jazz bars in Chalandri"
  fallbackResults?: Item[]     // Smart alternatives
}

interface SearchPill {
  type: 'VIBE' | 'TYPE' | 'LOC' | 'TIME' | 'PRICE' | 'PLATFORM'
  value: string                // e.g. "JAZZ", "BAR", "CHALANDRI"
  confidence: number
}

// Examples:
// "a jazz bar in chalandri" →
//   pills: [VIBE:JAZZ, TYPE:BAR, LOC:CHALANDRI]
//   intent: { category: 'bar', location: 'Chalandri', vibe: 'jazz' }

// "sci-fi series with one season on netflix" →
//   pills: [VIBE:SCI-FI, TYPE:SERIES, PLATFORM:NETFLIX]
//   intent: { category: 'series', genre: 'sci-fi', seasons: 1, platform: 'netflix' }

// "romantic dinner athens under 40 euros" →
//   pills: [VIBE:ROMANTIC, TYPE:FOOD, LOC:ATHENS, PRICE:<40€]
//   intent: { category: 'food', vibe: 'romantic', location: 'Athens', maxPrice: 40 }
```

### Instant Pill Extraction (No AI needed)
```typescript
// lib/search/pillExtractor.ts
// Fast regex-based extraction that runs on every keystroke

const PILL_PATTERNS = {
  VIBE: {
    jazz: /jazz/i,
    romantic: /ρομαντικ|romantic/i,
    rooftop: /rooftop|ταράτσα/i,
    cozy: /cozy|ζεστ|άνετ/i,
    'sci-fi': /sci.?fi|επιστημονικ/i,
    classic: /κλασικ|classic/i,
    // ... more vibes
  },
  TYPE: {
    bar: /bar|μπαρ/i,
    restaurant: /εστιατόρι|restaurant|φαγητό|food/i,
    series: /σειρ|series/i,
    movie: /ταινί|movie|film/i,
    book: /βιβλί|book/i,
    hotel: /ξενοδοχ|hotel|διαμον/i,
    // ... more types
  },
  LOC: {
    // Greek cities and neighborhoods
    athens: /αθήνα|athens/i,
    chalandri: /χαλάνδρι|chalandri/i,
    kolonaki: /κολωνάκι/i,
    // ... more locations
  },
  PLATFORM: {
    netflix: /netflix/i,
    hbo: /hbo/i,
    'apple tv': /apple tv/i,
    // ... more platforms
  }
}
```

### No-Match Handling (Never a Dead End)
```typescript
// Always show something — never an empty screen
const handleNoMatch = (query: string, pills: SearchPill[]) => {
  // Strategy 1: Expand location radius
  // "No jazz bars in Chalandri" → show jazz bars in Athens
  
  // Strategy 2: Relax one constraint at a time
  // "No romantic italian in Glyfada" → show romantic restaurants in Glyfada
  
  // Strategy 3: Show what exists nearby
  // "No jazz bars in Chalandri" → show best bars in Chalandri
  
  // Strategy 4: Suggest submission
  // "Be the first to suggest a jazz bar in Chalandri →"
  
  return {
    message: buildNoMatchMessage(query, pills),
    // e.g. "Δεν βρέθηκαν jazz bars στο Χαλάνδρι."
    fallbackResults: getFallbackResults(pills),
    submissionCTA: {
      text: `Πρόσθεσε "${query}" πρώτος →`,
      prefillText: query // pre-fills the submission textarea
    }
  }
}
```

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

## 6. Mock AI Implementation

Until real AI provider is available, all AI responses are mocked.
Mocks must be realistic — they define the UX.

```typescript
// lib/ai/mock.ts

export class MockAIService implements AIService {
  
  async analyzeSubmission(input: SubmissionInput): Promise<SubmissionAnalysis> {
    // Simulate realistic latency
    await delay(800 + Math.random() * 400)
    
    const text = input.text.toLowerCase()
    
    // Simple keyword matching for demo
    if (text.includes('dune') || text.includes('interstellar')) {
      return {
        confidence: 0.95,
        match: {
          title: text.includes('dune') ? 'Dune: Part Two' : 'Interstellar',
          category: 'movie',
          metadata: { year: 2024, director: 'Denis Villeneuve' }
        },
        quality: this.scoreQuality(text),
        progressMessage: 'Match found!'
      }
    }
    
    // Generic medium confidence response
    return {
      confidence: text.length > 30 ? 0.6 : 0.2,
      match: null,
      quality: this.scoreQuality(text),
      progressMessage: text.length > 30 
        ? 'Analyzing context...' 
        : 'Keep going...'
    }
  }
  
  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    await delay(300)
    
    return {
      pills: extractPillsInstant(query), // uses regex, always works
      intent: parseIntent(query),
      pct: Math.min(query.length * 3, 100),
      message: getProgressMessage(query),
      hasDirectMatches: query.length > 5,
    }
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Return random 1536-dim vector for testing
    return Array.from({ length: 1536 }, () => Math.random() - 0.5)
  }
  
  private scoreQuality(text: string): QualityScore {
    const score = Math.min(text.length / 2, 100)
    return {
      score,
      label: score < 25 ? 'poor' : score < 50 ? 'fair' : score < 75 ? 'good' : 'excellent',
      suggestions: score < 50 ? ['Πρόσθεσε γιατί το προτείνεις'] : []
    }
  }
}
```

---

## 7. Real AI Integration (When Ready)

### Anthropic Claude Implementation
```typescript
// lib/ai/anthropic.ts

export class AnthropicAIService implements AIService {
  private client: Anthropic
  
  async analyzeSubmission(input: SubmissionInput): Promise<SubmissionAnalysis> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are Proteino's submission analyzer. 
        Identify what item the user is describing (movie, book, restaurant, etc).
        Return JSON only: { confidence, match: { title, category, year? }, quality: { score, label, suggestions } }`,
      messages: [{ role: 'user', content: input.text }]
    })
    
    return JSON.parse(response.content[0].text)
  }
  
  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `Extract search intent from natural language queries for a recommendation platform.
        Return JSON only: { pills: [{type, value}], intent: {...}, message: string }`,
      messages: [{ role: 'user', content: query }]
    })
    
    return JSON.parse(response.content[0].text)
  }
}
```

### Environment Variables Needed
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...          # When ready
OPENAI_API_KEY=sk-...                  # Alternative
TMDB_API_KEY=...                       # Movies + Series metadata
GOOGLE_BOOKS_API_KEY=...               # Books metadata
GOOGLE_PLACES_API_KEY=...              # Food, Bars, Hotels
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
> ✅ SHIPPED (session 12) — Admin-side AND user-facing for movies/series via TMDB. Other categories (books / food / bars / hotels / theater / events) follow the same architecture; not yet wired for user-side.

**Admin-side (session 10):**
- `/api/admin/enrich` endpoint dispatches by category and returns up to 8 candidates (poster/backdrop URLs + title/subtitle/description)
- "✨ Auto-fetch cover" button in `SuggestionEditor` opens a modal with a grid of candidates → click to apply
- All three APIs degrade gracefully if env keys missing (returns `{ candidates: [], reason }`)
- `scripts/bulk-enrich.js` walks items missing covers, calls the endpoint, picks the first candidate, updates `poster_url` + `backdrop_url` + `cover_url`

**User-side (session 12) — movies/series via TMDB:**
- `/api/ai/match?text=...` is the public match endpoint. Used by the (still-named) `MockAIService.analyzeSubmission` instead of pure local heuristics.
- Extracts candidate titles via `\p{Lu}` + `\p{L}` Unicode property classes (handles Greek + Latin), tries each against TMDB concurrently, scores results by string similarity to the candidate, picks the highest score. Stops Greek opening verbs ("Είδα") from beating real titles via TMDB's fuzzy matching.
- Returns canonical title (Greek-localized when TMDB has it), year, director, full cast with avatars, plot, runtime, poster, backdrop. PreviewScreen renders all of it.
- When TMDB returns nothing, refuses to pretend — shows "Δεν βρήκα τον τίτλο" instead of shipping garbage to the DB.
- `/api/suggestions` writes the full TMDB metadata into `items` (poster_url, backdrop_url, description_seo, metadata.tmdb_id) + `item_movies`/`item_series` (director, directors[], actors[] with avatars, plot, release_date, duration_min) on first publish. Admin's existing suggestion editor reads these columns, so a user submission appears in `/admin/suggestions` with full metadata, no admin work needed.

**Quality coaching (session 12):**
- `lib/ai/quality.ts::assessQuality(text)` returns `{score 0-100, label poor|fair|good|excellent, tip, badge}`
- Real-time text analysis: length, "γιατί/why" markers, emotional language, specificity, sentence count
- Drives the ProteínoIntelligence panel: tip becomes message, colored badge replaces bare progress %
- Same shape real Anthropic Claude will populate later — swap implementation, UI doesn't change

**Still pending:**
- **Books** via Google Books, **Food/Bars/Hotels** via Google Places, **Theater/Events** via Ticketmaster — same `/api/ai/match` architecture, just need the per-category branches
- Real Anthropic Claude integration: `lib/ai/anthropic.ts` implementing the same `AIService` interface. Mock+TMDB hybrid is good enough for dev; swap when going to production scale.

### API Map

| Category | API | Free? | Key Data |
|---|---|---|---|
| Movies | TMDB (themoviedb.org) | ✅ Free | Poster, director, cast, trailer, year, runtime |
| Series | TMDB | ✅ Free | Poster, seasons, cast, network, status |
| Books | Google Books API | ✅ Free | Cover, author, publisher, pages, ISBN |
| Food | Google Places API | 💰 Free tier | Photos, hours, phone, address, price level |
| Bars/Cafes | Google Places API | 💰 Free tier | Photos, hours, phone, address |
| Hotels | Google Places API | 💰 Free tier | Photos, stars, amenities, address |
| Theater | Ticketmaster API | ✅ Free tier | Poster, dates, venue, prices |
| Events | Ticketmaster API | ✅ Free tier | Poster, dates, venue, prices |
| Recipes | None | — | User-generated, no enrichment |

### Implementation
```typescript
// lib/enrichment/index.ts
export const enrichItem = async (category: Category, match: AIMatch) => {
  switch(category) {
    case 'movie':   return enrichFromTMDB(match, 'movie')
    case 'series':  return enrichFromTMDB(match, 'tv')
    case 'book':    return enrichFromGoogleBooks(match)
    case 'food':    
    case 'bar':     
    case 'hotel':   return enrichFromGooglePlaces(match)
    case 'theater': 
    case 'event':   return enrichFromTicketmaster(match)
    case 'recipe':  return {}
    default:        return {}
  }
}

// NEVER block submission on enrichment failure
export const safeEnrich = async (category: Category, match: AIMatch) => {
  try {
    return await enrichItem(category, match)
  } catch (error) {
    console.error('Enrichment failed — continuing without metadata:', error)
    return {}
  }
}
```

### TMDB (Movies + Series)
```typescript
// lib/enrichment/tmdb.ts
const enrichFromTMDB = async (match: AIMatch, type: 'movie' | 'tv') => {
  const { results } = await fetch(
    `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(match.title)}&api_key=${process.env.TMDB_API_KEY}`
  ).then(r => r.json())
  
  const item = results[0]
  const [details, credits] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${type}/${item.id}?api_key=${process.env.TMDB_API_KEY}`).then(r => r.json()),
    fetch(`https://api.themoviedb.org/3/${type}/${item.id}/credits?api_key=${process.env.TMDB_API_KEY}`).then(r => r.json()),
  ])

  return {
    externalId: String(item.id),
    coverUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    backdropUrl: `https://image.tmdb.org/t/p/w500${item.backdrop_path}`,
    year: new Date(item.release_date || item.first_air_date).getFullYear(),
    runtime: details.runtime || details.episode_run_time?.[0],
    genres: details.genres.map((g: any) => g.name),
    director: credits.crew?.find((c: any) => c.job === 'Director')?.name,
    cast: credits.cast?.slice(0, 5).map((c: any) => c.name),
    description: item.overview,
    seasons: details.number_of_seasons,
    network: details.networks?.[0]?.name,
  }
}
```

### Google Books
```typescript
// lib/enrichment/googleBooks.ts
const enrichFromGoogleBooks = async (match: AIMatch) => {
  const { items } = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(match.title)}&key=${process.env.GOOGLE_BOOKS_API_KEY}`
  ).then(r => r.json())
  
  const book = items[0].volumeInfo
  return {
    coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:'),
    author: book.authors?.[0],
    publisher: book.publisher,
    pageCount: book.pageCount,
    isbn: book.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier,
    description: book.description,
    publishedDate: book.publishedDate,
  }
}
```

### Google Places (Food, Bars, Hotels)
```typescript
// lib/enrichment/googlePlaces.ts
const enrichFromGooglePlaces = async (match: AIMatch) => {
  const { candidates } = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(match.title)}&inputtype=textquery&fields=place_id&key=${process.env.GOOGLE_PLACES_API_KEY}`
  ).then(r => r.json())
  
  const { result } = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidates[0].place_id}&fields=name,rating,photos,formatted_address,formatted_phone_number,opening_hours,website,price_level&key=${process.env.GOOGLE_PLACES_API_KEY}`
  ).then(r => r.json())

  return {
    externalId: candidates[0].place_id,
    coverUrl: result.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${result.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
      : null,
    address: result.formatted_address,
    phone: result.formatted_phone_number,
    website: result.website,
    openingHours: result.opening_hours?.weekday_text,
    priceLevel: result.price_level,
    googleRating: result.rating,
  }
}
```

### UX Messages During Syncing
```typescript
const SYNCING_MESSAGES = [
  "Εμπλουτίζουμε τα στοιχεία...",
  "Βρίσκουμε φωτογραφίες...",
  "Φορτώνουμε πληροφορίες...",
  "Σχεδόν έτοιμο...",
]
```

### Env Vars (add to .env.local when implementing)
```bash
TMDB_API_KEY=...              # themoviedb.org — free
GOOGLE_BOOKS_API_KEY=...      # console.cloud.google.com — free tier
GOOGLE_PLACES_API_KEY=...     # console.cloud.google.com — $200/month free credit
TICKETMASTER_API_KEY=...      # developer.ticketmaster.com — free tier
```

