import type { Metadata } from "next";
import { ReviewsCategoryPage } from "@/components/profile/reviews/ReviewsCategoryPage";

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Αξιολογήσεις @${params.handle} — Proteino` };
}

export default function ReviewsPage({ params }: Props) {
  return <ReviewsCategoryPage handle={params.handle} category="vivlia" />;
}
