import type {
  Item,
  SubmissionAnalysis,
  SearchAnalysis,
} from "@/types";
import type { AIService } from "./index";
import { assessQuality } from "./quality";

/**
 * Mock AI service. Despite the name, the submission match path calls our
 * real server-side endpoint /api/ai/match which talks to TMDB for
 * movies/series. So titles that come out of this are canonical (e.g.
 * "Inception" → "Inception (2010)" with TMDB id, poster, cast). Quality
 * coaching stays local since it doesn't need external help.
 */
export class MockAIService implements AIService {
  async analyzeSubmission(text: string): Promise<SubmissionAnalysis> {
    const quality = assessQuality(text);

    if (text.length < 10) {
      return {
        matched: false,
        title: null,
        category: null,
        confidence: 0,
        progress: Math.min(text.length * 8, 40),
        message: quality.tip ?? "Συνέχισε να γράφεις...",
        matchData: null,
        quality,
      };
    }

    // Server-side match (TMDB-backed for movies/series; heuristic otherwise).
    try {
      const res = await fetch(`/api/ai/match?text=${encodeURIComponent(text)}`);
      if (res.ok) {
        const j = (await res.json()) as SubmissionAnalysis;
        // Prefer the freshest local quality assessment in case the round-trip
        // raced an extra keystroke (cheap, no harm).
        return { ...j, quality };
      }
    } catch {
      /* network down — fall through to local-only response */
    }

    // Fallback when the route is unreachable: don't pretend a match exists.
    return {
      matched: false,
      title: null,
      category: null,
      confidence: 0,
      progress: 60,
      message: "Δεν μπορώ να συνδεθώ με την υπηρεσία αναζήτησης τώρα.",
      matchData: null,
      quality,
    };
  }

  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    await new Promise((r) => setTimeout(r, 400));

    return {
      intent: query,
      vibe: query.toLowerCase().includes("cozy") ? "cozy" : null,
      type: null,
      location: null,
      categories: ["movies", "series"],
      query,
    };
  }

  async scoreDescriptionQuality(text: string): Promise<number> {
    return assessQuality(text).score / 100;
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    return Array(1536).fill(0);
  }

  async rerankRecommendations(_userId: string, candidates: Item[]): Promise<Item[]> {
    return candidates;
  }
}
