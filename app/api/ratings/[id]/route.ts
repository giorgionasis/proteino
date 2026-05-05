import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/ratings/[id]
 *
 * Owner-only delete of a rating. Recomputes items.avg_rating + items.rating_count
 * from the source-of-truth ratings table after deletion. Decrements
 * users.rating_count.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("ratings")
    .select("id, user_id, item_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((existing as any).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const itemId = (existing as any).item_id as string;

  const { error: delErr } = await admin
    .from("ratings")
    .delete()
    .eq("id", params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Recompute item aggregate from remaining ratings
  const { data: allScores } = await admin
    .from("ratings")
    .select("score")
    .eq("item_id", itemId);
  const scores = (allScores ?? []) as Array<{ score: number }>;
  const ratingCount = scores.length;
  const avgRating = ratingCount > 0
    ? scores.reduce((sum, r) => sum + Number(r.score), 0) / ratingCount
    : 0;

  await (admin.from("items") as any)
    .update({
      avg_rating: Number(avgRating.toFixed(2)),
      rating_count: ratingCount,
    })
    .eq("id", itemId);

  // Decrement the user's rating_count (best-effort, never below 0)
  const { data: userRow } = await admin
    .from("users")
    .select("rating_count")
    .eq("id", user.id)
    .single();
  if (userRow) {
    const next = Math.max(0, ((userRow as any).rating_count ?? 0) - 1);
    await (admin.from("users") as any).update({ rating_count: next }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
