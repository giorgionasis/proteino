import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const patch: Record<string, any> = {};

  for (const f of ["label", "placeholder", "widget"] as const) {
    if (body[f] !== undefined) patch[f] = (body[f] === "" ? null : body[f]);
  }
  for (const f of ["is_quick", "is_published"] as const) {
    if (body[f] !== undefined) patch[f] = body[f];
  }
  if (body.display_order !== undefined) patch.display_order = body.display_order;
  if (body.options !== undefined) patch.options = body.options;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await (sb.from("category_filters") as any).update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("category_filters").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
