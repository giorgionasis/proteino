/**
 * /api/admin/related-sections/[id]
 *
 * PATCH  — update title_template / min_items / item_limit / display_order /
 *          is_active. field + category are immutable post-create (delete +
 *          recreate to switch axis).
 * DELETE — remove a rule.
 *
 * Both call revalidatePath for the affected category.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCategory } from "@/lib/revalidate";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  if (typeof body.title_template === "string" && body.title_template.length > 0) {
    patch.title_template = body.title_template;
  }
  if (typeof body.min_items === "number" && body.min_items >= 1) {
    patch.min_items = body.min_items;
  }
  if (typeof body.item_limit === "number" && body.item_limit >= 1 && body.item_limit <= 20) {
    patch.item_limit = body.item_limit;
  }
  if (typeof body.display_order === "number") {
    patch.display_order = body.display_order;
  }
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }
  // Nearby rules only — admin tweaks the search radius via the km input
  // in the rule row. Negative / zero rejected; max 50km sanity cap.
  if (typeof body.radius_km === "number" && body.radius_km > 0 && body.radius_km <= 50) {
    patch.radius_km = body.radius_km;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data, error } = await (sb.from("related_sections_config") as any)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.category) revalidateCategory(data.category);
  return NextResponse.json({ rule: data });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = createAdminClient();

  // Fetch first so we know which category to revalidate.
  const { data: row } = await (sb.from("related_sections_config") as any)
    .select("category")
    .eq("id", id)
    .maybeSingle();

  const { error } = await (sb.from("related_sections_config") as any)
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.category) revalidateCategory(row.category);
  return NextResponse.json({ ok: true });
}
