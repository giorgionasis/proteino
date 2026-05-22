# Proteino — Project Briefing

This file is the model's always-loaded briefing. Read this before every session, then jump to topical docs only when relevant.

**Discipline (don't break this):** PROGRESS.md is the append-only session log. CLAUDE.md is a living briefing — only edit when an invariant changes, an open follow-up shifts, or a decision is locked. Do NOT add "session N shipped X" narratives here; those go in PROGRESS.md.

**Topical docs (read on demand):**
- `docs/architecture.md` — schema decisions, AI service layer, recommendation architecture, search internals, integration plans
- `docs/design-system.md` — color/typography tokens, icon registry, motion, image pipeline, /admin/showcase as live truth
- `PROGRESS.md` — session-by-session history, completed work, in-progress, what's next
- `AI.md` / `HOOKS.md` / `ADMIN.md` / `DEPLOY.md` — domain deep-dives

---

## What Proteino is

Mobile-first, community-driven recommendation platform for the Greek market. Users share + discover across **Books · Movies · Series · Recipes · Theater · Events · Accommodation · Bars/Cafes · Food/Restaurants**.

**Three differentiators:**
1. **AI submission flow** — natural-language description → AI auto-identifies item + category + gives real-time quality feedback.
2. **AI-driven search** — no traditional filter sidebar. Free-text Greek queries parsed for vibe / type / location / structured attributes via Gemini.
3. **Social + gamification** — profiles, follows, reviews, ratings, bookmarks, levels, leaderboard. Personalised home for registered users; guests browse only.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) · React 19 · Tailwind |
| Backend | Next.js API Routes (service-layer pattern, extractable) |
| DB | Supabase (Postgres + pgvector + Auth + Storage), two schemas: `public` + `analytics` |
| AI | Gemini 2.5 Flash Lite via Vercel AI Gateway. Anthropic Haiku planned for reranking. AIService interface abstracts the provider. |
| Deployment | Vercel (frontend) + Supabase (hosted) |
| Admin | `/admin` same codebase, role-gated |
| Runtime | Node 22, ~Vercel Edge for select reads |

---

## Architecture invariants

### Hybrid base + extension tables
- `items` carries every shared field across all 9 categories (title, slug, cover/poster/backdrop, avg_rating, embedding).
- `item_<category>` (item_food, item_movies, …) carries category-specific structured fields.
- **Why:** enables cross-category AI search/recs via single `items` table while keeping structured data per category. Adding a category = one new extension table.

### Two Supabase schemas
- `public` — online, real-time (users, items, suggestions, reviews, bookmarks, …).
- `analytics` — offline batch (embeddings, activity_log, precomputed_recs, search_log). Nightly cron jobs write here; serving reads from public.

### AI service abstraction
`lib/ai/index.ts` defines `AIService`. Current impl: `GeminiAIService` (lib/ai/gemini.ts) via AI Gateway. `lib/ai/cache-and-log.ts` wraps every call with Postgres-backed cache (30-day TTL, keyed by provider+model+`PROMPT_VERSION`+task+query) + `ai_usage_log` row per call. **Bump `PROMPT_VERSION`** in cache-and-log.ts on any prompt edit to invalidate stale entries.

### Recommendations (planned, not built — see docs/architecture.md "Phase B")
Three layers when shipped:
1. **Embeddings** — every item + user has `embedding vector(1536)`. Items from title+plot+tags+actors+reviews; users from rolling 30-day activity.
2. **Offline batch** — nightly Edge Function recomputes embeddings + pgvector top-50 per active user → `analytics.precomputed_recs`. Home reads precomputed (<100ms, no LLM at request time).
3. **LLM rerank (Haiku, on-demand)** — high-value moments only (home hero, "Tailored for You" rail). ~$0.001/rerank, 1-2/user/day.

"Training" = RAG + nightly embedding refresh. We do NOT fine-tune.

### Notification dispatcher
Hook-driven, NOT LLM-driven. Postgres triggers + Edge cron. Every passive user signal × time/event trigger = personal moment. Writes to `public.notifications`. Two prototypes shipped: `notify_bookmarkers_of_airing` (migration 011), `trg_fanout_search_matches` (migration 013). Detailed catalog in PROGRESS.md §3 Phase C.

---

## UX principles — non-negotiable

