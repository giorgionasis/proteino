import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateAfterCategoryEdit } from "../route";
import { CATEGORIES } from "@/constants/categories";

const VALID_SLUGS = new Set(CATEGORIES.map((c) => c.slug));

interface ReorderBody {
  orders?: { slug: string; display_order: number }[];
}

/**
 * POST /api/admin/categories/reorder
 *
 * Body: `{ orders: { slug, display_order }[] }`. One upsert per row.
 * Bounded by the count of categories (9 today), so we don't bother
 * with a batched RPC — sequential upserts are <50ms total.
 */
export async function POST(req: NextRequest) {
  let body: ReorderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const orders = Array.isArray(body.orders) ? body.orders : null;
  if (!orders) return NextResponse.json({ error: "orders[] required" }, { status: 400 });

  const sb = createAdminClient();
  const now = new Date().toISOString();
  for (const o of orders) {
    if (typeof o.slug !== "string" || !VALID_SLUGS.has(o.slug as any)) continue;
    if (typeof o.display_order !== "number" || !Number.isFinite(o.display_order)) continue;
    const { error } = await (sb.from("category_meta") as any)
      .upsert(
        { slug: o.slug, display_order: Math.round(o.display_order), modified_at: now },
        { onConflict: "slug" },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidateAfterCategoryEdit();
  return NextResponse.json({ ok: true });
}
