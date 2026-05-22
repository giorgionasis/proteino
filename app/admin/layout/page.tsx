import { LayoutManager } from "@/components/admin/LayoutManager";
import { getCategoriesResolved } from "@/lib/categories-meta";

export const dynamic = "force-dynamic";

export default async function AdminLayoutPage() {
  const cats = await getCategoriesResolved();
  const categories = cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }));
  return <LayoutManager categories={categories} />;
}