1. **No dead ends, ever.** Every screen has a next action. Empty search → alternatives + "be the first to suggest it". Empty category → "add the first suggestion".
2. **Real-time results.** Search results appear AS the user types, not after. AI analysis shows progress live.
3. **Give before you ask.** Onboarding shows personalised content before asking for follows. Guest sees real content before registration prompt.
4. **Hook mechanics.** Variable reward · social proof ("X and 2 others suggested this") · progress mechanics · streak protection · achievement popups · personalisation loop visible to the user.
5. **Light theme everywhere.** Dark theme is the exception — used only for Syncing screen during AI enrichment + the achievement-unlock celebration.

---

## Detail page composition rules — non-negotiable

The 9 detail pages are visual variations of one archetype. Violating these breaks UX consistency:

- **No chips under hero by default.** Surface 2-3 inline metadata pairs via `InfoCell` below the user reflection — not as a chip row.
- **3-col stat bar is conditional, not default.** Default = inline `<RatingLine>`. Movies show the 3-col only when Oscar present + `avgRating ≥ 4.5`.
- **Suggester block is unboxed.** Avatar + name + badge + reflection text + date. No border, no fill.
- **Featured suggester block is mandatory on all 9 categories.**
- **1-column list across all 9 categories.** Carousels stay portrait for movies/series/books.
- **Histogram + Top Rated** combine ratings from BOTH sources (`ratings` table + `suggestions.rating`), deduped by user. Server-side, overrides `item.rating_count + avg_rating`.
- **Empty-state = hide, never "—".** If a metadata pair has both cells empty, hide the row including its divider. Conditional renders everywhere.
- **No gray-circle placeholders for people.** Every actor/performer/director/writer bubble is `<PersonBubble>` — real image when available, deterministic colored-initial circle otherwise.
- **No dead CTAs.** Every button/link goes somewhere real. Map → Google Maps, Phone → `tel:`, Website → `https://` URL.
- **Own-suggestion behavior** — viewing your own suggestion replaces the rate card with `<OwnSuggestionActions>` (Edit + Delete).

---

## Other load-bearing invariants

### Reviews are the single source of truth
- `reviews` table (migration 016) replaces both `ratings` and the user-on-item dimension of `comments`. Every user-on-item interaction = one row.
- Trigger `trg_sync_review_votes` keeps `reviews.vote_up`/`vote_down` synced from `review_votes`. Self-vote blocked at API.
- Legacy `ratings` + `comments` tables are FROZEN — no longer written or read. Slated for drop.
- Reports flow: `content_reports` with `target_type='review'`. Moderation lives at `/admin/reviews` (Unresolved section + REPORTS column). `/admin/reports` was removed — folded into `/admin/reviews`.

### Bookmark v2 — two-state model
- `bookmarks.status` ∈ {`'wishlist'`, `'done'`}. Migration 023 + 025.
- Default save = `wishlist`. Tap top-right bookmark IconButton → lands on wishlist.
- **Rating an item auto-flips wishlist → done.** Reverse flip is manual only.
- Chips always visible below the hero on every detail page (discoverability > minimalism).
- Per-category labels in `lib/bookmarks/labels.ts`.

### Badge tier source of truth
- Derived from `suggestion_count`, NOT `users.level`. Use `badgeIconForSuggestions(count)` / `badgeLabelForSuggestions(count)` in `lib/icons.ts`.
- Thresholds: 0–2 none · 3–9 Verified · 10–24 Gold · 25–49 Expert · 50+ Platinum.
- Admin `UsersTable` has one extra NEW tier (<3) so the moderation column always has a label.
- `<UserBadge>` accepts `suggestionCount` (preferred) → `kind` → legacy `level`. Returns null below 3 when suggestionCount is supplied.

### Item images — dual-shape JSONB
`items.images` can be `null` / array (legacy K2) / object with `{poster, backdrop, og, gallery}` keys (modern). **Don't narrow with `Array.isArray(x) ? x : []`** — that drops the modern shape and wipes data on save. Always go through `extractGalleryImages(x)` or `pickCoverUrl(x, fallback)` from `lib/images/gallery.ts`. See PROGRESS.md for the session-31 silent-wipe incident.

### CATEGORIES resolver
Category label / icon / display_order / nav-visibility are admin-editable via `/admin/categories` (migration 041 → `category_meta` table). Slug + capability flags (hasMap / hasTrailer / hasDelivery / …) stay code-coupled. Resolver in `lib/categories-meta.ts`:
- `getCategoriesResolved()` — all 9, DB overlay + sorted
- `getCategoryResolved(slug)` — single lookup
- `getNavPublishedCategories()` — only `is_nav_published`

