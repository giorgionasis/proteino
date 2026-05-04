import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/bookmarks  body: { item_id, category }
// Idempotent — re-bookmarking is a no-op via ON CONFLICT.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { item_id, category } = body;
  if (!item_id || !category) {
    return NextResponse.json({ error: "item_id and category required" }, { status: 400 });
  }

  const { error } = await (supabase.from("bookmarks") as any)
    .upsert(
      { user_id: user.id, item_id, category },
      { onConflict: "user_id,item_id", ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/bookmarks?item_id=...
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const itemId = url.searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET /api/bookmarks?item_id=...&item_id=...   — returns set of bookmarked ids
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ids: [] });

  const url = new URL(req.url);
  const ids = url.searchParams.getAll("item_id");

  let q: any = supabase.from("bookmarks").select("item_id").eq("user_id", user.id);
  if (ids.length > 0) q = q.in("item_id", ids);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ids: (data ?? []).map((b: any) => b.item_id) });
}
