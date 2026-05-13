# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 14 (App Router) + Tailwind + Supabase (PostgreSQL + Auth + Storage)

**Current state (session 22):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini structured filters), submission v2 (Gemini full-text match), notifications dispatcher, security settings, region picker, achievement celebration, onboarding, moments, submission funnel tracking — all shipped. Page composition (category + home) now DB-driven via `page_sections` + `/admin/layout` with dnd-kit + mobile-frame iframe preview. Detail pages support admin-defined "More from {axis}" carousels via `related_sections_config` + `/admin/related-sections`.

**Next step:** Finalize AI for search and submission. Then Phase B (pgvector recommendations, ~5 days) and Phase C (more hook-driven notification loops). See PROGRESS.md §3 for the full ordered roadmap.

**Full specs:** CLAUDE.md (architecture — §37 layout system, §38 related sections), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist)
