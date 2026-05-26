import { GoogleGenerativeAI } from "@google/generative-ai";

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

function truncate(v: number[]): number[] {
  return v.slice(0, TRUNCATE_DIMS);
}

async function embedWithRetry(model: any, text: string, retries = 3): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await model.embedContent(text);
      return truncate(res.embedding.values);
    } catch (err: any) {
      if (err?.status === 429 && attempt < retries - 1) {
        const backoff = (attempt + 1) * 30_000;
        console.log(`    Rate limited, waiting ${backoff / 1000}s...`);
        await delay(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Exhausted retries");
}

export async function embedText(text: string): Promise<number[]> {
  const model = client().getGenerativeModel({ model: MODEL });
  return embedWithRetry(model, text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = client().getGenerativeModel({ model: MODEL });
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedWithRetry(model, text));
    await delay(INTERVAL_MS);
  }
  return results;
}
