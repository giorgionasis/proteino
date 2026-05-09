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

// `\b` is an ASCII-only word boundary in JS regex — it doesn't fire on
// Greek letter transitions, so '\bσειρ' would never match 'τη σειρά'.
// Greek roots are matched without \b; English alternatives keep \b only
// for the ASCII tokens that benefit from it.
const CATEGORY_KEYWORDS: Array<[CategorySlug, RegExp]> = [
  ["series",  /σειρ|σεζόν|επεισόδι|\bseries\b|\bseason\b|\bepisode\b/i],          // before movies (more specific)
  ["movies",  /ταιν[ίι]|σινε[μν]|\bmovie\b|\bfilm\b|\bcinema\b/i],
  ["books",   /βιβλ[ίι]|μυθιστόρ|συγγραφέ|\bbook\b|\bnovel\b|\bauthor\b/i],
  ["recipes", /συνταγ|μαγείρε|\brecipe\b|\bcook\b/i],
  ["food",    /εστιατόρι|φαγητό|δείπνο|γεύμα|τρώω|τρώμε|\brestaurant\b/i],
  ["bars",    /μπαρ|καφέ|\bbar\b|\bcafe\b|\bcoffee\b|\bcocktail\b|\bwine\b/i],
  ["hotels",  /ξενοδοχ|διαμον|\bhotel\b|\bairbnb\b|\bstay\b/i],
  ["theater", /θέατρ|παράσταση|σκηνή|\btheater\b|\btheatre\b/i],
  ["events",  /συναυλ|έκθεση|\bsynaul\b|\bfestival\b|\bevent\b/i],
];

// Returns null when no keyword fires — caller should defer to
// Gemini's category_hint or skip TMDB lookup entirely. Previously
// silently defaulted to 'movies' which caused the 'I watched a series
// → got a movie' bug when the σειρά keyword wasn't matched.
function detectCandidateCategory(text: string): CategorySlug | null {
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return null;
}

/**
 * Common articles, pronouns, descriptors, and "watched/loved" type verbs
 * that are noise in title extraction. The lowercase fallback strips these
 * to surface the actual title nouns.
 */
const STOPWORDS = new Set([
  // English articles / pronouns / fillers
  "i","a","an","the","this","that","those","these","my","your","his","her","our","their",
  "just","very","really","only","also","quite","rather","kinda","still","again",
  "is","was","were","are","be","been","being","have","has","had","do","does","did",
  "and","or","but","so","with","of","to","for","from","by","in","on","at","as",
  "it","its","they","them","we","us","you",
  // English descriptors that aren't titles
  "great","good","bad","nice","amazing","brilliant","stunning","lovely","awesome","perfect","cool","best",
  "watched","saw","read","listened","loved","liked","hated","enjoyed","saw",
  "movie","movies","film","films","book","books","series","show","shows","novel",
  "yesterday","today","tonight","night","last","week","weekend",
  // Greek articles / pronouns / fillers
  "ένα","ένας","μια","μία","ο","η","το","τον","την","του","της","τα","τους","τις","οι","τι","ότι","πως",
  "και","ή","αλλά","όμως","σε","από","για","με","χωρίς","όπως","ως","εκεί","εδώ",
  "αυτό","αυτή","αυτός","εμένα","εσένα","μου","σου","τους","εμείς","εσείς",
  "είναι","ήταν","έχω","έχει","είχα","είδα","διάβασα","άκουσα","παρακολούθησα","έπιασα","ξανάδα","έβαλα",
  "πολύ","λίγο","ωραία","καλή","καλό","κακό","τέλεια","τέλειο","υπέροχη","υπέροχο","εξαιρετική","εξαιρετικό",
  "γιατί","επειδή","διότι","όταν","αν","μήπως","χθες","σήμερα","απόψε","χθες",
  "ταινία","ταινίες","βιβλίο","βιβλία","σειρά","σειρές","επεισόδιο",
]);

/**
 * Returns ranked candidate titles to try against TMDB. Best signal first:
 *   1. Anything in quotes (highest confidence)
 *   2. Sequences of consecutive capital-starting words ("Dune Part Two",
 *      "Anora", "Mikey Madison" — all proper-noun phrases). Earlier in
 *      the text ranks higher (people usually mention the title before
 *      the actors).
 *   3. Lowercase fallback — runs of consecutive non-stopword tokens (3+
 *      chars). Catches lowercase typing like "i just watched dune a great
 *      movie" → "dune". TMDB itself is case-insensitive so once we have
 *      the bare token, the search works fine.
 *   4. Last resort: first 5 words of the text.
 *
 * The route tries each in order and returns the best-scored TMDB hit.
 */
