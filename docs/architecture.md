# Architecture

Deep-dive on schema, AI layer, search, recommendations, layout system, and integration plans. Read sections on demand — CLAUDE.md carries the briefing-level summary.

---

## Database

### Schema topology

Two Supabase schemas:
- **`public`** — online, real-time. Users, items, suggestions, reviews, bookmarks, follows, notifications, achievements/badges, devices, categories, regions, page_sections, related_sections_config, content_reports, moments, etc.
- **`analytics`** — offline batch. user_embeddings, item_embeddings, activity_log, precomputed_recs, search_log, ai_usage_log, ai_query_cache.

`pgvector` extension provisioned. `embedding vector(1536)` column exists on both `items` and `users`.

### Hybrid base + extension tables

Every category shares a single `items` row + a category-specific row in `item_<category>`:

```
items                          — base table for all 9 categories
├── item_movies                — director, duration_min, release_date, country, language,
│                               channel, plot, actors jsonb, awards jsonb
├── item_series                — + seasons int, end_date
├── item_books                 — writer, publication, language, pages, plot,
│                               is_trilogy, trilogy_name, original_title (mig 020)
├── item_food                  — cuisine, type, address, lat/lng, delivery_links jsonb,
│                               external_ratings jsonb, information jsonb (amenities, price_level)
├── item_recipes               — yields, calories, origin, level, channel,
│                               duration jsonb, nutrition jsonb, ingredients jsonb, steps jsonb
├── item_bars                  — type, address, lat/lng, information jsonb
├── item_hotels                — type, address, lat/lng, price_range, facilities jsonb
├── item_theater               — name_place, address, lat/lng, type, writer, director,
│                               dates jsonb, actors jsonb
└── item_events                — name_place, address, event_type, dates jsonb,
                                performers jsonb
```

`items` carries: `id, category, title, slug, description_seo, cover_url, poster_url, backdrop_url, subcategory_id, avg_rating, rating_count, suggestion_count, is_published, embedding, created_at, modified_at, images jsonb, original_title (mig 020), title_normalized + original_title_normalized (generated, accent-folded)`.

**Why hybrid:** cross-category AI search/recs run a single query against `items` (one index, one ranking). Adding a category = one new extension table; touching shared fields = one column on `items`. The alternative (one giant table with nullable fields per category) loses type safety and forces every category-specific filter to JS-side.

### Core tables

```
users           id, email, handle, display_name, role (user|admin),
                points, level, suggestion_count, rating_count,
                avg_quality_score, embedding, is_private, is_verified,
                preferences jsonb (onboarded_at, interests, notifications),
                admin_warnings jsonb (mig 039)

suggestions     id, user_id, item_id, reflection, rating (initial),
                ai_quality_score, ai_match_data jsonb,
                content_hash (immutable, proof of authorship),
                is_published, hidden_at/by/reason
                (1 per item — first submitter's text)

reviews         id, user_id, item_id, rating SMALLINT 1..5,
                reflection text NULL, vote_up, vote_down, report_count,
                is_hidden, hidden_at/by/reason
                UNIQUE (user_id, item_id)
                (mig 016 — single source of truth for user-on-item interactions)

review_votes    user_id, review_id, vote SMALLINT (-1, 1)
                trigger trg_sync_review_votes keeps reviews.vote_up/down in sync
                self-vote blocked at API

bookmarks       id, user_id, item_id, category, status (wishlist|done),
                created_at (mig 023 adds status, mig 025 GRANT+UPDATE policy fix)

follows         id, follower_id, following_id

notifications   id, user_id, type, name, payload jsonb,
                email_enabled, push_enabled, is_read

categories      legacy CMS catalog table (not the runtime resolver — see category_meta)
category_meta   slug PK, display_label_el, icon, display_order,
                is_nav_published, modified_at/by (mig 041)

subcategories   id, name, slug, category, description_seo, display_order,
                is_published

regions         id, name, slug, parent_id (self-referential), display_order
                — N-level tree

content_reports id, target_type ('comment'|'suggestion'|'review' since mig 035),
                target_id, reporter_id, reason, description text NOT NULL,
                resolved, resolution_action ('kept'|'hidden'),
                resolution_note (required ≥5 chars), resolved_by, resolved_at
                UNIQUE (reporter_id, target_type, target_id, reason)
                (mig 015)

page_sections   id, section_type (collection|widget|divider), collection_id,
                widget_key, context (home|category|suggestions), category,
                display_order, audience (all|registered|guest),
                config jsonb, is_active, valid_from/until
                (mig 032+033 — DB-driven page composition)

related_sections_config
                id, category, field (path: 'writer', 'actors[0].name', etc),
                title_template, min_items, item_limit, display_order, is_active
                UNIQUE (category, field) (mig 034)

moments         id, trigger_event, predicate_key, predicate_args jsonb,
                copy jsonb (title, body, label_line1/2, etc), display jsonb,
                cooldown_seconds, is_active

collections     id, slug, alias, source_category, tags jsonb,
                filters jsonb, item_limit, manual_item_ids jsonb (mig 042),
                is_published, modified_at/by

category_filters
                id, category, filter_id, label, widget, placeholder,
                options jsonb, is_quick, is_published, display_order

search_log      query, normalized, user_id, category, region_id,
                was_no_match (powers latent-intent notification loops)

ai_usage_log    task, provider, model, query_text, input/output_tokens,
                latency_ms, cache_hit (mig 019)

ai_query_cache  cache_key (sha256), task, query_text, result jsonb,
                hit_count, last_hit_at (30-day TTL)
```

