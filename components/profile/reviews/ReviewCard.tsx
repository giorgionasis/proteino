"use client";

import { useState } from "react";

/* ── Icons ────────────────────────────────────────────────────── */

function StarsFilled({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} αστέρια`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="14" viewBox="0 0 13 12" fill="none" aria-hidden>
          <path
            d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
            fill={i < count ? "#27272A" : "#D4D4D8"}
          />
        </svg>
      ))}
    </div>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" stroke="#3F3F46" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10Z" stroke="#3F3F46" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M11.333 2a1.885 1.885 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2Z" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.333 3.667l2 2" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden>
      <path d="M1 3.5h10M4 3.5V2h4v1.5M4.5 5.5v5M7.5 5.5v5M2 3.5l.5 7.5a1 1 0 001 1h5a1 1 0 001-1L10 3.5H2z" stroke="#3F3F46" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Types ────────────────────────────────────────────────────── */

export interface ReviewCardProps {
  id: string;
  itemTitle: string;
  starCount: number;
  date: string;
  likeCount: number;
  dislikeCount: number;
  reviewText: string;
}

/* ── Main component ───────────────────────────────────────────── */

export function ReviewCard({ itemTitle, starCount, date, likeCount, dislikeCount, reviewText }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const TRUNCATE_CHARS = 200;
  const isTruncatable = reviewText.length > TRUNCATE_CHARS;
  const displayText = expanded || !isTruncatable ? reviewText : reviewText.slice(0, TRUNCATE_CHARS) + "…";

  return (
    <div className="flex flex-col gap-4" style={{ width: 342 }}>
      {/* Top row: stars + dot + date (left) | voting pill (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StarsFilled count={starCount} />
          <span className="w-1 h-1 rounded-full bg-[#71717A]" />
          <span className="text-sm font-medium text-[#52525B]">{date}</span>
        </div>

        {/* Voting pill */}
        <div
          className="flex items-center gap-3"
          style={{ border: "1px solid #E4E4E7", borderRadius: 50, paddingLeft: 12, paddingRight: 4 }}
        >
          {/* Likes */}
          <div className="flex items-center" style={{ gap: -4 }}>
            <div className="flex items-center justify-center" style={{ height: 32 }}>
              <span className="text-[13px] font-semibold text-[#3F3F46]">{likeCount}</span>
            </div>
            <div className="flex items-center pb-1.5" style={{ height: 32 }}>
              <ThumbUpIcon />
            </div>
          </div>
          {/* Divider */}
          <div className="w-px bg-[#E4E4E7]" style={{ height: 28 }} />
          {/* Dislikes */}
          <div className="flex items-center" style={{ gap: -4 }}>
            <div className="flex items-center justify-center" style={{ height: 32 }}>
              <span className="text-[13px] font-semibold text-[#3F3F46]">{dislikeCount}</span>
            </div>
            <div className="flex items-center pt-1.5" style={{ height: 32 }}>
              <ThumbDownIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-5">
        {/* Item title */}
        <p className="text-[18px] font-bold text-[#27272A]">{itemTitle}</p>

        {/* Review text + expand */}
        <div className="flex flex-col gap-4">
          <p className="text-base font-normal text-[#27272A] leading-[150%]">{displayText}</p>
          {isTruncatable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="self-start flex flex-col items-start active:opacity-70 transition-opacity"
            >
              <span className="text-sm font-bold text-[#27272A] leading-[140%]">
                {expanded ? "Λιγότερα" : "Περισσότερα"}
              </span>
              <span className="block h-px bg-[#27272A]" style={{ width: expanded ? 66 : 88 }} />
            </button>
          )}
        </div>
      </div>

      {/* Footer: edit + delete */}
      <div className="flex items-center">
        <button
          className="flex items-center gap-1.5 active:opacity-70 transition-opacity rounded-[8px]"
          style={{ backgroundColor: "#F4F4F5", width: 161, padding: "15px 20px" }}
        >
          <EditIcon />
          <span className="text-base font-semibold text-[#3F3F46]">επεξεργασία</span>
        </button>
        <button
          className="flex items-center justify-center gap-2 active:opacity-70 transition-opacity rounded-[8px]"
          style={{ backgroundColor: "#FFF2F1", width: 161, height: 48 }}
        >
          <TrashIcon />
          <span className="text-base font-semibold text-[#3F3F46]">διαγραφή</span>
        </button>
      </div>
    </div>
  );
}
