import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { resolved, resolution_action } = body;

  const supabase = createAdminClient();

  const patch: Record<string, any> = {};
  if (resolved !== undefined) {
    patch.resolved = resolved;
    patch.resolved_at = resolved ? new Date().toISOString() : null;
  }
  if (resolution_action !== undefined) patch.resolution_action = resolution_action;

  const { error } = await (supabase.from("comment_reports") as any).update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
