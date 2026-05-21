import { CategoriesTable, type CategoryInitialRow } from "@/components/admin/CategoriesTable";
import { getCategoriesResolved } from "@/lib/categories-meta";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const sb = createAdminClient();

  const [resolved, subcatsRes, itemsRes, suggestionsRes] = await Promise.all([
    getCategoriesResolved(),
    sb.from("subcategories").select("category"),
    sb.from("items").select("category"),
    sb.from("suggestions").select("id, items!inner(category)"),
  ]);

  const subcatCounts: Record<string, number> = {};
  for (const r of (subcatsRes.data ?? []) as any[]) {
    if (r.category) subcatCounts[r.category] = (subcatCounts[r.category] ?? 0) + 1;
  }
  const itemCounts: Record<string, number> = {};
  for (const r of (itemsRes.data ?? []) as any[]) {
    if (r.category) itemCounts[r.category] = (itemCounts[r.category] ?? 0) + 1;
  }
  const suggestionCounts: Record<string, number> = {};
  for (const r of (suggestionsRes.data ?? []) as any[]) {
    const cat = r.items?.category;
    if (cat) suggestionCounts[cat] = (suggestionCounts[cat] ?? 0) + 1;
  }

  const initial: CategoryInitialRow[] = resolved.map((c) => ({
    ...c,
    subcategories: subcatCounts[c.slug] ?? 0,
    items:         itemCounts[c.slug] ?? 0,
    suggestions:   suggestionCounts[c.slug] ?? 0,
  }));

  return <CategoriesTable initial={initial} />;
}
