import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import { MockAIService } from "./mock";

export interface AIService {
  analyzeSubmission(text: string): Promise<SubmissionAnalysis>;
  analyzeSearchQuery(query: string): Promise<SearchAnalysis>;
  scoreDescriptionQuality(text: string): Promise<number>;
  /** Semantic-grade coaching tip. Fires when text is substantive enough
   *  (~60+ chars) and the user has paused. Null when no useful tip
   *  exists or the model is unavailable — caller falls back to the
   *  regex-based tip from lib/ai/quality.ts. */
  getSemanticQualityTip?(text: string, category?: string | null): Promise<string | null>;
  /** Conversational follow-up for empty search results. Given the user's
   *  query and any extracted intent, return a short, actionable
   *  Greek question that helps them narrow down. Null = no useful
   *  question (caller renders default chips instead). */
  conversationalSearchFallback?(query: string, hint?: string): Promise<string | null>;
  /** Extract category interests from a free-text self-description.
   *  Used by the onboarding flow's conversational expansion: the user
   *  types "λατρεύω το σινεμά και τα βιβλία", we return
   *  ["movies", "books"]. Caller falls back to a keyword matcher when
   *  this method is missing or returns null. */
  extractInterests?(text: string): Promise<string[] | null>;
  generateEmbedding(text: string): Promise<number[]>;
  rerankRecommendations(userId: string, candidates: Item[]): Promise<Item[]>;
}

let _instance: AIService | null = null;

/**
 * Service factory. Picks the implementation based on env var presence:
 *
 *   AI_GATEWAY_API_KEY → GeminiAIService routed through Vercel AI
 *                        Gateway, with Haiku 4.5 spliced in for the
 *                        Greek-prose surfaces (conversationalSearchFallback,
 *                        and Phase B rerank when wired).
 *   GEMINI_API_KEY     → Legacy direct-to-Google fallback for local
 *                        dev when the Gateway key isn't provisioned.
 *   else               → MockAIService
 *
 * Singleton — cached after first call. To swap providers in dev,
 * change the env var and restart the dev server.
 *
 * Server-side only check. Neither key is NEXT_PUBLIC_, so the
 * client-side branch always returns Mock; client paths that need
 * Gateway-backed calls hit the dedicated /api/ai/* routes (which run
 * server-side and stream the response back).
 */
export function getAIService(): AIService {
  if (_instance) return _instance;

  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv);
  const gatewayKey = env.AI_GATEWAY_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;

  if (gatewayKey) {
    // Production path — Vercel AI Gateway routes Gemini calls, and
    // Haiku is spliced in for the Greek-prose surfaces (conversational
    // search fallback, Phase B rerank). Cost + observability flow
    // through a single pane.
    const { GeminiAIService } = require("./gemini") as typeof import("./gemini");
    const { haikuConversationalFallback } = require("./haiku") as typeof import("./haiku");
    const { wrapWithCacheAndLog } = require("./cache-and-log") as typeof import("./cache-and-log");
    const base = new GeminiAIService();
    base.conversationalSearchFallback = (q: string, hint?: string) =>
      haikuConversationalFallback(q, hint);
    _instance = wrapWithCacheAndLog(base);
    return _instance!;
  }

  if (geminiKey) {
    // Local-dev fallback — direct-to-Google via @google/generative-ai.
    // Skips Gateway entirely. No Haiku splice; conversationalSearchFallback
    // stays on direct Gemini Flash-Lite. Suitable for `next dev` without
    // a provisioned Gateway key.
    const { GeminiDirectAIService } = require("./gemini-direct") as typeof import("./gemini-direct");
    const { wrapWithCacheAndLog } = require("./cache-and-log") as typeof import("./cache-and-log");
    _instance = wrapWithCacheAndLog(new GeminiDirectAIService(geminiKey));
    return _instance!;
  }

  _instance = new MockAIService();
  return _instance;
}
