import type { QualityAssessment, QualityLabel } from "@/types";

/**
 * Real-time analysis of the user's description. Returns a label, a 0-100
 * score, and the single most actionable tip for what's missing. Drives the
 * ProteínoIntelligence panel's coaching messages (AI.md §2). The same
 * interface real AI will populate — swap implementation, UI doesn't change.
 */

const RE_WHY = /(γιατί|επειδή|διότι|μου άρεσε|μου ['']?ρεσε|με συγκίνησε|με κράτησε|με ταξίδ|με έβαλε|με έκανε|because|why\s|loved|hated|made me|kept me|reason)/i;
const RE_EMOTION = /(τέλει\w+|υπέροχ\w+|εξαιρετικ\w+|εκπληκτικ\w+|συγκινητικ\w+|βαρετ\w+|αξέχαστ\w+|τρομερ\w+|μαγικ\w+|φοβερ\w+|καταπληκτικ\w+|αριστούργ\w+|amazing|brilliant|stunning|boring|incredible|fantastic|magical|masterpiece|powerful|hilarious|terrifying)/i;
const RE_SPECIFIC = /(σκηνή|σκηνές|χαρακτήρας|χαρακτήρες|στιγμή|στιγμές|τέλος|αρχή|μέση|σεζόν|επεισόδι|κεφάλαι|γραμμή|στίχος|scene|character|moment|quote|chapter|ending|opening)/i;

export function assessQuality(text: string): QualityAssessment {
  const trimmed = text.trim();
  const len = trimmed.length;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const sentenceCount = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 3).length || 1;

  const hasWhy = RE_WHY.test(text);
  const hasEmotion = RE_EMOTION.test(text);
  const hasSpecific = RE_SPECIFIC.test(text) || wordCount >= 18;
  const hasMultipleSentences = sentenceCount >= 2;

  let score = 0;
  if (len >= 10)            score += 12;
  if (len >= 30)            score += 10;
  if (len >= 60)            score += 10;
  if (len >= 120)           score += 8;
  if (hasWhy)               score += 25;
  if (hasEmotion)           score += 15;
  if (hasSpecific)          score += 12;
  if (hasMultipleSentences) score += 8;
  score = Math.min(score, 100);

  let label: QualityLabel;
  if (score < 30)      label = "poor";
  else if (score < 55) label = "fair";
  else if (score < 80) label = "good";
  else                 label = "excellent";

  let tip: string | null = null;
  if (len < 12)                          tip = "Πες περισσότερα — η κοινότητα θέλει να καταλάβει γιατί";
  else if (!hasWhy)                      tip = "Πες γιατί το προτείνεις — αυτό κάνει την πρόταση δυνατή";
  else if (!hasEmotion && len < 100)     tip = "Πρόσθεσε πώς σε έκανε να νιώσεις";
  else if (!hasSpecific && wordCount < 14) tip = "Πρόσθεσε κάτι συγκεκριμένο — μια σκηνή, στιγμή ή χαρακτήρα";
  else if (label === "fair")             tip = "Καλό! Πρόσθεσε άλλη μία λεπτομέρεια";
  else if (label === "good")             tip = "Πολύ καλή περιγραφή — η κοινότητα θα την εκτιμήσει";

  const badges: Record<QualityLabel, string> = {
    poor:      "Συνέχισε...",
    fair:      "Καλό ξεκίνημα",
    good:      "✓ Καλή περιγραφή",
    excellent: "🔥 Εξαιρετικό",
  };

  return { score, label, tip, badge: badges[label] };
}
