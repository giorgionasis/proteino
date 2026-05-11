import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { slugify } from "@/lib/slugify";
import { revalidateFrontend } from "@/lib/revalidate";

/**
 * Admin regions CRUD.
 *
 * The regions table is self-referential via `parent_id`, so depth is
 * unbounded — admin uses this to model 2-level taxonomies (Αττική →
 * Χαλάνδρι) AND 3-level (Κρήτη → Ηράκλειο → Ελούντα) without schema
 * changes.
 *
 * Slug uniqueness: name → slugify; if collision, append `-2`, `-3`, ...
 * Names ARE allowed to collide globally (Athens has a "Κέντρο", Crete
 * may also have one) — slug is the disambiguator.
 */

export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("regions")
    .select("id, name, slug, parent_id, display_order, created_at")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

async function uniqueSlug(sb: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  if (!base) return `region-${Date.now()}`;
  let candidate = base;
  let n = 2;
  // Bounded loop — names rarely collide more than a couple of times.
  while (n < 50) {
    const { data } = await sb.from("regions").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n++}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const parentId = typeof body.parent_id === "string" ? body.parent_id : null;
  const displayOrder = typeof body.display_order === "number" ? body.display_order : 0;

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const sb = createAdminClient();
  const slug = await uniqueSlug(sb, slugify(name));

  const { data, error } = await (sb.from("regions") as any)
    .insert({ name, slug, parent_id: parentId, display_order: displayOrder })
    .select("id, name, slug, parent_id, display_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // New region affects every category's region picker → bust everything.
  revalidateFrontend();
  return NextResponse.json(data);
}
