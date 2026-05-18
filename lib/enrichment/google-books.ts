import { parseYear, scoreTitleMatch } from "./scoring";

/**
 * Typed Google Books client. Greek-first search with English fallback.
 *
 * Authentication is optional — Google Books accepts unauthenticated
 * requests but with a stricter shared-IP quota and zero observability.
 * In production set GOOGLE_BOOKS_API_KEY for: (a) a 1000/day quota
 * scoped to your project, (b) live usage dashboard at console.cloud
 * .google.com → APIs → Books API → Metrics, (c) one-click quota
 * increase if you grow.
 *
 * Strategy (4 tiers, returns the first hit that scores ≥60):
 *   1. q=<title>, langRestrict=el                — Greek edition
 *   2. q=intitle:<title>+inauthor:<author>, el   — disambiguated, Greek
 *   3. q=<title>                                  — global (drops langRestrict)
 *   4. q=intitle:<title>+inauthor:<author>       — disambiguated, global
 *
 * Each tier is best-effort: 0 results / fetch error → fall through.
 */

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

export interface GoogleBookMatch {
  id: string;
  title: string;
  subtitle: string | null;
  /** Full canonical title (title + subtitle joined). Used for scoring. */
  full_title: string;
  authors: string[];
  publisher: string | null;
  published_year: number | null;
  description: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  pages: number | null;
  categories: string[];
  language: string;
  /** Highest-resolution image we can pull from the volume. Google
   *  returns thumbnail by default (~128px); we upgrade via the zoom
   *  param trick when available. */
  cover_url: string | null;
  preview_url: string | null;
  info_url: string | null;
  /** Score 0-100 vs. the original query — drives tier selection. */
  match_score: number;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  previewLink?: string;
  infoLink?: string;
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
  error?: { code: number; message: string };
}

/** Replace thumbnail's default zoom=1 (~128px) with zoom=0 (~512px),
 *  and force HTTPS. The "extraLarge" link is rarely populated; this
 *  trick is the canonical workaround documented by Google support. */
function upgradeCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const https = url.replace(/^http:\/\//, "https://");
  return https.replace(/&zoom=\d+/, "&zoom=0").replace(/&edge=curl/, "");
}

function pickCover(images: GoogleBooksVolumeInfo["imageLinks"]): string | null {
  if (!images) return null;
  const best =
    images.extraLarge ||
    images.large ||
    images.medium ||
    images.small ||
    images.thumbnail ||
    images.smallThumbnail ||
    null;
  return upgradeCoverUrl(best);
}

function pickIsbn(
  identifiers: GoogleBooksVolumeInfo["industryIdentifiers"],
  type: "ISBN_10" | "ISBN_13",
): string | null {
  if (!Array.isArray(identifiers)) return null;
  const found = identifiers.find((i) => i.type === type);
  return found?.identifier ?? null;
}

function mapVolume(item: GoogleBooksItem, query: string): GoogleBookMatch | null {
  const v = item.volumeInfo;
  if (!v || !v.title) return null;
  const fullTitle = v.subtitle ? `${v.title}: ${v.subtitle}` : v.title;
  const score = Math.max(
    scoreTitleMatch(query, v.title),
    scoreTitleMatch(query, fullTitle),
  );
  return {
    id: item.id,
    title: v.title,
    subtitle: v.subtitle ?? null,
    full_title: fullTitle,
    authors: Array.isArray(v.authors) ? v.authors : [],
    publisher: v.publisher ?? null,
    published_year: parseYear(v.publishedDate),
    description: v.description ?? null,
    isbn_10: pickIsbn(v.industryIdentifiers, "ISBN_10"),
    isbn_13: pickIsbn(v.industryIdentifiers, "ISBN_13"),
    pages: typeof v.pageCount === "number" && v.pageCount > 0 ? v.pageCount : null,
    categories: Array.isArray(v.categories) ? v.categories : [],
    language: v.language ?? "und",
    cover_url: pickCover(v.imageLinks),
    preview_url: v.previewLink ?? null,
    info_url: v.infoLink ?? null,
    match_score: score,
  };
}

