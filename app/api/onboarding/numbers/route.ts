import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_SLUGS } from "@/constants/categories";

/**
 * GET /api/onboarding/numbers?categories=movies,books
 *
 * Live counts shown on the OnboardingSyncing screen so the "preparing
 * your feed" beat reads like real work instead of a generic spinner.
 *
 * Returns three numbers:
 *
 *   suggestionsInScope — count of published items in the user's
 *     picked categories, OR total published items when no categories
 *     are picked (the hook-skip path).
 *
 *   strongMatches — items in scope with avg_rating >= 4.0. The
 *     "actually good" pool the feed will draw from.
 *
 *   peopleInScope — distinct users with at least one published
 *     suggestion in the user's categories (or globally for skip).
 *
 * Lightweight queries — three counts in parallel. Cached at the edge
 * for 60s since these numbers don't move per-second.
 */

export const revalidate = 60;

type CountResult = { count: number | null };

export async function GET(req: NextRequest) {
  const sb  = createClient();
  const url = new URL(req.url);
  const raw = url.searchParams.get("categories") ?? "";
  const chosen = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s));

  const hasInterests = chosen.length > 0;

  // Parallel counts. `head: true` keeps responses tiny.
  const totalP = sb
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .then((r) => (r as unknown as CountResult).count ?? 0);

  const scopedP = hasInterests
    ? sb
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .in("category", chosen)
        .then((r) => (r as unknown as CountResult).count ?? 0)
    : totalP;

  const strongP = hasInterests
    ? sb
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .in("category", chosen)
        .gte("avg_rating", 4.0)
        .then((r) => (r as unknown as CountResult).count ?? 0)
    : sb
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .gte("avg_rating", 4.0)
        .then((r) => (r as unknown as CountResult).count ?? 0);

  // Distinct contributors in scope. For the count of distinct users
  // who suggested in the picked categories, we can't head:true a
  // GROUP BY, so pull the (small) set of user_ids and de-dupe in JS.
  const peopleP = hasInterests
    ? sb
        .from("suggestions")
        .select("user_id, items!inner(category)")
        .eq("is_published", true)
        .in("items.category", chosen)
        .limit(3000)
        .then((r) => {
          const ids = new Set<string>();
          for (const row of ((r as any).data ?? []) as Array<{ user_id: string }>) {
            if (row.user_id) ids.add(row.user_id);
          }
          return ids.size;
        })
    : sb
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("suggestion_count", 0)
        .then((r) => (r as unknown as CountResult).count ?? 0);

  const [total, scoped, strong, people] = await Promise.all([
    totalP,
    scopedP,
    strongP,
    peopleP,
  ]);

  return NextResponse.json({
    suggestionsInScope: scoped,
    strongMatches:      strong,
    peopleInScope:      people,
    totalSuggestions:   total,
  });
}
