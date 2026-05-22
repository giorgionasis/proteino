# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 37):** Auth + extension tables + ~1955 items / 627 users. **Search v3** (Gemini, structured-attribute extraction — amenities / seasons / diet / language / country / when / awards / level / origin / pages / calories / yields / trilogy), submission v2, notifications dispatcher, security settings, region picker, achievement celebration (suggestions + reviews + per-category + streak milestones), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO, admin-editable category metadata via `category_meta` resolver (now consumed by every admin tool, not just the high-visibility user-facing ones), structured amenities filter (food/bars/hotels) — vocab now DB-sourced, no drift between filter UI and Gemini prompt — manual-list mode for Collections via Explorer matched-IDs handoff. Runtime: Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack) + React Compiler 1.0.

**Session 37 was a pure follow-up sweep** — four "concrete + sized" items from CLAUDE.md's open-follow-ups list, all shipped: admin tools through `category_meta` resolver (commit `1733520`), shared `parseEventDate` so `match.ts:when` handles K2's `DD/MM/YYYY` (commit `36dd82e`), amenity vocab sourced from `category_filters.options` instead of hardcoded in `taxonomy.ts` (commit `e4311d3`), first-paint flash audit pass 2 on `/admin/content/regions` + `/admin/content/activities` + `/admin/users` (commit `548bbd0`). Zero new migrations. **No concrete+sized follow-ups remain** for the first time since session 30.

**Session 36 shipped two things** — AI search v3 (commit `be06762`, landed upstream before that session opened — no new migrations, every column it targets was already on items + extension tables; PROMPT_VERSION v16 → v17 invalidated the 30-day search cache) + a project-docs restructure (CLAUDE.md 2624 → 280 lines, two new topical docs under `docs/`, session-end discipline rule locked: PROGRESS.md is the append-only session log, CLAUDE.md is a living briefing).

**Session 35** — five shipped pieces plus one shipped-then-reverted experiment: admin flash fix on `/admin/categories` + `/admin/content/filters` (server-fetch + skip-flag pattern); Collection manual-list mode + Explorer matched-IDs handoff (migration 042); vibes tag-pattern filter (043) shipped then reverted ("filtering should be structured queries, not regex over tags"); structured amenities filter (migration 044) using existing `information.amenities` / `facilities` columns; 5 user-facing CATEGORIES consumers routed through `category_meta` resolver. Full narrative: `PROGRESS.md` "Previous state — session 35".

`npx tsc --noEmit` → 0 errors. `npx next build` → green with React Compiler (112 routes).

**🎯 Next move — pick one from the blocked-on-decisions list, or the long tail:**

Blocked on user decisions:
- **Phase B day 1** (pgvector recs) — embedding provider lock (OpenAI `text-embedding-3-small` is the recommendation; matches the existing `vector(1536)` column shape) + backfill scope (prod directly vs dev branch first). 5-day plan in `docs/architecture.md` → "Recommendations (Phase B)". Cost at 1000 DAU ≈ $60/month total (item embedding + user embedding + Haiku rerank at 2/user/day cap).
- **Biblionet subcategory taxonomy** — expand to ~18 subcategories vs a two-tier UI on top of the 9 categories. Plan in `docs/architecture.md` → "Biblionet integration".

Long tail (no single one is sized — pick one and it becomes sized):
- §39 SEO closing (admin fields for contentRating / ISBN / numberOfEpisodes / starRating / openingHours / organizer / recipe video; sitemap split at 5K; image sitemap; `noindex` on thin pages; K2→new URL 301 map)
- Real legal copy on `/terms` + `/privacy`
- Drop legacy `ratings` + `comments` tables (after archive review)
- Promote useful admin-only facets to public filters (case-by-case)
- Per-category visual identity polish

**Migrations to apply on next deploy:**
- `scripts/sql/035-content-reports-add-review-type.sql` (session 23)
- `scripts/sql/036-moments-review-published.sql` (session 26)
- `scripts/sql/037-items-admin-review.sql`
- `scripts/sql/038-nearby-related-section.sql`
- `scripts/sql/039-user-admin-warnings.sql` (session 28)
- `scripts/sql/040-admin-audit-stamps.sql` (session 29) — applied 2026-05-19
- `scripts/sql/041-categories-admin-metadata.sql` (session 34) — applied 2026-05-22
- `scripts/sql/042-collections-manual-item-ids.sql` (session 35) — `collections.manual_item_ids jsonb` for manual-list mode
- `scripts/sql/043-public-vibes-filters-rollback.sql` (session 35) — drops the rolled-back 043 seed if applied (no-op otherwise)
- `scripts/sql/044-public-amenities-filters.sql` (session 35) — seeds the proper structured `amenities` filter rows for food + bars + hotels

All idempotent. Apply 043-rollback BEFORE 044 (only matters if 043 was on prod; rollback + 044 leaves your DB in the right end-state regardless). Set `NEXT_PUBLIC_SITE_URL=https://proteino.gr` on Vercel for the SEO layer.

**Full specs:**
- `CLAUDE.md` — always-loaded briefing: project pitch · invariants · decisions log · open follow-ups · key files · session-end discipline
- `docs/architecture.md` — deep on schema, AI service + cache, search v3 internals, Phase B recs plan, dispatcher, moments, layout/related-sections, filters, category resolver, SEO, reports, Biblionet, runtime, onboarding
- `docs/design-system.md` — deep on tokens, layout chrome, detail-page rules, image pipeline, icons, motion + CSS gotchas, components catalog, admin UI, profile + review + achievement visuals, PWA rules
- `AI.md` — AI service implementation guide + Phase B catalogue (overlaps with `docs/architecture.md` "AI service layer" + "Recommendations" — kept as a domain deep-dive)
- `HOOKS.md` — gamification + notification triggers status table
- `ADMIN.md` — admin panel reference
- `PROGRESS.md` — append-only session log (this file's narrative source)
- `DEPLOY.md` — migration checklist + env vars