### Legacy tables (frozen, no longer written or read)

- `ratings` — replaced by `reviews` (mig 016 wiped clean). Drop candidate once archive confirmed unwanted.
- `comments` — 343 K2 rows kept for archive (`/admin/legacy-comments`). All write paths deleted in session 23.

### Image schema

`items.images` jsonb is dual-shape — see CLAUDE.md "Item images" invariant. Modern shape:

```json
{
  "poster":   { "s": "...", "m": "...", "l": "...", "xl": "..." },
  "backdrop": { "s": "...", "m": "...", "l": "...", "xl": "..." },
  "og":       "...jpg",
  "gallery":  [{ "url": "...", "tab": "...", "alt": "...", "isDefault": false }]
}
```

`poster` portrait 2:3 for movies/series/books, `backdrop` landscape 16:9 for venues/recipes. `og` always 1200×630 for social cards. `gallery` is admin-uploaded extras. Pipeline auto-generates size variants via Sharp on upload. See design-system.md "Image pipeline".

---

## AI service layer

### Abstraction

`lib/ai/index.ts` defines:

```ts
interface AIService {
  analyzeSearchQuery(query: string): Promise<SearchAnalysis>
  analyzeSubmission(text: string): Promise<SubmissionAnalysis>
  scoreDescriptionQuality(text: string): Promise<number>
  generateEmbedding(text: string): Promise<number[]>
  rerankRecommendations(userId: string, candidates: Item[]): Promise<Item[]>
  extractInterests?(text: string): Promise<string[] | null>
  getSemanticQualityTip?(text: string, category?: string): Promise<string | null>
  conversationalSearchFallback?(query: string, hint?: string): Promise<string | null>
}
```

Implementations:
- `lib/ai/gemini.ts` — `GeminiAIService` via Vercel AI Gateway. Uses `generateObject` + `gateway()`. Model `google/gemini-2.5-flash-lite`, embedding `google/text-embedding-004`.
- `lib/ai/mock.ts` — for tests / offline dev.

### Cache + usage logging

`lib/ai/cache-and-log.ts:wrapWithCacheAndLog(inner)` wraps any provider. Per call:
- **Read** `ai_query_cache` by `sha256(provider|model|PROMPT_VERSION|task|query)`. 30-day TTL. Hit → return cached, increment hit_count.
- **Miss** → call inner, write cache + log `ai_usage_log` row.

**`PROMPT_VERSION` is the cache-buster.** Bump it on any prompt change in `gemini.ts`. Currently `v17` (search v3, session 36).

### Submission prompt — what Gemini extracts

```
title · category · confidence · year_hint · actor_hint · director_hint ·
mood · english_title_hint · english_author_hint · location_hint
```

`english_title_hint` + `english_author_hint` drive the Google Books fallback tier when Greek-script queries return empty. `location_hint` (venues only) gives Google Places a disambiguator for same-name venues.

### Search prompt — v3 structured-attribute extraction

`SearchAnalysis` carries (all optional, all nullable):

```
intent · vibe · type · location · categories[] · query ·
genre · channel · status · period · person · decade · price ·
duration_min/max · amenities[] · seasons · has_awards · diet[] · when ·
language · country · level · origin · pages_min/max · calories_min/max ·
yields_min/max · is_trilogy
```

Per-field rules in `SEARCH_PROMPT` (gemini.ts:34-146) with Greek + English aliases. `taxonomy.ts:getTaxonomy()` injects canonical DB values at runtime (categories, subcategories, cuisines, types per venue, top-level regions, amenity vocabulary) — 5-min cache.

**Amenity vocabulary** in `taxonomy.ts:159-162` must mirror migration 044 byte-for-byte. Drift = silent search miss. Open follow-up: read from `category_filters` rows on prompt assembly.

### Decisions locked

| Decision | Choice | Reason |
|---|---|---|
| Provider | Gemini 2.5 Flash Lite (search/submission) · Haiku planned (rerank) | Greek quality + cost + speed |
| Self-hosted? | No until 50K+ DAU | Greek quality drop on 7-13B open models, 3-6w setup, eng cost |
| Fine-tune? | Never | RAG > fine-tune for diverse tasks |
| Routing | Vercel AI Gateway | Unified observability + zero-data-retention + fallback |
| Plan | Anthropic Individual + pay-per-use credits | $20 starter, $30/mo soft cap |
| Cost target | 3-5% of revenue | At 100K DAU: ~$3.5K cost vs ~€122K revenue projected |
| Cache TTL | 30 days | Long enough to amortize popular queries, short enough to refresh |

---

## Search (v3)

`app/api/search/route.ts` — ~1700 lines, dense. Read it before extending.

### Pipeline

