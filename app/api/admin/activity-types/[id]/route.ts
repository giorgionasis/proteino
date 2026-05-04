import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const patch: Record<string, any> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.icon !== undefined) patch.icon = body.icon || null;
  if (body.image_url !== undefined) patch.image_url = body.image_url || null;
  if (body.display_order !== undefined) patch.display_order = body.display_order;
  if (body.is_published !== undefined) patch.is_published = body.is_published;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await (sb.from("activity_types") as any).update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  const { count } = await sb
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("type_id", params.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Δεν διαγράφεται: ${count} activities ακόμα χρησιμοποιούν αυτόν τον τύπο.` },
      { status: 400 }
    );
  }

  const { error } = await sb.from("activity_types").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
