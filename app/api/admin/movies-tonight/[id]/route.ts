import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateHome } from "@/lib/revalidate";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await req.json();
  const patch: Record<string, any> = {};
  for (const f of ["item_id", "channel", "air_date", "air_time", "is_published"] as const) {
    if (body[f] !== undefined) {
      patch[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await (sb.from("movies_tonight") as any).update(patch).eq("id", params.id);
  if (error) {
    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "Αυτή η ταινία υπάρχει ήδη για αυτό το κανάλι/ώρα." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidateHome();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = createAdminClient();
  const { error } = await sb.from("movies_tonight").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateHome();
  return NextResponse.json({ ok: true });
}
