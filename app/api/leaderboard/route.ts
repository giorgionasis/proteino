import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/leaderboard?period=all|month|week&category=all|<slug>
 *
 * Returns:
 *   {
 *     period, category,
 *     top:     [{ rank, ...user, score }, ...] // up to 10 rows
 *     viewer:  { rank, score, ...user } | null  // null = not on board
 *     neighbours: [...] // 1 above + 1 below the viewer when off the top
 *   }
 *
 * The RPC `get_leaderboard` returns the FULL ranked list — we trim
 * server-side so the wire payload stays small (≤12 rows). Public
 * endpoint: no auth required; the viewer is detected from the
 * session if present.
 */

const TOP_LIMIT      = 10;
const NEIGHBOUR_SPAN = 1; // rows above + below the viewer when shown

interface LeaderboardRow {
  id:           string;
  handle:       string;
  display_name: string | null;
  avatar_url:   string | null;
  level:        number;
  score:        number;
  rank:         number;
  is_viewer:    boolean;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const url      = new URL(req.url);
  const period   = url.searchParams.get("period")   ?? "all";
  const category = url.searchParams.get("category") ?? "all";

  if (!["all", "month", "week"].includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase.rpc as any)("get_leaderboard", {
    p_period:   period,
    p_category: category,
    p_viewer:   user?.id ?? null,
  });

  if (error) {
    // Migration 024 not applied → expose clearly so admin can act on
    // it. Same fail-soft pattern as bookmark.status.
    if ((error as any).code === "42883" || (error as any).message?.includes("get_leaderboard")) {
      return NextResponse.json(
        { error: "Migration 024 not applied", code: "MISSING_RPC" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: LeaderboardRow[] = (data ?? []).map((r: any) => ({
    id:           r.id,
    handle:       r.handle,
    display_name: r.display_name,
    avatar_url:   r.avatar_url,
    level:        r.level ?? 1,
    score:        Number(r.score ?? 0),
    rank:         r.rank,
    is_viewer:    !!r.is_viewer,
  }));

  const top      = rows.slice(0, TOP_LIMIT);
  const viewer   = rows.find((r) => r.is_viewer) ?? null;

  // Neighbours: only show when the viewer is off the top of the list.
  // 1 above + 1 below their rank. Skips rows already in `top`.
  let neighbours: LeaderboardRow[] = [];
  if (viewer && viewer.rank > TOP_LIMIT) {
    const start = Math.max(TOP_LIMIT, viewer.rank - NEIGHBOUR_SPAN - 1);
    const end   = viewer.rank + NEIGHBOUR_SPAN;
    neighbours = rows.slice(start, end);
  }

  return NextResponse.json({
    period,
    category,
    top,
    viewer,
    neighbours,
  });
}
