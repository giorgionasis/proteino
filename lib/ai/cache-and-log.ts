import crypto from "crypto";
import type { Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import type { AIService } from "./index";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wrapper that adds Postgres-backed caching + per-call usage logging
 * around any AIService implementation. Wraps the underlying provider
 * (Gemini, Haiku, Mock) without touching its logic.
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
// v13 — invitational tone bump: prompt now prefers conditional
// ("θα ήθελες", "μήπως θες") over imperative ("πες μας") so the
// coach feels like a polite friend, not a teacher giving an order.
const PROMPT_VERSION = "v13";
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
    const age = Date.now() - new Date(data.last_hit_at).getTime();
    if (age > CACHE_TTL_MS) return null;
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
  provider: string;
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
      provider: entry.provider,
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

/** Inner services may expose `provider` + `model` so cache + usage
 *  rows are labelled with what was actually called. The fallback
 *  preserves the legacy "gemini" label for callers that don't yet
 *  set these. */
interface ProviderTagged {
  readonly provider?: string;
  readonly model?: string;
}

const DEFAULT_PROVIDER = "gemini";
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

/**
 * Wrap a provider with cache + usage logging. The wrapper intercepts the
 * latency-sensitive methods (search + submission); embeddings and
 * reranking pass through unchanged for now (different cost profile,
 * different optimization).
 */
export function wrapWithCacheAndLog(inner: AIService): AIService {
  const tagged = inner as AIService & ProviderTagged;
  const provider = tagged.provider ?? DEFAULT_PROVIDER;
  const model = tagged.model ?? DEFAULT_MODEL;

  const wrapped: AIService = {
    async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
      const trimmed = query.trim();
      if (!trimmed) return inner.analyzeSearchQuery(query);

      const key = cacheKey(provider, model, "search", trimmed);
      const t0 = Date.now();

      const cached = await readCache(key);
      if (cached) {
        void logUsage({
          task: "search",
          provider,
          model,
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
        provider,
        model,
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

      const key = cacheKey(provider, model, "submission", trimmed);
      const t0 = Date.now();

      const cached = await readCache(key);
      if (cached) {
        void logUsage({
          task: "submission",
          provider,
          model,
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
        provider,
        model,
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

  // Optional methods — forwarded only when the inner service implements
  // them. Keeps the wrapped object structurally consistent with the
  // interface while letting the parse-interests route detect AI
  // availability via `typeof ai.extractInterests === "function"`.
  if (typeof inner.extractInterests === "function") {
    wrapped.extractInterests = inner.extractInterests.bind(inner);
  }
  if (typeof inner.getSemanticQualityTip === "function") {
    wrapped.getSemanticQualityTip = inner.getSemanticQualityTip.bind(inner);
  }
  if (typeof inner.conversationalSearchFallback === "function") {
    wrapped.conversationalSearchFallback = inner.conversationalSearchFallback.bind(inner);
  }

  return wrapped;
}