1. **Gemini extraction** — `getAIService().analyzeSearchQuery(q)` returns `SearchAnalysis`. Single source of truth. Regex extraction only as emergency fallback when LLM hard-errors.
2. **Category resolution** — Gemini's `categories[]` (preferred) → regex `extractCategories` → empty (no auto-expand).
3. **Location resolution** — `resolveLocation(q)` walks `regions` tree, multi-word match required for compound names (Βόρεια Προάστια), returns `{id, name, slug, descendantIds[]}`. Token-overlap sanity check against the user's query (Gemini occasionally inverts directions).
4. **Branch:**
   - **Venue branch** (food/bars/hotels/theater/events) — pulls candidates per category (up to 800/cat when refinement tokens present, 60/cat for bare browse), then JS-filters by address (location tokens) + title/cuisine/type (refinement tokens via `tokenMatches`). When a title-anchor is found, surfaces contextually-similar Tier A (same type + nearby address) with Tier B fallback (same type anywhere). Applies amenities (AND), `period` (events), `when` (theater+events).
   - **Non-venue branch** (movies/series/books/recipes) — `fetchByStructuredFilters` composes subcategory_id + ext filters (channel, duration, status, seasons, has_awards, language, country, level, origin, calories, yields, pages, is_trilogy, diet) into one Supabase query per category. Genre-miss drops the constraint when other signals carry the load.
5. **People search** — `fetchPeopleMatches` runs ilike across actors/director/writer/performers in movies/series/books/theater/events. Two passes (raw + accent-folded query) to beat Postgres's accent sensitivity. Tagged `__matched_via` for ranking.
6. **Title fallback** — when structured returns empty, ilike against `title_normalized` + `original_title_normalized` (both accent-folded generated columns).
7. **Rank** — `rankScore({titleScore, avgRating, ratingCount, suggestionCount, ageDays})`. Title is ×5 weight; people-match baseline 50.
8. **Confidence tier** — `tierFromScores(best, runnerUp)` returns `high|medium|low`. Drives hero-card-vs-list rendering.
9. **No-match → search_log** insert (powers the fan-out notification loop).

### tokenMatches semantics

Asymmetric Greek-inflection-aware:
- `target.includes(token)` → match (data broadens query)
- Common prefix ≥4 chars AND within 2 of shorter side → match (inflection variants)
- `token.includes(target)` (token longer than target) → **NOT a match** (user being more specific is intentional)

So "ταβέρνα" matches "ψαροταβέρνα" (broadening allowed), but "μπακαλοταβέρνα" does NOT silently expand to all "ταβέρνα" venues.

### Amenities (v3)

Source per category:
- food → `item_food.information.amenities` (jsonb object-of-booleans)
- bars → `item_bars.information.amenities`
- hotels → `item_hotels.facilities`

Read via `venueAmenityKeys` (route-local) — tolerates array-of-strings + object-of-booleans. AND semantics; every selected amenity must be present. **Soft fallback** — if amenities knock everything out but no other signal carries, drop the constraint (mirror of genre-miss handling).

### Periods + dates

- **`period`** (events) = month/season → `eventMatchesPeriod` walks `dates` jsonb. Year-agnostic ("summer concerts" matches any year).
- **`when`** (theater + events) = rolling 7d/30d horizon → `eventMatchesWhen`. Mutually exclusive with `period` per prompt rule.
- `dates` jsonb is K2-format `[{from: "DD/MM/YYYY", to: "..."}]`. Search route's `parseEventDate` handles it; public `match.ts:when` does `new Date(d)` which mis-parses (open follow-up).

### Region descendants

`regions.parent_id` is self-referential — N-level tree. `resolveLocation` walks BFS to collect every descendant id; the venue filter uses `.in("region_id", [region.id, ...descendantIds])`. So "Κρήτη" search captures items tagged to "Ηράκλειο" (prefecture) AND "Ελούντα" (place under Ηράκλειο).

### Regions admin

`/admin/content/regions` (RegionsManager) — inline rename, add-child, drag-to-reparent via select, cycle prevention, recursive descendant collection.

**Picker UX is two-step max** — top-level region → leaves. Intermediate prefecture-style regions are HIDDEN from the user-facing picker (Βόρεια Προάστια, Ηράκλειο prefecture). The intermediate stays in the table so Gemini taxonomy injection + `resolveLocation` walk the full tree.

`SuggestionEditor.RegionSelect` is N cascading dropdowns — auto-deepens when the selected region has children.

### Multi-language item titles (mig 020)

`items.original_title` stores Latin-script title alongside Greek `title`. Generated `original_title_normalized` is accent-folded + lowercased. Search route ilikes BOTH columns. Admin editor shows the field for movies/series/books only.

3-tier fallback in the admin page query (with both new cols → without `original_title` → without `images` either) so the editor loads even pre-migration.

---

## Recommendations (Phase B — planned, not built)

Locked architecture: 3 layers per CLAUDE.md "Architecture invariants".

### Day 1 — Item embeddings
- Provider: **OpenAI `text-embedding-3-small`** ($0.02/1M tokens, 1536-dim matches schema). Pending lock.
- `lib/embeddings/openai.ts:embedText(text)` — batches up to 100/call.
- `scripts/embed-items.ts` backfills all ~1953 items. Per-category text composition:
  - Movies/Series: `title + original_title + plot + cast + genres + director`
  - Books: `title + author + plot + subjects`
  - Food/Bars: `title + cuisine + type + description + city`
  - Recipes: `title + ingredients + origin + tips`
