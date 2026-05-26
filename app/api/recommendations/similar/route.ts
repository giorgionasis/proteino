import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/recommendations/similar?item_id=<uuid>&limit=<n>
 *
 * Returns the top-N most similar items by pgvector cosine distance.
 * Works for guests — no auth required. Item must have an embedding.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const itemId = url.searchParams.get("item_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);

  if (!itemId) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data, error } = await sb.rpc("match_items", {
    query_item_id: itemId,
    match_count: limit,
  } as any);

  if (error) {
    if (error.message.includes("embedding")) {
      return NextResponse.json(
        { error: "Item has no embedding", items: [] },
        { status: 200 },
      );
    }
    console.error("[recommendations/similar]", error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
