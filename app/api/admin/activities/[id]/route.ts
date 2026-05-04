import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("activities")
    .select("*, activity_types(id, name, category_id, activity_categories(id, name))")
    .eq("id", params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const patch: Record<string, any> = {};
  const fields = [
    "type_id", "name", "description", "address",
    "lat", "lng", "website_url", "facebook_url",
    "instagram_url", "phone", "image_url", "is_published",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) {
      // Strings: trim and convert "" → null. Bool/number: pass through.
      const v = body[f];
      if (typeof v === "string") patch[f] = v.trim() || null;
      else patch[f] = v;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await (sb.from("activities") as any).update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("activities").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
