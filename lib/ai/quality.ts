import type { QualityAssessment, QualityLabel } from "@/types";

/**
 * Real-time analysis of the user's description. Pure local function — no
 * network — so it runs on every keystroke without leaning on the AI match
 * round-trip. Drives the ProteínoIntelligence panel's coaching messages.
 *
 * Returns a label, a 0-100 score, and the most actionable next step. The
 * coaching is multi-dimensional (length / why / emotion / specific) and
 * rotates phrasings as the user writes so the panel feels alive instead
 * of stuck on the same line. Same shape as real AI will populate later.
 */

const RE_WHY = /(γιατί|επειδή|διότι|μου άρεσε|μου ['']?ρεσε|με συγκίνησε|με κράτησε|με ταξίδ|με έβαλε|με έκανε|because|why\s|loved|hated|made me|kept me|reason)/i;
const RE_EMOTION = /(τέλει\w+|υπέροχ\w+|εξαιρετικ\w+|εκπληκτικ\w+|συγκινητικ\w+|βαρετ\w+|αξέχαστ\w+|τρομερ\w+|μαγικ\w+|φοβερ\w+|καταπληκτικ\w+|αριστούργ\w+|amazing|brilliant|stunning|boring|incredible|fantastic|magical|masterpiece|powerful|hilarious|terrifying)/i;
const RE_SCENE = /(σκηνή|σκηνές|στιγμή|στιγμές|τέλος|αρχή|μέση|κεφάλαι|γραμμή|στίχος|scene|moment|quote|chapter|ending|opening)/i;
const RE_CHAR = /(χαρακτήρας|χαρακτήρες|πρωταγωνιστ|ηθοποιό|ερμηνεί|character|actor|cast|performance)/i;
const RE_PLOT = /(πλοκή|ιστορία|υπόθεση|σενάρι|story|plot|narrative)/i;

/** Pools of phrasings per coaching dimension. We rotate within a pool as
 *  the user keeps writing, so they don't see the exact same sentence for
 *  20 keystrokes in a row. */
type Coaching = "length" | "why" | "emotion" | "scene" | "character" | "plot" | "polish" | "celebrate";

const COACHING: Record<Coaching, string[]> = {
  length: [
    "Συνέχισε... πες περισσότερα",
    "Λίγα λόγια ακόμα και ξεκινάμε",
    "Γράψε λίγα λόγια για να καταλάβω",
  ],
  why: [
    "Γιατί σου άρεσε; Αυτό κάνει την πρόταση δυνατή",
    "Πες την αιτία — γιατί το προτείνεις",
    "Τι σε έκανε να το προτείνεις σε άλλους;",
    "Είναι λίγο γενικό — πες γιατί ξεχωρίζει",
  ],
  emotion: [
    "Πώς σε έκανε να νιώσεις;",
    "Τι συναίσθημα σου άφησε;",
    "Πες κάτι πιο προσωπικό — πώς σε άγγιξε",
    "Τι εντύπωση σου άφησε στο τέλος;",
  ],
  scene: [
    "Πες για μια σκηνή που σε εντυπωσίασε",
    "Ποια στιγμή έμεινε στο μυαλό σου;",
    "Υπάρχει σκηνή που θα θυμάσαι; Πες την",
  ],
  character: [
    "Πες για κάποιον χαρακτήρα ή ερμηνεία",
    "Ποιος ηθοποιός σε εντυπωσίασε;",
    "Μίλα για τους πρωταγωνιστές",
  ],
  plot: [
    "Πες λίγα λόγια για την πλοκή",
    "Τι σε κράτησε στην ιστορία;",
    "Μίλα για το σενάριο — τι σε καθήλωσε;",
  ],
  polish: [
    "Καλό! Πρόσθεσε άλλη μία λεπτομέρεια",
    "Λίγο ακόμα και είναι έτοιμο",
    "Πάμε για μία ακόμη πινελιά",
  ],
  celebrate: [
    "🔥 Εξαιρετική περιγραφή!",
    "✓ Έτοιμη για δημοσίευση",
    "Καταπληκτική πρόταση",
  ],
};

/** Pick a phrasing deterministically from text length so the same input
 *  always produces the same tip (no flicker), but variety appears as the
 *  user keeps writing. */
function pickPhrasing(coaching: Coaching, len: number): string {
  const pool = COACHING[coaching];
  // Rotate every ~10 characters of new text. Floor so identical text
  // never produces a different tip across renders.
  return pool[Math.floor(len / 10) % pool.length];
}

/** Decide the most useful dimension to coach on, given what's missing. */
function chooseCoaching(opts: {
  len: number;
  hasWhy: boolean;
  hasEmotion: boolean;
  hasScene: boolean;
  hasCharacter: boolean;
  hasPlot: boolean;
  score: number;
}): Coaching {
  if (opts.len < 12) return "length";
  if (!opts.hasWhy) return "why";
  if (!opts.hasEmotion) return "emotion";
  // After the basics, suggest specific dimensions in rotation. Use length
  // to pick which dimension the user hasn't covered yet, biased toward
  // whatever they HAVEN'T written about.
  if (!opts.hasScene && !opts.hasCharacter && !opts.hasPlot) {
    // Rotate suggestion based on current length
    const dims: Coaching[] = ["plot", "scene", "character"];
    return dims[Math.floor(opts.len / 25) % dims.length];
  }
  if (!opts.hasScene) return "scene";
  if (!opts.hasCharacter) return "character";
  if (!opts.hasPlot) return "plot";
  if (opts.score < 80) return "polish";
  return "celebrate";
}

export function assessQuality(text: string): QualityAssessment {
  const trimmed = text.trim();
  const len = trimmed.length;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const sentenceCount = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 3).length || 1;

  const hasWhy = RE_WHY.test(text);
  const hasEmotion = RE_EMOTION.test(text);
  const hasScene = RE_SCENE.test(text);
  const hasCharacter = RE_CHAR.test(text);
  const hasPlot = RE_PLOT.test(text);
  const hasMultipleSentences = sentenceCount >= 2;
  const hasSpecific = hasScene || hasCharacter || hasPlot || wordCount >= 18;

  let score = 0;
  if (len >= 10)            score += 10;
  if (len >= 30)            score += 8;
  if (len >= 60)            score += 8;
  if (len >= 120)           score += 8;
  if (len >= 200)           score += 4;
  if (hasWhy)               score += 22;
  if (hasEmotion)           score += 14;
  if (hasScene)             score += 8;
  if (hasCharacter)         score += 8;
  if (hasPlot)              score += 6;
  if (hasMultipleSentences) score += 4;
  score = Math.min(score, 100);

  let label: QualityLabel;
  if (score < 30)      label = "poor";
  else if (score < 55) label = "fair";
  else if (score < 80) label = "good";
  else                 label = "excellent";

  const coaching = chooseCoaching({ len, hasWhy, hasEmotion, hasScene, hasCharacter, hasPlot, score });
  const tip = coaching === "celebrate" ? null : pickPhrasing(coaching, len);

  const badges: Record<QualityLabel, string> = {
    poor:      "Συνέχισε...",
    fair:      "Καλό ξεκίνημα",
    good:      "✓ Καλή περιγραφή",
    excellent: "🔥 Εξαιρετικό",
  };

  return { score, label, tip, badge: badges[label] };
}

// hasSpecific is computed for backward-compat with any callers; nothing else uses it.
void 0;
