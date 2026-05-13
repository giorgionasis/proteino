"use client";

import { useState } from "react";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";

export interface ReviewCardProps {
  id: string;
  rating: number;
  text: string;
  date: string;
  name: string;
  userData: any;
  badge: "Verified" | "Expert" | "Gold" | "Platinum";
  likes?: number;
  dislikes?: number;
  /** Current viewer's vote on this review: 1 | -1 | null. Server-provided. */
  myVote?: 1 | -1 | null;
  /** "carousel" → fixed-width 310px, used in horizontal scroll. "list" → full-width column. */
  variant?: "carousel" | "list";
  /**
   * Review author's user id. Forwarded to ReviewCardFooter so it can
   * detect the "this is my own review" case and hide vote/report controls.
   * Optional — when omitted, the footer always renders the controls.
   */
  authorId?: string;
}

/**
 * Single source of truth for a review card. Used inside the detail-page
 * carousel below the rating box AND inside the /reviews sub-page list.
 *
 * Layout per design:
 *   ★★☆☆☆ · χθες
 *   <text — clamped at 4 lines>
 *   Περισσότερα ← expand link, only when text overflows
 *   <avatar> Name
 *           <badge>
 *   ────────────
 *   👍 N  │  👎 N                              αναφορά
 */
export function ReviewCard({
  id,
  rating,
  text,
  date,
  name,
  userData,
  badge,
  likes = 0,
  dislikes = 0,
  myVote = null,
  variant = "carousel",
  authorId,
}: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Cheap heuristic: assume any text past ~280 chars OR 4 line breaks is
  // "long" and worth offering an expand link. Avoids measuring the DOM.
  const looksLong = text.length > 280 || (text.match(/\n/g)?.length ?? 0) >= 3;

  const sizeClass =
    variant === "carousel"
      ? "flex-none w-[310px]"
      : "w-full";

  return (
    <article
      className={`${sizeClass} bg-white rounded-[12px] flex flex-col justify-between overflow-hidden`}
      style={{ boxShadow: "2px 2px 9px -2px rgba(0,0,0,0.1)" }}
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon key={s} size={11} filled={s <= rating} />
            ))}
          </div>
          <span className="w-[2px] h-[2px] rounded-full bg-zinc-500 shrink-0" />
          <span className="text-[13px] font-medium text-zinc-500">{date}</span>
        </div>

        {text && text.trim().length > 0 && (
          <div className="flex flex-col gap-3">
            <p
              className={`text-[14px] font-normal text-zinc-800 leading-[150%] whitespace-pre-wrap ${
                !expanded && looksLong ? "line-clamp-4" : ""
              }`}
            >
              {text}
            </p>
            {looksLong && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="self-start text-[14px] font-bold text-zinc-800 underline decoration-zinc-800 underline-offset-2"
              >
                Περισσότερα
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <UserAvatarWithPopup user={userData ?? { display_name: name }} size={50} />
          <div className="space-y-1">
            <p className="text-[14px] font-bold text-zinc-800 leading-none">{name}</p>
            <UserBadge kind={badge} />
          </div>
        </div>
      </div>
      <ReviewCardFooter reviewId={id} likes={likes} dislikes={dislikes} myVote={myVote} authorId={authorId ?? userData?.id} />
    </article>
  );
}

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={(size * 12) / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"}
        stroke="#27272A"
        strokeWidth={filled ? 0 : 1}
      />
    </svg>
  );
}
