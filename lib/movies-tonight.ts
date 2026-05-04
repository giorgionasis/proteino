/**
 * Movies Tonight — frontend fetcher.
 *
 * Returns today's published movie airings, joined with the movie item.
 * Used by the home page to render an "Απόψε στην TV" section.
 */

import { safeImageUrl } from "@/lib/image-url";

type SupabaseLike = { from: (table: string) => any };

export interface TonightAiring {
  id: string;
  channel: string;
  air_date: string;       // YYYY-MM-DD
  air_time: string;       // HH:MM:SS
  movie: {
    id: string;
    title: string;
    slug: string;          // includes category prefix, e.g. "movies/oppenheimer"
    cover_url: string | null;
    avg_rating: number;
    year: number | null;
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

export async function fetchTonightAirings(
  sb: SupabaseLike,
  date?: string,
  limit = 8
): Promise<TonightAiring[]> {
  const targetDate = date ?? todayISO();

  const { data, error } = await sb
    .from("movies_tonight")
    .select(
      "id, channel, air_date, air_time, " +
      "items!inner(id, title, slug, cover_url, avg_rating, item_movies(release_date))"
    )
    .eq("is_published", true)
    .eq("air_date", targetDate)
    .order("air_time")
    .limit(limit);

  if (error) {
    console.error("[movies-tonight] fetch failed:", error.message);
    return [];
  }

  return (data ?? []).map((r: any) => {
    const item = r.items;
    const ext = Array.isArray(item.item_movies) ? item.item_movies[0] : item.item_movies;
    const year = ext?.release_date ? new Date(ext.release_date).getFullYear() : null;
    return {
      id: r.id,
      channel: r.channel,
      air_date: r.air_date,
      air_time: r.air_time,
      movie: {
        id: item.id,
        title: item.title,
        slug: stripPrefix(item.slug),
        cover_url: safeImageUrl(item.cover_url),
        avg_rating: item.avg_rating ?? 0,
        year,
      },
    };
  });
}

export function formatAirTime(t: string): string {
  return t.slice(0, 5);   // HH:MM
}
