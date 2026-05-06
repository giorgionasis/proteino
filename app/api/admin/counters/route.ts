import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/counters
 *
 * Light endpoint that returns current "needs attention" counts for the
 * admin sidebar badges. Polled every 60s by the sidebar.
 *
 * - suggestions: unpublished count (red dot if > 0)
 * - reviews: unresolved-reports count (red dot if > 0)
 * - dataQuality: NULL-subcategory items + items with no cover (amber if > 0)
 */
export async function GET() {
  const sb = createAdminClient();

  const [unpubRes, reportedRes, nullSubcatRes, missingCoverRes, pendingReportsRes] = await Promise.all([
    sb.from("suggestions").select("id", { count: "exact", head: true }).eq("is_published", false),
    sb.from("comments").select("id", { count: "exact", head: true }).gt("report_count", 0),
    sb.from("items").select("id", { count: "exact", head: true }).is("subcategory_id", null),
    sb.from("items").select("id", { count: "exact", head: true }).is("cover_url", null),
    // Unresolved reports across both target_types (migration 015).
    sb.from("content_reports").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);

  return NextResponse.json({
    unpublishedSuggestions: unpubRes.count ?? 0,
    reportedReviews: reportedRes.count ?? 0,
    nullSubcategory: nullSubcatRes.count ?? 0,
    missingCover: missingCoverRes.count ?? 0,
    dataQualityIssues: (nullSubcatRes.count ?? 0) + (missingCoverRes.count ?? 0),
    pendingReports: pendingReportsRes.count ?? 0,
  });
}
