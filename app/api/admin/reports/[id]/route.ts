import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateFrontend } from "@/lib/revalidate";

const VALID_ACTIONS = ["kept", "hidden"] as const;
type Action = (typeof VALID_ACTIONS)[number];

const MIN_NOTE_LEN = 5;

/**
 * PATCH /api/admin/reports/[id]
 *
 * Resolves a single report. Two actions:
 *   - kept   → mark just this report as resolved (other reports for the
 *              same target stay pending; admin reviews them individually)
 *   - hidden → soft-hide the target + auto-resolve ALL pending reports
 *              for that same target with the same admin note (since they're
 *              all about content that's now gone from public view)
 *
 * Both actions REQUIRE a note (admin's justification — audit trail per
 * product decision). The note shows on the resolved report row and, for
 * `hidden`, also lands on `target.hidden_reason`.
 *
 * Body: { action: 'kept' | 'hidden', note: string }
 *
 * Targets: comments + suggestions. Both have hidden_at/hidden_reason/hidden_by
 * columns (suggestions added in migration 015; comments from migration 003).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Admin role check
  const { data: actor } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!actor || (actor as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reportId = params.id;
  const body = await req.json();
  const action = body.action as Action | undefined;
  const note = ((body.note as string | undefined) ?? "").trim();

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (note.length < MIN_NOTE_LEN) {
    return NextResponse.json(
      { error: `note required (min ${MIN_NOTE_LEN} chars)` },
      { status: 400 }
    );
  }

  // Look up the report and ensure it's still unresolved
  const { data: report } = await admin
    .from("content_reports")
    .select("id, target_type, target_id, resolved")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return NextResponse.json({ error: "report not found" }, { status: 404 });
  if ((report as any).resolved) {
    return NextResponse.json({ error: "report already resolved" }, { status: 409 });
  }

  const targetType = (report as any).target_type as "comment" | "suggestion";
  const targetId = (report as any).target_id as string;
  const now = new Date().toISOString();

  // Common patch we'll apply to either this row alone (kept) or all pending
  // reports for the target (hidden).
  const resolutionPatch = {
    resolved: true,
    resolution_action: action,
    resolution_note: note,
    resolved_by: user.id,
    resolved_at: now,
  };

  if (action === "hidden") {
    // 1. Mark the target as hidden
    const targetTable = targetType === "comment" ? "comments" : "suggestions";
    const targetPatch: any = { hidden_at: now, hidden_reason: note, hidden_by: user.id };
    // Comments also use is_hidden boolean from migration 003 — keep both in sync.
    if (targetType === "comment") targetPatch.is_hidden = true;

    const { error: targetErr } = await (admin.from(targetTable) as any)
      .update(targetPatch)
      .eq("id", targetId);
    if (targetErr) {
      return NextResponse.json({ error: `target update failed: ${targetErr.message}` }, { status: 500 });
    }

    // 2. Auto-resolve all pending reports for this target with the same patch
    const { error: bulkErr } = await (admin.from("content_reports") as any)
      .update(resolutionPatch)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("resolved", false);
    if (bulkErr) {
      return NextResponse.json({ error: `bulk resolve failed: ${bulkErr.message}` }, { status: 500 });
    }
  } else {
    // Dismiss: only this report. Other pending reports for the same target
    // stay open for separate review.
    const { error } = await (admin.from("content_reports") as any)
      .update(resolutionPatch)
      .eq("id", reportId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Hiding content removes it from frontend pages — bust caches so the
  // visible-on-site state matches the moderation decision quickly.
  if (action === "hidden") revalidateFrontend();
  return NextResponse.json({ ok: true, action });
}
