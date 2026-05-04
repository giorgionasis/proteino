import { createAdminClient } from "@/lib/supabase/admin";
import { ExtraFieldsManager } from "@/components/admin/ExtraFieldsManager";

export default async function ExtraFieldsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("extra_field_options")
    .select("id, category, field_group, value, label, display_order, is_published, icon")
    .order("category")
    .order("field_group")
    .order("display_order");

  return <ExtraFieldsManager initialOptions={(data ?? []) as any} />;
}
