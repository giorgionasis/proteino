import { RelatedSectionsManager } from "@/components/admin/RelatedSectionsManager";
import { getCategoriesResolved } from "@/lib/categories-meta";

export const dynamic = "force-dynamic";

export default async function RelatedSectionsAdminPage() {
  const cats = await getCategoriesResolved();
  const categories = cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }));
  return <RelatedSectionsManager categories={categories} />;
}
