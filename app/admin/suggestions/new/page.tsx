import { NewSuggestionForm } from "@/components/admin/NewSuggestionForm";
import { getCategoriesResolved } from "@/lib/categories-meta";

export default async function NewSuggestionPage() {
  const cats = await getCategoriesResolved();
  const categories = cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }));
  return <NewSuggestionForm categories={categories} />;
}
