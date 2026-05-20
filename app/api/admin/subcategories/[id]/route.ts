import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateFrontend } from "@/lib/revalidate";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await req.json();
  const { name, slug, description_seo, is_published, display_order } = body;
  const patch: Record<string, any> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }
    patch.name = name.trim();
  }

  if (slug !== undefined) {
    if (typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ error: "slug must be a non-empty string" }, { status: 400 });
    }
    const cleaned = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(cleaned)) {
      return NextResponse.json(
        { error: "slug must be lowercase alphanumeric with hyphens (e.g. 'mystery-thriller')" },
        { status: 400 },
      );
    }
    patch.slug = cleaned;
  }

  if (description_seo !== undefined) {
    if (description_seo === null || description_seo === "") {
      patch.description_seo = null;
    } else if (typeof description_seo === "string") {
      patch.description_seo = description_seo.trim();
    } else {
      return NextResponse.json({ error: "description_seo must be a string or null" }, { status: 400 });
    }
  }

  if (is_published !== undefined) patch.is_published = is_published;
  if (display_order !== undefined) patch.display_order = display_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Slug uniqueness — UNIQUE(category, slug) would throw a generic 23505
  // at the DB layer; preflight here so we can return a user-friendly
  // message + know which sibling owns the conflicting slug.
  if (patch.slug !== undefined) {
    const { data: self } = await supabase
      .from("subcategories")
      .select("category, slug")
      .eq("id", params.id)
      .maybeSingle();
    if (!self) {
      return NextResponse.json({ error: "subcategory not found" }, { status: 404 });
    }
    if ((self as any).slug !== patch.slug) {
      const { data: conflict } = await supabase
        .from("subcategories")
        .select("id, name")
        .eq("category", (self as any).category)
        .eq("slug", patch.slug)
        .neq("id", params.id)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json(
          { error: `slug "${patch.slug}" already used by "${(conflict as any).name}"` },
          { status: 409 },
        );
      }
    }
  }

  const { error } = await (supabase.from("subcategories") as any).update(patch).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFrontend();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createAdminClient();

  // Safety check: refuse if items reference this subcategory
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", params.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} items still use this subcategory. Reassign them first.` },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("subcategories").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFrontend();
  return NextResponse.json({ ok: true });
}