- Cost: ~400K tokens = **$0.008 one-shot**.
- Wire `/api/recommendations/similar` — pgvector cosine top-N.

### Day 2 — Item-to-item carousels (detail pages)
- Day-1 win, works for guests. Replace hardcoded "Σχετικά" / "Από τον ίδιο director" `<RelatedSections>` blocks with new `vector_similar_items` rule.
- Add `vector_similar` widget to `lib/layout/widgets.ts`.

### Day 3 — User embeddings + offline batch
- Migration: column on `users.embedding` (already exists).
- `lib/embeddings/user.ts`:
  - Active users (≥3 bookmarks/ratings/30d): weighted average of interacted-item embeddings (rating ×3, bookmark ×2, suggestion ×3, view ×1).
  - Low-activity: average of top-N in onboarding categories — cold-start fallback.
  - Zero-activity legacy K2: fallback to "popular last 30d" cluster center.
- Supabase Edge Function `embed-users-cron` — daily 04:00. Recompute on activity. One-shot backfill on first run.

### Day 4 — Precompute → online table
- Migration: `analytics.precomputed_recs (user_id, item_id, score, rank, reason_seed, computed_at)`. Indexed on `(user_id, rank)`.
- Edge Function `precompute-recs-cron` — daily 04:30. Per user with `last_login_at` in 30d: pgvector top-50 cosine, excluding bookmarked/rated/own-suggested.
- New widget `tailored_for_you` — registered audience only, reads from precomputed.

### Day 5 — Haiku rerank + reasoning
- `/api/recommendations/rerank` — fetches user's precomputed top-50 + last 5 high-rated items. Haiku reranks to top-5 + 1-line Greek "Επειδή σου άρεσε X" reasoning.
- Cap: 2 calls/user/day. Cached in `analytics.rerank_cache` for 24h.
- Wired to first card of "Tailored for You" rail + AI-personalised home chips.

### Cost at 1000 DAU

| Item | Cost |
|---|---|
| Item embeddings backfill | $0.008 one-shot |
| User embeddings backfill | $0.0006 one-shot |
| Daily user refresh | ~$0.01/month |
| Daily precompute cron | $0 (pure pgvector) |
| Haiku rerank @ 2/user/day | ~$60/month |
| **Total monthly** | **~$60/month** |

### Cold-start handling

- Days 1-2 wins are content-based, not collaborative. Item-to-item works with zero user activity.
- User embeddings have 3 fallback tiers — every user gets a usable embedding from day 3.
- Quality grows organically as users bookmark/rate.

### Decisions pending before day 1

1. **Embedding provider lock** — text-embedding-3-small (recommended) vs text-embedding-3-large ($0.13/1M, vector(3072) migration) vs Cohere multilingual ($0.10/1M, vector(1024) migration).
2. **Backfill scope** — production directly vs dev branch first.

---

## Notification dispatcher (hook-driven)

**Principle:** every passive user signal (bookmark, rating, follow, suggestion, search_log entry, location, last_login_at) × time/event trigger = personal moment. The platform "remembered" the user.

**Architecture:** Postgres triggers + Supabase Edge cron. No LLM at runtime — pure event matching. Writes to `public.notifications`.

**Shipped:**
- `notify_bookmarkers_of_airing` (mig 011) — bookmarked movie airs tonight on TV
- `trg_fanout_search_matches` (mig 013) — searched X but not in DB → notifies when matching item lands later

**Loops to build (~1 day each):**
- TMDB new-season webhook for bookmarked series
- Dormant 14-day comeback
- Bookmarked event passed → rate prompt
- Streak protection
- Friend rated my bookmark
- Suggestion anniversary

Full catalog: PROGRESS.md §3 Phase C.

---

## Achievement / moments system

DB-driven copy + timing in `moments` table (since session 21). Admin-editable at `/admin/moments`.

### Triggers

- `suggestion_published` — counts the user's new `suggestion_count`. Resolves via `suggestion_count_eq` predicate.
- `review_published` — counts user's total non-hidden reviews. Resolves via `review_count_eq` / `category_review_count_eq` / `reviews_this_week_eq` / `reviews_this_month_eq` predicates.

### Tier schedule (suggestion milestones)

| Tier | Counts |
|---|---|
| Verified (3) | 1, 2 → progress · 3 → tier_unlock |
| Έμπειρος (10) | 7, 9 → progress · 10 → tier_unlock |
| Expert (25) | 22, 24 → progress · 25 → tier_unlock |
| Platinum (50) | 47, 49 → progress · 50 → tier_unlock |

Tier colors: Verified `#1D9E75` · Έμπειρος `#3B82F6` · Expert `#7C3AED` · Platinum `#64748B`.

### Review milestones (since session 26 + 32)

Counts 1/5/10/25/50 use the `tier_unlock` variant with `display.label_line1/2` overrides ("Πρώτη / αξιολόγηση" instead of "Επαληθευμένος / χρήστης").

Per-category (`category_review_count_eq`) + streak-window (`reviews_this_week_eq`, `reviews_this_month_eq`) predicates available. `/api/reviews` writes payload keys (`category`, `category_review_count`, `reviews_this_week`, `reviews_this_month`) so admin copy can use `{category}`, `{week_count}`, `{month_count}` placeholders.

