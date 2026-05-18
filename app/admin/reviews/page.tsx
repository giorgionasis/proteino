import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewsAdminTable, type UnresolvedReviewRow, type ReportEntry } from "@/components/admin/ReviewsAdminTable";

export const dynamic = "force-dynamic";

/**
 * /admin/reviews — first-class moderation surface for the `reviews` table
 * (migration 016). Reports filed against reviews live in `content_reports`
 * with `target_type='review'` (migration 035) — they used to be handled on
 * a separate `/admin/reports` page, but that's been folded into here as of
 * the session-28 consolidation: a top "Unresolved" section lists every
 * review with pending reports, while the main paginated list sits below
 * with a REPORTS column on every row (black filled = unresolved, green
 * filled = resolved-history, plain "0" = pristine).
 *
 * Suggestions can't be user-reported (per product decision — admins curate
 * them), so reviews are the only `target_type` in practice.
 *
 * Server fetches: stat counters + the unresolved-reports slice (always
 * shown above the main list). Client handles filters / sort / pagination /
 * inline hide + per-report Keep/Hide via the admin browser client.
 */
export default async function ReviewsAdminPage() {
  const sb = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Pull unresolved review-reports first so we know which review IDs need
  // the urgent top-section treatment. Cap at 200 — typical volume is far
  // below this, and bigger backlogs are an operational problem the admin
  // should clear before pagination matters.
  const { data: unresolvedReports } = await sb
    .from("content_reports")
    .select("id, target_id, reason, description, created_at, reporter_id, users:reporter_id(display_name, handle)")
    .eq("target_type", "review")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(200);

  const unresolvedRows = (unresolvedReports ?? []) as any[];
  const flaggedReviewIds = Array.from(new Set(unresolvedRows.map((r) => r.target_id))) as string[];

  // Hydrate the flagged reviews. We need full row context (author + item)
  // because they render in the same shape as the main list.
  let unresolvedReviews: UnresolvedReviewRow[] = [];
  if (flaggedReviewIds.length > 0) {
    const { data: revs } = await sb
      .from("reviews")
      .select(`
        id, rating, reflection, created_at, user_id, item_id,
        vote_up, vote_down, is_hidden, hidden_reason,
        users!reviews_user_id_fkey(display_name, handle, avatar_url),
        items!inner(id, title, category, slug, cover_url)
      `)
      .in("id", flaggedReviewIds);

    const reportsByReview = new Map<string, ReportEntry[]>();
    for (const rr of unresolvedRows) {
      const list = reportsByReview.get(rr.target_id) ?? [];
      list.push({
        id: rr.id,
        reason: rr.reason,
        description: rr.description,
        created_at: rr.created_at,
        reporter_id: rr.reporter_id,
        reporter_name: rr.users?.display_name ?? "Άγνωστος",
        reporter_handle: rr.users?.handle ?? null,
      });
      reportsByReview.set(rr.target_id, list);
    }

    unresolvedReviews = ((revs ?? []) as any[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      reflection: r.reflection,
      created_at: r.created_at,
      user_id: r.user_id,
      item_id: r.item_id,
      vote_up: r.vote_up ?? 0,
      vote_down: r.vote_down ?? 0,
      is_hidden: r.is_hidden ?? false,
      hidden_reason: r.hidden_reason ?? null,
      authorName: r.users?.display_name ?? "—",
      authorHandle: r.users?.handle ?? null,
      authorAvatar: r.users?.avatar_url ?? null,
      itemTitle: r.items?.title ?? "—",
      itemCategory: r.items?.category ?? "",
      itemSlug: r.items?.slug ?? null,
      itemCover: r.items?.cover_url ?? null,
      reports: reportsByReview.get(r.id) ?? [],
    }));

    // Preserve the order of the most-recent unresolved report — keeps the
    // freshest issue at the top of the Unresolved section.
    const orderIndex = new Map(flaggedReviewIds.map((id, i) => [id, i] as const));
    unresolvedReviews.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  }

  const [totalRes, last24Res, hiddenRes] = await Promise.all([
    sb.from("reviews").select("id", { count: "exact", head: true }),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).eq("is_hidden", true),
  ]);

  return (
    <ReviewsAdminTable
      stats={{
        total: totalRes.count ?? 0,
        last24h: last24Res.count ?? 0,
        unresolved: unresolvedReviews.length,
        hidden: hiddenRes.count ?? 0,
      }}
      unresolved={unresolvedReviews}
    />
  );
}
