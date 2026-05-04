import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/category-filters/settings?category=movies
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");

  let q: any = sb.from("category_filter_settings").select("*");
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (category) {
    return NextResponse.json((data as any[])?.[0] ?? null);
  }
  return NextResponse.json(data);
}

// PATCH /api/admin/category-filters/settings
// Body: { category, has_nearby?, sort_options? }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { category, has_nearby, sort_options } = body;
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const sb = createAdminClient();
  const patch: any = {};
  if (has_nearby !== undefined) patch.has_nearby = has_nearby;
  if (sort_options !== undefined) patch.sort_options = sort_options;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  // Upsert keyed on category
  const { error } = await (sb.from("category_filter_settings") as any)
    .upsert({ category, ...patch }, { onConflict: "category" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
