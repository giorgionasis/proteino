import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookmarksCategoryPage, type BookmarkedItem } from "@/components/profile/bookmarks/BookmarksCategoryPage";
import { CATEGORIES } from "@/constants/categories";
import { createClient } from "@/lib/supabase/server";

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Αγαπημένα @${params.handle} — Proteino` };
}

export const dynamic = "force-dynamic";

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

export default async function BookmarksPage({ params }: Props) {
  const sb = createClient();

  const [{ data: { user: viewer } }, profileRes] = await Promise.all([
    sb.auth.getUser(),
    sb.from("users").select("id, handle").eq("handle", params.handle).maybeSingle(),
  ]);

  const profileUser = profileRes.data as { id: string; handle: string } | null;
  if (!profileUser) redirect("/");
  const isOwnProfile = !!viewer && viewer.id === profileUser.id;

  // Bookmarks RLS = own-only; if not own profile, list is intentionally empty
  // (privacy default — opt-in sharing is a future feature).
  const targetUserId = isOwnProfile ? viewer!.id : profileUser.id;

  const { data: rows } = await sb
    .from("bookmarks")
    .select("id, item_id, category, items(id, title, slug, cover_url, category, avg_rating, rating_count)")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  const items: BookmarkedItem[] = ((rows ?? []) as any[])
    .filter((b) => b.items)
    .map((b) => ({
      id: b.id,
      itemId: b.item_id,
      category: b.items.category,
      title: b.items.title,
      cover_url: b.items.cover_url,
      avg_rating: b.items.avg_rating ?? 0,
      rating_count: b.items.rating_count ?? 0,
      href: `/${b.items.category}/${stripPrefix(b.items.slug)}`,
    }));

  const groups = CATEGORIES
    .map((c) => ({
      category: c.slug,
      label: c.labelEl,
      icon: c.icon,
      items: items.filter((i) => i.category === c.slug),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <BookmarksCategoryPage
      handle={params.handle}
      isOwnProfile={isOwnProfile}
      groups={groups}
      total={items.length}
    />
  );
}
