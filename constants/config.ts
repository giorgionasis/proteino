export const APP_NAME = "Proteino";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const LEVEL_THRESHOLDS = [0, 3, 10, 25, 50, 100, 200, 500];

export function getLevel(suggestionCount: number): number {
  let level = 0;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (suggestionCount >= threshold) level++;
    else break;
  }
  return level;
}

export const ACHIEVEMENT_MILESTONES = [
  { count: 3,   badge: "Επαληθευμένος χρήστης", icon: "🛡️" },
  { count: 10,  badge: "Έμπειρος χρήστης",       icon: "⭐" },
  { count: 25,  badge: "Τακτικός contributor",    icon: "🔥" },
  { count: 50,  badge: "Power user",              icon: "💎" },
  { count: 100, badge: "Proteino Legend",         icon: "👑" },
];

export const QUALITY_SCORE_LABELS: Record<string, string> = {
  excellent: "Εξαιρετικό",
  good:      "Καλό",
  average:   "Μέτριο",
  poor:      "Φτωχό",
};
