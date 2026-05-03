import { NextRequest, NextResponse } from "next/server";
import type { Item } from "@/types";

const MOCK_RECS: Item[] = [
  {
    id: "r1", category: "movies", title: "Interstellar", slug: "interstellar",
    description_seo: null, cover_url: null,
    avg_rating: 4.9, rating_count: 201, suggestion_count: 45,
    is_published: true, embedding: null,
    created_at: "2024-01-01", modified_at: "2024-01-01",
  },
  {
    id: "r2", category: "books", title: "The Alchemist", slug: "the-alchemist",
    description_seo: null, cover_url: null,
    avg_rating: 4.6, rating_count: 150, suggestion_count: 38,
    is_published: true, embedding: null,
    created_at: "2024-01-01", modified_at: "2024-01-01",
  },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json({ items: MOCK_RECS, total: MOCK_RECS.length });
}
