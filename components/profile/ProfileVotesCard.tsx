import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface Props {
  /** Total positive (vote_up) count across the user's reviews/suggestions. */
  votes:   number;
  /** Where the "Δες όλες" link goes. */
  href:    string;
  /** Optional tooltip handler when info icon is tapped. */
  onInfo?: () => void;
}

/**
 * Profile votes summary card — "Θετικές ψήφοι" — shown in the
 * horizontal stats scroller on a user's profile.
 *
 *  ┌──────────────────────────────┐
 *  │ Θετικές ψήφοι ⓘ              │
 *  │                              │
 *  │ 27   👍                      │
 *  │                              │
 *  │ Δες όλες τις αξιολογήσεις    │
 *  └──────────────────────────────┘
 */
export function ProfileVotesCard({ votes, href, onInfo }: Props) {
  return (
    <div
      className="shrink-0 flex flex-col gap-5 rounded-lg border border-zinc-300 bg-white"
      style={{ padding: "24px 20px", minWidth: 260 }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[20px] font-bold text-zinc-800 leading-[130%]">
          Θετικές ψήφοι
        </span>
        <button
          type="button"
          onClick={onInfo}
          className="shrink-0 active:opacity-60 transition-opacity"
          aria-label="Τι σημαίνει αυτό"
        >
          <InfoIcon />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[40px] font-extrabold text-zinc-800 leading-none tracking-tight">
          {votes}
        </span>
        <Icon name="profile-thumb-up" width={32} height={28} alt="" />
      </div>

      <Link
        href={href}
        className="text-[14px] font-semibold text-zinc-700 underline underline-offset-2 active:opacity-60 transition-opacity"
      >
        Δες όλες τις αξιολογήσεις
      </Link>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#A1A1AA" strokeWidth="1.4" />
      <path d="M8 7.2v4" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.8" fill="#A1A1AA" />
    </svg>
  );
}
