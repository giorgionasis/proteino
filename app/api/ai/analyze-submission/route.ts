import { NextRequest } from "next/server";
import { streamObject } from "ai";
import { SUBMISSION_PROMPT, SubmissionExtractionSchema } from "@/lib/ai/gemini";
import { getTaxonomy, renderTaxonomyForPrompt } from "@/lib/ai/taxonomy";
import { getStreamingFlashModel, streamingAvailable } from "@/lib/ai/stream-model";

/**
 * POST /api/ai/analyze-submission
 *
 *   Body: { text: string }
 *   Resp: streamed JSON ({ title, category, confidence, year_hint,
 *                          actor_hint, director_hint, mood })
 *
 * Streams the submission analysis object progressively so the
 * IntelligencePanel can render fields as they arrive (e.g. title
 * appears before confidence). The full object is still required by
 * the useSubmission state machine before transitioning to
 * `match_found`, so the client buffers the stream to completion.
 *
 * The non-streaming GeminiAIService.analyzeSubmission also hits
 * /api/ai/match for TMDB confirmation; this route only handles the
 * extraction step. The client orchestrates the follow-up match call.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!streamingAvailable()) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (text.length < 10) {
    return new Response(JSON.stringify({ error: "Text too short" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (text.length > 2000) {
    return new Response(JSON.stringify({ error: "Text too long" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let fullPrompt = SUBMISSION_PROMPT;
  try {
    const taxonomy = await getTaxonomy();
    fullPrompt = SUBMISSION_PROMPT + "\n\n" + renderTaxonomyForPrompt(taxonomy);
  } catch {
    /* taxonomy unavailable — base prompt only */
  }

  const result = streamObject({
    model: getStreamingFlashModel(),
    schema: SubmissionExtractionSchema,
    system: fullPrompt,
    prompt: text,
    temperature: 0.1,
  });

  return result.toTextStreamResponse();
}
