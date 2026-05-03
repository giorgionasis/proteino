import type { Metadata } from "next";
import { SuggestionsByCategoryPage } from "@/components/profile/suggestions/SuggestionsByCategoryPage";

interface Props { params: { handle: string; category: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Προτάσεις — Proteino` };
}

export default function CategoryPage({ params }: Props) {
  return <SuggestionsByCategoryPage handle={params.handle} category={params.category} />;
}
