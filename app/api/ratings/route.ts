import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ratings
 *
 * Persists a user's rating of an item. Upserts on (user_id, item_id) so
 * re-rating overwrites the previous score (ratings table has UNIQUE on
 * those two columns, see migration 001).
 *
 * Body:  { item_id: uuid, score: 0..5, suggestion_id?: uuid }
 * Returns: { rating_id, avg_rating, rating_count }
 *
 * After the upsert, recomputes items.avg_rating + items.rating_count from
 * AVG/COUNT of the ratings table so the detail page can re-render with the
 * authoritative aggregate without waiting for a trigger or batch job.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const itemId = body.item_id as string | undefined;
  const score = Number(body.score);
  const suggestionId = (body.suggestion_id as string | undefined) ?? null;

  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });
  if (!Number.isFinite(score) || score < 0 || score > 5) {
    return NextResponse.json({ error: "score must be a number 0..5" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Upsert the rating
  const { data: ratingRow, error: upErr } = await (admin.from("ratings") as any)
    .upsert(
      {
        user_id: user.id,
        item_id: itemId,
        suggestion_id: suggestionId,
        score,
      },
      { onConflict: "user_id,item_id" }
    )
    .select("id")
    .single();

  if (upErr || !ratingRow) {
    return NextResponse.json({ error: upErr?.message ?? "rating upsert failed" }, { status: 500 });
  }

  // 2. Recompute item aggregate (avg + count) from the source-of-truth table.
  //    PostgREST has no AVG aggregate exposed directly; pull all scores and
  //    compute client-side. Cheap (one row per user per item; small set).
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

  // 3. Bump the user's rating_count + last_review_at so leaderboards / activity reflect.
  const { data: userRow } = await admin
    .from("users")
    .select("rating_count")
    .eq("id", user.id)
    .single();

  await (admin.from("users") as any)
    .update({
      rating_count: ((userRow as any)?.rating_count ?? 0) + 1,
      last_review_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({
    rating_id: (ratingRow as any).id,
    avg_rating: Number(avgRating.toFixed(2)),
    rating_count: ratingCount,
  });
}

/**
 * GET /api/ratings?item_id=...
 *
 * Returns the current user's rating for the item, or null if they haven't
 * rated it. Used to pre-fill the star UI on the detail page.
 */
export async function GET(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ score: null });

  const url = new URL(req.url);
  const itemId = url.searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  const { data } = await sb
    .from("ratings")
    .select("score")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  return NextResponse.json({ score: (data as any)?.score ?? null });
}
