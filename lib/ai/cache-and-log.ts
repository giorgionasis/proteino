import crypto from "crypto";
import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import type { AIService } from "./index";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wrapper that adds Postgres-backed caching + per-call usage logging
 * around any AIService implementation. Wraps the underlying provider
 * (Gemini, future Anthropic, Mock) without touching its logic.
 *
 * - Cache: hot queries skip the LLM round-trip on repeat. Keyed by
 *   (provider, model, prompt-version, task, query). 30-day TTL.
 * - Usage log: every call (cache hit or miss) inserts a row in
 *   ai_usage_log for the cost dashboard. Tracks tokens, latency,
 *   cache_hit, query_text.
 *
 * Both writes are best-effort — if the tables don't exist (migration
 * 019 not run) or DB is down, the underlying service still works.
 *
 * Prompt-version bump invalidates cache on prompt changes. Bump when
 * tweaking the system prompt in gemini.ts.
 */
// v2 — taxonomy injection (DB-canonical values added to prompts).
// Bumping invalidates all v1 cached results so the next call re-fetches
// with the richer prompt.
const PROMPT_VERSION = "v2";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedEntry {
  result: unknown;
  hit_count: number;
  last_hit_at: string;
}

function cacheKey(provider: string, model: string, task: string, query: string): string {
  return crypto
    .createHash("sha256")
    .update(`${provider}|${model}|${PROMPT_VERSION}|${task}|${query.trim().toLowerCase()}`)
    .digest("hex");
}

async function readCache(key: string): Promise<unknown | null> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("ai_query_cache")
      .select("result, hit_count, last_hit_at")
      .eq("cache_key", key)
      .maybeSingle<CachedEntry>();
    if (error || !data) return null;
    // TTL check
    const age = Date.now() - new Date(data.last_hit_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    // Bump hit count + timestamp (fire-and-forget, no need to await)
    void (sb.from("ai_query_cache") as any)
      .update({ hit_count: data.hit_count + 1, last_hit_at: new Date().toISOString() })
      .eq("cache_key", key);
    return data.result;
  } catch {
    return null;
  }
}

async function writeCache(key: string, task: string, queryText: string, result: unknown): Promise<void> {
  try {
    const sb = createAdminClient();
    await (sb.from("ai_query_cache") as any).upsert(
      {
        cache_key: key,
        task,
        query_text: queryText,
        result,
        hit_count: 0,
        last_hit_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch {
    /* fail silently — table missing or DB unreachable */
  }
}

interface UsageLogEntry {
  task: string;
  model: string;
  query_text: string | null;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
  cache_hit: boolean;
}

async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const sb = createAdminClient();
    await (sb.from("ai_usage_log") as any).insert({
      task: entry.task,
      provider: "gemini",
      model: entry.model,
      query_text: entry.query_text ? entry.query_text.slice(0, 500) : null,
      input_tokens: entry.input_tokens ?? null,
      output_tokens: entry.output_tokens ?? null,
      latency_ms: entry.latency_ms,
      cache_hit: entry.cache_hit,
    });
  } catch {
    /* fail silently */
  }
}

const PROVIDER = "gemini";
const MODEL_FLASH_LITE = "gemini-2.5-flash-lite";

/**
 * Wrap a provider with cache + usage logging. The wrapper intercepts the
 * latency-sensitive methods (search + submission); embeddings and
 * reranking pass through unchanged for now (different cost profile,
 * different optimization).
 */
export function wrapWithCacheAndLog(inner: AIService): AIService {
  const wrapped: AIService = {
    async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
      const trimmed = query.trim();
      if (!trimmed) return inner.analyzeSearchQuery(query);

      const key = cacheKey(PROVIDER, MODEL_FLASH_LITE, "search", trimmed);
      const t0 = Date.now();

      const cached = await readCache(key);
      if (cached) {
        void logUsage({
          task: "search",
          model: MODEL_FLASH_LITE,
          query_text: trimmed,
          latency_ms: Date.now() - t0,
          cache_hit: true,
        });
        return cached as SearchAnalysis;
      }

      const result = await inner.analyzeSearchQuery(query);
      const elapsed = Date.now() - t0;

      void writeCache(key, "search", trimmed, result);
      void logUsage({
        task: "search",
        model: MODEL_FLASH_LITE,
        query_text: trimmed,
        latency_ms: elapsed,
        cache_hit: false,
      });
      return result;
    },

    async analyzeSubmission(text: string): Promise<SubmissionAnalysis> {
      const trimmed = text.trim();
      // Submissions cache more sparingly than search — text varies more,
      // hit rate is much lower. Still cache identical strings (e.g. user
      // resubmits same draft).
      if (!trimmed || trimmed.length < 15) return inner.analyzeSubmission(text);

      const key = cacheKey(PROVIDER, MODEL_FLASH_LITE, "submission", trimmed);
      const t0 = Date.now();

      const cached = await readCache(key);
      if (cached) {
        void logUsage({
          task: "submission",
          model: MODEL_FLASH_LITE,
          query_text: trimmed,
          latency_ms: Date.now() - t0,
          cache_hit: true,
        });
        return cached as SubmissionAnalysis;
      }

      const result = await inner.analyzeSubmission(text);
      const elapsed = Date.now() - t0;

      void writeCache(key, "submission", trimmed, result);
      void logUsage({
        task: "submission",
        model: MODEL_FLASH_LITE,
        query_text: trimmed,
        latency_ms: elapsed,
        cache_hit: false,
      });
      return result;
    },

    scoreDescriptionQuality: inner.scoreDescriptionQuality.bind(inner),
    generateEmbedding: inner.generateEmbedding.bind(inner),
    rerankRecommendations: inner.rerankRecommendations.bind(inner),
  };
  return wrapped;
}
