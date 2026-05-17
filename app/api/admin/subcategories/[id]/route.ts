import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateFrontend } from "@/lib/revalidate";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await req.json();
  const { name, is_published, display_order } = body;
  const patch: Record<string, any> = {};
  if (name !== undefined) patch.name = name;
  if (is_published !== undefined) patch.is_published = is_published;
  if (display_order !== undefined) patch.display_order = display_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await (supabase.from("subcategories") as any).update(patch).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFrontend();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createAdminClient();

  // Safety check: refuse if items reference this subcategory
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", params.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} items still use this subcategory. Reassign them first.` },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("subcategories").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFrontend();
  return NextResponse.json({ ok: true });
}
