import { CategoryDetail } from "@/components/admin/CategoryDetail";
import { CATEGORIES } from "@/constants/categories";

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

export default function CategoryDetailPage({ params }: { params: { id: string } }) {
  const name = CATEGORY_NAMES[params.id] ?? params.id;
  return <CategoryDetail categoryId={params.id} categoryName={name} />;
}
