import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewsAdminTable } from "@/components/admin/ReviewsAdminTable";

export const dynamic = "force-dynamic";

/**
 * /admin/reviews — list + moderation surface for the NEW `reviews` table
 * (migration 016). Every user-on-item interaction (rating + optional text)
 * lives here. The legacy K2 `comments` archive lives at /admin/legacy-comments.
 *
 * Server fetches the stat counters; the client table handles filters / sort /
 * pagination / inline hide-unhide via the admin browser client + API route.
 */
export default async function ReviewsAdminPage() {
  const sb = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, last24Res, reportedRes, hiddenRes] = await Promise.all([
    sb.from("reviews").select("id", { count: "exact", head: true }),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gt("report_count", 0),
    sb.from("reviews").select("id", { count: "exact", head: true }).eq("is_hidden", true),
  ]);

  return (
    <ReviewsAdminTable
      stats={{
        total: totalRes.count ?? 0,
        last24h: last24Res.count ?? 0,
        reported: reportedRes.count ?? 0,
        hidden: hiddenRes.count ?? 0,
      }}
    />
  );
}
