import { createAdminClient } from "@/lib/supabase/admin";
import { ReportsTable, type ReportRow } from "@/components/admin/ReportsTable";

export const dynamic = "force-dynamic";

/**
 * /admin/reports — moderation queue for the new content_reports table
 * (migration 015). Shows unresolved reports across both target_types
 * (suggestion + comment), grouped by target. Admin actions: Dismiss / Hide.
 *
 * Uses the service-role client so RLS doesn't filter out anything.
 */
export default async function AdminReportsPage() {
  const sb = createAdminClient();

  const { data: rawReports } = await sb
    .from("content_reports")
    .select("id, target_type, target_id, reason, description, created_at, reporter_id, users:reporter_id(display_name, handle)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(200);

  const reports = (rawReports ?? []) as any[];

  // Hydrate target context: for each report, fetch a tiny excerpt of the
  // suggestion/comment + the item title (where applicable).
  const suggestionIds = Array.from(new Set(reports.filter(r => r.target_type === "suggestion").map(r => r.target_id)));
  const commentIds = Array.from(new Set(reports.filter(r => r.target_type === "comment").map(r => r.target_id)));

  const targetMap = new Map<string, { excerpt: string; itemTitle?: string; authorName?: string }>();

  if (suggestionIds.length > 0) {
    const { data: sugRows } = await sb
      .from("suggestions")
      .select("id, reflection, users(display_name), items(title)")
      .in("id", suggestionIds);
    for (const s of (sugRows ?? []) as any[]) {
      targetMap.set(`suggestion:${s.id}`, {
        excerpt: s.reflection ?? "(κενή πρόταση)",
        itemTitle: s.items?.title,
        authorName: s.users?.display_name,
      });
    }
  }

  if (commentIds.length > 0) {
    const { data: cmtRows } = await sb
      .from("comments")
      .select("id, body, users(display_name)")
      .in("id", commentIds);
    for (const c of (cmtRows ?? []) as any[]) {
      targetMap.set(`comment:${c.id}`, {
        excerpt: c.body ?? "(κενό σχόλιο)",
        authorName: c.users?.display_name,
      });
    }
  }

  const rows: ReportRow[] = reports.map((r) => {
    const ctx = targetMap.get(`${r.target_type}:${r.target_id}`) ?? { excerpt: "(δεν βρέθηκε)" };
    return {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reason: r.reason,
      description: r.description,
      created_at: r.created_at,
      reporter_name: r.users?.display_name ?? "Άγνωστος",
      reporter_handle: r.users?.handle ?? "",
      target_excerpt: ctx.excerpt,
      target_item_title: ctx.itemTitle,
      target_author_name: ctx.authorName,
    };
  });

  return <ReportsTable rows={rows} />;
}
