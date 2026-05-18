# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 28):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini), notifications dispatcher, security settings, region picker, achievement celebration (suggestions AND reviews), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. Runtime is Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack). **Session 28** consolidated admin moderation: dropped the standalone `/admin/reports` page; review reports now live inside `/admin/reviews` as a top "Unresolved (N)" section + a 3-state REPORTS column (black=unresolved, green=resolved-history, "0"=pristine). Drawer reframed as "Είναι έγκυρη η αναφορά;" with two answer buttons. Added a warn endpoint (`POST /api/admin/users/[id]/warn`) backed by the new `users.admin_warnings jsonb` audit log (migration 039) — kinds: `review_hidden`, `abusive_reporter`, `manual`. Reporter abuse signal (auto-surfaced when dismissed-ratio crosses 50%) + checkbox "warn review author" on hide + manual warnings UI all wired. Audit log is read on `/admin/users` via a new Warnings column + side drawer.

**Session 27** was a runtime upgrade: Node 20 → 22 LTS + React 18 → 19.2.6 + Next 14.2.35 → 16.2.6. Single commit, all green. Dev boots in 171ms now (Turbopack). See CLAUDE.md §43 for the full breakdown. **Session 26** added: review-milestone celebration modals (1st / 5th / 10th / 25th / 50th first-time review) wired through the same DB-driven moments system as suggestion milestones; admin can edit copy/timing via `/admin/moments` without a deploy. Plus a FLIP push-right animation on the reviews carousel.

`npx tsc --noEmit` → 0 errors.

**Next step:** **Phase B — pgvector recommendations** (~5 days, biggest user-visible leap left — the 1953-item corpus is finally rich enough). Quick wins also queued: AI-coached review writing (Gemini overlay, ~1h), SEO redirects from legacy K2 URLs (need sample of old URL format), per-category visual identity (UI_AUDIT.md option B — ~1.5 weeks), remaining A.5 punch list. See PROGRESS.md §0 "open follow-ups" + §3 for the full ordered roadmap.

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql` (admin-review note column)
- `scripts/sql/038-nearby-related-section.sql` (distance-based related items)
- `scripts/sql/039-user-admin-warnings.sql` (session 28) — `users.admin_warnings jsonb` audit log

All idempotent. Migration 039 must land before the warn flow can persist. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §37 layout system, §38 related sections, §40 review writing flow, §41 admin IA + review-reports consolidation + warnings reader, §42 review milestones, §43 runtime upgrade), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel — Reviews now also handles reports), PROGRESS.md (build log), DEPLOY.md (migration checklist)
