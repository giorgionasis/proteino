import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MovieDetail }   from "@/components/detail/MovieDetail";
import { SeriesDetail }  from "@/components/detail/SeriesDetail";
import { BookDetail }    from "@/components/detail/BookDetail";
import { FoodDetail }    from "@/components/detail/FoodDetail";
import { BarsDetail }    from "@/components/detail/BarsDetail";
import { HotelDetail }   from "@/components/detail/HotelDetail";
import { TheaterDetail } from "@/components/detail/TheaterDetail";
import { EventDetail }   from "@/components/detail/EventDetail";
import { RecipeDetail }  from "@/components/detail/RecipeDetail";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CategorySlug } from "@/types";

interface Props {
  params: { category: string; id: string };
}

export type ItemDetailData = {
  item: Record<string, any>;
  extension: Record<string, any>;
  suggestions: Array<{
    id: string;
    reflection: string | null;
    rating: number | null;
    created_at: string;
    user: { id: string; display_name: string; handle: string; avatar_url: string | null; level: number };
  }>;
  related: Array<Record<string, any>>;
};

const EXT_TABLE: Record<string, string> = {
  movies: "item_movies", series: "item_series", books: "item_books",
  food: "item_food", recipes: "item_recipes", bars: "item_bars",
  hotels: "item_hotels", theater: "item_theater", events: "item_events",
};

async function fetchItemData(slug: string, category: string): Promise<ItemDetailData | null> {
  const sb = createAdminClient();
  const extTable = EXT_TABLE[category];
  if (!extTable) return null;

  const fullSlug = `${category}/${slug}`;
  const { data: item } = (await (sb.from("items") as any)
    .select(`*, ${extTable}(*)`)
    .eq("slug", fullSlug)
    .eq("category", category)
    .eq("is_published", true)
    .single()) as { data: any };

  if (!item) return null;

  const ext = Array.isArray(item[extTable]) ? item[extTable][0] : (item[extTable] ?? {});

  // Fetch suggestions with user data
  const { data: sugData } = (await (sb.from("suggestions") as any)
    .select("id, reflection, rating, created_at, users(id, display_name, handle, avatar_url, level, suggestion_count, avg_quality_score)")
    .eq("item_id", item.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20)) as { data: any[] | null };

  const suggestions = (sugData ?? []).map((s: any) => ({
    id: s.id,
    reflection: s.reflection,
    rating: s.rating,
    created_at: s.created_at,
    user: s.users ?? { id: "", display_name: "Χρήστης", handle: "user", avatar_url: null, level: 1, suggestion_count: 0, avg_quality_score: null },
  }));

  // Fetch related items in same category
  const { data: relData } = (await (sb.from("items") as any)
    .select(`id, title, slug, cover_url, avg_rating, rating_count, metadata, ${extTable}(*)`)
    .eq("category", category)
    .eq("is_published", true)
    .neq("id", item.id)
    .order("avg_rating", { ascending: false })
    .limit(7)) as { data: any[] | null };

  return {
    item: { ...item, [extTable]: undefined },
    extension: ext,
    suggestions,
    related: (relData ?? []).map((r: any) => {
      const rExt = Array.isArray(r[extTable]) ? r[extTable]?.[0] : r[extTable];
      const cleanSlug = r.slug?.includes("/") ? r.slug.split("/").pop() : r.slug;
      return { ...r, slug: cleanSlug, ext: rExt, [extTable]: undefined };
    }),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchItemData(params.id, params.category);
  if (!data) return { title: "Proteino" };
  return { title: `${data.item.title} — Proteino` };
}

export default async function ItemDetailPage({ params }: Props) {
  const validCategories = ["movies", "series", "books", "food", "bars", "hotels", "theater", "events", "recipes"];
  if (!validCategories.includes(params.category)) notFound();

  const data = await fetchItemData(params.id, params.category);
  if (!data) notFound();

  switch (params.category) {
    case "movies":  return <MovieDetail data={data} />;
    case "series":  return <SeriesDetail data={data} />;
    case "books":   return <BookDetail data={data} />;
    case "food":    return <FoodDetail data={data} />;
    case "bars":    return <BarsDetail data={data} />;
    case "hotels":  return <HotelDetail data={data} />;
    case "theater": return <TheaterDetail data={data} />;
    case "events":  return <EventDetail data={data} />;
    case "recipes": return <RecipeDetail data={data} />;
    default:        notFound();
  }
}
