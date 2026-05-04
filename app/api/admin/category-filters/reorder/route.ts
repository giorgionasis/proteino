import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/category-filters/reorder
// Body: { category, ordered_ids: string[] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, ordered_ids } = body as { category: string; ordered_ids: string[] };

  if (!category || !Array.isArray(ordered_ids)) {
    return NextResponse.json({ error: "category and ordered_ids required" }, { status: 400 });
  }

  const sb = createAdminClient();
  for (let i = 0; i < ordered_ids.length; i++) {
    const { error } = await (sb.from("category_filters") as any)
      .update({ display_order: i })
      .eq("id", ordered_ids[i])
      .eq("category", category);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
