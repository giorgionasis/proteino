import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/reviews/[id]/vote
 *
 * Vote a review up/down/clear. Body: { vote: 1 | -1 | null }
 *   - 1 → upsert as up
 *   - -1 → upsert as down
 *   - null → delete the user's vote on this review
 *
 * Self-vote prevention: a user can't vote on their own review.
 *
 * The DB trigger `trg_sync_review_votes` keeps reviews.vote_up/vote_down in
 * sync after each insert/update/delete — we don't recompute here.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewId = params.id;
  if (!reviewId) return NextResponse.json({ error: "review id required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const vote = body.vote;

  if (vote !== 1 && vote !== -1 && vote !== null) {
    return NextResponse.json({ error: "vote must be 1, -1, or null" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Block self-vote — the original review author can't vote on their own
  const { data: reviewRow } = await admin
    .from("reviews")
    .select("user_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!reviewRow) return NextResponse.json({ error: "review not found" }, { status: 404 });
  if ((reviewRow as any).user_id === user.id) {
    return NextResponse.json({ error: "Δεν μπορείς να ψηφίσεις τη δική σου αξιολόγηση" }, { status: 403 });
  }

  if (vote === null) {
    // Remove existing vote (if any). Trigger fires DELETE → decrements counter.
    await admin.from("review_votes").delete().eq("user_id", user.id).eq("review_id", reviewId);
  } else {
    // Upsert. Trigger handles INSERT (new) and UPDATE (flipped vote).
    const { error: upErr } = await (admin.from("review_votes") as any).upsert(
      { user_id: user.id, review_id: reviewId, vote },
      { onConflict: "user_id,review_id" }
    );
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Return fresh counts so the caller can sync optimistic state if needed
  const { data: counts } = await admin
    .from("reviews")
    .select("vote_up, vote_down")
    .eq("id", reviewId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    vote_up: (counts as any)?.vote_up ?? 0,
    vote_down: (counts as any)?.vote_down ?? 0,
    my_vote: vote,
  });
}
