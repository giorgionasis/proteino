import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/counters
 *
 * Light endpoint that returns current "needs attention" counts for the
 * admin sidebar badges. Polled every 60s by the sidebar.
 *
 * - suggestions: unpublished count (red dot if > 0)
 * - reportedComments: legacy `comments` table — frozen K2 archive surfaced
 *   under the "Legacy Comments" tab.
 * - pendingReviewReports: unresolved content_reports with target_type='review'.
 *   Surfaced on the Reviews sidebar entry. Suggestions cannot be user-reported
 *   (only admin-reviewed), so all current report traffic is on reviews.
 * - dataQuality: NULL-subcategory items + items with no cover (amber if > 0)
 */
export async function GET() {
  const sb = createAdminClient();

  const [unpubRes, reportedRes, nullSubcatRes, missingCoverRes, pendingReviewReportsRes] = await Promise.all([
    sb.from("suggestions").select("id", { count: "exact", head: true }).eq("is_published", false),
    sb.from("comments").select("id", { count: "exact", head: true }).gt("report_count", 0),
    sb.from("items").select("id", { count: "exact", head: true }).is("subcategory_id", null),
    sb.from("items").select("id", { count: "exact", head: true }).is("cover_url", null),
    sb.from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false)
      .eq("target_type", "review"),
  ]);

  return NextResponse.json({
    unpublishedSuggestions: unpubRes.count ?? 0,
    reportedComments: reportedRes.count ?? 0,
    nullSubcategory: nullSubcatRes.count ?? 0,
    missingCover: missingCoverRes.count ?? 0,
    dataQualityIssues: (nullSubcatRes.count ?? 0) + (missingCoverRes.count ?? 0),
    pendingReviewReports: pendingReviewReportsRes.count ?? 0,
  });
}
