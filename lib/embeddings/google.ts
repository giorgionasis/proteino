import { embed } from "ai";
import { gateway } from "@ai-sdk/gateway";

const MODEL = "google/gemini-embedding-001";
const TRUNCATE_DIMS = 768;

function truncate(v: number[]): number[] {
  return v.slice(0, TRUNCATE_DIMS);
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.textEmbeddingModel(MODEL),
    value: text,
  });
  return truncate(embedding);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const results: number[][] = [];
  for (const text of texts) {
    const { embedding } = await embed({
      model: gateway.textEmbeddingModel(MODEL),
      value: text,
    });
    results.push(truncate(embedding));
  }
  return results;
}
