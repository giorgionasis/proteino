import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const VALID_TARGETS = ["comment", "suggestion", "review"] as const;
const VALID_REASONS = ["inaccurate", "fraud", "offensive", "other"] as const;

type TargetType = (typeof VALID_TARGETS)[number];
type Reason = (typeof VALID_REASONS)[number];

const MIN_DESCRIPTION_LEN = 10;
const MAX_DESCRIPTION_LEN = 500;

/**
 * POST /api/reports
 *
 * Generalized content reporting flow (3-step modal: reason → description → confirm).
 * Writes to `content_reports` (migration 015). Replaces the old comment-only
 * `comment_reports` path for all NEW reports.
 *
 * Body: { target_type: 'comment'|'suggestion', target_id: uuid, reason: Reason, description: string }
 *
 * Description is REQUIRED for all reasons (per product decision — reporters
 * must justify so admin has context). Server enforces ≥10 chars + ≤500.
 *
 * Idempotency: same user reporting same target with same reason returns
 * 200 + already_reported=true (no duplicate row). Reporting same target
 * with a different reason creates a new row.
 *
 * Service-role client used so auth.uid mismatches with RLS don't block.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetType = body.target_type as TargetType | undefined;
  const targetId = body.target_id as string | undefined;
  const reason = body.reason as Reason | undefined;
  const description = ((body.description as string | undefined) ?? "").trim();

  // Validate input
  if (!targetType || !VALID_TARGETS.includes(targetType)) {
    return NextResponse.json(
      { error: `target_type must be one of: ${VALID_TARGETS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!targetId) {
    return NextResponse.json({ error: "target_id required" }, { status: 400 });
  }
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (description.length < MIN_DESCRIPTION_LEN) {
    return NextResponse.json(
      { error: `description required (min ${MIN_DESCRIPTION_LEN} chars)` },
      { status: 400 }
    );
  }
  if (description.length > MAX_DESCRIPTION_LEN) {
    return NextResponse.json(
      { error: `description too long (max ${MAX_DESCRIPTION_LEN})` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Sanity check: target exists. Prevents orphan reports.
  const targetTable =
    targetType === "comment" ? "comments" :
    targetType === "review"  ? "reviews"  :
    "suggestions";
  const { data: target } = await admin
    .from(targetTable)
    .select("id, user_id")
    .eq("id", targetId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: `${targetType} not found` }, { status: 404 });
  }

  // Self-report: not blocked at DB level. Could be a "flag for visibility"
  // call but flagged in response so the UI can react if it wants to.
  const isSelfReport = (target as any).user_id === user.id;

  // Idempotency: same (reporter, target, reason) → return existing row
  const { data: existing } = await admin
    .from("content_reports")
    .select("id, resolved")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
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

  const { data: inserted, error } = await (admin.from("content_reports") as any)
    .insert({
      target_type: targetType,
      target_id: targetId,
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
