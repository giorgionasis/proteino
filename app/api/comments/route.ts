import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_LEN = 2000;

/**
 * POST /api/comments
 *
 * Adds a user comment to a suggestion (or reply to another comment).
 *
 * Body:  { suggestion_id: uuid, body: string, parent_id?: uuid }
 * Returns: the inserted comment with joined user info so the caller can
 *          render it without a follow-up fetch.
 *
 * Triggers maintained by migration 003 will keep comments.report_count and
 * comments.vote_up/vote_down in sync as votes/reports come in.
 *
 * Hidden comments (is_hidden = true) are still inserted but the moderation
 * UI in /admin/reviews flags them. Frontend feeds should filter those out.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const suggestionId = body.suggestion_id as string | undefined;
  const text = (body.body ?? "").toString().trim();
  const parentId = (body.parent_id as string | undefined) ?? null;

  if (!suggestionId) return NextResponse.json({ error: "suggestion_id required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY_LEN})` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Sanity check: the suggestion exists. Cheap; prevents orphan comments.
  const { data: sug } = await admin
    .from("suggestions")
    .select("id")
    .eq("id", suggestionId)
    .maybeSingle();
  if (!sug) return NextResponse.json({ error: "suggestion not found" }, { status: 404 });

  // If parent_id provided, verify it points to a comment on the same suggestion.
  if (parentId) {
    const { data: parent } = await admin
      .from("comments")
      .select("id, suggestion_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || (parent as any).suggestion_id !== suggestionId) {
      return NextResponse.json({ error: "invalid parent_id" }, { status: 400 });
    }
  }

  const { data: inserted, error } = await (admin.from("comments") as any)
    .insert({
      user_id: user.id,
      suggestion_id: suggestionId,
      parent_id: parentId,
      body: text,
    })
    .select(
      "id, body, created_at, parent_id, suggestion_id, " +
      "users!comments_user_id_fkey(id, handle, display_name, avatar_url, level)"
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ comment: inserted });
}

/**
 * GET /api/comments?suggestion_id=...
 *
 * Returns all visible (not hidden) comments for a suggestion, with author
 * info, ordered oldest → newest. Used by the detail-page comment thread.
 */
export async function GET(req: NextRequest) {
  const sb = createClient();
  const url = new URL(req.url);
  const suggestionId = url.searchParams.get("suggestion_id");
  if (!suggestionId) return NextResponse.json({ error: "suggestion_id required" }, { status: 400 });

  const { data, error } = await (sb.from("comments") as any)
    .select(
      "id, body, created_at, parent_id, vote_up, vote_down, " +
      "users!comments_user_id_fkey(id, handle, display_name, avatar_url, level)"
    )
    .eq("suggestion_id", suggestionId)
    .or("is_hidden.is.null,is_hidden.eq.false")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}
