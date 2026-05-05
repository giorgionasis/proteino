import { NextRequest, NextResponse } from "next/server";
import type { CategorySlug, SubmissionAnalysis } from "@/types";
import { assessQuality } from "@/lib/ai/quality";

/**
 * GET /api/ai/match?text=<user description>
 *
 * Server-side AI match. Used by useSubmission instead of pure client-side
 * heuristics. Behaviour:
 *
 *  1. Score description quality (lib/ai/quality) — same shape the panel uses.
 *  2. Extract a candidate title + category from the user's text.
 *  3. If the candidate looks like a movie/series, hit TMDB to verify and
 *     pull the canonical title + rich metadata (poster, backdrop, director,
 *     cast, plot, year, runtime). The TMDB title beats the user's typing.
 *  4. (TODO) Books / venues / events follow the same pattern via Google
 *     Books / Places / Ticketmaster — wired through the existing admin
 *     enrichment helpers, exposed publicly here for the user-facing flow.
 *
 * Returns a `SubmissionAnalysis` shaped exactly like the mock service did,
 * so client code in useSubmission stays unchanged.
 *
 * If the API key is missing or the external API returns nothing, we fall
 * back to the candidate title we extracted — the user can still publish,
 * just without rich metadata. Matched=false only when we don't even have
 * a plausible candidate (very short text).
 */

// ── Heuristic helpers (used as a fallback + as the candidate generator) ──

const CATEGORY_KEYWORDS: Array<[CategorySlug, RegExp]> = [
  ["series",  /\bσειρ|series|season|σεζόν|episode|επεισόδι/i],          // before movies (more specific)
  ["movies",  /\bταινί|movie|film|cinema|σινε[μν]/i],
  ["books",   /\bβιβλί|book|novel|μυθιστόρ|author|συγγραφέ/i],
  ["recipes", /\bσυνταγ|recipe|μαγείρε|cook/i],
  ["food",    /\bεστιατόρι|restaurant|φαγητό|δείπνο|γεύμα|τρώω|τρώμε/i],
  ["bars",    /\bbar|μπαρ|καφέ|cafe|coffee|cocktail|wine/i],
  ["hotels",  /\bξενοδοχ|hotel|διαμον|airbnb|stay/i],
  ["theater", /\bθέατρ|theater|theatre|παράσταση|σκηνή/i],
  ["events",  /\bsynaul|συναυλ|festival|έκθεση|event/i],
];

function detectCandidateCategory(text: string): CategorySlug {
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return "movies";
}

/**
 * Returns ranked candidate titles to try against TMDB. Best signal first:
 *   1. Anything in quotes (highest confidence)
 *   2. Sequences of consecutive capital-starting words ("Dune Part Two",
 *      "Anora", "Mikey Madison" — all proper-noun phrases). Earlier in
 *      the text ranks higher (people usually mention the title before
 *      the actors).
 *   3. Last resort: first 5 words of the text.
 *
 * The route tries each in order and returns on the first TMDB hit. This
 * fixes the "Anora last night" greedy-extraction bug where we'd glue
 * lowercase trailing words onto the title and TMDB would return 0 hits.
 */
function extractCandidateTitles(text: string): string[] {
  const out: string[] = [];

  // 1. Quoted phrase
  const quoted = text.match(/["«„''']([^"»"'']{2,80})["»"'']/);
  if (quoted) out.push(quoted[1].trim());

  // 2. Proper-noun phrases — every word in the phrase must start with an
  // uppercase letter (any script: Latin, Greek, Cyrillic, …). We use
  // Unicode property classes \p{Lu} + \p{L} because JS's \b and \w are
  // ASCII-only and would never fire on Greek input.
  // Built via constructor to keep the TS literal-regex target unchanged.
  const propRe = new RegExp(
    "\\p{Lu}[\\p{L}\\d'\\-]*(?:\\s+\\p{Lu}[\\p{L}\\d'\\-]*)*",
    "gu"
  );
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(text)) !== null) {
    const phrase = m[0].trim();
    if (phrase.length < 2) continue;       // skip "I" etc.
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    out.push(phrase);
  }

  // 3. Final fallback: first 5 words of the text
  if (out.length === 0) {
    const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
    if (words) out.push(words.length > 60 ? words.slice(0, 60) : words);
  }

  return out;
}

// ── TMDB enrichment (movies + series) ────────────────────────────────────

interface TmdbMatch {
  id: number;
  title: string;
  category: "movies" | "series";
  poster_url: string | null;
  backdrop_url: string | null;
  year: number | null;
  runtime: number | null;
  plot: string | null;
  director: string | null;
  cast: Array<{ name: string; character: string | null; avatar: string | null }>;
}

