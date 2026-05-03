import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import { MockAIService } from "./mock";

export interface AIService {
  analyzeSubmission(text: string): Promise<SubmissionAnalysis>;
  analyzeSearchQuery(query: string): Promise<SearchAnalysis>;
  scoreDescriptionQuality(text: string): Promise<number>;
  generateEmbedding(text: string): Promise<number[]>;
  rerankRecommendations(userId: string, candidates: Item[]): Promise<Item[]>;
}

let _instance: AIService | null = null;

export function getAIService(): AIService {
  if (!_instance) {
    _instance = new MockAIService() as AIService;
  }
  return _instance!;
}