Consumers either receive `categories` prop (from server fetch) or fall back to `constants/categories.ts` for showcase/standalone use.

### Admin layout (page_sections) vs related sections
- `page_sections` table (migration 032+033) drives composition of home page + all 9 category pages. Admin reorders/adds/removes via `/admin/layout`. Resolver in `lib/layout/resolver.ts`.
- `related_sections_config` (migration 034) drives the per-item "More from X" rules on detail pages. Admin manages at `/admin/related-sections`.
- Two separate systems by design — see docs/architecture.md for why.

### Reports / moderation
- `content_reports` (migration 015) handles both review reports and legacy comment reports.
- Description always required for the user (not optional).
- Admin note always required (audit trail).
- Multiple reports per target supported; auto-batch resolution on `hidden`.
- Never hard-delete — soft-hide via `hidden_at`.
- Warnings flow (migration 039): admin can flag review authors + abusive reporters via `users.admin_warnings` jsonb. Audit log surfaces in `/admin/users` Warnings column.

---

## Design tokens (quick reference)

```
Coral-600:   #FE6F5E  (primary CTA, AI elements, active state)
Coral-700:   #E05A4A  (hover)
Coral-50:    #FFF5EC  (selected backgrounds)
ios-gray:    #F2F2F7
Zinc scale:  950 (h1) → 50 (subtle bg)
Success:     #1D9E75
Danger:      #E24B4A
Warning:     #FF9123
Gold:        #F8D160
Badge-red:   #C51501
```

- **Font:** Open Sans (Google Fonts import at TOP of `app/globals.css` — Turbopack rejects `@import` after `@tailwind` directives).
- **Border radius:** 4 / 8 / 12 / 16 / 50 / 9999 px scale.
- **Bottom nav:** 3 tabs — HOME · SEARCH · YOU. NOT 4 or 5. Submission opens via FAB.
- **Component catalog:** `/admin/showcase` is the live source of truth — 16 tabs, ~110 components. Open it before designing new variants.

Full token reference + image pipeline + icon registry + motion system in `docs/design-system.md`.

---

## Business rules

- **Guests** can browse everything. Cannot suggest, bookmark, rate, comment, or get personalised content.
- **Registration incentives** are always visible, never blocking.
- **content_hash** on every suggestion (immutable) = proof of authorship; no blockchain.
- **Admin panel** at `/admin`, gated by `users.role = 'admin'`.
- **Nearby activities** admin-managed only.
- **Location notifications** parked until native app.
- **Revenue sharing** parked.

---

## Major decisions log

| Decision | Choice | Reason |
|---|---|---|
| Items schema | Hybrid base + extensions | Cross-category AI + structured data |
| DB topology | Single Supabase + 2 schemas | Simple now, extractable later |
| AI provider | Gemini 2.5 Flash Lite (search) · Anthropic Haiku planned (rerank) | Greek quality + cost + speed |
| Self-hosted AI? | No, until 50K+ DAU | Greek quality drop on 7-13B open models |
| Fine-tune LLM? | Never | RAG > fine-tune for diverse tasks |
| Recs | Vector + LLM hybrid, 3 layers | Embeddings via user activity; precomputed nightly; Haiku reranks on-demand |
| AI cost target | 3-5% of revenue | At 100K DAU: ~$3.5K cost vs ~€122K revenue |
| Theme | Light + coral, dark only in syncing/celebration | Content-heavy screens need light |
| Levels | Suggestion count only | Simple, transparent |
| Admin | Same codebase /admin | Role-based gate |
| Blockchain | Not needed | content_hash same goal |
| Reviews vs ratings/comments | Single reviews table | Migration 016 unifies; legacy frozen |
| Bookmarks | wishlist + done | Two-state model (migration 023) |
| Badge tier | Derive from suggestion_count | users.level unreliable post-K2 migration |
| Books data source | Biblionet only | Drop Google Books entirely. Production wiring blocked on subcategory taxonomy decision |
| Category layout | DB-driven via page_sections | Admin edits home + 9 categories without code change |
| Detail-page related sections | Separate rules table | Different cardinality + admin UX than layout |
| Filter system | Public filters + admin-only facets | `category_filters` + `ADMIN_FACETS` registry |
| Search v3 | Structured-attribute extraction | 16 fields beyond title/category/location |

