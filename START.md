# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 29):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini + confidence-tiered match with alternatives for movies/series/books/venues), notifications dispatcher, security settings, region picker, achievement celebration (suggestions AND reviews), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. Runtime is Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack). **Session 29** was a pre-Phase-B polish sweep: app-wide error/loading/404 boundaries, `/terms` + `/privacy` pages + retargeted RegisterForm/footer links, PWA manifest with dynamic `app/icon.tsx` + `app/apple-icon.tsx`, 9 OAuth `console.log` calls stripped, all 14 admin native `alert()`/`prompt()` sites replaced with `<Toast>` + new `<PromptModal>` primitive, Gemini coaching overlay on the review composer (reuses `/api/ai/coaching-tip`), middleware → proxy rename, deleted `/showcase` + `/submit` + `/api/recommendations` dead code, Google Books + Places enrichment now populate the alternatives array, bookmarks empty state honest about non-own profile privacy. Capstone: migration 040 adds `modified_by` + `modified_at` to 5 admin-managed tables + new `<RecentChanges>` widget on `/admin` Overview surfaces recent admin actions across moments/page_sections/collections/related_sections_config/category_filters.

**Session 28** consolidated admin moderation: dropped the standalone `/admin/reports` page; review reports now live inside `/admin/reviews` as a top "Unresolved (N)" section + a 3-state REPORTS column. Added warn endpoint + `users.admin_warnings jsonb` audit log (migration 039) + reader UI on `/admin/users`. **Session 27** was a runtime upgrade: Node 20 → 22 LTS + React 18 → 19.2.6 + Next 14.2.35 → 16.2.6. Dev boots in 171ms now (Turbopack).

`npx tsc --noEmit` → 0 errors.

**Next step:** **Phase B — pgvector recommendations** (~5 days, biggest user-visible leap left). Quick wins also queued: §39 SEO closing (`noindex` thin pages, canonical category+profile, K2 redirect map), §41 admin polish remainder (per-row "Last edited by" stamps, POST endpoints stamping on create, merge Reports + Data Quality inbox), §42 per-category review milestones + streak milestones, §43 React Compiler trial + PPR for detail pages, per-category visual identity (UI_AUDIT.md option B — ~1.5 weeks). See PROGRESS.md §0 "open follow-ups" for the full ordered roadmap.

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql` (admin-review note column)
- `scripts/sql/038-nearby-related-section.sql` (distance-based related items)
- `scripts/sql/039-user-admin-warnings.sql` (session 28) — `users.admin_warnings jsonb` audit log
- `scripts/sql/040-admin-audit-stamps.sql` (session 29) — `modified_by` + `modified_at` on 5 admin tables (Applied 2026-05-19)

All idempotent. Migrations 039 + 040 must land before the warn flow + RecentChanges widget can populate. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §7 confidence-tiered match, §21 image schema (shipped), §37 layout system, §38 related sections, §40 review writing flow + Gemini coaching, §41 admin IA + review-reports consolidation + warnings reader + audit log + confirm-before-save, §42 review milestones, §43 runtime upgrade), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel — Reviews now also handles reports; Overview surfaces recent changes), PROGRESS.md (build log), DEPLOY.md (migration checklist)
