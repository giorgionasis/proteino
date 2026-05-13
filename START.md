# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 14 (App Router) + Tailwind + Supabase (PostgreSQL + Auth + Storage)

**Current state (session 23):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini), notifications dispatcher, security settings, region picker, achievement celebration, onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, postMessage iframe scroll, manual item-source picker for static carousels — all shipped. Session 23 closed Phase A.6, swept the codebase for logic/bug inconsistencies (legacy `ratings`/`comments` paths, stale `collection_placements` references, redundant own-context UI, broken Follow buttons), and added a full Google rich-results SEO layer (JSON-LD per category, sitemap.ts, robots.ts, Open Graph + Twitter Card metadata).

**Next step:** Sitemap/indexing strategy + 301 redirect map from legacy K2 URLs (need sample of old format). Then Phase B (pgvector recommendations, ~5 days) and Phase C (more hook-driven notification loops). See PROGRESS.md §0 "open follow-ups" + §3 for the full ordered roadmap.

**Migration to apply on next deploy:** `scripts/sql/035-content-reports-add-review-type.sql` — adds `'review'` to `content_reports.target_type` CHECK so review reports route to the right admin lookup. Idempotent. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §37 layout system, §38 related sections), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist)
