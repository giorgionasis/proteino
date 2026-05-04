import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/suggestions/queue?cursor=ID&filter=unpublished|all
 *
 * Given the current suggestion id, returns:
 *   { prev_id, next_id, position, total }
 *
 * Powers "Save & next" navigation in the editor — admin can plow through
 * the unpublished queue without going back to the list. Default filter is
 * `unpublished` since that's the dominant moderation flow.
 *
 * Ordering is created_at DESC (newest first), matching the list's default.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const filter = (url.searchParams.get("filter") ?? "unpublished") as "unpublished" | "all";
  if (!cursor) return NextResponse.json({ error: "cursor required" }, { status: 400 });

  const sb = createAdminClient();

  // Look up cursor's created_at
  const { data: cur } = await sb
    .from("suggestions")
    .select("created_at, is_published")
    .eq("id", cursor)
    .single();
  const cursorRow = cur as { created_at: string; is_published: boolean } | null;
  if (!cursorRow) return NextResponse.json({ error: "cursor not found" }, { status: 404 });

  // Build the "filter applies" query helper
  function applyFilter<T>(q: T): T {
    if (filter === "unpublished") {
      return (q as any).eq("is_published", false);
    }
    return q;
  }

  const [totalRes, posRes, nextRes, prevRes] = await Promise.all([
    applyFilter(sb.from("suggestions").select("id", { count: "exact", head: true })),
    applyFilter(
      sb.from("suggestions").select("id", { count: "exact", head: true }).gt("created_at", cursorRow.created_at)
    ),
    applyFilter(
      sb.from("suggestions").select("id").lt("created_at", cursorRow.created_at).order("created_at", { ascending: false }).limit(1)
    ),
    applyFilter(
      sb.from("suggestions").select("id").gt("created_at", cursorRow.created_at).order("created_at", { ascending: true }).limit(1)
    ),
  ]);

  const total = totalRes.count ?? 0;
  // position is 1-based: how many rows are AHEAD (newer) + 1
  const ahead = posRes.count ?? 0;

  // If the cursor doesn't match the filter (e.g., already-published while
  // queue is unpublished), the cursor is "outside" the queue. Position is null.
  const cursorMatchesFilter = filter === "all" || !cursorRow.is_published;
  const position = cursorMatchesFilter ? ahead + 1 : null;

  return NextResponse.json({
    prev_id: (prevRes.data as any)?.[0]?.id ?? null,
    next_id: (nextRes.data as any)?.[0]?.id ?? null,
    position,
    total,
  });
}
