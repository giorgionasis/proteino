import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const VALID_REASONS = ["offensive", "spam", "misinformation", "harassment", "other"] as const;
type Reason = (typeof VALID_REASONS)[number];

const MAX_DESCRIPTION_LEN = 500;

/**
 * POST /api/reports
 *
 * Reports a comment for moderator review. Schema: comment_reports
 * (migration scripts/sql/003-comments-votes-reports.sql).
 *
 * Body: { comment_id: uuid, reason: Reason, description?: string }
 *
 * The trigger `sync_comment_report_counts` keeps comments.report_count
 * in sync with unresolved reports, which is what /admin/reviews surfaces
 * as the red badge.
 *
 * RLS allows users to insert reports where reporter_id = auth.uid(); we
 * use the admin (service-role) client here because we want the auth.users
 * id to flow through cleanly without policy mismatch.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const commentId = body.comment_id as string | undefined;
  const reason = body.reason as Reason | undefined;
  const description = ((body.description as string | undefined) ?? "").trim() || null;

  if (!commentId) return NextResponse.json({ error: "comment_id required" }, { status: 400 });
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (description && description.length > MAX_DESCRIPTION_LEN) {
    return NextResponse.json(
      { error: `description too long (max ${MAX_DESCRIPTION_LEN})` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Sanity check: comment exists. Cheap; prevents orphan reports.
  const { data: comment } = await admin
    .from("comments")
    .select("id, user_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "comment not found" }, { status: 404 });

  // Reporting your own comment is not blocked at DB level, but is unusual.
  // We allow it (might be a self-flag for admin attention) but flag in response.
  const isSelfReport = (comment as any).user_id === user.id;

  // Idempotency: check if this user already reported this comment with the
  // same reason. If yes, return 200 with already_reported=true so the UI
  // can show a friendly "already reported" state instead of a duplicate row.
  const { data: existing } = await admin
    .from("comment_reports")
    .select("id, resolved")
    .eq("comment_id", commentId)
    .eq("reporter_id", user.id)
    .eq("reason", reason)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      already_reported: true,
      report_id: (existing as any).id,
    });
  }

  const { data: inserted, error } = await (admin.from("comment_reports") as any)
    .insert({
      comment_id: commentId,
      reporter_id: user.id,
      reason,
      description,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "report insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    report_id: (inserted as any).id,
    self_report: isSelfReport,
  });
}