function extractCandidateTitles(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (seen.has(trimmed.toLowerCase())) return;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed);
  };

  // 1. Quoted phrase
  const quoted = text.match(/["«„''']([^"»"'']{2,80})["»"'']/);
  if (quoted) push(quoted[1]);

  // 2. Proper-noun phrases — every word in the phrase must start with an
  // uppercase letter (any script: Latin, Greek, Cyrillic, …). We use
  // Unicode property classes \p{Lu} + \p{L} because JS's \b and \w are
  // ASCII-only and would never fire on Greek input.
  const propRe = new RegExp(
    "\\p{Lu}[\\p{L}\\d'\\-]*(?:\\s+\\p{Lu}[\\p{L}\\d'\\-]*)*",
    "gu"
  );
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(text)) !== null) push(m[0]);

  // 3. Lowercase fallback — group runs of consecutive non-stopword tokens.
  // Tokens shorter than 3 chars or in the stopword list act as separators.
  // For "i just watched dune a great movie" this yields just ["dune"].
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  let run: string[] = [];
  const flushRun = () => {
    if (run.length > 0) {
      push(run.join(" "));
      // If the run has 2+ tokens, also try the longest single token alone
      // (often the head noun is the actual title — "the matrix" vs "matrix").
      if (run.length > 1) {
        const longest = run.slice().sort((a, b) => b.length - a.length)[0];
        if (longest.length >= 4) push(longest);
      }
    }
    run = [];
  };
  for (const t of tokens) {
    // Strip surrounding punctuation
    const punctRe = new RegExp("^[^\\p{L}\\d]+|[^\\p{L}\\d]+$", "gu");
    const tok = t.replace(punctRe, "");
    if (!tok || tok.length < 3 || STOPWORDS.has(tok)) {
      flushRun();
      continue;
    }
    run.push(tok);
  }
  flushRun();

  // 4. Final fallback: first 5 words of the text
  if (out.length === 0) {
    const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
    if (words) push(words);
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
  /** Localized TMDB genre names — display only, do not map by these (locale-dependent). */
  genres: string[];
  /** Stable TMDB genre IDs — locale-independent, the right key for taxonomy mapping. */
  genre_ids: number[];
  /** Comma-joined production country names (Greek-localized via TMDB i18n). */
  country: string | null;
  /** ISO 639-1 code, e.g. "en", "el", "fr". */
  language: string | null;
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
      genres: [],
      genre_ids: Array.isArray(top.genre_ids) ? top.genre_ids : [],
      country: null,
      language: top.original_language ?? null,
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

  const genreObjs: Array<{ id?: number; name?: string }> = Array.isArray(detail.genres) ? detail.genres : [];
  const genres: string[] = genreObjs.map((g) => g?.name).filter((n): n is string => typeof n === "string");
  const genre_ids: number[] = genreObjs.map((g) => g?.id).filter((id): id is number => typeof id === "number");

  const countryNames: string[] = Array.isArray(detail.production_countries)
    ? detail.production_countries
        .map((c: any) => c?.name)
        .filter((n: any): n is string => typeof n === "string")
    : Array.isArray(detail.origin_country)
      ? detail.origin_country
      : [];
  const country = countryNames.length > 0 ? countryNames.join(", ") : null;

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
    genres,
    genre_ids,
    country,
    language: detail.original_language ?? null,
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

/**
 * Confidence tier the UI uses to decide whether to auto-lock or surface
 * alternatives. Two signals fold in:
 *   - Best score: how cleanly the top candidate's title matches what the
 *     user typed.
 *   - Runner-up gap: when the second best is within 20 points the choice
 *     is genuinely ambiguous (e.g. two TMDB hits both scoring 100). We
 *     downgrade to "low" so the user picks.
 *
 * High   → auto-lock as before.
 * Medium → lock but offer "Όχι αυτό; →" escape hatch.
 * Low    → don't lock; show alternative cards.
 */
function computeTier(best: number, runnerUp: number | null): "high" | "medium" | "low" {
  if (runnerUp !== null && best - runnerUp < 20) return "low";
  if (best >= 100) return "high";
  if (best >= 60) return "medium";
  return "low";
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

  // Optional hints passed by GeminiAIService.analyzeSubmission. The
  // confidence_hint drives candidate-list policy:
  //   ≥70 → trust Gemini, use ONLY title_hint as the candidate. Skips
  //         regex extraction entirely so noisy candidates ("Είδα",
  //         "Ιστορία", "Βατικανό") can't beat the actual title in
  //         TMDB's fuzzy scoring. This is the fix for "Έδωσα Conclave
  //         and got something else" — Gemini extracts cleanly, regex
  //         then injects 5 noise candidates, scoring picks one of them.
  //   <70  → prepend title_hint to regex candidates (signal-not-force).
  const titleHint = url.searchParams.get("title_hint")?.trim() ?? null;
  const categoryHint = url.searchParams.get("category_hint")?.trim() ?? null;
  const confidenceHint = parseInt(url.searchParams.get("confidence_hint") ?? "0", 10) || 0;

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

  const regexCandidates = extractCandidateTitles(text);
  // Confidence-tier policy on candidate sourcing:
  const candidates =
    titleHint && confidenceHint >= 70
      ? [titleHint] // Trust Gemini fully — no regex noise.
      : titleHint
        ? [titleHint, ...regexCandidates.filter((c) => c.toLowerCase() !== titleHint.toLowerCase())]
        : regexCandidates;
  // Category resolution priority:
  //   1. Gemini's category_hint when confidence ≥ 70 (trust it — it
  //      reads the full text semantically, not just keywords)
  //   2. Regex detection when it fires
  //   3. Gemini's category_hint as final fallback regardless of confidence
  //   4. null — skip TMDB lookup, return raw match data
  // This fixes 'I watched τη σειρά X → matched a movie' (regex \bσειρ
  // didn't fire on Greek text → defaulted to movies → wrong TMDB index).
  const regexCategory = detectCandidateCategory(text);
  const isValidCat = (c: string | null): c is "movies" | "series" =>
    c === "movies" || c === "series";
  const candidateCategory: "movies" | "series" | null =
    (confidenceHint >= 70 && isValidCat(categoryHint))
      ? categoryHint
      : isValidCat(regexCategory)
        ? regexCategory
        : isValidCat(categoryHint)
          ? categoryHint
          : null;

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
      const runnerUpScore = ranked[1]?.score ?? null;
      const tier = computeTier(best.score, runnerUpScore);

      // Build a self-contained payload for each alternative so the client
      // can swap analysis on tap with no extra round-trip. Each entry
      // carries the same shape as the top match — once picked it just
      // becomes the new top.
      const buildPayload = (r: { candidate: string; match: TmdbMatch; score: number }) => ({
        source: "tmdb" as const,
        tmdb_id: r.match.id,
        poster_url: r.match.poster_url,
        backdrop_url: r.match.backdrop_url,
        year: r.match.year,
        runtime: r.match.runtime,
        plot: r.match.plot,
        director: r.match.director,
        cast: r.match.cast,
        genres: r.match.genres,
        genre_ids: r.match.genre_ids,
        country: r.match.country,
        language: r.match.language,
        tried_candidate: r.candidate,
      });

      const tierMessage =
        tier === "low"
          ? "Βρήκα μερικά. Ποιο εννοείς;"
          : tier === "medium"
            ? `Νομίζω είναι ${m.title}. Σωστό;`
            : `Βρήκα: ${m.title}${m.year ? ` (${m.year})` : ""}`;

      const out: SubmissionAnalysis = {
        matched: true,
        title: m.title,
        category: m.category as CategorySlug,
        confidence: tier === "high" ? 0.95 : tier === "medium" ? 0.7 : 0.45,
        progress: 100,
        message: quality.tip ?? tierMessage,
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
          genres: m.genres,
          genre_ids: m.genre_ids,
          country: m.country,
          language: m.language,
          tried_candidate: best.candidate,
          confidence_tier: tier,
          best_score: best.score,
          alternatives: ranked.slice(1, 3).map((r) => ({
            title: r.match.title,
            year: r.match.year,
            poster_url: r.match.poster_url,
            score: r.score,
            category: r.match.category as CategorySlug,
            match_data: buildPayload(r),
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
