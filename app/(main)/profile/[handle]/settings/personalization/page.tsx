import { PersonalizationSettings } from "@/components/profile/settings/PersonalizationSettings";
import { getNavPublishedCategories } from "@/lib/categories-meta";

export default async function PersonalizationPage() {
  const cats = await getNavPublishedCategories();
  return (
    <PersonalizationSettings
      categories={cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }))}
    />
  );
}
