import { createAdminClient } from "@/lib/supabase/admin";
import { LegacyCommentsTable } from "@/components/admin/LegacyCommentsTable";

export default async function LegacyCommentsPage() {
  const supabase = createAdminClient();

  const { count: totalCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: last24h } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneDayAgo);

  const { count: reportedCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .gt("report_count", 0);

  const { count: hiddenCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("is_hidden", true);

  return (
    <LegacyCommentsTable
      stats={{
        total: totalCount ?? 0,
        last24h: last24h ?? 0,
        reported: reportedCount ?? 0,
        hidden: hiddenCount ?? 0,
      }}
    />
  );
}
