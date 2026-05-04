"use client";

/**
 * Achievement progress block — appears in the Published state.
 *
 * Per CLAUDE.md gamification spec:
 *   1st suggestion → "Μόλις έκανες την πρώτη σου πρόταση!" — 1/3 toward Verified
 *   2nd            → "Καταπληκτική αρχή!"                  — 2/3 toward Verified
 *   3rd            → UNLOCK Verified badge
 *   7th            → progress toward Expert (10)
 *   9th            → "Είσαι πολύ κοντά!" — 1 more
 *   10th           → UNLOCK Expert badge
 *
 * Pure UI — caller passes the user's new suggestion_count after publish.
 */

interface Props {
  /** The user's suggestion_count AFTER this publish. */
  suggestionCount: number;
}

interface Milestone {
  threshold: number;
  badge: string;
  badgeIcon: string;
  badgeColor: string;
}

const MILESTONES: Milestone[] = [
  { threshold: 3,  badge: "Επαληθευμένος",  badgeIcon: "🛡️", badgeColor: "#1D9E75" },
  { threshold: 10, badge: "Έμπειρος",       badgeIcon: "⭐", badgeColor: "#3b82f6" },
  { threshold: 25, badge: "Gold",           badgeIcon: "🏆", badgeColor: "#F8D160" },
  { threshold: 50, badge: "Platinum",       badgeIcon: "💎", badgeColor: "#a855f7" },
];

function findCurrent(count: number): { milestone: Milestone; isUnlock: boolean } | null {
  // First not-yet-passed milestone
  const upcoming = MILESTONES.find((m) => count <= m.threshold);
  if (!upcoming) return null;
  return { milestone: upcoming, isUnlock: count === upcoming.threshold };
}

export function AchievementProgress({ suggestionCount }: Props) {
  const state = findCurrent(suggestionCount);
  if (!state) return null;

  const { milestone, isUnlock } = state;
  const progress = Math.min(suggestionCount / milestone.threshold, 1);
  const remaining = Math.max(milestone.threshold - suggestionCount, 0);

  // First-suggestion warm message
  const headline =
    isUnlock                 ? `Ξεκλείδωσες τη διάκριση ${milestone.badge}!`
  : suggestionCount === 1    ? "Μόλις έκανες την πρώτη σου πρόταση!"
  : suggestionCount === 2    ? "Καταπληκτική αρχή!"
  : remaining === 1          ? "Είσαι πολύ κοντά!"
  : remaining <= 3           ? "Λίγο ακόμα!"
                             : "Κάθε πρόταση μετράει.";

  const subtitle = isUnlock
    ? `Συγχαρητήρια! Έχεις πλέον το badge "${milestone.badge}".`
    : `${suggestionCount} / ${milestone.threshold} προτάσεις προς τη διάκριση "${milestone.badge}"`;

  return (
    <div className="w-full max-w-xs bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
      {isUnlock ? (
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-3 animate-pulse"
            style={{ backgroundColor: milestone.badgeColor }}
          >
            <span className="text-3xl">{milestone.badgeIcon}</span>
          </div>
          <p className="text-base font-bold text-white mb-1">{headline}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 opacity-60"
              style={{ backgroundColor: milestone.badgeColor }}
            >
              {milestone.badgeIcon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{headline}</p>
              <p className="text-[11px] text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: milestone.badgeColor,
              }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 text-center">
            {remaining === 0
              ? "Σε λίγο ξεκλειδώνει."
              : remaining === 1
                ? "1 ακόμα πρόταση"
                : `${remaining} ακόμα προτάσεις`}
          </p>
        </>
      )}
    </div>
  );
}
