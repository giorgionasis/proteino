import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewsCategoryPage } from "@/components/profile/reviews/ReviewsCategoryPage";
import { safeImageUrl } from "@/lib/image-url";

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Αξιολογήσεις @${params.handle} — Proteino` };
}

export default async function ReviewsPage({ params }: Props) {
  const supabase = createClient();

  const { data: { user: viewer } } = await supabase.auth.getUser();

  const { data: profileUser } = await supabase
    .from("users")
    .select("id, handle")
    .eq("handle", params.handle)
    .maybeSingle();
  if (!profileUser) notFound();

  const isOwner = !!viewer && (viewer.id === (profileUser as any).id);

  // Source of truth is the `reviews` table (migration 016). The legacy
  // `ratings` table was wiped clean and is no longer written to.
  const { data: rows } = await supabase
    .from("reviews")
    .select(`
      id, rating, reflection, created_at,
      items!inner(id, slug, title, category, cover_url, poster_url)
    `)
    .eq("user_id", (profileUser as any).id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });

  const reviews = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    score: typeof r.rating === "number" ? r.rating : 0,
    reflection: r.reflection as string | null,
    createdAt: r.created_at as string,
    item: {
      id: r.items.id as string,
      title: r.items.title as string,
      slug: r.items.slug as string,
      category: r.items.category as string,
      poster: safeImageUrl(r.items.poster_url) ?? safeImageUrl(r.items.cover_url) ?? null,
    },
  }));

  return (
    <ReviewsCategoryPage
      handle={params.handle}
      isOwner={isOwner}
      reviews={reviews}
    />
  );
}
