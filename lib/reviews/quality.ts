/**
 * Char-count tiered praise + progress for the review composer.
 *
 * Tiers chosen empirically:
 *   <  20 chars  → "Πες μας λίγα ακόμα"      (encouragement)
 *   <  80 chars  → "Καλή αρχή! Πες περισσότερα"
 *   < 180 chars  → "Τέλεια αρχή!"
 *  ≥ 180 chars  → "Οι αναγνώστες σου ευχαριστούν 🙏"  (praise)
 *
 * Hard cap is 4000 chars (validated server-side). Past 600 we soft-warn
 * with a red counter but don't block — the GIF flow does the same.
 */

export const SOFT_TARGET_CHARS = 180; // progress bar full at this point
export const SOFT_WARN_CHARS = 600;   // counter turns amber past this
export const HARD_MAX_CHARS = 4000;   // server enforces

export interface QualityFeedback {
  /** 0..1 — fills the progress bar. */
  progress: number;
  /** Short message under the bar. Empty when textarea is empty. */
  message: string;
  /** Tone applied to the message + bar fill. */
  tone: "muted" | "encourage" | "good" | "great";
}

export function evaluateQuality(text: string): QualityFeedback {
  const len = text.trim().length;

  if (len === 0) {
    return { progress: 0, message: "", tone: "muted" };
  }

  if (len < 20) {
    return {
      progress: Math.min(len / SOFT_TARGET_CHARS, 0.15),
      message: "Πες μας λίγα ακόμα ✍️",
      tone: "encourage",
    };
  }

  if (len < 80) {
    return {
      progress: Math.min(len / SOFT_TARGET_CHARS, 0.5),
      message: "Καλή αρχή! Πες λίγα περισσότερα",
      tone: "encourage",
    };
  }

  if (len < SOFT_TARGET_CHARS) {
    return {
      progress: Math.min(len / SOFT_TARGET_CHARS, 0.85),
      message: "Τέλεια αρχή!",
      tone: "good",
    };
  }

  return {
    progress: 1,
    message: "Οι αναγνώστες σου ευχαριστούν 🙏",
    tone: "great",
  };
}

/** Returns true when the user has written enough to feel "complete." */
export function meetsSoftTarget(text: string): boolean {
  return text.trim().length >= 80;
}

/** Returns the colour class for the progress bar + message based on tone. */
export const TONE_TO_COLOR: Record<QualityFeedback["tone"], { bar: string; text: string }> = {
  muted:     { bar: "bg-zinc-200",  text: "text-zinc-400" },
  encourage: { bar: "bg-amber-400", text: "text-amber-700" },
  good:      { bar: "bg-coral-500", text: "text-coral-700" },
  great:     { bar: "bg-emerald-500", text: "text-emerald-700" },
};
