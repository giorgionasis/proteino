import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ISR — refresh every 60s. Admin saves call `revalidatePath` on this
// specific path for instant updates; this caps staleness for items
// that aren't actively being edited.
export const revalidate = 60;

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
import { fetchRelatedSections, type RelatedSection } from "@/lib/related-sections";
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
    user: { id: string; display_name: string; handle: string; avatar_url: string | null; level: number; suggestion_count: number };
  }>;
  related: Array<Record<string, any>>;
  /** Populated only for hotels (proximity-based, sorted by distance asc). */
  nearbyActivities?: NearbyActivity[];
  /** True if the current user has bookmarked this item. False for guests. */
  isBookmarked: boolean;
  /** Current bookmark status — null = not bookmarked, 'wishlist' | 'done' = saved. */
  bookmarkStatus: "wishlist" | "done" | null;
  /** Current user's existing review (rating + optional reflection), or null. */
  myReview: { rating: number; reflection: string | null } | null;
  /** Auth uid of the viewer, or null for guests. Used to detect own-suggestion. */
  currentUserId: string | null;
  /** Star distribution computed at fetch time from `reviews` table (5★ → 1★). */
  ratingDistribution: { stars: number; pct: number }[];
  /** True when avg ≥ 4.5 AND review count ≥ 5 — drives "Top Rated" badge. */
  isTopRated: boolean;
  /**
   * All visible reviews for this item (from `reviews` table — the new model).
   * Each row = one user's rating (mandatory) + optional text. Used by the
   * carousel below the rating box AND by /reviews page.
   */
  reviews: Array<{
    id: string;
    user: { id: string; display_name: string; handle: string; avatar_url: string | null; level: number; suggestion_count: number };
    rating: number;
    reflection: string | null;
    created_at: string;
    vote_up: number;
    vote_down: number;
    /** Current viewer's vote on this review: 1, -1, or null. Always null for guests. */
    my_vote: 1 | -1 | null;
  }>;
  /** Populated only for `category === "movies"` AND only when the
   *  movie has a row in `movies_tonight` with `air_date = today`.
   *  Drives the channel-icon badge on the detail page hero — the user's
   *  explicit "show me where it airs today" hook. Null on any other
   *  day, on non-movie pages, and for movies without a tonight booking. */
  airingToday?: { channel: string; air_time: string } | null;
  /**
   * Admin-configured "More from {axis}" carousels — empty when no rule
   * matched min_items siblings for this item, or when the category has
   * no active rules. Each section already includes interpolated title +
   * hydrated items. See lib/related-sections.ts.
   */
  relatedSections: RelatedSection[];
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
    .select("id, reflection, rating, created_at, users!suggestions_user_id_fkey(id, display_name, handle, avatar_url, level, suggestion_count, avg_quality_score)")
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

  // Reviews — single source of truth (post migration 016). Each row =
  // one user's rating (mandatory) + optional reflection. Carousel + /reviews
  // page read from this. Histogram + headline avg/count computed from it.
  const { data: reviewRows } = (await (sb.from("reviews") as any)
    .select("id, rating, reflection, created_at, vote_up, vote_down, users!reviews_user_id_fkey(id, display_name, handle, avatar_url, level, suggestion_count)")
    .eq("item_id", item.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: any[] | null };

  const reviewsRaw = (reviewRows ?? []).filter((r: any) => r.users);

  // For the logged-in viewer, fetch their votes on this item's reviews so the
  // thumbs render in the active state on first paint (no client-side flash).
  let myVoteByReview = new Map<string, 1 | -1>();
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user && reviewsRaw.length > 0) {
      const reviewIds = reviewsRaw.map((r: any) => r.id);
      const { data: voteRows } = await sb
        .from("review_votes")
        .select("review_id, vote")
        .eq("user_id", user.id)
        .in("review_id", reviewIds);
      for (const v of (voteRows ?? []) as Array<{ review_id: string; vote: number }>) {
        if (v.vote === 1 || v.vote === -1) myVoteByReview.set(v.review_id, v.vote as 1 | -1);
      }
    }
  } catch { /* guest or network — defaults to no votes */ }

  const reviews: ItemDetailData["reviews"] = reviewsRaw.map((r: any) => ({
    id: r.id,
    user: {
      id: r.users.id,
      display_name: r.users.display_name ?? "Χρήστης",
      handle: r.users.handle ?? "user",
      avatar_url: r.users.avatar_url ?? null,
      level: r.users.level ?? 1,
      suggestion_count: r.users.suggestion_count ?? 0,
    },
    rating: Number(r.rating),
    reflection: r.reflection,
    created_at: r.created_at,
    vote_up: Number(r.vote_up ?? 0),
    vote_down: Number(r.vote_down ?? 0),
    my_vote: myVoteByReview.get(r.id) ?? null,
  }));

  const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let scoreSum = 0;
  for (const r of reviews) {
    const b = Math.max(1, Math.min(5, Math.round(r.rating)));
    buckets[b] = (buckets[b] ?? 0) + 1;
    scoreSum += r.rating;
  }
  const totalScored = reviews.length;

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: totalScored > 0 ? Math.round((buckets[stars] / totalScored) * 100) : 0,
  }));

  const avg = totalScored > 0 ? scoreSum / totalScored : 0;
  const isTopRated = avg >= 4.5 && totalScored >= 5;

  // Override item aggregates (kept in sync by /api/reviews on each write,
  // but compute fresh here in case the page is loaded before that runs).
  item.rating_count = totalScored;
  item.avg_rating = Number(avg.toFixed(2));

  // Initial bookmark + own-review state for the current user
  let isBookmarked = false;
  let bookmarkStatus: ItemDetailData["bookmarkStatus"] = null;
  let myReview: ItemDetailData["myReview"] = null;
  let currentUserId: string | null = null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      currentUserId = user.id;
      // Try with `status` column (migration 023). Falls back to a
      // status-less select if the column isn't present yet — bookmark
      // is then treated as "wishlist" by default.
      let bm: { id: string; status?: string } | null = null;
      const bmWithStatus = await sb
        .from("bookmarks")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("item_id", item.id)
        .maybeSingle();
      if (bmWithStatus.error?.code === "42703") {
        const fallback = await sb
          .from("bookmarks")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", item.id)
          .maybeSingle();
        bm = (fallback.data as any) ?? null;
      } else {
        bm = (bmWithStatus.data as any) ?? null;
      }
      const rRes = await sb.from("reviews").select("rating, reflection").eq("user_id", user.id).eq("item_id", item.id).maybeSingle();
      isBookmarked = !!bm;
      if (bm) {
        bookmarkStatus = (bm.status === "wishlist" || bm.status === "done")
          ? (bm.status as "wishlist" | "done")
          : "wishlist";
      }
      const r = rRes.data as any;
      myReview = r ? { rating: Number(r.rating), reflection: r.reflection ?? null } : null;
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

  // Airing-today check — movies only. One small query against
  // movies_tonight, scoped to TODAY's date in YYYY-MM-DD. If the admin
  // booked this movie to air today, the detail page hero gets a channel
  // badge. Yesterday + tomorrow are explicitly NOT included — the hook
  // is "where can you watch this RIGHT NOW", not "where has it played".
  let airingToday: { channel: string; air_time: string } | null = null;
  if (category === "movies") {
    const today = new Date().toISOString().slice(0, 10);
    const { data: airing } = await sb
      .from("movies_tonight")
      .select("channel, air_time")
      .eq("item_id", item.id)
      .eq("air_date", today)
      .eq("is_published", true)
      .order("air_time", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (airing) {
      airingToday = {
        channel:  (airing as { channel: string }).channel,
        air_time: (airing as { air_time: string }).air_time,
      };
    }
  }

  // Admin-configured related sections (migration 034). Auto-hides
  // sections below their min_items threshold; returns [] when category
  // has no active rules.
  const relatedSections = await fetchRelatedSections(sb, {
    itemId: item.id,
    category: category as CategorySlug,
    extension: ext,
  });

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
    bookmarkStatus,
    myReview,
    currentUserId,
    ratingDistribution,
    isTopRated,
    reviews,
    airingToday,
    relatedSections,
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
