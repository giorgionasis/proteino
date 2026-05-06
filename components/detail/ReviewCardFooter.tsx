"use client";

import { ReportLink } from "@/components/report/ReportLink";

interface ReviewCardFooterProps {
  reviewId: string;
  likes: number;
  dislikes: number;
}

/**
 * Shared footer for review cards across all 9 detail pages.
 *
 * Layout (per Figma `review-card.png`):
 *   [👍 N] [│] [👎 N]                              αναφορά
 *
 * Vote counts read from `suggestion.vote_up/vote_down` columns when wired
 * (see PROGRESS — needs a `suggestion_votes` table migration mirroring the
 * `comment_votes` pattern from migration 003). Until then the buttons
 * render with the current count (default 0) and clicks are no-ops.
 */
export function ReviewCardFooter({ reviewId, likes, dislikes }: ReviewCardFooterProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-zinc-700 active:opacity-70 transition-opacity"
          aria-label="Like"
        >
          <ThumbUpIcon />
          <span className="text-[13px] font-semibold">{likes}</span>
        </button>
        <span className="w-px h-5 bg-zinc-300" />
        <button
          type="button"
          className="flex items-center gap-1.5 text-zinc-700 active:opacity-70 transition-opacity"
          aria-label="Dislike"
        >
          <ThumbDownIcon />
          <span className="text-[13px] font-semibold">{dislikes}</span>
        </button>
      </div>
      <ReportLink targetType="suggestion" targetId={reviewId} />
    </div>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
    </svg>
  );
}
