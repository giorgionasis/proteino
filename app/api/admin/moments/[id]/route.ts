import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin moments — single-row CRUD.
 *
 * GET    /api/admin/moments/[id] → row + last-7d stats summary
 * PATCH  /api/admin/moments/[id] → partial update (any column)
 * DELETE /api/admin/moments/[id] → hard delete (cascades moment_events)
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, props: RouteParams) {
  const params = await props.params;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("moments")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "not_found" },    { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE_FIELDS = new Set([
  "key", "label", "surface", "trigger_event",
  "predicate_key", "predicate_args",
  "copy", "display",
  "priority", "variant_group",
  "is_active", "valid_from", "valid_until",
]);

export async function PATCH(req: NextRequest, props: RouteParams) {
  const params = await props.params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (EDITABLE_FIELDS.has(k)) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no editable fields in body" }, { status: 400 });
  }

  // Empty-string → null for nullable fields so admin can clear them.
  for (const k of ["label", "variant_group", "valid_from", "valid_until"]) {
    if (patch[k] === "") patch[k] = null;
  }

  const sb = createAdminClient();
  const { data, error } = await (sb.from("moments") as any)
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, props: RouteParams) {
  const params = await props.params;
  const sb = createAdminClient();
  const { error } = await sb.from("moments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
