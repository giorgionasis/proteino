# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 14 (App Router) + Tailwind + Supabase (PostgreSQL + Auth + Storage)

**Current state (session 24):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini), notifications dispatcher, security settings, region picker, achievement celebration, onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO (JSON-LD per category + sitemap + OG/Twitter Card metadata) — all shipped. **Session 24** swept the 7 legacy detail pages (Series, Bars, Hotels, Food, Recipes, Theater, Events) to the Figma-aligned template: added missing featured suggester blocks (Bars + Series), replaced every gray-circle person placeholder with `<PersonBubble>` (deterministic colored initials + optional real-avatar override), hid every empty `"—"` cell platform-wide, wired every map button to real Google Maps URLs, killed dead CTAs. `npx tsc --noEmit` → 0 errors.

**Next step:** **Phase B — pgvector recommendations** (~5 days, biggest user-visible leap left — the 1953-item corpus is finally rich enough). Side quests: SEO redirects from legacy K2 URLs (need sample of old URL format), per-category visual identity (UI_AUDIT.md option B — bigger visual leap, ~1.5 weeks), remaining A.5 punch list. See PROGRESS.md §0 "open follow-ups" + §3 for the full ordered roadmap.

**Migration to apply on next deploy:** `scripts/sql/035-content-reports-add-review-type.sql` — adds `'review'` to `content_reports.target_type` CHECK so review reports route to the right admin lookup. Idempotent. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §37 layout system, §38 related sections), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel), PROGRESS.md (build log), DEPLOY.md (migration checklist)
