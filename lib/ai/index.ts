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

/**
 * Service factory. Picks the implementation based on env var presence:
 *
 *   GEMINI_API_KEY    → GeminiAIService (Gemini 2.5 Flash)
 *   ANTHROPIC_API_KEY → AnthropicAIService (Claude Haiku 4.5) — TODO
 *   else              → MockAIService
 *
 * Singleton — cached after first call. To swap providers in dev,
 * change the env var and restart the dev server.
 *
 * Server-side only check. The Gemini key must never reach the client
 * (using NEXT_PUBLIC_ prefix would expose it).
 */
export function getAIService(): AIService {
  if (_instance) return _instance;

  const geminiKey = typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined;

  if (geminiKey) {
    // Lazy-load to avoid pulling the Gemini SDK into client bundles.
    // (When called on the client, geminiKey is undefined, so this branch
    // is only reachable server-side.)
    const { GeminiAIService } = require("./gemini") as typeof import("./gemini");
    const { wrapWithCacheAndLog } = require("./cache-and-log") as typeof import("./cache-and-log");
    _instance = wrapWithCacheAndLog(new GeminiAIService(geminiKey));
    return _instance!;
  }

  _instance = new MockAIService();
  return _instance;
}
