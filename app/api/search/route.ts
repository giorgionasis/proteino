import { NextRequest, NextResponse } from "next/server";
import type { Item } from "@/types";

const MOCK_ITEMS: Item[] = [
  {
    id: "1", category: "bars", title: "Theory Bar", slug: "theory-bar",
    description_seo: "All-day cocktail bar in Chalandri", cover_url: null,
    avg_rating: 4.5, rating_count: 87, suggestion_count: 12,
    is_published: true, embedding: null,
    created_at: "2024-01-01", modified_at: "2024-01-01",
  },
  {
    id: "2", category: "bars", title: "Jazz Point", slug: "jazz-point",
    description_seo: "Live jazz bar in central Athens", cover_url: null,
    avg_rating: 4.2, rating_count: 54, suggestion_count: 8,
    is_published: true, embedding: null,
    created_at: "2024-01-01", modified_at: "2024-01-01",
  },
  {
    id: "3", category: "movies", title: "Inception", slug: "inception",
    description_seo: "A mind-bending sci-fi thriller by Christopher Nolan", cover_url: null,
    avg_rating: 4.87, rating_count: 123, suggestion_count: 31,
    is_published: true, embedding: null,
    created_at: "2024-01-01", modified_at: "2024-01-01",
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const categories = searchParams.get("categories")?.split(",") ?? [];

  const items = MOCK_ITEMS.filter((item) => {
    const matchesQuery = !q || item.title.toLowerCase().includes(q) || item.description_seo?.toLowerCase().includes(q);
    const matchesCategory = categories.length === 0 || categories.includes(item.category);
    return matchesQuery && matchesCategory;
  });

  return NextResponse.json({ items, total: items.length });
}
