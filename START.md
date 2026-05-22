# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 16 (App Router + Turbopack) + React 19 + Tailwind + Supabase (PostgreSQL + Auth + Storage). Node 22 LTS.

**Current state (session 36):** Auth + extension tables + ~1955 items / 627 users. **Search v3** (Gemini, structured-attribute extraction — amenities / seasons / diet / language / country / when / awards / level / origin / pages / calories / yields / trilogy), submission v2, notifications dispatcher, security settings, region picker, achievement celebration (suggestions + reviews + per-category + streak milestones), onboarding, moments, submission funnel, admin-controlled layouts via `page_sections`, admin-configurable related-section carousels, Google rich-results SEO, admin-editable category metadata via `category_meta` resolver, structured amenities filter (food/bars/hotels), manual-list mode for Collections via Explorer matched-IDs handoff — all shipped. Runtime: Node 22 LTS + React 19.2.6 + Next 16.2.6 (Turbopack) + React Compiler 1.0.

**Session 36 shipped two things** — AI search v3 (commit `be06762`, landed upstream before this session opened — no new migrations, every column it targets was already on items + extension tables; PROMPT_VERSION v16 → v17 invalidated the 30-day search cache) + a project-docs restructure (CLAUDE.md 2624 → 280 lines, two new topical docs under `docs/`, session-end discipline rule locked: PROGRESS.md is the append-only session log, CLAUDE.md is a living briefing).

**Session 35** — five shipped pieces plus one shipped-then-reverted experiment: admin flash fix on `/admin/categories` + `/admin/content/filters` (server-fetch + skip-flag pattern); Collection manual-list mode + Explorer matched-IDs handoff (migration 042); vibes tag-pattern filter (043) shipped then reverted ("filtering should be structured queries, not regex over tags"); structured amenities filter (migration 044) using existing `information.amenities` / `facilities` columns; 5 user-facing CATEGORIES consumers routed through `category_meta` resolver. Full narrative: `PROGRESS.md` "Previous state — session 35".

**Session 34** wrapped the Explorer expansion + Admin gap C: matchesFilter Class A wired 8 silently no-op filters; `ADMIN_FACETS` registry with 7 facet kinds; searchable combobox replaced chip dumps for people fields; Save-as-Collection deeplink (filter portion); migration 041 created `category_meta` table.

`npx tsc --noEmit` → 0 errors. `npx next build` → green with React Compiler (112 routes).

**🎯 Next move (concrete + sized) — pick one:**
- **Admin tools → resolver** (~30 min mechanical) — 7 admin files still read `constants/categories.ts` directly. Lowest risk.
- **First-paint flash audit pass 2** (~1h each) — apply session-35 server-fetch + skip-flag pattern to `/admin/content/regions`, `/admin/content/activities`, `/admin/users`.
- **Amenity vocab → DB-driven** (~1h) — `taxonomy.ts:159-162` has canonical keys hardcoded; if admin edits migration 044, the Gemini prompt drifts. Read from `category_filters` rows.
- **Public `match.ts:when` parser fix** (narrow) — `new Date(d)` mis-parses K2's `DD/MM/YYYY`; replace with `parseEventDate`.

**Blocked on user decisions:** Phase B day 1 (embedding provider lock + backfill scope — `docs/architecture.md` → "Recommendations") · Biblionet subcategory taxonomy (~18 expanded vs two-tier UI — `docs/architecture.md` → "Biblionet").

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
