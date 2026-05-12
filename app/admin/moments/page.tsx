import { createAdminClient } from "@/lib/supabase/admin";
import { PREDICATE_SCHEMAS } from "@/lib/moments";
import type { MomentRow } from "@/lib/moments";
import { MomentsManager } from "@/components/admin/MomentsManager";

export const dynamic = "force-dynamic";

export default async function MomentsAdminPage() {
  const sb = createAdminClient();

  // List + stats in parallel — both feed the same client component.
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [momentsRes, eventsRes] = await Promise.all([
    sb.from("moments")
      .select("*")
      .order("trigger_event", { ascending: true })
      .order("priority", { ascending: false })
      .order("key", { ascending: true }),
    sb.from("moment_events")
      .select("moment_id, cta_clicked, dismissed_at")
      .gte("fired_at", since),
  ]);

  const moments = (momentsRes.data ?? []) as unknown as MomentRow[];
  const events  = (eventsRes.data  ?? []) as Array<{
    moment_id: string;
    cta_clicked: boolean;
    dismissed_at: string | null;
  }>;

  const stats: Record<string, { fires: number; ctaClicks: number; dismissed: number }> = {};
  for (const e of events) {
    if (!stats[e.moment_id]) stats[e.moment_id] = { fires: 0, ctaClicks: 0, dismissed: 0 };
    stats[e.moment_id].fires++;
    if (e.cta_clicked)  stats[e.moment_id].ctaClicks++;
    if (e.dismissed_at) stats[e.moment_id].dismissed++;
  }

  return (
    <MomentsManager
      initialMoments={moments}
      initialStats={stats}
      predicateSchemas={PREDICATE_SCHEMAS}
    />
  );
}