### Modal architecture

`<AchievementUnlockedModal>` portal-mounts to body, 3-phase mount, body-scroll lock, X + backdrop close. **No auto-dismiss** — achievements are intentional pauses. Fires 10s after suggestion Published, 2s after review publish (less ceremonial).

---

## Admin layout system (page_sections)

Composition of every category page + home is DB-driven (mig 032+033). Admin reorders/adds/removes via `/admin/layout`.

### Three layers

| Layer | File | Role |
|---|---|---|
| DB | `page_sections` | One row per visible section per audience |
| lib | `lib/layout/{types,widgets,resolver,home-bridge}.ts` | Types, widget registry, server resolver, render bridges |
| UI | `CategoryPageShell`, `app/(main)/page.tsx`, `/admin/layout`, `/preview/...` | Map resolved sections to JSX |

### Widget registry (`lib/layout/widgets.ts`)

22 widgets, pure metadata (no render functions — those live per-page so they close over shell state). Each `WidgetSpec` carries `key`, Greek `label`, allowed contexts/categories/audiences, `fixed: true` (admin reorders but never deletes — e.g. `filter_row`, `items_list`, `footer_mobile`), `singleton: true`, optional `configSchema`.

| Bucket | Widget keys |
|---|---|
| Category chrome (fixed) | `welcome_header`, `sub_category_tabs`, `filter_row`, `items_list` |
| Category content | `movies_tonight` (movies only), `open_map_button` (venues), `static_carousel`, `category_top_users`, `suggest_box` |
| Home guest | `hero_discover`, `hero_suggest`, `hero_personalise`, `category_tiles`, `suggestion_feed`, `how_it_works`, `register_promo` |
| Home registered | `greeting`, `ai_chips`, `suggested_users`, `contribution_cta` |
| Shared | `support_section`, `footer_mobile` (fixed) |
| Repeatable | `static_carousel` (non-singleton — config carries title + source + category override + offset + limit) |

### Resolver

```ts
resolvePageLayout(sb, {
  context: 'home' | 'category' | 'suggestions',
  category: string | null,
  viewerAudience: 'registered' | 'guest' | null,  // null = admin "show all"
  includeInactive?: boolean,
}) → RenderedSection[]
```

Single query + parallel collection hydration. Discriminated union `{kind: 'collection' | 'widget' | 'divider'}`. Empty collections dropped after hydration.

### Render bridges

- **Category** — `renderSection()` closure inside `CategoryPageShell.tsx` with shell state access.
- **Home** — `lib/layout/home-bridge.tsx:renderHomeSection(section, ctx)` because Next.js disallows extra exports from `page.tsx`. `ctx` carries fetched buckets.
- **Static carousel** — for category pages: slices from the main `items` array using `config.offset` + `config.limit`. For home: picks the right bucket based on `config.category`, renders portrait if movies/series/books else landscape.

### Locked invariants

- Audience filter: `'registered'` → rows where `audience IN ('all','registered')`. `'guest'` → `('all','guest')`. `null` (admin preview) skips entirely.
- Lifecycle: `valid_from > now` hides; `valid_until < now` hides. Computed in JS over bounded set.
- Empty collection rows silently dropped (no zero-item carousels visible).
- Singleton enforced at the application layer (POST returns 409). No DB UNIQUE constraint.
- Fixed widget delete refuses with 4xx — admin can mark inactive instead.

### Postmessage preview scroll (session 23)

`/admin/layout`'s section stack is interactive — clicking a row posts `{type:'scroll-to-section', sectionId}` to the iframe. Preview routes mount `PreviewScrollListener` (in `app/preview/layout.tsx`) which receives + scrolls + applies 1.6s coral highlight ring. Origin checked.

---

## Detail-page related sections

`related_sections_config` table (mig 034) drives the per-item "More from X" rules. Different from `page_sections` by design — see below.

### Field path syntax

Parsed by `lib/related-sections.ts:parseFieldPath`:

| Pattern | Example | SQL target |
|---|---|---|
| Scalar | `writer` | `item_books.writer = ?` |
| Array element | `performers[0]` | `item_events.performers->>0 = ?` |
| Object key in array | `actors[0].name` | `item_movies.actors->0->>'name' = ?` |

### Default rules (mig 034)

| Category | Field | Title template |
|---|---|---|
| books | writer | "Περισσότερα από {value}" |
| movies | director | "Άλλες ταινίες από {value}" |
| movies | actors[0].name | "Παίζει επίσης ο {value}" |
| series | director | "Άλλες σειρές από {value}" |
| series | actors[0].name | "Παίζει επίσης ο {value}" |
| theater | director | "Άλλες παραστάσεις από {value}" |
| theater | writer | "Άλλα έργα του {value}" |
| events | performers[0] | "Άλλες εμφανίσεις του {value}" |

food / bars / hotels / recipes start empty — admin adds via preset picker. `field` is immutable post-create; delete + recreate to switch axes.

### Auto-hide rules

`fetchRelatedSections(sb, {itemId, category, extension})` silently drops sections when:
- The current item has no value for the field
- Fewer than `min_items` siblings share the value

User never sees a hollow section.

### Why two tables (page_sections vs related_sections_config)

