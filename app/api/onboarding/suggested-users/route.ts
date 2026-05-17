import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_SLUGS } from "@/constants/categories";

/**
 * GET /api/onboarding/suggested-users?categories=movies,series
 *
 * Returns two ranked groups:
 *
 *   tight  — Specialists in the user's picked categories. Top N users
 *            by `matched` count (suggestions made inside the picked
 *            categories). These are the high-confidence matches.
 *   broad  — The next ring. Active suggesters who aren't specialists
 *            in the user's exact interests but still contribute heavily
 *            overall. Falls back to global top suggesters when no
 *            categories are provided.
 *
 * Both lists exclude the viewer and any user the viewer already
 * follows — onboarding only ever shows actionable rows.
 *
 * Each user comes back with `taste`: a one-line "what they're known
 * for" — top category breakdown (e.g. "78 ταινίες · 12 βιβλία") so
 * cards read like personalities instead of follow counts. The
 * personality data is computed from the suggestions corpus that was
 * already needed for ranking, so the extra cost is zero queries.
 *
 * If a user appears in `tight`, they don't appear in `broad`.
 */

const TIGHT_LIMIT = 3;
const BROAD_LIMIT = 6;

const CAT_LABEL: Record<string, { sg: string; pl: string }> = {
  movies:  { sg: "ταινία",   pl: "ταινίες" },
  series:  { sg: "σειρά",    pl: "σειρές" },
  books:   { sg: "βιβλίο",   pl: "βιβλία" },
  food:    { sg: "μέρος",    pl: "μέρη φαγητού" },
  recipes: { sg: "συνταγή",  pl: "συνταγές" },
  bars:    { sg: "μπαρ",     pl: "μπαρ" },
  hotels:  { sg: "ξενοδοχείο", pl: "ξενοδοχεία" },
  theater: { sg: "παράσταση", pl: "παραστάσεις" },
  events:  { sg: "εκδήλωση",  pl: "εκδηλώσεις" },
};

interface Suggester {
  id:               string;
  handle:           string;
  display_name:     string | null;
  avatar_url:       string | null;
  suggestion_count: number;
  level:            number | null;
  avg_quality_score: number | null;
  matched:          number;
  /** Per-category counts inside the user's picked categories.
   *  Used to render `taste`. */
  byCat:            Record<string, number>;
  /** Pre-rendered one-line taste line. */
  taste:            string;
}

function formatCount(n: number, cat: string): string {
  const label = CAT_LABEL[cat];
  if (!label) return `${n} προτάσεις`;
  return `${n} ${n === 1 ? label.sg : label.pl}`;
}

function buildTaste(byCat: Record<string, number>, fallbackCount: number): string {
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `${fallbackCount} ${fallbackCount === 1 ? "πρόταση" : "προτάσεις"}`;
  }
  // Show up to 2 categories joined with " · " (e.g. "78 ταινίες · 12 βιβλία").
  return entries.slice(0, 2).map(([cat, n]) => formatCount(n, cat)).join(" · ");
}

export async function GET(req: NextRequest) {
  const sb  = await createClient();
  const url = new URL(req.url);
  const raw = url.searchParams.get("categories") ?? "";
  const chosen = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s));

  const { data: { user } } = await sb.auth.getUser();
  const viewerId = user?.id ?? null;

  // Pre-fetch follows so we don't show "Ακολούθησε" on users we're
  // already following — saves the user a moment of confusion.
  let alreadyFollowing = new Set<string>();
  if (viewerId) {
    const { data } = await sb
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId);
    alreadyFollowing = new Set((data ?? []).map((r: any) => r.following_id));
  }

  // Build a working pool: every active suggester, with `matched`
  // counting suggestions IN the picked categories. When no categories
  // are picked, matched = 0 for everyone and we fall through to the
  // global ranking by `suggestion_count`.
  const pool = new Map<string, Suggester>();

  if (chosen.length > 0) {
    const { data: rows, error } = await sb
      .from("suggestions")
      .select(`
        user_id,
        users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, suggestion_count, level, avg_quality_score),
        items!inner(category)
      `)
      .eq("is_published", true)
      .in("items.category", chosen)
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const r of rows ?? []) {
      const u: any = (r as any).users;
      const itemCat: string | undefined = (r as any).items?.category;
      if (!u || u.id === viewerId || alreadyFollowing.has(u.id)) continue;
      const cur = pool.get(u.id);
      if (cur) {
        cur.matched += 1;
        if (itemCat) cur.byCat[itemCat] = (cur.byCat[itemCat] ?? 0) + 1;
      } else {
        pool.set(u.id, {
          id:                u.id,
          handle:            u.handle,
          display_name:      u.display_name,
          avatar_url:        u.avatar_url,
          suggestion_count:  u.suggestion_count ?? 0,
          level:             u.level ?? null,
          avg_quality_score: u.avg_quality_score ?? null,
          matched:           1,
          byCat:             itemCat ? { [itemCat]: 1 } : {},
          taste:             "",
        });
      }
    }
  }

  // Bring in global top suggesters as a fallback / broad pool, so we
  // always have enough rows even when the user picked a niche set or
  // categories are empty.
  {
    const { data: top } = await sb
      .from("users")
      .select("id, handle, display_name, avatar_url, suggestion_count, level, avg_quality_score")
      .gt("suggestion_count", 0)
      .order("suggestion_count", { ascending: false })
      .limit(TIGHT_LIMIT + BROAD_LIMIT + 5);

    for (const u of top ?? []) {
      const id = (u as any).id as string;
      if (id === viewerId || alreadyFollowing.has(id) || pool.has(id)) continue;
      pool.set(id, {
        id,
        handle:            (u as any).handle,
        display_name:      (u as any).display_name,
        avatar_url:        (u as any).avatar_url,
        suggestion_count:  (u as any).suggestion_count ?? 0,
        level:             (u as any).level ?? null,
        avg_quality_score: (u as any).avg_quality_score ?? null,
        matched:           0,
        byCat:             {},
        taste:             "",
      });
    }
  }

  // Compute taste line per user. Specialists get a category-broken-down
  // line; broad-pool users (no matched suggestions in scope) fall back
  // to the total suggestion_count.
  const all = Array.from(pool.values());
  for (const u of all) {
    u.taste = buildTaste(u.byCat, u.suggestion_count);
  }

  // Tight = specialists (matched > 0), ranked by matched count desc,
  // breaking ties on suggestion_count. Capped at TIGHT_LIMIT.
  const tight = all
    .filter((u) => u.matched > 0)
    .sort((a, b) => b.matched - a.matched || b.suggestion_count - a.suggestion_count)
    .slice(0, TIGHT_LIMIT);

  const tightIds = new Set(tight.map((u) => u.id));

  // Broad = everyone else (matched === 0 OR didn't make the tight cut),
  // ranked by suggestion_count desc. Capped at BROAD_LIMIT.
  const broad = all
    .filter((u) => !tightIds.has(u.id))
    .sort((a, b) => b.suggestion_count - a.suggestion_count)
    .slice(0, BROAD_LIMIT);

  // Strip internal `byCat` from the wire payload — only `taste` is
  // needed client-side.
  const strip = (u: Suggester) => {
    const { byCat: _omit, ...rest } = u;
    void _omit;
    return rest;
  };
  return NextResponse.json({
    tight: tight.map(strip),
    broad: broad.map(strip),
  });
}
