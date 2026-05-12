/**
 * Notifications — server-side fetcher for the bell-icon list.
 *
 * Loads the user's notifications, joins minimal info from referenced items
 * (so click-through links work without an extra round-trip).
 */

import { safeImageUrl } from "@/lib/image-url";

type SupabaseLike = { from: (table: string) => any };

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  name: string;
  payload: Record<string, any>;
  is_read: boolean;
  created_at: string;
  /** Resolved deeplink slug for movie_airing/rating/comment notifications. */
  itemSlug?: string | null;
  itemCover?: string | null;
}

const ITEM_REFERENCE_TYPES = new Set([
  // Legacy / pre-wired types (kept for back-compat)
  "movie_airing", "rating", "comment", "suggestion_published",
  // New types from migration 029
  "suggestion_rated", "suggestion_bookmarked", "new_suggestion_from_friend", "search_match",
]);

export async function fetchUserNotifications(
  sb: SupabaseLike,
  userId: string,
  limit = 50
): Promise<NotificationItem[]> {
  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notifications] fetch failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as any[];

  // Resolve item slugs/covers in one round trip
  const itemIds = rows
    .filter((r) => ITEM_REFERENCE_TYPES.has(r.type))
    .map((r) => r.payload?.item_id)
    .filter(Boolean);

  let itemMap = new Map<string, { slug: string; cover_url: string | null; category: string }>();
  if (itemIds.length > 0) {
    const { data: items } = await sb
      .from("items")
      .select("id, slug, cover_url, category")
      .in("id", Array.from(new Set(itemIds)));
    for (const it of (items ?? []) as any[]) {
      itemMap.set(it.id, { slug: it.slug, cover_url: it.cover_url, category: it.category });
    }
  }

  return rows.map((r) => {
    const itemRef = r.payload?.item_id ? itemMap.get(r.payload.item_id) : null;
    let slug: string | null = null;
    if (itemRef) {
      const stripped = itemRef.slug.includes("/") ? itemRef.slug.split("/").slice(1).join("/") : itemRef.slug;
      slug = `/${itemRef.category}/${stripped}`;
    }
    return {
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      name: r.name,
      payload: r.payload ?? {},
      is_read: r.is_read,
      created_at: r.created_at,
      itemSlug: slug,
      itemCover: safeImageUrl(itemRef?.cover_url),
    };
  });
}

/** Group into Νέες (unread) and Παλιότερες (read), preserving order. */
export function groupNotifications(items: NotificationItem[]): { unread: NotificationItem[]; read: NotificationItem[] } {
  const unread: NotificationItem[] = [];
  const read: NotificationItem[] = [];
  for (const n of items) {
    (n.is_read ? read : unread).push(n);
  }
  return { unread, read };
}