async function tmdbMatch(category: "movies" | "series", title: string): Promise<TmdbMatch | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const tmdbType = category === "movies" ? "movie" : "tv";

  // Step 1: search
  const searchUrl = new URL(`https://api.themoviedb.org/3/search/${tmdbType}`);
  searchUrl.searchParams.set("api_key", key);
  searchUrl.searchParams.set("query", title);
  searchUrl.searchParams.set("language", "el-GR");

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const top = searchData.results?.[0];
  if (!top) return null;

  // Step 2: details + credits in one call
  const detailUrl = new URL(`https://api.themoviedb.org/3/${tmdbType}/${top.id}`);
  detailUrl.searchParams.set("api_key", key);
  detailUrl.searchParams.set("language", "el-GR");
  detailUrl.searchParams.set("append_to_response", "credits");

  const detailRes = await fetch(detailUrl.toString());
  if (!detailRes.ok) {
    // Degrade gracefully — return what we have from search
    return {
      id: top.id,
      title: top.title ?? top.name ?? title,
      category,
      poster_url: top.poster_path ? `https://image.tmdb.org/t/p/w500${top.poster_path}` : null,
      backdrop_url: top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : null,
      year: parseYear(top.release_date ?? top.first_air_date),
      runtime: null,
      plot: top.overview ?? null,
      director: null,
      cast: [],
    };
  }
  const detail = await detailRes.json();

  const director =
    category === "movies"
      ? detail.credits?.crew?.find((c: any) => c.job === "Director")?.name ?? null
      : (detail.created_by ?? detail.credits?.crew?.find((c: any) => c.job === "Director"))?.[0]?.name
        ?? detail.created_by?.[0]?.name
        ?? null;

  const cast = (detail.credits?.cast ?? []).slice(0, 8).map((c: any) => ({
    name: c.name,
    character: c.character ?? null,
    avatar: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  }));

  const runtime =
    category === "movies"
      ? (detail.runtime ?? null)
      : (Array.isArray(detail.episode_run_time) ? detail.episode_run_time[0] : null);

  return {
    id: detail.id,
    title: detail.title ?? detail.name ?? top.title ?? top.name ?? title,
    category,
    poster_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    backdrop_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : null,
    year: parseYear(detail.release_date ?? detail.first_air_date),
    runtime,
    plot: detail.overview ?? null,
    director,
    cast,
  };
}

/**
 * How well does a TMDB-returned title match what the user typed? Higher
 * is better. Lets the route prefer exact matches over fuzzy ones — so
 * "Κονκλάβιο" → "Κονκλάβιο" (exact, 100) beats "Είδα" → "Σε Είδα"
 * (substring, 60).
 */
function scoreTitleMatch(candidate: string, title: string): number {
  const c = candidate.trim().toLowerCase();
  const t = title.trim().toLowerCase();
  if (!c || !t) return 0;
  if (c === t) return 100;
  if (t.startsWith(c) || t.endsWith(c)) return 80;
  if (t.includes(c)) return 60;
  if (c.includes(t)) return 50;
  return 20; // TMDB picked it via its own fuzzy matching
}

function parseYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// ── Route ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const text = (url.searchParams.get("text") ?? "").trim();

  const quality = assessQuality(text);

  // Below 10 chars we don't even attempt a match — keep the user typing.
  if (text.length < 10) {
    const empty: SubmissionAnalysis = {
      matched: false,
      title: null,
      category: null,
      confidence: 0,
      progress: Math.min(text.length * 8, 40),
      message: quality.tip ?? "Συνέχισε να γράφεις...",
      matchData: null,
      quality,
    };
    return NextResponse.json(empty);
  }

  const candidates = extractCandidateTitles(text);
  const candidateCategory = detectCandidateCategory(text);

  // Try TMDB for movies/series. Other categories fall through with the
  // raw candidate (TODO: wire Google Books / Places / Ticketmaster the
  // same way; admin enrichment helpers are already in place).
  if (candidateCategory === "movies" || candidateCategory === "series") {
    // Try all candidates concurrently. For each TMDB hit, score how well
    // its title matches the candidate. The best score wins. This stops
    // common Greek opening verbs like "Είδα" from beating the real title
    // ("Κονκλάβιο") when both are candidates: "Είδα" → "Σε Είδα" is a
    // substring match (lower score), "Κονκλάβιο" → "Κονκλάβιο" is exact.
    const scored = await Promise.all(
      candidates.map(async (c) => {
        const m = await tmdbMatch(candidateCategory, c).catch(() => null);
        if (!m) return null;
        return { candidate: c, match: m, score: scoreTitleMatch(c, m.title) };
      })
    );
    const ranked = scored
      .filter((x): x is { candidate: string; match: TmdbMatch; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);

    if (ranked.length > 0) {
      const best = ranked[0];
      const m = best.match;
      const out: SubmissionAnalysis = {
        matched: true,
        title: m.title,
        category: m.category as CategorySlug,
        confidence: 0.95,
        progress: 100,
        message: quality.tip ?? `Βρήκα: ${m.title}${m.year ? ` (${m.year})` : ""}`,
        matchData: {
          source: "tmdb",
          tmdb_id: m.id,
          poster_url: m.poster_url,
          backdrop_url: m.backdrop_url,
          year: m.year,
          runtime: m.runtime,
          plot: m.plot,
          director: m.director,
          cast: m.cast,
          tried_candidate: best.candidate,
          alternatives: ranked.slice(1, 3).map((r) => ({
            candidate: r.candidate,
            title: r.match.title,
            score: r.score,
          })),
        },
        quality,
      };
      return NextResponse.json(out);
    }

    // No candidate matched → don't pretend. Better to nudge.
    const out: SubmissionAnalysis = {
      matched: false,
      title: null,
      category: null,
      confidence: 0.2,
      progress: 60,
      message: process.env.TMDB_API_KEY
        ? `Δεν βρήκα κάτι σχετικό στο TMDB. Έλεγξε τον τίτλο.`
        : "Λείπει το TMDB_API_KEY στον server.",
      matchData: { tried: candidates },
      quality,
    };
    return NextResponse.json(out);
  }

  // Other categories: accept the first candidate without external
  // verification (TODO: wire Google Books / Places / Ticketmaster).
  const candidateTitle = candidates[0] ?? "";
  const out: SubmissionAnalysis = {
    matched: true,
    title: candidateTitle,
    category: candidateCategory,
    confidence: Math.min(0.6 + text.length / 400, 0.92),
    progress: 100,
    message: quality.tip ?? `Βρήκα: ${candidateTitle}`,
    matchData: { source: "heuristic", derived_title: candidateTitle },
    quality,
  };
  return NextResponse.json(out);
}
