import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { revalidateItem } from "@/lib/revalidate";

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

/**
 * POST /api/admin/suggestions/create
 *
 * Creates a new item + suggestion in one transaction-like call. Used by
 * `/admin/suggestions/new` so admins can seed an item from scratch (e.g.
 * a magazine review the migration missed). The admin becomes the suggester.
 *
 * After insertion the caller redirects to /admin/suggestions/[id] for the
 * full editor experience (extension fields, media tabs, etc.).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, category, subcategory_id, cover_url, reflection, is_published } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  // Resolve admin user id from the session
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Build a unique slug. DB convention is `category/slug` (see PROGRESS.md §4).
  const baseSlug = slugify(title);
  let candidate = baseSlug;
  let n = 1;
  while (true) {
    const { data: existing } = await admin
      .from("items")
      .select("id")
      .eq("slug", `${category}/${candidate}`)
      .maybeSingle();
    if (!existing) break;
    candidate = `${baseSlug}-${++n}`;
  }
  const fullSlug = `${category}/${candidate}`;

  // 1. Insert the item
  const { data: itemData, error: itemErr } = await (admin.from("items") as any)
    .insert({
      title: title.trim(),
      slug: fullSlug,
      category,
      subcategory_id: subcategory_id || null,
      cover_url: cover_url?.trim() || null,
      is_published: is_published ?? true,
      avg_rating: 0,
      rating_count: 0,
      suggestion_count: 1,
      images: cover_url?.trim() ? [{ url: cover_url.trim() }] : [],
      metadata: { tags: [] },
    })
    .select("id")
    .single();
  if (itemErr || !itemData) {
    return NextResponse.json({ error: itemErr?.message ?? "item insert failed" }, { status: 500 });
  }

  // 2. Insert the suggestion (admin is the suggester)
  const now = new Date().toISOString();
  const { data: sugData, error: sugErr } = await (admin.from("suggestions") as any)
    .insert({
      user_id: user.id,
      item_id: itemData.id,
      reflection: reflection?.trim() || null,
      content_hash: `admin-${itemData.id}-${Date.now()}`,
      is_published: is_published ?? true,
      published_at: is_published ? now : null,
    })
    .select("id")
    .single();
  if (sugErr || !sugData) {
    // Rollback item insert if suggestion failed (no real transactions in PostgREST)
    await admin.from("items").delete().eq("id", itemData.id);
    return NextResponse.json({ error: sugErr?.message ?? "suggestion insert failed" }, { status: 500 });
  }

  // Bust frontend caches: a new item just landed in this category.
  revalidateItem(category, candidate);
  return NextResponse.json({ id: sugData.id, item_id: itemData.id, slug: fullSlug });
}
