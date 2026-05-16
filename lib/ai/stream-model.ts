import { gateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Server-side helper for picking the right Gemini model instance for
 * AI SDK streaming routes (`streamObject`, `streamText`). Mirrors the
 * branching in `lib/ai/index.ts:getAIService`:
 *
 *   AI_GATEWAY_API_KEY → Vercel AI Gateway (production)
 *   GEMINI_API_KEY     → direct Google provider (local dev)
 *   else               → throws — streaming routes have no Mock path
 *
 * The two id formats look different because they're routed by
 * different providers:
 *   Gateway model id → "google/gemini-2.5-flash-lite"
 *   Direct Google    → "gemini-2.5-flash-lite"
 */
export function getStreamingFlashModel(): LanguageModel {
  const env = process.env;
  if (env.AI_GATEWAY_API_KEY) {
    return gateway("google/gemini-2.5-flash-lite");
  }
  if (env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    return google("gemini-2.5-flash-lite");
  }
  throw new Error(
    "No AI credentials — set AI_GATEWAY_API_KEY (preferred) or GEMINI_API_KEY",
  );
}

/** True when either credential is present. Streaming routes should
 *  short-circuit with 503 when this returns false. */
export function streamingAvailable(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY);
}
