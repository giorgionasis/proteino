import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateCategory } from "@/lib/revalidate";
import { slugify } from "@/lib/slugify";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json();
  const { category, name } = body;

  if (!category || !name?.trim()) {
    return NextResponse.json({ error: "Missing category or name" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get max display_order for this category to append at end
  const { data: existing } = await supabase
    .from("subcategories")
    .select("display_order")
    .eq("category", category)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxOrder = (existing as any)?.[0]?.display_order ?? -1;
  const slug = `${slugify(name.trim())}-${slugify(category)}`.replace(/--+/g, "-").replace(/^-|-$/g, "");

  const { data, error } = await (supabase.from("subcategories") as any)
    .insert({
      category,
      name: name.trim(),
      slug,
      display_order: maxOrder + 1,
      is_published: true,
    })
    .select("id, category, name, slug")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateCategory(category);
  return NextResponse.json(data);
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category, name")
    .order("category")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
