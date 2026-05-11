import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Per-row regions ops.
 *
 * PATCH — rename, re-parent, reorder. Slug stays stable on rename so
 * existing item links don't break; admin must explicitly reset it
 * (out-of-scope here).
 *
 * DELETE — hard delete, blocked when:
 *   1. children rows reference this id as parent_id, OR
 *   2. ANY item_<category> row references this id as region_id.
 * Both conditions surface a 409 with a hint, so the admin can re-parent
 * children or reassign items first. We do NOT cascade — silently
 * orphaning items would be a worse footgun than an explicit error.
 */

const ITEM_TABLES_WITH_REGION = [
  "item_food",
  "item_bars",
  "item_hotels",
  "item_theater",
  "item_events",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if ("parent_id" in body) {
    if (body.parent_id === params.id) {
      return NextResponse.json({ error: "Region cannot be its own parent" }, { status: 400 });
    }
    patch.parent_id = body.parent_id ?? null;
  }
  if (typeof body.display_order === "number") patch.display_order = body.display_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data, error } = await (sb.from("regions") as any)
    .update(patch)
    .eq("id", params.id)
    .select("id, name, slug, parent_id, display_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  // Block if children exist.
  const { count: childCount } = await sb
    .from("regions")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", params.id);
  if ((childCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Έχει ${childCount} υπο-περιοχές. Διέγραψέ τες ή άλλαξε γονέα πρώτα.` },
      { status: 409 },
    );
  }

  // Block if any item references it.
  for (const table of ITEM_TABLES_WITH_REGION) {
    const { count } = await sb
      .from(table)
      .select("item_id", { count: "exact", head: true })
      .eq("region_id", params.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Χρησιμοποιείται από ${count} item(s) στον πίνακα ${table}. Άλλαξε region σε αυτά πρώτα.` },
        { status: 409 },
      );
    }
  }

  const { error } = await sb.from("regions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
