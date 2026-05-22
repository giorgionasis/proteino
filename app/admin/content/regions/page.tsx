import { RegionsManager, type Region } from "@/components/admin/RegionsManager";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function RegionsPage() {
  const sb = createAdminClient();
  const { data } = await sb
    .from("regions")
    .select("id, name, slug, parent_id, display_order");
  const initial = (data ?? []) as Region[];
  return <RegionsManager initial={initial} />;
}
