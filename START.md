# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 14 (App Router) + Tailwind + Supabase (PostgreSQL + Auth + Storage)

**Current state (session 25):** Auth + extension tables + 1953 items / 627 users. Search v2 (Gemini), submission v2 (Gemini), notifications dispatcher, security settings, region picker, achievement celebration, onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO — all shipped. **Session 25** rebuilt two big surfaces:
- **Admin IA + visual refresh** — sidebar regrouped into 6 jobs-based sections (Moderation / Content / Taxonomy / Engagement / People / Platform) with tone dots + soft coral pill active state. Overview rewritten as a control room (Needs Attention attention cards with 14-day sparklines, Last-7-Days metrics with sparklines, Quick Actions, time-aware greeting, soft radial coral backdrop). Page subtitles wired on Layout / Moments / Extra Fields / Collections.
- **`/admin/reviews` — first-class moderation surface** for the new `reviews` table (which had zero admin UI before). Stats strip + filters + 7 sort options + inline hide/unhide with required reason. Legacy K2 comments moved to `/admin/legacy-comments` (renamed, kept under Platform).
- **Review-writing flow redesign** — old inline rate-this-item replaced by `<RateThisItem>` (idle → composing → saved state machine with category-aware placeholders, calibration labels per star, char-count tiered praise, soft progress bar). After Publish: success modal opens, on close the new review fades into carousel position 0 with `review-card-appear` keyframe + other reviews shift right. Old `useReview` hook + `ReviewComposerModal` deleted.
- **Long-standing bug fixed**: page.tsx was calling `auth.getUser()` on the admin (service-role) client, which silently returned null user. Switched to cookie-aware auth client. This silently fixed bookmark prefill + my-review prefill across all 9 detail pages.

`npx tsc --noEmit` → 0 errors.

**Next step:** **Phase B — pgvector recommendations** (~5 days, biggest user-visible leap left — the 1953-item corpus is finally rich enough). Side quests: SEO redirects from legacy K2 URLs (need sample of old URL format), per-category visual identity (UI_AUDIT.md option B — bigger visual leap, ~1.5 weeks), remaining A.5 punch list. See PROGRESS.md §0 "open follow-ups" + §3 for the full ordered roadmap.

**Migration to apply on next deploy:** `scripts/sql/035-content-reports-add-review-type.sql` — adds `'review'` to `content_reports.target_type` CHECK so review reports route to the right admin lookup. Idempotent. Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:** CLAUDE.md (architecture — §5 reviews/legacy tables, §37 layout system, §38 related sections, §40 review writing flow), AI.md (AI service), HOOKS.md (gamification), ADMIN.md (admin panel — Reviews + Legacy Comments split), PROGRESS.md (build log), DEPLOY.md (migration checklist)
