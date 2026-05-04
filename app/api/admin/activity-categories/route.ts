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

export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("activity_categories")
    .select("*")
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
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
