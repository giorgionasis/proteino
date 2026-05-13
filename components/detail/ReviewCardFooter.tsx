"use client";

import { ReportLink } from "@/components/report/ReportLink";
import { useReviewVote, type Vote } from "@/hooks/useReviewVote";
import { useAuthStore } from "@/stores/authStore";

interface ReviewCardFooterProps {
  reviewId: string;
  likes: number;
  dislikes: number;
  /** The current user's existing vote on this review, or null. Server provides. */
  myVote?: Vote;
  /**
   * Review author's user id. When provided + matches the current viewer,
   * the vote + report controls hide (you can't vote on or report your
   * own review). When omitted, controls always render.
   */
  authorId?: string;
}

/**
 * Shared footer for review cards across all 9 detail pages.
 *
 *   [👍 N] [│] [👎 N]                              αναφορά
 *
 * Counts pulled from `reviews.vote_up / vote_down` (kept current by the
 * `trg_sync_review_votes` Postgres trigger). Per-user vote state comes from
 * `review_votes` and is passed in via `myVote` so the active thumb is
 * highlighted. Optimistic updates inside the hook.
 */
export function ReviewCardFooter({ reviewId, likes, dislikes, myVote = null, authorId }: ReviewCardFooterProps) {
  const viewerId = useAuthStore((s) => s.supabaseUser?.id ?? null);
  const isOwnReview = !!viewerId && !!authorId && viewerId === authorId;

  const { myVote: vote, voteUp, voteDown, toggleUp, toggleDown, busy } = useReviewVote(reviewId, {
    myVote,
    voteUp: likes,
    voteDown: dislikes,
  });

  // Author viewing their own review — show vote counts as a static display
  // (so the totals are still visible) but no clickable thumbs and no report.
  if (isOwnReview) {
    return (
      <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <ThumbUpIcon filled={false} />
            {likes}
          </span>
          <span className="w-px h-5 bg-zinc-300" />
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <ThumbDownIcon filled={false} />
            {dislikes}
          </span>
        </div>
        <span className="text-[12px] font-medium text-zinc-400">η αξιολόγησή σου</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleUp}
          disabled={busy}
          className={`flex items-center gap-1.5 transition-opacity active:opacity-70 disabled:opacity-50 ${
            vote === 1 ? "text-coral-600" : "text-zinc-700"
          }`}
          aria-label="Like"
          aria-pressed={vote === 1}
        >
          <ThumbUpIcon filled={vote === 1} />
          <span className="text-[13px] font-semibold">{voteUp}</span>
        </button>
        <span className="w-px h-5 bg-zinc-300" />
        <button
          type="button"
          onClick={toggleDown}
          disabled={busy}
          className={`flex items-center gap-1.5 transition-opacity active:opacity-70 disabled:opacity-50 ${
            vote === -1 ? "text-coral-600" : "text-zinc-700"
          }`}
          aria-label="Dislike"
          aria-pressed={vote === -1}
        >
          <ThumbDownIcon filled={vote === -1} />
          <span className="text-[13px] font-semibold">{voteDown}</span>
        </button>
      </div>
      <ReportLink targetType="review" targetId={reviewId} />
    </div>
  );
}

function ThumbUpIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

function ThumbDownIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
    </svg>
  );
}