async function fetchVolumes(opts: {
  q: string;
  langRestrict?: string | null;
  maxResults?: number;
}): Promise<GoogleBooksItem[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("q", opts.q);
  url.searchParams.set("maxResults", String(opts.maxResults ?? 5));
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", "relevance");
  if (opts.langRestrict) url.searchParams.set("langRestrict", opts.langRestrict);
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), {
      // Short timeout — submission flow is latency-sensitive. 4s is
      // generous for an API that usually returns in <500ms.
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn("[google-books] quota / rate limit hit", { status: res.status });
      }
      return [];
    }
    const data = (await res.json()) as GoogleBooksResponse;
    if (data.error) {
      console.warn("[google-books]", data.error.message);
      return [];
    }
    return data.items ?? [];
  } catch (err) {
    console.error("[google-books] fetch error", err);
    return [];
  }
}

/**
 * Find the best Google Books match for a title + optional author.
 *
 * Returns null when all tiers come up empty (rare — usually fuzzy
 * matches surface something). Callers should fall back to a soft
 * Gemini-only lock when this returns null.
 */
export async function searchGoogleBooks(opts: {
  title: string;
  author?: string | null;
  /** Canonical English title — falls back here when Greek-script
   *  search returns 0 / weak matches. Critical for Greek classics
   *  like Καζαντζάκης where Google's Greek index is sparse but the
   *  English-translated work ("Zorba the Greek") is fully indexed. */
  englishTitle?: string | null;
  /** Latin-script author name (Καζαντζάκης → Kazantzakis). */
  englishAuthor?: string | null;
}): Promise<{ best: GoogleBookMatch; alternatives: GoogleBookMatch[] } | null> {
  const title = opts.title.trim();
  if (!title) return null;
  const author = opts.author?.trim() || null;
  const enTitle = opts.englishTitle?.trim() || null;
  const enAuthor = opts.englishAuthor?.trim() || null;

  // Tier order: author-constrained FIRST when we have a hint, so a
  // title like "Hooked" doesn't return the wrong book (Nir Eyal vs.
  // Emily McIntire — both score 100 on exact title match, but only
  // one matches the user's author hint). After the Greek-script
  // tiers we fall back to English equivalents (Gemini-supplied) so
  // Greek classics indexed only under Latin spelling still get hit.
  interface Tier {
    q: string;
    scoreQuery: string;
    langRestrict: string | null;
    requireAuthor: boolean;
    authorForCheck: string | null;
  }
  const tiers: Tier[] = [];

  // Greek tiers (preferred — gives Greek edition when it exists)
  if (author) {
    tiers.push({
      q: `intitle:${title}+inauthor:${author}`,
      scoreQuery: title, langRestrict: "el", requireAuthor: true, authorForCheck: author,
    });
    tiers.push({
      q: `intitle:${title}+inauthor:${author}`,
      scoreQuery: title, langRestrict: null, requireAuthor: true, authorForCheck: author,
    });
  }
  tiers.push({
    q: title, scoreQuery: title, langRestrict: "el", requireAuthor: false, authorForCheck: null,
  });

  // English fallback tiers — only fire when Gemini supplied an
  // English equivalent. Score against the English title since that's
  // what Google will return.
  if (enTitle && enAuthor) {
    tiers.push({
      q: `intitle:${enTitle}+inauthor:${enAuthor}`,
      scoreQuery: enTitle, langRestrict: null, requireAuthor: true, authorForCheck: enAuthor,
    });
  }
  if (enTitle) {
    tiers.push({
      q: enTitle, scoreQuery: enTitle, langRestrict: null, requireAuthor: false, authorForCheck: null,
    });
  }
  // Final catch-all — global title-only search with original Greek query.
  tiers.push({
    q: title, scoreQuery: title, langRestrict: null, requireAuthor: false, authorForCheck: null,
  });

  const authorMatches = (book: GoogleBookMatch, expected: string | null): boolean => {
    if (!expected) return true;
    const folded = expected.toLowerCase();
    return book.authors.some((a) => a.toLowerCase().includes(folded) || folded.includes(a.toLowerCase()));
  };

  // Two parallel best-trackers: a strict one that only keeps hits
  // whose authors match a hint we have, and a permissive one that
  // tracks the best-overall result. When the user gave us an author
  // hint (Greek OR English), we always prefer the author-matching
  // hit even if a non-matching hit scored higher — Google's
  // langRestrict + intitle lenience can otherwise float wrong-author
  // matches to the top (the classic "Hooked by Emily McIntire"
  // beating "Hooked by Nir Eyal" bug).
  let bestOverall: GoogleBookMatch | null = null;
  let bestAuthorMatch: GoogleBookMatch | null = null;
  // Deduped pool of all viable candidates across every tier — drives
  // the alternatives list returned for low/medium-tier matches. Keyed
  // by volume id so the same edition isn't surfaced twice when it
  // shows up in multiple tiers (Greek + English fallbacks frequently
  // re-hit the same volume).
  const pool = new Map<string, GoogleBookMatch>();
  const haveAuthorHint = Boolean(author || enAuthor);

  const matchesAnyAuthorHint = (book: GoogleBookMatch): boolean => {
    if (author && authorMatches(book, author)) return true;
    if (enAuthor && authorMatches(book, enAuthor)) return true;
    return false;
  };

  for (const tier of tiers) {
    const items = await fetchVolumes({ q: tier.q, langRestrict: tier.langRestrict });
    for (const item of items) {
      const mapped = mapVolume(item, tier.scoreQuery);
      if (!mapped) continue;
      // Tier-level author validation (was already on intitle+inauthor
      // tiers — Google's filter is lenient and can return books where
      // the queried name appears in metadata but isn't the author).
      if (tier.requireAuthor && !authorMatches(mapped, tier.authorForCheck)) continue;
      if (!bestOverall || mapped.match_score > bestOverall.match_score) {
        bestOverall = mapped;
      }
      if (haveAuthorHint && matchesAnyAuthorHint(mapped)) {
        if (!bestAuthorMatch || mapped.match_score > bestAuthorMatch.match_score) {
          bestAuthorMatch = mapped;
        }
      }
      const existing = pool.get(mapped.id);
      if (!existing || mapped.match_score > existing.match_score) {
        pool.set(mapped.id, mapped);
      }
    }
    // Early-exit only when we have a strong author-confirmed match
    // (when author hint exists) OR a strong overall match (when not).
    const earlyCandidate = haveAuthorHint ? bestAuthorMatch : bestOverall;
    if (earlyCandidate && earlyCandidate.match_score >= 60) {
      return { best: earlyCandidate, alternatives: pickAlternatives(pool, earlyCandidate.id) };
    }
  }

  // No early exit — return author-match if any found, else overall.
  // Important: bestAuthorMatch wins even with a lower score than
  // bestOverall when an author hint was supplied. The user told us
  // who the author was; respecting that beats fuzzy title-only luck.
  const best = bestAuthorMatch ?? bestOverall;
  if (!best) return null;
  return { best, alternatives: pickAlternatives(pool, best.id) };
}

