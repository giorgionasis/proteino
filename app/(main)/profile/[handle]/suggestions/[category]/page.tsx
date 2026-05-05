import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, CATEGORY_SLUGS } from "@/constants/categories";
import { SuggestionsByCategoryPage } from "@/components/profile/suggestions/SuggestionsByCategoryPage";
import { safeImageUrl } from "@/lib/image-url";
import type { CategorySlug } from "@/types";

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

interface Props { params: { handle: string; category: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Προτάσεις — Proteino` };
}

export default async function CategoryPage({ params }: Props) {
  if (!CATEGORY_SLUGS.includes(params.category as CategorySlug)) notFound();
  const supabase = createClient();

  const { data: { user: viewer } } = await supabase.auth.getUser();

  const { data: profileUser } = await supabase
    .from("users")
    .select("id, handle")
    .eq("handle", params.handle)
    .maybeSingle();
  if (!profileUser) notFound();

  const isOwner = !!viewer && (viewer.id === (profileUser as any).id);

  const { data: rows } = await supabase
    .from("suggestions")
    .select(`
      id, reflection, rating, created_at, modified_at,
      items!inner(id, slug, title, category, cover_url, poster_url, avg_rating, rating_count)
    `)
    .eq("user_id", (profileUser as any).id)
    .eq("is_published", true)
    .eq("items.category", params.category)
    .order("created_at", { ascending: false });

  const suggestions = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    reflection: (r.reflection ?? "") as string,
    rating: typeof r.rating === "number" ? r.rating : 0,
    createdAt: r.created_at as string,
    item: {
      id: r.items.id as string,
      title: r.items.title as string,
      slug: stripPrefix(r.items.slug as string),
      fullSlug: r.items.slug as string,
      poster: safeImageUrl(r.items.poster_url) ?? safeImageUrl(r.items.cover_url) ?? null,
      avgRating: typeof r.items.avg_rating === "number" ? r.items.avg_rating : 0,
      ratingCount: typeof r.items.rating_count === "number" ? r.items.rating_count : 0,
    },
  }));

  const categoryMeta = CATEGORIES.find((c) => c.slug === params.category)!;

  return (
    <SuggestionsByCategoryPage
      handle={params.handle}
      category={params.category as CategorySlug}
      categoryLabel={categoryMeta.labelEl}
      isOwner={isOwner}
      suggestions={suggestions}
    />
  );
}