Considered folding related sections into `page_sections` with `context='item_detail'`. Rejected — different mental model (static composition per page vs function from item → sections), different cardinality (bounded per-page vs bounded per-axis-per-category), different admin UX (dnd+audience+preview vs simple list+inline edit). Keep separate until a concrete second per-item widget type emerges.

---

## Filter system

Two layers: public filters (`category_filters` table) + admin-only facets (`ADMIN_FACETS` registry).

### Public filters — `lib/category-filters/match.ts`

Single source of truth for filter application. Each `filter_id` branch maps to a column on `CategoryItem` (denormalised in `app/(main)/[category]/page.tsx:mapItem`).

Cases: `genre · event_type · cuisine · type · writer · publisher · director · actor · performer · region · awards · characteristics · origin · diet · when · price · amenities · platform · delivery · duration · level · property_type`.

**Empty/`"all"` always passes** — by convention. AND vs OR depends on case (amenities AND, characteristics AND, diet AND; writer/director/actor OR across selection).

**Amenities** (mig 044) — AND semantics. `parseAmenities` (from `admin-facets.ts`) tolerates both jsonb object-of-booleans and array-of-strings shapes. Lowercased canonical keys match migration 044 + `taxonomy.ts:159-162`.

### Admin facets — `lib/category-filters/admin-facets.ts`

Declarative per-category catalogue of admin-only knobs (ext-table columns NOT published as public `category_filters`).

```ts
AdminFacetKind = 'chips' | 'searchable-chips' | 'year-range' | 'range'
              | 'amenities' | 'tag-pattern' | 'boolean' | 'text'
```

Used by `/admin/filters` → Explorer tab. Server response carries `distincts` (for chips/searchable-chips) + `peopleDistincts` (for free-text public filters) + `matchedIds` (for Save-as-Collection handoff).

### Per-category facet catalogue

| Category | Facets |
|---|---|
| movies | country (searchable) · language (searchable) · decade · characteristics (tag-pattern: sequel/remake/based_on_true/biographical/trilogy/adapted_book) |
| series | + seasons range + characteristics |
| books | language (searchable) · pages range · decade · `is_trilogy` (boolean) · characteristics |
| recipes | yields · calories · origin (searchable) · channel (searchable) · characteristics (quick/healthy/traditional/party/kids/comfort) |
| food | characteristics (vegan-friendly/family/romantic/brunch/late-night/view/terrace/BYOB) |
| bars | type (searchable) · characteristics |
| hotels | facilities (amenities) · price band · characteristics |
| theater | year · director (searchable) · writer (searchable) · price · characteristics |
| events | status (searchable) · price · characteristics |

### Combinatorial Explorer

`/admin/filters` → Explorer tab. Live count debounces 250ms. Recommendation thresholds: ≥11 → Card · 4-10 → Carousel · 1-3 → too few · 0 → no match.

**Save-as-Collection** has two modes:
- **Filter mode** — picks expressible as ExtFilter[] carry through (`tags`, `filters` URL params).
- **Manual mode** (mig 042) — `result.matchedIds` stashed in `localStorage['explorer_matched_<key>']`, deeplink `?manual_key=<key>`. CollectionEditor reads stash on mount via `originManualKey` prop. Fails soft.

Tag-pattern is **admin-only by default** — promotion to public requires deliberate per-category decision + public widget.

---

## Category metadata resolver

`category_meta` table (mig 041) overlays admin-editable display label / icon / display_order / `is_nav_published` on top of `constants/categories.ts`.

**Slug + capability flags stay code-coupled.** Slugs are route segments (`/[category]`), API param keys, `items.category` FK string, switch-case keys in 50+ files. Capability flags (`hasMap` / `hasTrailer` / …) gate conditional component imports.

`lib/categories-meta.ts`:
- `getCategoriesResolved()` — all 9, DB overlay + sorted, capability flags from constant.
- `getCategoryResolved(slug)` — single lookup.
- `getNavPublishedCategories()` — only `is_nav_published`.

Resolver merge rules:
- Slug + capability flags ALWAYS from constant.
- `labelEl` / `icon` from DB when present, else constant fallback.
- `display_order` from DB when present, else `1000 + arrayIndex`.
- Migration not applied / outage → returns constants unchanged. Null-safe.

Consumer migration is mechanical; ~7 admin files still read the constant directly.

---

## SEO (Schema.org rich results)

Every detail page emits a JSON-LD payload matching Google's rich-results spec for the category's `@type`. Wired into `app/(main)/[category]/[id]/page.tsx` via `buildItemStructuredData(...)` + `<JsonLd>`.

| Category | @type |
|---|---|
| Movies | Movie |
| Series | TVSeries |
| Books | Book |
| Recipes | Recipe (author = suggester, datePublished, recipeIngredient[], HowToStep, nutrition with suitableForDiet) |
| Food | Restaurant |
| Bars | BarOrPub (LocalBusiness subtype) |
| Hotels | Hotel (LodgingBusiness subtype + priceRange + amenityFeature[]) |
| Theater | TheaterEvent |
| Events | Event |

Every type emits `aggregateRating` (when ≥1) + up to 8 `review[]`.

### Wiring

