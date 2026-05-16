"use client";

import { parsePartialJson } from "ai";

export type CoachingLabel = "poor" | "fair" | "good" | "excellent";

export interface CoachingUpdate {
  tip: string | null;
  /** Gemini's per-stream quality judgment. Overrides the regex
   *  label/badge so the panel actually moves as the user writes
   *  better content. Null while the field hasn't streamed in yet. */
  label: CoachingLabel | null;
  /** Whether the LLM thinks the writing is already rich + personal
   *  enough — drives the celebration state. */
  ready: boolean;
}

/**
 * Client-side streaming consumer for /api/ai/coaching-tip.
 *
 * Posts the user's draft to the streaming route and invokes
 * `onUpdate({ tip, label, ready })` every time the partial JSON
 * object grows. The panel renders the tip character-by-character +
 * snaps the badge to the LLM's freshness judgment.
 *
 * Returns the final update (or a no-op object if errored). Returns
 * `{tip:null, label:null, ready:false}` on errors so the caller can
 * keep the local regex tip as a fallback.
 *
 * `signal` cancellation aborts the fetch + stops further onUpdate
 * callbacks. Pass it through from the consumer's debounce so a fresh
 * keystroke supersedes an in-flight stream cleanly.
 */
export async function streamCoachingTip(
  text: string,
  category: string | null,
  onUpdate: (update: CoachingUpdate) => void,
  signal?: AbortSignal,
): Promise<CoachingUpdate> {
  let response: Response;
  try {
    response = await fetch("/api/ai/coaching-tip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, category }),
      signal,
    });
  } catch {
    return { tip: null, label: null, ready: false };
  }

  // 204 = under-threshold input (no tip yet). 503 = no AI credentials
  // server-side. Both cases: caller's local regex tip wins.
  if (response.status === 204) return { tip: null, label: null, ready: false };
  if (!response.ok || !response.body) return { tip: null, label: null, ready: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastTip: string | null = null;
  let lastLabel: CoachingLabel | null = null;
  let ready = false;
  const ALLOWED_LABELS: CoachingLabel[] = ["poor", "fair", "good", "excellent"];

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parsed = await parsePartialJson(buffer);
      const obj = parsed?.value as
        | { tip?: unknown; ready?: unknown; quality_label?: unknown }
        | null
        | undefined;
      if (!obj || typeof obj !== "object") continue;

      if (typeof obj.ready === "boolean") ready = obj.ready;

      const rawLabel = obj.quality_label;
      const nextLabel = typeof rawLabel === "string" && ALLOWED_LABELS.includes(rawLabel as CoachingLabel)
        ? (rawLabel as CoachingLabel)
        : null;
      const tipRaw = typeof obj.tip === "string" ? obj.tip : null;

      const changed = tipRaw !== lastTip || nextLabel !== lastLabel;
      if (changed) {
        lastTip = tipRaw;
        if (nextLabel) lastLabel = nextLabel;
        onUpdate({ tip: tipRaw, label: lastLabel, ready });
      }
    }
  } catch {
    return { tip: lastTip, label: lastLabel, ready };
  }

  const finalTip = (() => {
    if (ready) return null;
    const t = lastTip?.trim() ?? "";
    return t.length > 0 && t.length <= 120 ? t : null;
  })();

  return { tip: finalTip, label: lastLabel, ready };
}
