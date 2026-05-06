import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/reviews
 *
 * Persist a user's review of an item. One row per (user, item) — the unique
 * constraint on the `reviews` table enforces this. Calling again upserts.
 *
 * Body: { item_id: uuid, rating: 1..5, reflection?: string }
 * Returns: { review_id, avg_rating, rating_count }
 *
 * After the upsert, recomputes items.avg_rating + items.rating_count from
 * the reviews table (single source of truth going forward) so the detail
 * page reflects the new aggregate immediately.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const itemId = body.item_id as string | undefined;
  const rating = Number(body.rating);
  const reflectionRaw = typeof body.reflection === "string" ? body.reflection.trim() : null;
  const reflection = reflectionRaw && reflectionRaw.length > 0 ? reflectionRaw : null;

  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be an integer 1..5" }, { status: 400 });
  }
  if (reflection && reflection.length > 4000) {
    return NextResponse.json({ error: "reflection too long (max 4000 chars)" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: reviewRow, error: upErr } = await (admin.from("reviews") as any)
    .upsert(
      { user_id: user.id, item_id: itemId, rating, reflection },
      { onConflict: "user_id,item_id" }
    )
    .select("id")
    .single();

  if (upErr || !reviewRow) {
    return NextResponse.json({ error: upErr?.message ?? "review upsert failed" }, { status: 500 });
  }

  // Recompute item aggregate from reviews — small N, cheap.
  const { data: allRatings } = await admin
    .from("reviews")
    .select("rating")
    .eq("item_id", itemId)
    .eq("is_hidden", false);

  const ratings = (allRatings ?? []) as Array<{ rating: number }>;
  const ratingCount = ratings.length;
  const avgRating = ratingCount > 0
    ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratingCount
    : 0;

  await (admin.from("items") as any)
    .update({
      avg_rating: Number(avgRating.toFixed(2)),
      rating_count: ratingCount,
    })
    .eq("id", itemId);

  return NextResponse.json({
    review_id: reviewRow.id,
    avg_rating: Number(avgRating.toFixed(2)),
    rating_count: ratingCount,
  });
}

/** GET /api/reviews?item_id=… — returns the current user's review for prefill, or null. */
export async function GET(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ review: null });

  const itemId = req.nextUrl.searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  const { data } = await sb
    .from("reviews")
    .select("id, rating, reflection")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  return NextResponse.json({ review: data ?? null });
}

/** DELETE /api/reviews?id=… — own review only. Recomputes aggregate. */
export async function DELETE(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();

  // Capture item_id before deletion for the recompute step
  const { data: existing } = await admin
    .from("reviews")
    .select("item_id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ((existing as any).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: delErr } = await admin.from("reviews").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const itemId = (existing as any).item_id;
  const { data: allRatings } = await admin
    .from("reviews")
    .select("rating")
    .eq("item_id", itemId)
    .eq("is_hidden", false);

  const ratings = (allRatings ?? []) as Array<{ rating: number }>;
  const ratingCount = ratings.length;
  const avgRating = ratingCount > 0
    ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratingCount
    : 0;

  await (admin.from("items") as any)
    .update({
      avg_rating: Number(avgRating.toFixed(2)),
      rating_count: ratingCount,
    })
    .eq("id", itemId);

  return NextResponse.json({
    ok: true,
    avg_rating: Number(avgRating.toFixed(2)),
    rating_count: ratingCount,
  });
}
