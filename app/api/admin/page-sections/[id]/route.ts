/**
 * /api/admin/page-sections/[id]
 *
 * PATCH  — update is_active / audience / config / valid_from / valid_until
 *          (section_type, widget_key, collection_id, context, category
 *          are intentionally immutable post-create — change requires
 *          delete + recreate)
 * DELETE — remove a row. Refuses if the widget is `fixed` (filter_row,
 *          items_list, footer_mobile, welcome_header, sub_category_tabs).
 *          Admin can mark fixed widgets inactive instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCategory, revalidateHome } from "@/lib/revalidate";
import { isWidgetFixed } from "@/lib/layout/widgets";

const VALID_AUDIENCES = new Set(["all", "registered", "guest"]);

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.audience === "string") {
    if (!VALID_AUDIENCES.has(body.audience)) {
      return NextResponse.json({ error: "audience invalid" }, { status: 400 });
    }
    patch.audience = body.audience;
  }
  if (body.config && typeof body.config === "object") patch.config = body.config;
  if (body.valid_from === null || typeof body.valid_from === "string") patch.valid_from = body.valid_from;
  if (body.valid_until === null || typeof body.valid_until === "string") patch.valid_until = body.valid_until;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data, error } = await (sb.from("page_sections") as any)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.context === "home") revalidateHome();
  else if (data?.category) revalidateCategory(data.category);

  return NextResponse.json({ section: data });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = createAdminClient();

  // Fetch first so we can validate (fixed widget?) + know the bucket
  // to revalidate.
  const { data: row, error: fetchErr } = await (sb.from("page_sections") as any)
    .select("id, section_type, widget_key, context, category")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "section not found" }, { status: 404 });

  if (row.section_type === "widget" && isWidgetFixed(row.widget_key)) {
    return NextResponse.json(
      { error: `Widget ${row.widget_key} is structural and cannot be deleted. Mark it inactive instead.` },
      { status: 400 }
    );
  }

  const { error } = await (sb.from("page_sections") as any).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row.context === "home") revalidateHome();
  else if (row.category) revalidateCategory(row.category);

  return NextResponse.json({ ok: true });
}
