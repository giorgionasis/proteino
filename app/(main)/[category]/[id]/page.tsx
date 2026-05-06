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
import { fetchNearbyActivities, type NearbyActivity } from "@/lib/activities";
import { safeImageUrl } from "@/lib/image-url";
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
  /** Populated only for hotels (proximity-based, sorted by distance asc). */
  nearbyActivities?: NearbyActivity[];
  /** True if the current user has bookmarked this item. False for guests. */
  isBookmarked: boolean;
  /** Current user's rating of this item, or null if they haven't rated / aren't logged in. */
  userRating: number | null;
  /** Auth uid of the viewer, or null for guests. Used to detect own-suggestion. */
  currentUserId: string | null;
  /** Star distribution computed at fetch time from the ratings table (5★ → 1★). */
  ratingDistribution: { stars: number; pct: number }[];
  /** True when avg ≥ 4.5 AND rating_count ≥ 5 — drives "Top Rated" badge. */
  isTopRated: boolean;
  /**
   * Users who rated this item but did NOT write a suggestion. Surfaced as a
   * compact "Άλλες βαθμολογίες" row below the review carousel so the rating
   * count visible at the top matches the actual people behind it (the gap
   * shows up most on migrated items where 1 suggester + N rating-only users
   * is the norm).
   */
  extraRatings: Array<{
    user: { id: string; display_name: string; handle: string; avatar_url: string | null; level: number };
    score: number;
    created_at: string;
  }>;
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

  // Fetch suggestions with user data — exclude moderator-hidden rows.
  // hidden_at is set by `/api/admin/reports/[id]` when an admin chooses "hidden".
  const { data: sugData } = (await (sb.from("suggestions") as any)
    .select("id, reflection, rating, created_at, users(id, display_name, handle, avatar_url, level, suggestion_count, avg_quality_score)")
    .eq("item_id", item.id)
    .eq("is_published", true)
    .is("hidden_at", null)
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

  // Hotels only: proximity-based nearby activities (admin-curated)
  let nearbyActivities: NearbyActivity[] | undefined;
  if (category === "hotels" && typeof ext.lat === "number" && typeof ext.lng === "number") {
    nearbyActivities = await fetchNearbyActivities(sb, ext.lat, ext.lng, 50, 12);
  }

  // Star distribution + counts: ratings live in TWO places due to the MySQL
  // migration —
  //   - `ratings` table: independent ratings (new flow + some migrated rows)
  //   - `suggestions.rating`: embedded rating per suggester (dominant in
  //     migrated data — old site stored most ratings here)
  // Dedupe by user_id (canonical: the `ratings` table wins if both exist),
  // then bucket into 1..5 stars and recompute avg + count + distribution
  // from this single source of truth. This way `items.rating_count` being
  // out-of-sync (zero on migrated items) doesn't hide the histogram.
  const [scoresRes, suggRatingsRes] = await Promise.all([
    (sb.from("ratings") as any).select("score, user_id").eq("item_id", item.id),
    (sb.from("suggestions") as any)
      .select("rating, user_id")
      .eq("item_id", item.id)
      .eq("is_published", true)
      .is("hidden_at", null)
      .not("rating", "is", null),
  ]);

  const scoreByUser = new Map<string, number>();
  for (const s of (suggRatingsRes.data ?? []) as Array<{ rating: number; user_id: string }>) {
    if (s.rating != null && s.user_id) scoreByUser.set(s.user_id, Number(s.rating));
  }
  for (const r of (scoresRes.data ?? []) as Array<{ score: number; user_id: string }>) {
    if (r.score != null && r.user_id) scoreByUser.set(r.user_id, Number(r.score));
  }

  const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let scoreSum = 0;
  scoreByUser.forEach((s) => {
    const bucket = Math.max(1, Math.min(5, Math.round(s)));
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    scoreSum += s;
  });
  const totalScored = scoreByUser.size;

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: totalScored > 0 ? Math.round((buckets[stars] / totalScored) * 100) : 0,
  }));

  const avg = totalScored > 0 ? scoreSum / totalScored : (item.avg_rating ?? 0);
  const ratingCount = totalScored;
  const isTopRated = avg >= 4.5 && ratingCount >= 5;

  // Override the item-level aggregates so RatingLine and other consumers
  // see the corrected count + average even when items.rating_count is stale.
  item.rating_count = ratingCount;
  item.avg_rating = Number(avg.toFixed(2));

  // Compact "rating-only" entries: users who rated but didn't write a
  // suggestion (i.e. they appear in `ratings` but not in `suggestions`).
  // Distinct from the review carousel above (which is full text + stars).
  const suggesterIds = new Set(suggestions.map((s) => s.user.id).filter(Boolean));
  const ratingOnlyUserIds = ((scoresRes.data ?? []) as Array<{ user_id: string }>)
    .map((r) => r.user_id)
    .filter((id) => id && !suggesterIds.has(id));

  let extraRatings: ItemDetailData["extraRatings"] = [];
  if (ratingOnlyUserIds.length > 0) {
    const { data: extraRows } = (await (sb.from("ratings") as any)
      .select("score, created_at, users(id, display_name, handle, avatar_url, level)")
      .eq("item_id", item.id)
      .in("user_id", ratingOnlyUserIds)
      .order("created_at", { ascending: false })
      .limit(20)) as { data: any[] | null };

    extraRatings = (extraRows ?? [])
      .map((r: any) => ({
        user: r.users
          ? {
              id: r.users.id,
              display_name: r.users.display_name ?? "Χρήστης",
              handle: r.users.handle ?? "user",
              avatar_url: r.users.avatar_url ?? null,
              level: r.users.level ?? 1,
            }
          : null,
        score: Number(r.score),
        created_at: r.created_at,
      }))
      .filter((r): r is NonNullable<ItemDetailData["extraRatings"][number]> => !!r.user);
  }

  // Initial bookmark + rating state for the current user
  let isBookmarked = false;
  let userRating: number | null = null;
  let currentUserId: string | null = null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      currentUserId = user.id;
      const [bmRes, rRes] = await Promise.all([
        sb.from("bookmarks").select("id").eq("user_id", user.id).eq("item_id", item.id).maybeSingle(),
        sb.from("ratings").select("score").eq("user_id", user.id).eq("item_id", item.id).maybeSingle(),
      ]);
      isBookmarked = !!bmRes.data;
      userRating = (rRes.data as any)?.score ?? null;
    }
  } catch { /* not logged in or network error */ }

  // Normalize image URLs at the data-layer boundary so every detail
  // component is automatically safe — legacy K2 paths (e.g.
  // "k2-legacy/movies/.../poster.jpg") get a leading slash, missing/invalid
  // URLs become null and trigger the placeholder branch downstream.
  const normalizedItem = {
    ...item,
    [extTable]: undefined,
    cover_url: safeImageUrl(item.cover_url),
    poster_url: safeImageUrl(item.poster_url),
    backdrop_url: safeImageUrl(item.backdrop_url),
  };

  return {
    item: normalizedItem,
    extension: ext,
    suggestions,
    related: (relData ?? []).map((r: any) => {
      const rExt = Array.isArray(r[extTable]) ? r[extTable]?.[0] : r[extTable];
      const cleanSlug = r.slug?.includes("/") ? r.slug.split("/").pop() : r.slug;
      return { ...r, slug: cleanSlug, ext: rExt, [extTable]: undefined, cover_url: safeImageUrl(r.cover_url) };
    }),
    nearbyActivities,
    isBookmarked,
    userRating,
    currentUserId,
    ratingDistribution,
    isTopRated,
    extraRatings,
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