- `lib/seo/structured-data.ts` — one mapper per category. `compact()` strips nulls.
- `components/seo/JsonLd.tsx` — server component, `<script type="application/ld+json">` with `<` escape.
- `app/sitemap.ts` — home + leaderboard + 9 category indexes + 5000 most-recent items. Defensive try/catch.
- `app/robots.ts` — allow `/`, disallow admin/api/auth/preview/onboarding/settings/auth-flow.
- `app/layout.tsx` — `metadataBase`, Greek title template `"%s — Proteino"`, default OG + Twitter + robots.

### Env

`NEXT_PUBLIC_SITE_URL` (default `https://proteino.gr`). Set on Vercel before prod deploy.

### Gaps (open follow-ups)

Each is one-line code work + admin form field: `contentRating` (MPAA), `isbn`, `numberOfEpisodes`, `starRating` (hotel int), `openingHours` / `acceptsReservations`, `organizer` (events), `video` (recipes).

### Operational follow-ups

- Sitemap index when corpus passes 5K items.
- Image sitemap extension.
- `noindex` on thin pages (empty category, 0-suggestion profile, `/onboarding`).
- Canonical URLs on category + profile pages.
- K2 → new URL 301 redirect map.

---

## Reports / moderation

### Schema (mig 015 + 035 + 039)

```
content_reports
  target_type ('comment'|'suggestion'|'review' since mig 035)
  target_id, reporter_id, reason, description (≥10 chars REQUIRED for all),
  resolved, resolution_action ('kept'|'hidden'), resolution_note (≥5 chars),
  resolved_by, resolved_at
  UNIQUE (reporter_id, target_type, target_id, reason)

reviews         + hidden_at/by/reason

users           + admin_warnings jsonb (mig 039)
```

### User-facing flow (`<ReportFlowModal>`)

3-step state machine:
1. Reason picker — 4 radio options. "Επόμενο" disabled until selected.
2. Description — required textarea (≥10 chars). Reason-aware headline + placeholder.
3. Confirmation — "Λάβαμε την αναφορά σου". OK closes.

Posted via `POST /api/reports`. Idempotent on (reporter, target, reason).

### Admin moderation (`/admin/reviews`, session 28 consolidation)

The `/admin/reports` route was removed in session 28. Moderation lives at `/admin/reviews`:

- **Unresolved section** at top — server-fetched, lists every review with ≥1 pending report.
- **REPORTS column** on every row, 3 states:
  - Black filled badge with count → unresolved reports → opens drawer
  - Green filled badge → resolved-only history
  - Plain "0" → never reported
- **Reports drawer** per row — lists pending reports + "Είναι έγκυρη η αναφορά;" with two answer buttons:
  - **Όχι — άσε το review** → `PATCH /api/admin/reports/[id]` action='kept' (just this report).
  - **Ναι — απόκρυψη review** → action='hidden' (soft-hides review + auto-resolves all sibling pending reports with same note).
- **Warn-author checkbox** on "Ναι" → `POST /api/admin/users/[author_id]/warn` writes `{kind: 'review_hidden', ...}` to `admin_warnings`.
- **Reporter abuse signal** — if reporter has dismissed ≥2 reports / dismissed/total ≥0.5: red line + "Σήμανε ως καταχραστή" → writes `{kind: 'abusive_reporter', ...}`.

### Admin user warnings

`/admin/users` Warnings column reads `admin_warnings` jsonb. Click → drawer renders audit log newest-first with kind chip (Review hidden / Abusive reporter / Manual). "+ Πρόσθεσε manual προειδοποίηση" appends to same log with `kind='manual'`. Append-only — no delete.

### Locked invariants

- Description ALWAYS required (not optional, not just for "other").
- Admin note ALWAYS required (audit trail).
- Multiple reports per target supported (separate rows, individually resolvable).
- Never hard-delete — soft-hide via `hidden_at`.
- Old `comment_reports` table (mig 003) kept for historical data; new flow writes only to `content_reports`.

---

## Biblionet integration (parked)

