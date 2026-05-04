import { createAdminClient } from "@/lib/supabase/admin";
import { SuggestionsTable } from "@/components/admin/SuggestionsTable";

export default async function SuggestionsPage() {
  const supabase = createAdminClient();

  const { data: authors } = await supabase
    .from("users")
    .select("id, display_name")
    .order("suggestion_count", { ascending: false })
    .limit(50);

  const { data: subcategories } = await supabase
    .from("subcategories")
    .select("id, category, name")
    .eq("is_published", true)
    .order("display_order");

  return (
    <SuggestionsTable
      authors={authors ?? []}
      subcategories={subcategories ?? []}
    />
  );
}
