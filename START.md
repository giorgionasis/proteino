# Proteino — Quick Context

Mobile-first community recommendation platform (Greek market). Users suggest and discover books, movies, series, recipes, food, bars, hotels, theater, events. AI-powered submission + search flows.

**Stack:** Next.js 14 (App Router) + Tailwind + Supabase (PostgreSQL + Auth + Storage)

**Current state:** Auth complete. All pages (home, category, detail, profile) wired to real Supabase data (1953 items, 627 users from MySQL migration). BookDetail rebuilt to match Figma. Other detail pages need same Figma alignment pass.

**Next step:** Populate extension tables (`item_books`, `item_movies`, etc.) from `metadata.extra_fields_raw` — data is currently in wrong place (jsonb with numeric keys instead of proper typed columns). Blocks filtering, search, and AI features.

**Full specs:** CLAUDE.md (architecture), AI.md (AI service), HOOKS.md (gamification), PROGRESS.md (build log)
