import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookmarksCategoryPage, type BookmarkedItem } from "@/components/profile/bookmarks/BookmarksCategoryPage";
import { CATEGORIES } from "@/constants/categories";
import { createClient } from "@/lib/supabase/server";

interface Props { params: Promise<{ handle: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return { title: `Αγαπημένα @${params.handle} — Proteino` };
}

export const dynamic = "force-dynamic";

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

export default async function BookmarksPage(props: Props) {
  const params = await props.params;
  const sb = await createClient();

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

  // Try with `status` first (migration 023). Fall back to the
  // legacy shape if the column doesn't exist yet — page still renders,
  // all rows treated as "wishlist" by default. Lets us deploy the UI
  // before the DB migration is applied.
  let rows: any[] | null = null;
  const withStatus = await sb
    .from("bookmarks")
    .select("id, item_id, category, status, items(id, title, slug, cover_url, category, avg_rating, rating_count)")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });
  if (withStatus.error?.code === "42703") {
    const fallback = await sb
      .from("bookmarks")
      .select("id, item_id, category, items(id, title, slug, cover_url, category, avg_rating, rating_count)")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    rows = fallback.data ?? null;
  } else {
    rows = withStatus.data ?? null;
  }

  const items: BookmarkedItem[] = ((rows ?? []) as any[])
    .filter((b) => b.items)
    .map((b) => ({
      id: b.id,
      itemId: b.item_id,
      category: b.items.category,
      status: (b.status === "done" ? "done" : "wishlist") as "wishlist" | "done",
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
