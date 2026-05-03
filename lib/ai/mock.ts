import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import type { AIService } from "./index";

export class MockAIService implements AIService {
  async analyzeSubmission(text: string): Promise<SubmissionAnalysis> {
    // Simulate incremental analysis delay
    await new Promise((r) => setTimeout(r, 600));

    if (text.length < 10) {
      return {
        matched: false,
        title: null,
        category: null,
        confidence: 0,
        progress: Math.min(text.length * 8, 40),
        message: "Συνέχισε να γράφεις...",
        matchData: null,
      };
    }

    return {
      matched: true,
      title: "Mock Match Result",
      category: "movies",
      confidence: 0.92,
      progress: 100,
      message: "Βρήκα αντιστοιχία!",
      matchData: { source: "mock", score: 0.92 },
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

  async scoreDescriptionQuality(_text: string): Promise<number> {
    return 0.85;
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // 1536-dim mock embedding (all zeros — fine for dev)
    return Array(1536).fill(0);
  }

  async rerankRecommendations(_userId: string, candidates: Item[]): Promise<Item[]> {
    return candidates;
  }
}
