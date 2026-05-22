import {
  ActivitiesTable,
  type ActivityCategory,
  type ActivityType,
  type ActivityRow,
} from "@/components/admin/ActivitiesTable";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const sb = createAdminClient();
  const pageSize = 50;

  const [catsRes, typesRes, activitiesRes] = await Promise.all([
    sb.from("activity_categories").select("id, name, icon"),
    sb.from("activity_types").select("id, category_id, name, icon"),
    sb
      .from("activities")
      .select(
        "*, activity_types!inner(id, name, slug, icon, category_id, activity_categories!inner(id, name, slug, icon))",
        { count: "exact" }
      )
      .order("modified_at", { ascending: false })
      .range(0, pageSize - 1),
  ]);

  const initialCategories = (catsRes.data ?? []) as ActivityCategory[];
  const initialTypes = (typesRes.data ?? []) as ActivityType[];
  const initialRows = (activitiesRes.data ?? []) as ActivityRow[];
  const initialTotal = activitiesRes.count ?? 0;

  return (
    <ActivitiesTable
      initialCategories={initialCategories}
      initialTypes={initialTypes}
      initialRows={initialRows}
      initialTotal={initialTotal}
    />
  );
}
