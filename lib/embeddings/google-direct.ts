import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const MODEL = "gemini-embedding-001";
const TRUNCATE_DIMS = 768;
const RATE_LIMIT_PER_MIN = 95;
const INTERVAL_MS = Math.ceil((60 * 1000) / RATE_LIMIT_PER_MIN);

let _client: GoogleGenerativeAI | null = null;

function client(): GoogleGenerativeAI {
  if (_client) return _client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  _client = new GoogleGenerativeAI(key);
  return _client;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Matryoshka truncation, re-normalised to unit length (Google's guidance
 *  for gemini-embedding-001 below 3072 dims). */
function truncate(v: number[]): number[] {
  const out = v.slice(0, TRUNCATE_DIMS);
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

/** Items are embedded as retrieval documents so the same vectors serve
 *  item-to-item similarity now and query search (RETRIEVAL_QUERY) later. */
async function embedWithRetry(model: any, text: string, title?: string, retries = 5): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await model.embedContent({
        content:  { role: "user", parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        ...(title ? { title } : {}),
      });
      return truncate(res.embedding.values);
    } catch (err: any) {
      if (attempt < retries - 1) {
        if (err?.status === 429) {
          const backoff = (attempt + 1) * 30_000;
          console.log(`    Rate limited, waiting ${backoff / 1000}s...`);
          await delay(backoff);
          continue;
        }
        // Network drops ("fetch failed") and 5xx are transient on long runs.
        if (!err?.status || err.status >= 500) {
          const backoff = (attempt + 1) * 5_000;
          console.log(`    ${err?.message ?? "network error"}, retrying in ${backoff / 1000}s...`);
          await delay(backoff);
          continue;
        }
      }
      throw err;
    }
  }
  throw new Error("Exhausted retries");
}

export async function embedText(text: string, title?: string): Promise<number[]> {
  const model = client().getGenerativeModel({ model: MODEL });
  return embedWithRetry(model, text, title);
}

/** Google's batchEmbedContents cap. */
const BATCH_MAX = 100;

/**
 * Embed many texts, up to 100 per API request. The free tier counts
 * requests, not texts (1,000/day) — one request per item exhausted it
 * mid-backfill. Falls back to one-by-one if a batch call fails for a
 * reason other than quota.
 */
export async function embedBatch(texts: string[], titles?: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = client().getGenerativeModel({ model: MODEL });
  const results: number[][] = [];
  for (let start = 0; start < texts.length; start += BATCH_MAX) {
    const chunk = texts.slice(start, start + BATCH_MAX);
    const requests = chunk.map((text, i) => {
      const title = titles?.[start + i];
      return {
        content:  { role: "user", parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        ...(title ? { title } : {}),
      };
    });
    const vectors = await batchWithRetry(model, requests);
    if (vectors) {
      results.push(...vectors);
    } else {
      for (let i = 0; i < chunk.length; i++) {
        results.push(await embedWithRetry(model, chunk[i], titles?.[start + i]));
        await delay(INTERVAL_MS);
      }
    }
    await delay(INTERVAL_MS);
  }
  return results;
}

async function batchWithRetry(model: any, requests: unknown[], retries = 4): Promise<number[][] | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await model.batchEmbedContents({ requests });
      const out = (res.embeddings ?? []).map((e: { values: number[] }) => truncate(e.values));
      if (out.length !== requests.length) throw new Error(`batch returned ${out.length}/${requests.length}`);
      return out;
    } catch (err: any) {
      const daily = /per day/i.test(String(err?.message ?? ""));
      if (daily) throw err; // nothing to gain retrying a daily quota today
      if (attempt < retries - 1 && (err?.status === 429 || !err?.status || err.status >= 500)) {
        const backoff = (attempt + 1) * (err?.status === 429 ? 30_000 : 5_000);
        console.log(`    batch: ${err?.message?.slice(0, 80) ?? "error"}, retrying in ${backoff / 1000}s...`);
        await delay(backoff);
        continue;
      }
      console.log(`    batch failed (${err?.status ?? "?"}), falling back to single requests`);
      return null;
    }
  }
  return null;
}
