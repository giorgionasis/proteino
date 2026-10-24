import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("activity_categories")
    .select("*")
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json();
  const { name, icon, slug } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = createAdminClient();

  const { data: maxRow } = await sb
    .from("activity_categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const next = ((maxRow as any)?.[0]?.display_order ?? -1) + 1;

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(name);

  const { data, error } = await (sb.from("activity_categories") as any)
    .insert({
      name: name.trim(),
      slug: finalSlug,
      icon: icon?.trim() || null,
      display_order: next,
      is_published: true,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