---

## Open follow-ups (rolling — update this section, not narrative)

**Concrete + sized:**
- **First-paint flash audit pass 2** — apply server-fetch + skip-flag pattern to `/admin/content/regions`, `/admin/content/activities`, `/admin/users`. ~1h each.
- **Amenity vocab → DB-driven** (§54 follow-up) — `taxonomy.ts:159-162` has canonical keys hardcoded. If admin edits migration 044, prompt drifts until file re-edited. ~1h.
- **Public `match.ts:when` parser fix** — `new Date(d)` mis-parses K2's `DD/MM/YYYY`. Replace with `parseEventDate`. Narrow surface area.

**Blocked on user decisions:**
- **Phase B day 1** (pgvector recs) — needs embedding-provider lock (OpenAI text-embedding-3-small recommended) + backfill scope (prod direct vs dev first). Plan in docs/architecture.md.
- **Biblionet subcategory taxonomy** — expand to ~18 vs two-tier UI. Plan in docs/architecture.md.

**Long tail:**
- §39 SEO closing — admin fields for contentRating / ISBN / numberOfEpisodes / starRating / openingHours / organizer / recipe video; sitemap split at 5K; image sitemap; `noindex` on thin pages; K2 → new URL 301 map.
- Real legal copy on `/terms` + `/privacy`.
- Drop legacy `ratings` + `comments` tables once archive is confirmed unwanted.
- Promote useful admin-only facets to public filters case-by-case.
- Per-category visual identity polish.

---

## Key files (where to look)

```
app/
├── (auth)/                    # login, register — no main layout
├── (main)/                    # main layout with bottom nav
│   ├── page.tsx               # home
│   ├── [category]/[id]/       # detail pages (9 variants of one archetype)
│   └── submit/                # AI submission flow
├── admin/                     # role-gated
│   ├── layout/                # page_sections editor
│   ├── related-sections/      # per-item rules editor
│   ├── reviews/               # moderation + reports (consolidated session 28)
│   └── showcase/              # live component catalog — read before designing
└── api/
    ├── search/route.ts        # main search route (~1700 lines, dense)
    └── ai/match/route.ts      # submission match endpoint

lib/
├── ai/                        # AIService interface + Gemini impl + cache wrapper
├── layout/                    # page_sections resolver + widgets registry
├── category-filters/          # match.ts (public) + admin-facets.ts (admin Explorer)
├── categories-meta.ts         # CATEGORIES resolver
├── supabase/                  # client.ts, server.ts (async — await createClient()), admin.ts
├── icons.ts                   # icon registry + badge helpers
└── images/gallery.ts          # dual-shape JSONB tolerant extractors

scripts/sql/                   # numbered migrations (read the latest few for current schema)
supabase/migrations/           # initial schema only
```

---

## Working conventions

- **Submission flow is async on Next 16** — `cookies()` is async, so `await createClient()` (server.ts factory). Don't break this; ~45 routes depend on it.
- **React 19 ref-as-prop** — `forwardRef` was swept in session 31. Don't reintroduce.
- **Turbopack default** — webpack config is gone. `@import` must come BEFORE `@tailwind` in CSS.
- **Skill /admin/showcase before designing** — saves redoing work.
- **PROMPT_VERSION bump** on any Gemini prompt edit, in `lib/ai/cache-and-log.ts`.
- **No `Array.isArray` narrowing on `items.images`** — see invariants above.
- **Migrations are append-only + idempotent** (`ON CONFLICT DO NOTHING`, `IF NOT EXISTS`). Never edit a numbered migration in place after applying.

---

## Session-end discipline

At the end of a session:
1. Write a session entry to `PROGRESS.md §0 WHERE WE LEFT OFF` + bump the "Last updated" line. Move the previous §0 entry to "Previous sessions".
2. Touch CLAUDE.md ONLY if:
   - A load-bearing invariant changed (e.g. a new "don't do X" rule emerged)
   - An open follow-up shipped (remove or mark)
   - A new follow-up surfaced
   - A decision is locked (add to decisions log)
3. Topical docs (`docs/architecture.md`, `docs/design-system.md`) updated when their domain changed.

The goal: a year from now, opening CLAUDE.md should give a model the briefing it needs in 2-3 minutes. If a section can be derived from `git log`, `ls`, or reading the code, it doesn't belong here.
