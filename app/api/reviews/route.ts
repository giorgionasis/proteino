import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOneMoment, buildVars } from "@/lib/moments";
import type { ResolvedMoment } from "@/lib/moments";

/**
 * POST /api/reviews
 *
 * Persist a user's review of an item. One row per (user, item) — the unique
 * constraint on the `reviews` table enforces this. Calling again upserts.
 *
 * Body: { item_id: uuid, rating: 1..5, reflection?: string }
 * Returns: { review_id, avg_rating, rating_count, achievement? }
 *
 * After the upsert, recomputes items.avg_rating + items.rating_count from
 * the reviews table (single source of truth going forward) so the detail
 * page reflects the new aggregate immediately.
 *
 * When the upsert is a NEW review (not an update of an existing one), the
 * route also counts the user's total non-hidden reviews and resolves a
 * `review_published` moment — drives the milestone celebration modal on
 * the detail page. Re-rating an item does NOT fire a milestone.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
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

  // Was this a brand-new review or an update? Look up BEFORE upsert so the
  // milestone fires only on the first publish per (user, item) — re-rating
  // an item must not re-trigger a celebration.
  const { data: existingRow } = await admin
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();
  const wasNewReview = !existingRow;

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

  // Review-milestone celebration. Only fires on the first publish per
  // (user, item). Counts the user's total non-hidden reviews including
  // this one, then resolves any `review_published` moment whose
  // predicate matches the new count.
  let achievement: ResolvedMoment | null = null;
  if (wasNewReview) {
    const { count: totalReviewCount } = await admin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_hidden", false);

    const newCount = totalReviewCount ?? 0;

    if (newCount > 0) {
      // Resolve the item's category + the user's category-scoped review
      // count so `category_review_count_eq` predicates can fire (e.g.
      // "first review in books"). Both are added to the moment payload
      // and to vars so admin copy can use {category} / {category_noun}.
      const [{ data: itemRow }, userMetaResult] = await Promise.all([
        admin.from("items").select("category").eq("id", itemId).single(),
        admin.from("users").select("handle, display_name").eq("id", user.id).single(),
      ]);
      const itemCategory = (itemRow as any)?.category as string | null;
      const userMeta = userMetaResult.data;

      let categoryReviewCount: number | null = null;
      if (itemCategory) {
        const { count: catCount } = await admin
          .from("reviews")
          .select("items!inner(category)", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_hidden", false)
          .eq("items.category", itemCategory);
        categoryReviewCount = catCount ?? 0;
      }

      // Pick the next-tier target for vars (drives {remaining} +
      // {ordinal} placeholders if a future moment uses them).
      const targetForCount =
        newCount <= 1   ? 1  :
        newCount <= 5   ? 5  :
        newCount <= 10  ? 10 :
        newCount <= 25  ? 25 : 50;
      const badgeForTarget =
        targetForCount <= 5  ? "verified" :
        targetForCount === 10 ? "gold" :
        targetForCount === 25 ? "expert"   : "platinum";

      const momentCtx = {
        user: {
          id:               user.id,
          handle:           (userMeta as any)?.handle ?? null,
          display_name:     (userMeta as any)?.display_name ?? null,
          suggestion_count: null,
        },
        payload: {
          count: newCount,
          category: itemCategory,
          category_review_count: categoryReviewCount,
        },
        vars: buildVars({
          user:     { handle: (userMeta as any)?.handle, display_name: (userMeta as any)?.display_name },
          count:    newCount,
          target:   targetForCount,
          badge:    badgeForTarget,
          category: itemCategory,
        }),
      };

      const raw = await resolveOneMoment("review_published", "achievement_modal", momentCtx);
      // Stamp the runtime count into display so the modal renderer
      // doesn't have to re-derive it from `vars`.
      if (raw) {
        achievement = {
          ...raw,
          display: { ...raw.display, count: newCount },
        };
      }
    }
  }

  return NextResponse.json({
    review_id: reviewRow.id,
    avg_rating: Number(avgRating.toFixed(2)),
    rating_count: ratingCount,
    achievement,
  });
}

/** GET /api/reviews?item_id=… — returns the current user's review for prefill, or null. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
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
  const sb = await createClient();
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
