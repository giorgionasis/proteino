# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 32):** Auth + extension tables + 1955 items / 627 users. Search v2 (Gemini), submission v2 (Gemini + confidence-tiered match with alternatives for movies/series/books/venues), notifications dispatcher, security settings, region picker, achievement celebration (suggestions AND reviews including per-category + streak milestones), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. Runtime is Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack) + React Compiler 1.0.

**Session 32** was a focused follow-up — 4 quick wins, all shipped, no new migrations. (1) **Image-wipe damage scan** (`scripts/scan-image-wipe.ts`): finds rows whose `images.poster`/`backdrop` is missing but `media/items/<id>/poster-*.webp` still exists. Production scope was 1 row out of 1955 — session 31's fix had already stopped new wipes. Tool stays in-repo for future vigilance. (2) **Per-category review milestones** (`category_review_count_eq` predicate): combined predicate that fires when user hits the N-th review in a specific category (or any category if `category` arg is empty). `/api/reviews` now resolves the item's category + counts category-scoped reviews via `reviews INNER JOIN items`. (3) **`useMemo`/`useCallback` sweep**: 90 manual memoization sites across 45 files collapsed to plain arrow functions / direct expressions / IIFEs. React Compiler auto-memoizes — these were redundant. Mechanical sweep via `scripts/sweep-memo-callback.js`. (4) **Streak-window milestones** (`reviews_this_week_eq` + `reviews_this_month_eq`): single timestamp fetch buckets total + 7-day + 30-day counts in JS; placeholders `{week_count}` + `{month_count}` available in admin copy.

**Session 31** was a pre-Phase-B cleanup pass + a critical bug fix. Cleanup: forwardRef → ref-as-prop sweep (6 files, 15 occurrences, including 9 useImperativeHandle wrappers in SuggestionEditor), `modified_by` stamped on 5 admin POST routes, "Last edited by X · Y ago" rendered in 4 admin manager UIs via new `<RowAuditFooter>` primitive, audit-log endpoint column-name bug fixed (RecentChanges widget on `/admin` now populates), React Compiler beta trial enabled (`babel-plugin-react-compiler@1.0.0`). **Image-wipe bug**: `app/admin/suggestions/[id]/page.tsx` was coercing the new dual-shape `items.images` object to `[]` — this both hid existing images from the admin and caused the row's JSONB to be wiped on save. Recovery for `bars/etouto-ath1`, three-prong fix, CLAUDE.md §46 documents the full save path. Gallery viewer redesigned + profile lists v2 (orientation-aware cards via new `<ProfilePoster>` primitive).

**Session 30** added two parallel workstreams, both planning/scaffolding only (zero production code touched): (1) **Biblionet API integration** — typed client (`lib/enrichment/biblionet.ts`, all 8 endpoints, 35+ fields per record), smoke tests validated against live API, 82-subject discovery scan locked five design decisions; subcategory taxonomy shape parked. (2) **Phase B execution plan** — concrete 5-day day-by-day plan locked: item embeddings → item-similar carousels → user embeddings → precompute_recs → Haiku reranking; ~$60/month at 1000 DAU; embedding provider + backfill scope decisions parked. See CLAUDE.md §44/§45.

`npx tsc --noEmit` → 0 errors. `npx next build` → green with React Compiler (112 routes).

**Next step:** **Phase B day 1** (embedding provider + backfill-scope decisions needed first) OR **Biblionet subcategory decision** to unblock the rest of the books integration. Both are blocked on user choices. Quick wins still queued: §39 SEO closing (admin fields for contentRating / ISBN / openingHours / image sitemap / K2 redirect map / canonical URLs / noindex on thin pages), real legal copy on `/terms` + `/privacy`, drop legacy `ratings`/`comments` tables. See PROGRESS.md §0 "open follow-ups" for the full ordered roadmap.

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql` (admin-review note column)
- `scripts/sql/038-nearby-related-section.sql` (distance-based related items)
- `scripts/sql/039-user-admin-warnings.sql` (session 28) — `users.admin_warnings jsonb` audit log
- `scripts/sql/040-admin-audit-stamps.sql` (session 29) — `modified_by` + `modified_at` on 5 admin tables (Applied 2026-05-19)

All idempotent. Migrations 039 + 040 must land before the warn flow + RecentChanges widget can populate. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §7 confidence-tiered match, §21 image schema (shipped), §37 layout system, §38 related sections, §40 review writing flow + Gemini coaching, §41 admin IA + review-reports consolidation + warnings reader + audit log + confirm-before-save, **§42 review milestones + per-category + streak-window predicates**, §43 runtime upgrade + Compiler, §44 Biblionet integration, §45 Phase B execution plan, §46 image save path + dual-shape JSONB gotcha, §47 profile lists v2 (orientation-aware cards)), AI.md (AI service + §4 Phase B execution plan), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist + env vars)
