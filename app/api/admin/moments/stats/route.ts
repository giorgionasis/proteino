import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Aggregated moment_events stats over the last 7 days.
 *
 * Returns: { [moment_id]: { fires, ctaClicks, dismissed } }
 *
 * Cheap enough to compute on every list-page hit — Postgres covers
 * the (moment_id, fired_at DESC) index from migration 026 and the
 * 7d window keeps the scan small.
 */
export async function GET() {
  const sb    = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await sb
    .from("moment_events")
    .select("moment_id, cta_clicked, dismissed_at")
    .gte("fired_at", since);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats: Record<string, { fires: number; ctaClicks: number; dismissed: number }> = {};
  for (const row of (data ?? []) as any[]) {
    const id = row.moment_id;
    if (!stats[id]) stats[id] = { fires: 0, ctaClicks: 0, dismissed: 0 };
    stats[id].fires++;
    if (row.cta_clicked)    stats[id].ctaClicks++;
    if (row.dismissed_at)   stats[id].dismissed++;
  }

  return NextResponse.json(stats);
}