/** Top-2 runner-ups from the pool, score-sorted, excluding the picked best. */
function pickAlternatives(
  pool: Map<string, GoogleBookMatch>,
  bestId: string,
): GoogleBookMatch[] {
  return [...pool.values()]
    .filter((b) => b.id !== bestId)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 2);
}

/**
 * Map a Google Books match to the shape /api/ai/match returns in
 * `matchData`. Mirrors the TMDB-derived payload so the consumer
 * (useSubmission + the preview screen) doesn't need book-specific
 * branching for the common fields.
 */
export function googleBookToMatchData(book: GoogleBookMatch) {
  return {
    source: "google-books" as const,
    google_books_id: book.id,
    poster_url: book.cover_url,   // books are portrait → use as poster
    backdrop_url: null,            // no backdrop for books
    year: book.published_year,
    runtime: null,
    plot: book.description,
    director: null,
    cast: book.authors.map((name) => ({ name, character: null, avatar: null })),
    genres: book.categories,
    genre_ids: [],
    country: null,
    language: book.language,
    // Book-specific extras the preview / extension schema picks up.
    writer: book.authors[0] ?? null,
    authors: book.authors,
    publisher: book.publisher,
    isbn_10: book.isbn_10,
    isbn_13: book.isbn_13,
    pages: book.pages,
    publication_year: book.published_year,
    preview_url: book.preview_url,
    info_url: book.info_url,
    match_score: book.match_score,
  };
}
