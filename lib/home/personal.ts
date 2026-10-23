import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { compactMainImage, type CompactMainImage } from "@/lib/item-images";
import { safeImageUrl } from "@/lib/image-url";

/**
 * Data for the session-40 home widgets: recommendation of the day,
 * "Από όσους ακολουθείς", "Η λίστα σου". Each returns null / [] when
 * there is nothing real to show, and the widget hides itself.
 */

type Sb = { from: (t: string) => any };

export interface HomeItemRef {
  id: string;
  title: string;
  category: string;
  href: string;
  image: CompactMainImage | null;
  coverUrl: string | null;
}

export interface PickOfTheDay extends HomeItemRef {
  quote: string;
  suggester: { id: string; handle: string; display_name: string; avatar_url: string | null; suggestion_count: number };
}

export interface FollowingFeedEntry {
  id: string;
  createdAt: string;
  quote: string | null;
  item: HomeItemRef;
  user: { id: string; handle: string; display_name: string; avatar_url: string | null };
}

const plain = (t: string) => t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clip = (t: string, n: number) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, "") + "…");
const stripPrefix = (slug: string) => (slug.includes("/") ? slug.split("/").pop()! : slug);

function toRef(r: any): HomeItemRef {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    href: `/${r.category}/${stripPrefix(r.slug)}`,
    image: compactMainImage(r.id, r.images),
    coverUrl: safeImageUrl(r.cover_url),
  };
}

/**
 * One real recommendation, rotating daily. Pool = the most-viewed items
 * (old-site views) that have a photo and a substantial reflection; the
 * day number picks from it, so everyone sees the same pick all day.
 */
export const fetchPickOfTheDay = unstable_cache(
  async (dayKey: string): Promise<PickOfTheDay | null> => {
    const sb = createAdminClient();
    const { data } = await (sb.from("items") as any)
      .select("id, title, slug, category, cover_url, images, suggestions(reflection, is_published, hidden_at, users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, suggestion_count))")
      .eq("is_published", true)
      .not("images->main", "is", null)
      .order("metadata->legacy_hits", { ascending: false, nullsFirst: false })
      .limit(120);

    const pool = ((data ?? []) as any[]).flatMap((r) => {
      const s = (r.suggestions ?? []).find((x: any) => x.is_published && !x.hidden_at && x.users && typeof x.reflection === "string" && plain(x.reflection).length >= 160);
      return s ? [{ r, s }] : [];
    });
    if (!pool.length) return null;

    const day = Math.floor(Date.parse(dayKey) / 86_400_000);
    const { r, s } = pool[day % pool.length];
    return {
      ...toRef(r),
      quote: clip(plain(s.reflection), 260),
      suggester: {
        id: s.users.id,
        handle: s.users.handle,
        display_name: s.users.display_name || s.users.handle,
        avatar_url: s.users.avatar_url,
        suggestion_count: s.users.suggestion_count ?? 0,
      },
    };
  },
  ["home-pick-of-the-day"],
  { revalidate: 3600 },
);

/** Latest recommendations from people the viewer follows. */
export async function fetchFollowingFeed(sb: Sb, viewerId: string | null): Promise<FollowingFeedEntry[]> {
  if (!viewerId) return [];
  const { data: f } = await sb.from("follows").select("following_id").eq("follower_id", viewerId).limit(200);
  const ids = ((f ?? []) as { following_id: string }[]).map((x) => x.following_id);
  if (!ids.length) return [];

  const { data } = await sb
    .from("suggestions")
    .select("id, reflection, created_at, users!suggestions_user_id_fkey(id, handle, display_name, avatar_url), items!inner(id, title, slug, category, cover_url, images, is_published)")
    .in("user_id", ids)
    .eq("is_published", true)
    .is("hidden_at", null)
    .eq("items.is_published", true)
    .order("created_at", { ascending: false })
    .limit(8);

  return ((data ?? []) as any[]).filter((r) => r.users && r.items).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    quote: typeof r.reflection === "string" && plain(r.reflection).length > 20 ? clip(plain(r.reflection), 120) : null,
    item: toRef(r.items),
    user: {
      id: r.users.id,
      handle: r.users.handle,
      display_name: r.users.display_name || r.users.handle,
      avatar_url: r.users.avatar_url,
    },
  }));
}

/** The viewer's wishlist ("Θα δω / Θα διαβάσω / Θέλω να πάω"), newest first. */
export async function fetchMyWishlist(sb: Sb, viewerId: string | null): Promise<HomeItemRef[]> {
  if (!viewerId) return [];
  const { data } = await sb
    .from("bookmarks")
    .select("created_at, items!inner(id, title, slug, category, cover_url, images, is_published)")
    .eq("user_id", viewerId)
    .eq("status", "wishlist")
    .eq("items.is_published", true)
    .order("created_at", { ascending: false })
    .limit(10);
  return ((data ?? []) as any[]).filter((r) => r.items).map((r) => toRef(r.items));
}
