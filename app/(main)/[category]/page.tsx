import type { Metadata } from "next";
import { CATEGORIES } from "@/constants/categories";
import { notFound } from "next/navigation";

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) return {};
  return { title: `${cat.label} — Proteino` };
}

export default function CategoryPage({ params }: Props) {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) notFound();

  return (
    <main className="pb-24 px-4">
      {/* Category header */}
      {/* Filter chips */}
      {/* Item list */}
    </main>
  );
}
