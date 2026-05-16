import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import type { Item } from "@/types";

/**
 * Claude Haiku 4.5 helpers routed through Vercel AI Gateway.
 *
 * Per CLAUDE.md §14: "AI provider — Anthropic Claude Haiku 4.5; Greek
 * quality + cost + speed; locked session 13". Haiku is reserved for
 * the high-value Greek-prose moments where Gemini's terseness shows:
 *
 *   - Conversational search fallback (this file) — empathetic Greek
 *     follow-up question when a query returns zero hits.
 *   - Phase B LLM reranking (TBD) — top-5 picks with a 1-line Greek
 *     reason per pick, on top of the pgvector candidate set.
 *
 * Wired into the AIService factory (lib/ai/index.ts) as a partial
 * override: Gemini handles extraction tasks (structured JSON, latency
 * sensitive); Haiku handles the prose tasks where quality > cost.
 *
 * Model id format: "anthropic/claude-haiku-4-5" (Vercel AI Gateway
 * provider/model). Auth via AI_GATEWAY_API_KEY (gateway picks up
 * automatically from process.env).
 */
const MODEL_HAIKU = "anthropic/claude-haiku-4-5";

export const HAIKU_PROVIDER_LABEL = "anthropic-gateway";
export const HAIKU_MODEL_ID = MODEL_HAIKU;

const FALLBACK_PROMPT = `Είσαι assistant για το Proteino. Ο χρήστης έκανε αναζήτηση και δεν βρήκε αποτέλεσμα. Δώσε μια σύντομη, ζεστή, βοηθητική ερώτηση που να τον κάνει να πει περισσότερα.

Επέστρεψε ΜΟΝΟ JSON:
{
  "question": "<μία σύντομη ερώτηση max 120 chars στα ελληνικά>"
}

Κανόνες:
- Φιλικός, ανθρώπινος τόνος. Σαν να ρωτάει φίλος.
- Συγκεκριμένη και βοηθητική ερώτηση που οδηγεί σε refinement
- Πχ αν "γαλατσι μπαρ": "Τι ψάχνεις πιο συγκεκριμένα — cocktails, ζωντανή μουσική, ή κάτι ήσυχο για κουβέντα;"
- Πχ αν "ταινιες δραμα": "Έχεις προτίμηση σε εποχή ή σκηνοθέτη; Ή θες κάτι σύγχρονο;"
- ΜΟΝΟ μία ερώτηση, όχι λίστα
- ΜΟΝΟ ελληνικά. ΜΟΝΟ έγκυρο JSON.`;

const FallbackSchema = z.object({
  question: z.string().nullable(),
});

/**
 * Conversational follow-up for empty search results. Haiku's prose is
 * meaningfully warmer + more idiomatic in Greek than Flash-Lite for
 * this surface — the user is already in a "didn't find what I wanted"
 * moment, so tone matters more than cost.
 *
 * Returns null on any error so the caller falls back to default chips.
 */
export async function haikuConversationalFallback(
  query: string,
  hint?: string
): Promise<string | null> {
  if (query.trim().length < 3) return null;
  try {
    const input = hint ? `Query: "${query}"\nHint: ${hint}` : `Query: "${query}"`;
    const { object } = await generateObject({
      model: gateway(MODEL_HAIKU),
      schema: FallbackSchema,
      system: FALLBACK_PROMPT,
      prompt: input,
      temperature: 0.6,
    });
    const q = (object.question ?? "").trim();
    return q.length > 0 && q.length <= 120 ? q : null;
  } catch (err) {
    console.error("[haiku.conversationalFallback]", err);
    return null;
  }
}

/**
 * Phase B rerank — placeholder. Today: passthrough.
 *
 * Future signature (locked in CLAUDE.md §3 / AI.md §12):
 *   - Input: userId + top-50 pgvector candidates
 *   - Process: Haiku reranks → returns top-5 with `reason_greek` per
 *     pick ("Επειδή σου άρεσε X, αυτό έχει την ίδια vibe")
 *   - Cost target: ~$0.001 per rerank, 1-2 fires/user/day
 */
export async function haikuRerank(
  _userId: string,
  candidates: Item[]
): Promise<Item[]> {
  return candidates;
}
