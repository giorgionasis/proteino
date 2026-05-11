import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateFrontend } from "@/lib/revalidate";

// POST /api/admin/collections/reorder
// Body: { context, category?, ordered_placement_ids: string[] }
// Updates display_order in one bucket. Pass placement IDs (not collection IDs)
// because the same collection can appear in multiple buckets with different
// orderings.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { context, category, ordered_placement_ids } = body as {
    context: "home" | "category" | "suggestions";
    category?: string | null;
    ordered_placement_ids: string[];
  };

  if (!context || !Array.isArray(ordered_placement_ids)) {
    return NextResponse.json({ error: "context and ordered_placement_ids required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Update each placement's display_order. Sequential to keep behavior simple.
  for (let i = 0; i < ordered_placement_ids.length; i++) {
    const id = ordered_placement_ids[i];
    let q = (supabase.from("collection_placements") as any)
      .update({ display_order: i })
      .eq("id", id)
      .eq("context", context);

    q = category ? q.eq("category", category) : q.is("category", null);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateFrontend();
  return NextResponse.json({ ok: true });
}
