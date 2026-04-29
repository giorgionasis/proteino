import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";

export interface AIService {
  analyzeSubmission(text: string): Promise<SubmissionAnalysis>;
  analyzeSearch(query: string): Promise<SearchAnalysis>;
  generateEmbedding(text: string): Promise<number[]>;
  rerankRecommendations(userId: string, candidates: Item[]): Promise<Item[]>;
}

// Lazily instantiated singleton
let _instance: AIService | null = null;

export function getAIService(): AIService {
  if (!_instance) {
    // Swap in the real provider when available:
    // const { AnthropicAIService } = await import("./anthropic");
    const { MockAIService } = require("./mock");
    _instance = new MockAIService() as AIService;
  }
  return _instance!;
}
