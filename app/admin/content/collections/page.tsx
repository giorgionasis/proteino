import { CollectionsList } from "@/components/admin/CollectionsList";
import { getCategoriesResolved } from "@/lib/categories-meta";

export default async function CollectionsPage() {
  const cats = await getCategoriesResolved();
  const categories = cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }));
  return <CollectionsList categories={categories} />;
}
