# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 31):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini + confidence-tiered match with alternatives for movies/series/books/venues), notifications dispatcher, security settings, region picker, achievement celebration (suggestions AND reviews), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. Runtime is Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack).

**Session 31** was a pre-Phase-B cleanup pass + a critical bug fix discovered mid-session. Cleanup: forwardRef → ref-as-prop sweep across 6 files (15 occurrences, including 9 useImperativeHandle wrappers in SuggestionEditor), `modified_by` stamped on 5 admin POST routes, "Last edited by X · Y ago" rendered in 4 admin manager UIs via new `<RowAuditFooter>` primitive, audit-log endpoint column-name bug fixed (`moments.name`/`collections.name`/`category_filters.field_label` → real columns, RecentChanges widget on `/admin` now populates), React Compiler beta trial (babel-plugin-react-compiler 1.0 enabled — build clean, ~135 manual `useMemo`/`useCallback` sites now redundant), `feedback_books_data_source` memory file persisted. **Image-wipe bug discovered + fixed:** `app/admin/suggestions/[id]/page.tsx` was coercing the new dual-shape `items.images` object to `[]` (the `Array.isArray(item.images) ? item.images : []` line) — this both hid existing images from the admin and caused the row's JSONB to be wiped on save. Recovery for `bars/etouto-ath1` from storage. Hardening: `/api/admin/suggestions` PUT now re-fetches current `images` server-side and merges, so a stale client copy can never wipe pipeline keys. CLAUDE.md §46 documents the full save path. Also: gallery viewer redesigned (image cells 280px × 3:2 aspect, auto-width pills, populated-tabs-only filter, hide entire viewer when ≤1 image) + profile lists v2 (orientation-aware cards across suggestions/bookmarks/reviews via new `<ProfilePoster>` primitive, page chrome polished: compact count strip, tight sort pills).

**Session 30** added two parallel workstreams, both planning/scaffolding only (zero production code touched): (1) **Biblionet API integration** — typed client (`lib/enrichment/biblionet.ts`, all 8 endpoints, 35+ fields per record), smoke tests validated against live API, 82-subject discovery scan locked five design decisions; subcategory taxonomy shape parked. (2) **Phase B execution plan** — concrete 5-day day-by-day plan locked: item embeddings → item-similar carousels → user embeddings → precompute_recs → Haiku reranking; ~$60/month at 1000 DAU; embedding provider + backfill scope decisions parked. See CLAUDE.md §44/§45.

`npx tsc --noEmit` → 0 errors. `npx next build` → green with React Compiler.

**Next step:** **Phase B day 1** (embedding provider + backfill-scope decisions needed first) OR **Biblionet subcategory decision** to unblock the rest of the books integration. Both are blocked on user choices. Quick wins still queued: §39 SEO closing, §42 per-category review milestones, audit how many other rows were hit by the image-wipe bug, sweep redundant `useMemo`/`useCallback` now that the Compiler is on. See PROGRESS.md §0 "open follow-ups" for the full ordered roadmap.

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql` (admin-review note column)
- `scripts/sql/038-nearby-related-section.sql` (distance-based related items)
- `scripts/sql/039-user-admin-warnings.sql` (session 28) — `users.admin_warnings jsonb` audit log
- `scripts/sql/040-admin-audit-stamps.sql` (session 29) — `modified_by` + `modified_at` on 5 admin tables (Applied 2026-05-19)

All idempotent. Migrations 039 + 040 must land before the warn flow + RecentChanges widget can populate. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §7 confidence-tiered match, §21 image schema (shipped), §37 layout system, §38 related sections, §40 review writing flow + Gemini coaching, §41 admin IA + review-reports consolidation + warnings reader + audit log + confirm-before-save, §42 review milestones, §43 runtime upgrade, §44 Biblionet integration, §45 Phase B execution plan, **§46 image save path + dual-shape JSONB gotcha**, **§47 profile lists v2 (orientation-aware cards)**), AI.md (AI service + §4 Phase B execution plan), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist + env vars)