Biblionet (https://biblionet.gr/webservice/) is the Greek institutional book catalog and will be Proteino's sole books data source. **Drop Google Books entirely.**

### What's in the repo

| File | Role |
|---|---|
| `lib/enrichment/biblionet.ts` | Typed client. 8 methods, single canonical `BiblionetTitle` shape (35+ fields). Env-driven auth. |
| `scripts/test-biblionet.ts` | Smoke test: month firehose → title → contributors → subjects → person → company. |
| `scripts/discover-biblionet-subjects.ts` | Aggregates DDC subjects across N months. |
| `scripts/biblionet-subjects-sample.json` | 82 distinct subjects across 150 books / 3 months. Drives the subcategory decision. |

### API findings vs docs

- Auth is `{ username, password }` in POST JSON body (not Basic).
- `get_month_titles` returns FULL detail payload (Summary, Price, Dimensions, Series). Mirror cost ≈ 3 calls/book.
- Description field is `Summary`.
- `Category` is uniformly `"Γενικά βιβλία"` — useless. Granular taxonomy is in `get_title_subject` (DDC-coded subjects like "Νεοελληνική ποίηση" DDC 889.1).
- `PresentOrder` always `"1"` — array index is the real ordering.
- `ContributorFullName` has double-spaces — normalised on read.
- Cover paths use `/assets/images/books/book_NNN/<uuid>.jpg`.
- 35+ bonus fields beyond docs example wired into the canonical interface.

### Locked design decisions

- Biblionet is the SOLE books source. Drop Google Books entirely.
- Subtitle concat into `items.title` — `"${Title}: ${Subtitle}"`.
- Multi-volume in `metadata.volume.*` — stop using `item_books.trilogy_name` / `is_trilogy` for new imports.
- Covers mirrored to Supabase Storage (own the asset; ~6GB at 200K books).
- Subcategory from `get_title_subject` DDC, NOT `Category` field. Auto-create subcategory if missing.

### Parked decisions (block production wiring)

1. **Subcategory taxonomy** — expand to ~18 subcategories (Θέατρο, Δοκίμιο, Τέχνη, Πολιτική, Επιστήμη, Γλώσσα, Θρησκεία, Παιδαγωγική) vs two-tier UI (9 top tabs + sub-genre chips within Λογοτεχνία).
2. **Local mirror vs admin-only** — Biblionet has NO text-search endpoint. User-submission flow needs local catalog mirror (bulk + daily delta). Decision deferred until taxonomy locked.
3. **`TitleType` filter** — proposed default: only `Βιβλίο`.
4. **Backfill** — match existing 1953 books by ISBN or import fresh.

### Env

```
BIBLIONET_USERNAME=...
BIBLIONET_PASSWORD=...
BIBLIONET_BASE_URL=...   # optional default https://biblionet.gr/webservice
```

---

## Runtime stack notes

### Node 22 / React 19 / Next 16 (session 27)

- Engines: `>=22.0.0 <25`. React 19.2.6 (was 18). Next 16.2.6 (was 14.2.35).
- Codemod `next-async-request-api` transformed 37 files. Pattern: `params` + `searchParams` are async — `interface Props { params: Promise<{ id: string }> }`, `const params = await props.params`.
- **`createClient()` from `lib/supabase/server` is async** — wraps `await cookies()`. 45 caller sites need `const sb = await createClient()`. Type alias `Awaited<ReturnType<typeof createClient>>` for fetcher signatures.
- **`useRef<T>(null)`** now returns `RefObject<T | null>` (was `RefObject<T>`). Hooks tightened accordingly.
- **Global `JSX` namespace** → `React.JSX`.
- **Turbopack default** — no webpack config. `@import` MUST come before `@tailwind` in CSS (PostCSS expands tailwind directives in-place, so `@import url(...)` ends up rejected if not at the top).
- **React Compiler** enabled (`reactCompiler: true` in `next.config.mjs`, `babel-plugin-react-compiler@1.0.0`). ~135 manual memo/callback sites identified for cleanup.
- `middleware.ts` still works (deprecation warning); rename to `proxy.ts` deferred.

### Dev boot

- Dev: 171ms (was 3-4s on webpack).
- HMR subjectively faster.

---

## Onboarding flow

4 screens at `/onboarding`, gated server-side from `(main)/layout.tsx`.

### Gate

`app/(main)/layout.tsx` reads `users.preferences` in the same admin query it already uses for avatar/displayName lookup. When `preferences.onboarded_at` is missing, `redirect("/onboarding")`. Safe against mig 022 not applied.

### Stamping rule (critical)

`preferences.onboarded_at` is stamped ONLY on the FINAL call to `/api/onboarding/complete`. Intermediate writes (step 2 → 3 saving interests) pass `final: false`.

If stamped mid-flow, any RSC re-render hitting `/onboarding`'s server entry would redirect mid-flow.

### Storage

All under `users.preferences` jsonb (mig 022): `interests` array, `onboarded_at` ISO timestamp, `notifications`, `tour_seen`.

### Screens (`components/onboarding/`)

| File | Step | Key behavior |
|---|---|---|
| `HookScreen.tsx` | 1 | 4-phase looping AI demo. "Παράλειψη" stamps onboarded_at. |
| `InterestsScreen.tsx` | 2 | 3×3 emoji grid, ≥2 picks. Coral pill expands inline textarea — AI parses Greek/greeklish, matching cells animate-pop-in. |
| `RewardScreen.tsx` | 3 | Horizontal carousels per picked category. Excludes user's own suggestions. Two-tier query (rated+covered preferred, cover-only fallback). |
| `PeopleScreen.tsx` | 4 | Two sections (tight specialists + broad). Avatar tap → ProfilePopup. FollowButton wired through useFollow. |
| `OnboardingSyncing.tsx` | final | 3-step checklist with live numbers from `/api/onboarding/numbers`. |

### APIs

- `POST /api/onboarding/complete` — `{interests?, final?, skipped?}`. Saves interests + conditionally stamps `onboarded_at`.
- `GET /api/onboarding/reward-feed` — per-category carousels.
- `GET /api/onboarding/suggested-users` — `{tight, broad}` ranked by matched count.
- `GET /api/onboarding/numbers` — 3 live counts for syncing screen.
- `POST /api/onboarding/parse-interests` — Gemini `extractInterests` + deterministic keyword fallback.

`<FollowButton>` is controllable (added `useEffect` to sync with `following` prop in session 20). `/onboarding` needs its own `AuthProvider` wrap in the layout — it lives outside `(main)` so otherwise the auth store stays null.
