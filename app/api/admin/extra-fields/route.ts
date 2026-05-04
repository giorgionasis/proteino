import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

function valueize(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9α-ωά-ώ]+/gi, "_")
    .replace(/^_|_$/g, "");
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const supabase = createAdminClient();

  let q = supabase
    .from("extra_field_options")
    .select("id, category, field_group, value, label, display_order, is_published, icon")
    .order("category")
    .order("field_group")
    .order("display_order");

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, field_group, label, icon } = body;

  if (!category || !field_group || !label?.trim()) {
    return NextResponse.json({ error: "Missing category, field_group, or label" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("extra_field_options")
    .select("display_order")
    .eq("category", category)
    .eq("field_group", field_group)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxOrder = (existing as any)?.[0]?.display_order ?? -1;
  const value = valueize(label.trim());

  const { data, error } = await (supabase.from("extra_field_options") as any)
    .insert({
      category,
      field_group,
      value,
      label: label.trim(),
      display_order: maxOrder + 1,
      is_published: true,
      icon: icon || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
