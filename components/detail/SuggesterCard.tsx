"use client";

import { useState } from "react";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { UserBadge } from "@/components/ui/UserBadge";

interface SuggesterCardProps {
  /** User profile shown in the avatar + popup. */
  user: {
    id?: string;
    display_name: string;
    handle?: string;
    avatar_url?: string | null;
    level?: number;
  };
  /** Badge tier ("Verified" / "Expert" / "Gold" / "Platinum"). */
  badge: "Verified" | "Expert" | "Gold" | "Platinum";
  /** Pre-formatted relative date ("Φεβ 24" / "χθες" / "πριν 2 μήνες"). */
  date: string;
  /** The reflection text. Truncates around the 4th line; "Περισσότερα" expands. */
  reflection: string;
}

const TRUNCATE_AT_CHARS = 240;

/**
 * Featured suggester block — the original submitter's reflection above the
 * rating box. Different from a review (no stars, no thumbs / αναφορά
 * footer); the reflection is the K2-imported submitter description.
 *
 * Layout:
 *   [avatar] Name              ⏰ Date
 *            <badge>
 *
 *   <reflection text — 4-line clamp + Περισσότερα expand>
 */
export function SuggesterCard({ user, badge, date, reflection }: SuggesterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reflection.length > TRUNCATE_AT_CHARS;
  const displayText =
    !isLong || expanded
      ? reflection
      : reflection.slice(0, TRUNCATE_AT_CHARS).trimEnd() + "…";

  return (
    <article className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatarWithPopup user={user} size={56} />
          <div className="min-w-0 space-y-1">
            <p className="text-[18px] font-bold text-zinc-900 leading-tight truncate">
              {user.display_name}
            </p>
            <UserBadge kind={badge} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 shrink-0 mt-1.5">
          <ClockIcon />
          <span className="text-[14px] font-medium">{date}</span>
        </div>
      </header>

      <div className="space-y-3">
        <p className="text-[18px] font-normal text-zinc-900 leading-[150%] whitespace-pre-wrap">
          {displayText}
        </p>
        {isLong && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[16px] font-bold text-zinc-900 underline decoration-zinc-900 underline-offset-[3px] active:opacity-70 transition-opacity"
          >
            Περισσότερα
          </button>
        )}
      </div>
    </article>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}
