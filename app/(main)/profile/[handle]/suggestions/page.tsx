import type { Metadata } from "next";
import { SuggestionsCategoryList } from "@/components/profile/suggestions/SuggestionsCategoryList";

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Προτάσεις @${params.handle} — Proteino` };
}

export default function SuggestionsPage({ params }: Props) {
  return <SuggestionsCategoryList handle={params.handle} />;
}
