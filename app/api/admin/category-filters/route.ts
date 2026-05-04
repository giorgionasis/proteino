import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/category-filters?category=movies
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");

  let q: any = sb.from("category_filters").select("*").order("display_order");
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/category-filters
// Body: { category, filter_id, label, widget, placeholder?, options?, is_quick? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, filter_id, label, widget } = body;
  if (!category || !filter_id?.trim() || !label?.trim() || !widget) {
    return NextResponse.json({ error: "category, filter_id, label, widget required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data: maxRow } = await sb
    .from("category_filters")
    .select("display_order")
    .eq("category", category)
    .order("display_order", { ascending: false })
    .limit(1);
  const next = ((maxRow as any)?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await (sb.from("category_filters") as any)
    .insert({
      category,
      filter_id: filter_id.trim(),
      label: label.trim(),
      widget,
      placeholder: body.placeholder?.trim() || null,
      options: body.options ?? [],
      is_quick: !!body.is_quick,
      display_order: next,
      is_published: true,
    })
    .select("*")
    .single();

  if (error) {
    if ((error as any).code === "23505") {
      return NextResponse.json({ error: "Υπάρχει ήδη φίλτρο με αυτό το id σε αυτή την κατηγορία." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
