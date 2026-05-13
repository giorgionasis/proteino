/**
 * /api/admin/page-sections/reorder
 *
 * POST { context, category, ordered_ids: [id1, id2, …] }
 *
 * Re-assigns display_order across an entire bucket. The client always
 * sends the FULL list for the (context, category) bucket in the desired
 * order — server doesn't try to compute deltas. Spacing of 10 between
 * consecutive items leaves room for future per-row inserts without a
 * full renumber.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCategory, revalidateHome } from "@/lib/revalidate";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { context, category, ordered_ids } = body as {
    context: "home" | "category" | "suggestions";
    category: string | null;
    ordered_ids: string[];
  };

  if (!context || !Array.isArray(ordered_ids)) {
    return NextResponse.json({ error: "context + ordered_ids required" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Sanity: every id must belong to the same bucket. Prevents an admin
  // from accidentally renumbering rows from a different page.
  let dupQ = (sb.from("page_sections") as any)
    .select("id")
    .eq("context", context)
    .in("id", ordered_ids);
  dupQ = context === "home" ? dupQ.is("category", null) : dupQ.eq("category", category);
  const { data: matching, error: matchErr } = await dupQ;
  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
  const matchIds = new Set((matching ?? []).map((r: { id: string }) => r.id));
  for (const id of ordered_ids) {
    if (!matchIds.has(id)) {
      return NextResponse.json(
        { error: `Section ${id} does not belong to bucket (${context}, ${category ?? "—"})` },
        { status: 400 }
      );
    }
  }

  // Sequential updates — bucket sizes are small (~15-20 rows max) so
  // 20 sequential PATCHes is fine. Postgres serializes them anyway.
  for (let i = 0; i < ordered_ids.length; i++) {
    const id = ordered_ids[i];
    const { error } = await (sb.from("page_sections") as any)
      .update({ display_order: (i + 1) * 10 })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (context === "home") revalidateHome();
  else if (category) revalidateCategory(category);

  return NextResponse.json({ ok: true });
}
