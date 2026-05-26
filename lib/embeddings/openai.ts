import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;
const MAX_BATCH = 100;

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export async function embedText(text: string): Promise<number[]> {
  const res = await client().embeddings.create({
    model: MODEL,
    dimensions: DIMENSIONS,
    input: text,
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const chunk = texts.slice(i, i + MAX_BATCH);
    const res = await client().embeddings.create({
      model: MODEL,
      dimensions: DIMENSIONS,
      input: chunk,
    });
    for (const d of res.data) {
      results.push(d.embedding);
    }
  }
  return results;
}
