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
  return text
    .toLowerCase()
    .split("")
    .map((c) => GREEK_TO_LATIN[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
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
    .select("id, category, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category, name")
    .order("category")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
