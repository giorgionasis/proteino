import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_SLUGS } from "@/constants/categories";
import { safeImageUrl } from "@/lib/image-url";

/**
 * GET /api/onboarding/reward-feed?categories=movies,series,books
 *
 * Returns a small carousel per selected category — top-rated items
 * with enough confidence (rating_count >= 1) so the onboarding step
 * shows real content, not stale or empty slots.
 *
 * Excludes items the user has already suggested. A returning user
 * wouldn't be impressed by "your top recommendation: the thing you
 * yourself added last week."
 *
 * Capped at 4 categories × 6 items each to keep payload small and the
 * UI focused.
 */

const MAX_CATS = 4;
const PER_CAT  = 6;

interface RewardItem {
  id:         string;
  title:      string;
  cover_url:  string | null;
  avg_rating: number | null;
  href:       string;
  /** Short reason this item is here (e.g. "Επειδή λατρεύεις σινεμά").
   *  Shown as a coral subtitle under the card to make the AI's pick
   *  feel intentional rather than generic-popular. */
  reason:     string;
}

interface RewardSection {
  category: string;
  label:    string;
  items:    RewardItem[];
}

const LABEL: Record<string, string> = {
  movies:   "Ταινίες",
  series:   "Σειρές",
  books:    "Βιβλία",
  food:     "Φαγητό",
  recipes:  "Συνταγές",
  bars:     "Μπαρ & Καφέ",
  hotels:   "Ξενοδοχεία",
  theater:  "Θέατρο",
  events:   "Εκδηλώσεις",
};

// "Because you said X" — phrased to read naturally in Greek as the
// completion of "this item is here because…". Indexed by category.
const REASON_INTEREST: Record<string, string> = {
  movies:   "επέλεξες σινεμά",
  series:   "επέλεξες σειρές",
  books:    "λατρεύεις τα βιβλία",
  food:     "ψάχνεις πού να φας",
  recipes:  "θες να μαγειρέψεις",
  bars:     "θες κάπου για ποτό",
  hotels:   "ταξιδεύεις",
  theater:  "θες παραστάσεις",
  events:   "ψάχνεις τι παίζει",
};

/**
 * Choose a one-line reason for the card. Three signal tiers, in
 * order of strength:
 *
 *   1. Item has community validation (rating ≥ 4.5 with ≥ 3 raters)
 *      → "Top rated από την κοινότητα" — appeals to social proof.
 *   2. Item has a decent rating (≥ 4.0)
 *      → "Με ★ X.X · N αξιολογήσεις" — leans on the score itself.
 *   3. Item is in scope but lacks ratings
 *      → "Επειδή <interest>" — the AI's "we listened to you" reason.
 *
 * Always returns something — onboarding cards never appear naked.
 */
function reasonFor(item: { avg_rating: number | null; rating_count: number | null }, cat: string): string {
  const r  = item.avg_rating ?? 0;
  const rc = item.rating_count ?? 0;
  if (r >= 4.5 && rc >= 3) return "Top rated από την κοινότητα";
  if (r >= 4.0 && rc >= 1) return `Με ★ ${r.toFixed(1)} · ${rc} ${rc === 1 ? "ψήφο" : "ψήφους"}`;
  return `Επειδή ${REASON_INTEREST[cat] ?? "σου ταιριάζει"}`;
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const raw     = url.searchParams.get("categories") ?? "";
  const chosen  = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s))
    .slice(0, MAX_CATS);

  if (chosen.length === 0) {
    return NextResponse.json({ sections: [] });
  }

  const sb = await createClient();

  // Collect the IDs of items the user has already suggested. Excluded
  // from the reward feed so the user isn't shown their own work.
  let ownIds: string[] = [];
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: own } = await sb
      .from("suggestions")
      .select("item_id")
      .eq("user_id", user.id);
    ownIds = (own ?? []).map((r: any) => r.item_id).filter(Boolean);
  }

  const sections = await Promise.all(
    chosen.map(async (cat): Promise<RewardSection> => {
      // Two-tier strategy. Tier A: items with a real rating AND a
      // cover image — these look great in the carousel and validate
      // the platform. Tier B (only if A came back empty for thinly-
      // populated categories): drop the rating floor but keep the
      // cover requirement so we never show broken placeholders.
      const baseSelect = "id, title, slug, cover_url, avg_rating, rating_count";

      let tierAQ = sb
        .from("items")
        .select(baseSelect)
        .eq("category", cat)
        .eq("is_published", true)
        .not("cover_url", "is", null)
        .gte("rating_count", 1);
      if (ownIds.length > 0) {
        tierAQ = tierAQ.not("id", "in", `(${ownIds.join(",")})`);
      }
      const tierA = await tierAQ
        .order("avg_rating", { ascending: false })
        .order("rating_count", { ascending: false })
        .limit(PER_CAT);

      let data: any[] = tierA.data ?? [];
      if (data.length === 0) {
        let tierBQ = sb
          .from("items")
          .select(baseSelect)
          .eq("category", cat)
          .eq("is_published", true)
          .not("cover_url", "is", null);
        if (ownIds.length > 0) {
          tierBQ = tierBQ.not("id", "in", `(${ownIds.join(",")})`);
        }
        const tierB = await tierBQ
          .order("avg_rating", { ascending: false })
          .limit(PER_CAT);
        data = tierB.data ?? [];
      }

      const items: RewardItem[] = data.map((r: any) => ({
        id:         r.id,
        title:      r.title,
        cover_url:  safeImageUrl(r.cover_url),
        avg_rating: r.avg_rating ?? null,
        href:       `/${cat}/${stripPrefix(r.slug)}`,
        reason:     reasonFor(r, cat),
      }));

      return { category: cat, label: LABEL[cat] ?? cat, items };
    }),
  );

  // Drop any section that came back empty (rare, but possible for
  // sparsely-populated categories on a fresh deploy). Never confront
  // the user with "0 items in your favourite category".
  return NextResponse.json({
    sections: sections.filter((s) => s.items.length > 0),
  });
}
