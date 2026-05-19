# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 30):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini + confidence-tiered match with alternatives for movies/series/books/venues), notifications dispatcher, security settings, region picker, achievement celebration (suggestions AND reviews), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. Runtime is Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack). **Session 30** added two parallel workstreams, both planning/scaffolding only (zero production code touched): (1) **Biblionet API integration** — typed client (`lib/enrichment/biblionet.ts`, all 8 endpoints, 35+ fields per record), smoke tests validated against live API, 82-subject discovery scan locked five design decisions (Biblionet = sole books source, subtitle concat into title, multi-volume in metadata, covers to Supabase Storage, subjects-not-Category drive subcategories); subcategory taxonomy shape (~18 buckets vs two-tier) + architecture (mirror vs admin-only) parked pending user decision. (2) **Phase B execution plan** — concrete 5-day day-by-day plan locked: day 1 item embeddings ($0.008 backfill via OpenAI text-embedding-3-small), day 2 item-similar carousels on detail pages, day 3 user embeddings + nightly cron, day 4 precompute_recs → "Tailored for You" rail, day 5 Haiku reranking with reasoning copy; cold-start handled via three-tier user-embedding fallback (active → onboarding interests → popular-last-30d); ~$60/month at 1000 DAU. Embedding provider + backfill scope decisions parked.

**Session 29** was a pre-Phase-B polish sweep: app-wide error/loading/404 boundaries, `/terms` + `/privacy` pages + retargeted RegisterForm/footer links, PWA manifest with dynamic `app/icon.tsx` + `app/apple-icon.tsx`, 9 OAuth `console.log` calls stripped, all 14 admin native `alert()`/`prompt()` sites replaced with `<Toast>` + new `<PromptModal>` primitive, Gemini coaching overlay on the review composer, middleware → proxy rename, deleted `/showcase` + `/submit` + `/api/recommendations` dead code. Capstone: migration 040 adds `modified_by` + `modified_at` to 5 admin-managed tables + new `<RecentChanges>` widget on `/admin` Overview. **Session 28** consolidated admin moderation: review reports moved inside `/admin/reviews` (Unresolved section + 3-state REPORTS column), warn endpoint + `users.admin_warnings jsonb` audit log (migration 039). **Session 27** was the runtime upgrade: Node 20 → 22 LTS + React 18 → 19.2.6 + Next 14.2.35 → 16.2.6 (Turbopack, 171ms boot).

`npx tsc --noEmit` → 0 errors.

**Next step:** **Phase B day 1** (embedding provider + backfill-scope decisions needed first) OR **Biblionet subcategory decision** to unblock the rest of the books integration. Both are blocked on user choices. Quick wins still queued from session 29: §39 SEO closing, §41 admin polish remainder, §42 per-category review milestones, §43 React Compiler trial + PPR. See PROGRESS.md §0 "open follow-ups" for the full ordered roadmap.

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql` (admin-review note column)
- `scripts/sql/038-nearby-related-section.sql` (distance-based related items)
- `scripts/sql/039-user-admin-warnings.sql` (session 28) — `users.admin_warnings jsonb` audit log
- `scripts/sql/040-admin-audit-stamps.sql` (session 29) — `modified_by` + `modified_at` on 5 admin tables (Applied 2026-05-19)

All idempotent. Migrations 039 + 040 must land before the warn flow + RecentChanges widget can populate. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §7 confidence-tiered match, §21 image schema (shipped), §37 layout system, §38 related sections, §40 review writing flow + Gemini coaching, §41 admin IA + review-reports consolidation + warnings reader + audit log + confirm-before-save, §42 review milestones, §43 runtime upgrade, **§44 Biblionet integration (in progress)**, **§45 Phase B execution plan**), AI.md (AI service + §4 Phase B execution plan), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist + env vars)
