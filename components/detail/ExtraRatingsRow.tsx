"use client";

import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";

interface ExtraRating {
  user: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    level: number;
  };
  score: number;
  created_at: string;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "σήμερα";
  if (days === 1) return "χθες";
  if (days < 30) return `${days} μέρες πριν`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} μήνες πριν`;
  return d.toLocaleDateString("el-GR", { month: "short", year: "2-digit" });
}

interface Props {
  ratings: ExtraRating[];
}

/**
 * "Άλλες βαθμολογίες" — compact rating-only entries shown below the full
 * review carousel. These are users who rated the item but didn't write a
 * suggestion (live in `ratings` table, not `suggestions` table).
 *
 * Common on migrated items where 1 suggester + N rating-only users is the
 * norm. Without this row, the rating count at the top wouldn't match any
 * visible person below.
 */
export function ExtraRatingsRow({ ratings }: Props) {
  if (ratings.length === 0) return null;

  return (
    <div className="w-full mt-6 flex flex-col gap-4">
      <p className="text-[15px] font-bold text-zinc-700 px-6">Άλλες βαθμολογίες</p>
      <ul className="flex flex-col">
        {ratings.map((r, i) => {
          const score = Math.max(0, Math.min(5, Math.round(r.score)));
          return (
            <li
              key={`${r.user.id}-${i}`}
              className="flex items-center gap-3 py-3 px-6 border-t border-zinc-100"
            >
              <UserAvatarWithPopup user={r.user} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-zinc-800 truncate">{r.user.display_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} filled={s <= score} />
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-zinc-500 shrink-0">{relativeDate(r.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"}
        stroke="#27272A"
        strokeWidth={filled ? 0 : 1}
      />
    </svg>
  );
}
