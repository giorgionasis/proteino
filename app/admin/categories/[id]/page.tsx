import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryDetail } from "@/components/admin/CategoryDetail";
import { notFound } from "next/navigation";

const CATEGORY_NAMES: Record<string, string> = {
  books: "Βιβλίο",
  movies: "Ταινίες",
  series: "Σειρές",
  recipes: "Συνταγές",
  bars: "Καφέ/Μπαρ",
  food: "Φαγητό",
  theater: "Θέατρο",
  events: "Εκδηλώσεις",
  hotels: "Διαμονή",
};

const VALID_CATEGORIES = Object.keys(CATEGORY_NAMES);

export default async function CategoryDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!VALID_CATEGORIES.includes(params.id)) notFound();

  const supabase = createAdminClient();
  const categoryId = params.id;

  // Fetch subcategories with item counts (using rpc-like nested select)
  const { data: subcategoriesRaw } = await supabase
    .from("subcategories")
    .select("id, name, slug, is_published, display_order")
    .eq("category", categoryId)
    .order("display_order", { ascending: true });

  // Get item counts per subcategory
  const subcategoryIds = (subcategoriesRaw ?? []).map((s: any) => s.id);
  const itemCounts: Record<string, number> = {};
  let totalItems = 0;
  let nullSubcatItems = 0;

  if (subcategoryIds.length > 0) {
    // Count items per subcategory in one go
    const { data: items } = await supabase
      .from("items")
      .select("id, subcategory_id")
      .eq("category", categoryId);

    for (const item of (items ?? []) as any[]) {
      totalItems++;
      if (item.subcategory_id) {
        itemCounts[item.subcategory_id] = (itemCounts[item.subcategory_id] ?? 0) + 1;
      } else {
        nullSubcatItems++;
      }
    }
  }

  // Get suggestion count for this category
  const { count: suggestionCount } = await supabase
    .from("suggestions")
    .select("id, items!inner(category)", { count: "exact", head: true })
    .eq("items.category", categoryId);

  // Get distinct user count contributing to this category
  const { data: usersRaw } = await supabase
    .from("suggestions")
    .select("user_id, items!inner(category)")
    .eq("items.category", categoryId);
  const distinctUsers = new Set((usersRaw ?? []).map((r: any) => r.user_id)).size;

  const subcategories = (subcategoriesRaw ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    isPublished: s.is_published,
    displayOrder: s.display_order,
    itemCount: itemCounts[s.id] ?? 0,
  }));

  return (
    <CategoryDetail
      categoryId={categoryId}
      categoryName={CATEGORY_NAMES[categoryId]}
      subcategories={subcategories}
      stats={{
        totalSubcategories: subcategories.length,
        totalItems,
        totalSuggestions: suggestionCount ?? 0,
        distinctUsers,
        nullSubcatItems,
      }}
    />
  );
}
