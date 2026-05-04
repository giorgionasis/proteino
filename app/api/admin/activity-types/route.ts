import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const GREEK_TO_LATIN: Record<string, string> = {
  "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
  "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
  "ΐ":"i","ΰ":"y",
};
function slugify(text: string): string {
  return text.toLowerCase().split("").map((c) => GREEK_TO_LATIN[c] || c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// GET /api/admin/activity-types
// GET /api/admin/activity-types?category_id=...
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("category_id");

  let q: any = sb.from("activity_types").select("*, activity_categories(name, slug, icon)").order("display_order");
  if (categoryId) q = q.eq("category_id", categoryId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category_id, name, icon, image_url } = body;
  if (!category_id) return NextResponse.json({ error: "category_id required" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = createAdminClient();

  const { data: maxRow } = await sb
    .from("activity_types")
    .select("display_order")
    .eq("category_id", category_id)
    .order("display_order", { ascending: false })
    .limit(1);
  const next = ((maxRow as any)?.[0]?.display_order ?? -1) + 1;

  const slug = slugify(name);

  const { data, error } = await (sb.from("activity_types") as any)
    .insert({
      category_id,
      name: name.trim(),
      slug,
      icon: icon?.trim() || null,
      image_url: image_url?.trim() || null,
      display_order: next,
      is_published: true,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
