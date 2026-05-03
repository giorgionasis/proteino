"use client";

import { useOverlay } from "@/hooks/useOverlay";

interface ContributionCTAProps {
  username: string;
}

export function ContributionCTA({ username }: ContributionCTAProps) {
  const { openSuggestion } = useOverlay();

  return (
    <section className="px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Illustration row */}
        <div className="flex items-center gap-3">
          {/* Animated writing icon placeholder */}
          <div className="w-[100px] h-[100px] rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
            <PencilIcon />
          </div>
          {/* User avatar placeholder */}
          <div
            className="w-[100px] h-[100px] rounded-full bg-zinc-300 overflow-hidden shrink-0"
            style={{ boxShadow: "2px 2px 12px -3px rgba(0,0,0,0.25)", border: "1px solid #fff" }}
          />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className="text-[18px] font-semibold text-zinc-700">
            {username},
          </p>
          <h3 className="text-[22px] font-bold text-zinc-800 leading-[130%]">
            Σειρά σου να συνεισφέρεις!
          </h3>
          <p className="text-[18px] text-zinc-800 leading-[130%]">
            Ανακάλυψες κάτι καλό τελευταία;
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={openSuggestion}
          className="w-full rounded-sm bg-zinc-950 text-[22px] font-bold text-zinc-50 py-6 active:bg-zinc-800 transition-colors"
        >
          Προτείνω
        </button>
      </div>
    </section>
  );
}

function PencilIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M28 8L32 12L14 30H10V26L28 8Z"
        stroke="#3F3F46"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 11L29 15"
        stroke="#3F3F46"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
