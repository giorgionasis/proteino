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

type Placement = {
  context: "home" | "category" | "suggestions";
  category?: string | null;
};

// GET /api/admin/collections                          — all
// GET /api/admin/collections?context=home              — placements + collections
// GET /api/admin/collections?context=category&category=movies
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const context = url.searchParams.get("context");
  const category = url.searchParams.get("category");

  if (context) {
    // Fetch placements (in this bucket) embedding the collection.
    let q = supabase
      .from("collection_placements")
      .select("id, display_order, context, category, collections!inner(*)")
      .eq("context", context)
      .order("display_order");

    if (context === "home") {
      q = q.is("category", null);
    } else if (category) {
      q = q.eq("category", category);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // List view: all collections + their placements.
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_placements(*)")
    .order("modified_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/collections — create collection + placements
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createAdminClient();

  const {
    type,
    title,
    title_specific,
    alias,
    image_url,
    source_category,
    tags = [],
    filters = [],
    item_limit = 20,
    is_published = true,
    valid_from,
    valid_until,
    target_audience = "all",
    placements = [],
  } = body as {
    type: "card" | "carousel";
    title: string;
    title_specific?: string;
    alias?: string;
    image_url?: string;
    source_category?: string;
    tags?: string[];
    filters?: any[];
    item_limit?: number;
    is_published?: boolean;
    valid_from?: string;
    valid_until?: string;
    target_audience?: "all" | "registered" | "guest";
    placements?: Placement[];
  };

  if (!type || !title?.trim()) {
    return NextResponse.json({ error: "type and title are required" }, { status: 400 });
  }
  if (!Array.isArray(placements) || placements.length === 0) {
    return NextResponse.json({ error: "At least one placement is required" }, { status: 400 });
  }

  // Slug — auto if not provided, append numeric suffix on collision
  let baseAlias = (alias?.trim() ? slugify(alias) : slugify(`${title} ${title_specific ?? ""}`)) || "collection";
  let finalAlias = baseAlias;
  let i = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("collections")
      .select("id")
      .eq("alias", finalAlias)
      .maybeSingle();
    if (!existing) break;
    finalAlias = `${baseAlias}-${++i}`;
  }

  const { data: created, error: insertErr } = await (supabase.from("collections") as any)
    .insert({
      type,
      title: title.trim(),
      title_specific: title_specific?.trim() || null,
      alias: finalAlias,
      image_url: image_url?.trim() || null,
      source_category: source_category || null,
      tags,
      filters,
      item_limit,
      is_published,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      target_audience,
    })
    .select("*")
    .single();

  if (insertErr || !created) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  // Build placements with display_order = current max + N within each bucket
  const rows: any[] = [];
  for (const p of placements) {
    if (!p.context) continue;
    const cat = p.context === "home" ? null : (p.category ?? null);
    if (p.context !== "home" && !cat) continue;

    const { data: maxRow } = await supabase
      .from("collection_placements")
      .select("display_order")
      .eq("context", p.context)
      .is("category", cat as any)
      .order("display_order", { ascending: false })
      .limit(1);

    const next = ((maxRow as any)?.[0]?.display_order ?? -1) + 1;
    rows.push({
      collection_id: created.id,
      context: p.context,
      category: cat,
      display_order: next,
    });
  }

  if (rows.length > 0) {
    const { error: pErr } = await (supabase.from("collection_placements") as any).insert(rows);
    if (pErr) {
      // Roll back the collection so we don't leave orphans
      await supabase.from("collections").delete().eq("id", created.id);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
  }

  const { data: full } = await supabase
    .from("collections")
    .select("*, collection_placements(*)")
    .eq("id", created.id)
    .single();

  return NextResponse.json(full ?? created);
}
