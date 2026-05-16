import { NextRequest } from "next/server";
import { streamObject } from "ai";
import { COACHING_PROMPT, CoachingSchema } from "@/lib/ai/gemini";
import { getStreamingFlashModel, streamingAvailable } from "@/lib/ai/stream-model";

/**
 * POST /api/ai/coaching-tip
 *
 *   Body: { text: string }
 *   Resp: streamed JSON ({ ready: boolean, tip: string | null })
 *
 * Streams the IntelligencePanel coaching tip progressively as Gemini
 * generates it. The `tip` field arrives token-by-token through the
 * partial-object stream so the panel can render the suggestion as it
 * forms instead of waiting for the full response.
 *
 * Server-side because AI_GATEWAY_API_KEY (and GEMINI_API_KEY) is
 * never NEXT_PUBLIC_. The client streams from this endpoint.
 *
 * Sub-60-char inputs match the non-streaming sibling
 * `GeminiAIService.getSemanticQualityTip` and return 204.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!streamingAvailable()) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null) as {
    text?: unknown;
    category?: unknown;
    last_tip?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const category = typeof body?.category === "string" && body.category ? body.category : null;
  const lastTip = typeof body?.last_tip === "string" && body.last_tip.trim() ? body.last_tip.trim() : null;

  if (text.length < 60) {
    return new Response(null, { status: 204 });
  }
  if (text.length > 2000) {
    return new Response(JSON.stringify({ error: "Text too long" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Anti-repeat: when the previous tip is present, the prompt's
  // hard rule kicks in — Gemini must pick a different angle.
  const promptParts = [
    `Κατηγορία: ${category ?? "άγνωστη"}`,
    lastTip ? `Προηγούμενο tip (μην το επαναλάβεις): ${lastTip}` : null,
    `Κείμενο χρήστη:\n${text}`,
  ].filter(Boolean);
  const prompt = promptParts.join("\n\n");

  const result = streamObject({
    model: getStreamingFlashModel(),
    schema: CoachingSchema,
    system: COACHING_PROMPT,
    prompt,
    temperature: 0.6,
  });

  return result.toTextStreamResponse();
}
