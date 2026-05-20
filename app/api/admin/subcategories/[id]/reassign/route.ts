import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateCategory } from "@/lib/revalidate";

/**
 * POST /api/admin/subcategories/[id]/reassign
 *
 * Body: { targetId: string }
 *
 * Bulk-reassigns every item from the source subcategory to the target,
 * then returns the row count. Used by the admin Delete-with-reassign
 * flow on /admin/categories/<id> so the admin doesn't have to manually
 * re-pick a subcategory on every affected item.
 *
 * Guards:
 *   - Both subs must exist
 *   - Both must belong to the SAME category (no cross-category moves)
 *   - source !== target
 *
 * The follow-up DELETE call lives on the existing route — this
 * endpoint only does the reassign, not the delete, so the client can
 * show the two-step progress + degrade gracefully if either step
 * fails.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sourceId = params.id;

  let body: { targetId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const targetId = typeof body.targetId === "string" ? body.targetId : null;
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  if (targetId === sourceId) {
    return NextResponse.json({ error: "source and target must differ" }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data: subs, error: lookupErr } = await sb
    .from("subcategories")
    .select("id, category")
    .in("id", [sourceId, targetId]);
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  if (!subs || subs.length !== 2) {
    return NextResponse.json({ error: "source or target subcategory not found" }, { status: 404 });
  }
  const source = subs.find((s: any) => s.id === sourceId);
  const target = subs.find((s: any) => s.id === targetId);
  if (!source || !target) {
    return NextResponse.json({ error: "source or target subcategory not found" }, { status: 404 });
  }
  if ((source as any).category !== (target as any).category) {
    return NextResponse.json(
      { error: "source and target must belong to the same category" },
      { status: 400 },
    );
  }

  const { count: before } = await sb
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", sourceId);

  if ((before ?? 0) === 0) {
    return NextResponse.json({ reassigned: 0 });
  }

  const { error: updErr } = await (sb.from("items") as any)
    .update({ subcategory_id: targetId })
    .eq("subcategory_id", sourceId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  revalidateCategory((source as any).category);
  return NextResponse.json({ reassigned: before ?? 0 });
}
