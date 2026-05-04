import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { label, is_published, display_order, icon } = body;
  const patch: Record<string, any> = {};
  if (label !== undefined) patch.label = label;
  if (is_published !== undefined) patch.is_published = is_published;
  if (display_order !== undefined) patch.display_order = display_order;
  if (icon !== undefined) patch.icon = icon;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await (supabase.from("extra_field_options") as any).update(patch).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("extra_field_options").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
