import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/suggestions/[id]
 *
 * Owner-only edit of an existing suggestion. Accepts partial updates of
 * `reflection` and `rating`. Other fields (item, content_hash, dates) are
 * immutable.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("suggestions")
    .select("id, user_id, item_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((existing as any).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { modified_at: new Date().toISOString() };

  if (typeof body.reflection === "string" || body.reflection === null) {
    update.reflection = typeof body.reflection === "string" ? body.reflection.trim() : null;
  }
  if (typeof body.rating === "number") {
    if (body.rating < 0 || body.rating > 5) {
      return NextResponse.json({ error: "rating must be 0–5" }, { status: 400 });
    }
    update.rating = body.rating;
  } else if (body.rating === null) {
    update.rating = null;
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await (admin.from("suggestions") as any)
    .update(update)
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/suggestions/[id]
 *
 * Owner-only delete. Reverts:
 *  - users.suggestion_count (decrement, never below 0)
 *  - items.suggestion_count (best-effort decrement, never below 0)
 *
 * Comments referencing this suggestion's id will FK-cascade per schema; we
 * don't delete them explicitly here.
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("suggestions")
    .select("id, user_id, item_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((existing as any).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const itemId = (existing as any).item_id as string;

  const { error: delErr } = await admin
    .from("suggestions")
    .delete()
    .eq("id", params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Best-effort denorm bumps. Failures here are non-fatal — the row is
  // already gone, counts can be reconciled later.
  // User count is recounted from published rows (same as the publish
  // path) so it can't drift from the truth.
  const { count: publishedCount } = await admin
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_published", true);
  if (publishedCount !== null) {
    await (admin.from("users") as any).update({ suggestion_count: publishedCount }).eq("id", user.id);
  }

  const { data: itemRow } = await admin
    .from("items")
    .select("suggestion_count")
    .eq("id", itemId)
    .single();
  if (itemRow) {
    const next = Math.max(0, ((itemRow as any).suggestion_count ?? 0) - 1);
    await (admin.from("items") as any).update({ suggestion_count: next }).eq("id", itemId);
  }

  // Last recommendation gone and nobody else reviewed it → the item is
  // just a title with no person behind it. Unpublish (not delete: an
  // admin can restore it, and other members' bookmarks keep their row).
  const [{ count: remainingSuggestions }, { count: visibleReviews }] = await Promise.all([
    admin.from("suggestions").select("id", { count: "exact", head: true })
      .eq("item_id", itemId).eq("is_published", true).is("hidden_at", null),
    admin.from("reviews").select("id", { count: "exact", head: true })
      .eq("item_id", itemId).eq("is_hidden", false),
  ]);
  let itemUnpublished = false;
  if (remainingSuggestions === 0 && visibleReviews === 0) {
    const { data: cur } = await (admin.from("items") as any).select("metadata").eq("id", itemId).maybeSingle();
    const { error: unpubErr } = await (admin.from("items") as any)
      // The reason lets a later suggestion of the same item republish it
      // (POST /api/suggestions) without touching admin-unpublished items.
      .update({ is_published: false, metadata: { ...(cur?.metadata ?? {}), unpublished_reason: "no_suggestions" } })
      .eq("id", itemId);
    itemUnpublished = !unpubErr;
  }

  return NextResponse.json({ ok: true, item_unpublished: itemUnpublished });
}
