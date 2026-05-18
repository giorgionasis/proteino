import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/users/[id]/warn
 *
 * Append an entry to `users.admin_warnings` (migration 039). Used by the
 * review-reports drawer to flag a review author when their content was
 * hidden, or to mark a reporter as abusive when they keep filing invalid
 * reports.
 *
 * Body:
 *   {
 *     kind: 'review_hidden' | 'abusive_reporter' | 'manual',
 *     note: string (≥5 chars — admin's justification),
 *     source_review_id?: string,
 *     source_report_id?: string,
 *   }
 *
 * Append-only — never overwrites prior entries. Service-role write, gated
 * by admin role on `public.users`.
 */
const VALID_KINDS = ["review_hidden", "abusive_reporter", "manual"] as const;
type Kind = (typeof VALID_KINDS)[number];

const MIN_NOTE_LEN = 5;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const targetUserId = params.id;
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  // Auth gate
  const sbAuth = await createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((actor as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    kind?: Kind;
    note?: string;
    source_review_id?: string;
    source_report_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind;
  const note = (body.note ?? "").trim();

  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${VALID_KINDS.join(", ")}` },
      { status: 400 }
    );
  }
  if (note.length < MIN_NOTE_LEN) {
    return NextResponse.json(
      { error: `note required (min ${MIN_NOTE_LEN} chars)` },
      { status: 400 }
    );
  }

  // Read existing warnings, append, write back. Append-via-jsonb-concat
  // would also work but we want a single readback so the caller can
  // confirm the new length.
  const { data: row, error: readErr } = await (admin.from("users") as any)
    .select("admin_warnings")
    .eq("id", targetUserId)
    .maybeSingle();
  if (readErr || !row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing: any[] = Array.isArray(row.admin_warnings) ? row.admin_warnings : [];
  const entry: Record<string, unknown> = {
    created_at: new Date().toISOString(),
    by_admin_id: user.id,
    kind,
    note,
  };
  if (body.source_review_id) entry.source_review_id = body.source_review_id;
  if (body.source_report_id) entry.source_report_id = body.source_report_id;

  const next = [...existing, entry];
  const { error: writeErr } = await (admin.from("users") as any)
    .update({ admin_warnings: next })
    .eq("id", targetUserId);
  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: next.length });
}
