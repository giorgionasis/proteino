import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/follows  body: { user_id: <target uuid> }
 *
 * Idempotent — re-following is a no-op via upsert + ignoreDuplicates on the
 * UNIQUE (follower_id, following_id) constraint.
 *
 * The DB CHECK (follower_id <> following_id) prevents self-follow at the
 * storage layer; we mirror it here for a friendlier error message.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetId = body.user_id as string | undefined;
  if (!targetId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  if (targetId === user.id) {
    return NextResponse.json({ error: "Δεν μπορείς να ακολουθήσεις τον εαυτό σου" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await (admin.from("follows") as any).upsert(
    { follower_id: user.id, following_id: targetId },
    { onConflict: "follower_id,following_id", ignoreDuplicates: true }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/follows?user_id=<target uuid>
 *
 * Removes the follow edge. No-op if not following.
 */
export async function DELETE(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetId = url.searchParams.get("user_id");
  if (!targetId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * GET /api/follows?user_id=<target uuid>
 *
 * Returns whether the current user follows the target. Returns
 * { following: false } for guests (no auth) — keeps the client code simple.
 */
export async function GET(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ following: false });

  const url = new URL(req.url);
  const targetId = url.searchParams.get("user_id");
  if (!targetId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data } = await sb
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  return NextResponse.json({ following: !!data });
}
