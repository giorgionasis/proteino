import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/enrich
 * Body: { category, title, year? }
 *
 * Looks up an external API based on category and returns candidate
 * cover/poster/backdrop images for the admin to pick.
 *
 * Movies/Series → TMDB (needs TMDB_API_KEY)
 * Books         → Google Books (no key required for low volume)
 * Food/Bars/Hotels → Google Places (needs GOOGLE_PLACES_API_KEY)
 *
 * Each API is best-effort. If a key is missing or the API returns nothing,
 * we return { candidates: [] } — admin can still type/upload manually.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, title, year, address } = body as {
    category: string;
    title: string;
    year?: number;
    address?: string;
  };

  if (!category || !title?.trim()) {
    return NextResponse.json({ error: "category and title required" }, { status: 400 });
  }

  try {
    switch (category) {
      case "movies":
      case "series":
        return NextResponse.json(await enrichTMDB(category, title, year));
      case "books":
        return NextResponse.json(await enrichBooks(title));
      case "food":
      case "bars":
      case "hotels":
        return NextResponse.json(await enrichPlaces(title, address));
      default:
        return NextResponse.json({ candidates: [], reason: "Unsupported category" });
    }
  } catch (e: any) {
    return NextResponse.json({ candidates: [], reason: e.message ?? "Enrichment failed" });
  }
}

/* ─── TMDB (movies/series) ─────────────────────────────────── */

async function enrichTMDB(category: "movies" | "series", title: string, year?: number) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { candidates: [], reason: "TMDB_API_KEY not configured" };

  const tmdbType = category === "movies" ? "movie" : "tv";
  const url = new URL(`https://api.themoviedb.org/3/search/${tmdbType}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", title);
  url.searchParams.set("language", "el-GR");
  if (year) {
    url.searchParams.set(category === "movies" ? "year" : "first_air_date_year", String(year));
  }

  const res = await fetch(url.toString());
  if (!res.ok) return { candidates: [], reason: `TMDB ${res.status}` };
  const data = await res.json();

  const results = (data.results ?? []).slice(0, 8);
  const candidates = results.map((r: any) => ({
    title: r.title ?? r.name ?? "",
    subtitle: r.release_date ?? r.first_air_date ?? "",
    poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
    backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w1280${r.backdrop_path}` : null,
    description: r.overview ?? "",
    source: "tmdb",
    source_id: String(r.id),
  })).filter((c: any) => c.poster_url || c.backdrop_url);

  return { candidates };
}

/* ─── Google Books ─────────────────────────────────────────── */

async function enrichBooks(title: string) {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", title);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("langRestrict", "el");
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return { candidates: [], reason: `Google Books ${res.status}` };
  const data = await res.json();

  const candidates = (data.items ?? []).slice(0, 8).map((b: any) => {
    const info = b.volumeInfo ?? {};
    const img = info.imageLinks ?? {};
    const cover = img.extraLarge ?? img.large ?? img.medium ?? img.thumbnail ?? null;
    return {
      title: info.title ?? "",
      subtitle: (info.authors ?? []).join(", "),
      poster_url: cover ? cover.replace(/^http:/, "https:") : null,
      backdrop_url: null,
      description: info.description ?? "",
      source: "google_books",
      source_id: b.id,
    };
  }).filter((c: any) => c.poster_url);

  return { candidates };
}

/* ─── Google Places (food/bars/hotels) ─────────────────────── */

async function enrichPlaces(title: string, address?: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { candidates: [], reason: "GOOGLE_PLACES_API_KEY not configured" };

  // Text Search
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", `${title}${address ? ` ${address}` : ""}`);
  url.searchParams.set("language", "el");
  url.searchParams.set("region", "gr");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return { candidates: [], reason: `Places ${res.status}` };
  const data = await res.json();

  const places = (data.results ?? []).slice(0, 5);

  // For each place, build a photo URL from photo_reference
  const candidates = places.map((p: any) => {
    const photoRef = p.photos?.[0]?.photo_reference;
    const photoUrl = photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${key}`
      : null;
    return {
      title: p.name ?? "",
      subtitle: p.formatted_address ?? "",
      poster_url: null,
      backdrop_url: photoUrl,
      description: "",
      source: "google_places",
      source_id: p.place_id,
    };
  }).filter((c: any) => c.backdrop_url);

  return { candidates };
}
