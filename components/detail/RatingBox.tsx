"use client";

import { useState, type CSSProperties } from "react";

interface DistributionRow {
  stars: number;
  pct: number;
}

interface RatingBoxProps {
  /** Aggregate average — big number at the top. */
  avgRating: number;
  /** 5★ → 1★ distribution. Pass [] to hide the histogram. */
  ratingDistribution: DistributionRow[];
  /** When true, show the gold stars + "Top Rated" copy. */
  isTopRated?: boolean;
  /** Subject noun used in the Top Rated description: "Η ταινία" / "Το βιβλίο" / "Το εστιατόριο". */
  topRatedNoun?: string;

  /** Question prompt above the rating form (e.g. "Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;"). */
  question?: string;
  /** Current user's selected rating in the form (0 = not selected). */
  userRating?: number;
  onChangeRating?: (rating: number) => void;
  /** Current value of the optional reflection textarea. */
  userText?: string;
  onChangeText?: (text: string) => void;
  /** Called when the user clicks save. */
  onSave?: () => void;
  /** Disables the save button + shows "Αποθήκευση…". */
  saving?: boolean;
  /** Server-side saved rating (used to switch button label to "✓ Αποθηκεύτηκε"). */
  savedRating?: number | null;
  /** When set, hides the rating form entirely (e.g. user already has a suggestion shown elsewhere). */
  hideForm?: boolean;
}

/**
 * Detail-page rating block: gradient backdrop, big avg, optional Top Rated
 * copy, 5-bar histogram, and the inline "Rate this item" form (stars +
 * optional reflection textarea + save button) inside a white card.
 *
 * Pure UI — caller owns the state (userRating, userText, save handler).
 * For default usage on a detail page, pair with the `useReview` hook.
 */
export function RatingBox({
  avgRating,
  ratingDistribution,
  isTopRated = false,
  topRatedNoun = "Η πρόταση",
  question = "Με πόσα αστέρια θα βαθμολογούσες;",
  userRating = 0,
  onChangeRating,
  userText = "",
  onChangeText,
  onSave,
  saving = false,
  savedRating = null,
  hideForm = false,
}: RatingBoxProps) {
  const showHistogram = ratingDistribution.some((d) => d.pct > 0);

  return (
    <div
      className="rounded-[16px] py-10 px-6 flex flex-col items-center gap-10"
      style={GRADIENT_BG}
    >
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Gold stars + big avg */}
        <div className="flex flex-col items-center gap-3">
          {isTopRated && <GoldStarsRow />}
          <div className="text-zinc-900 font-bold leading-none" style={{ fontSize: 72 }}>
            {avgRating.toFixed(2)}
          </div>
        </div>

        {/* Top Rated copy */}
        {isTopRated && (
          <div className="flex flex-col items-center gap-2 max-w-[300px]">
            <p className="text-[22px] font-semibold text-zinc-900">Top Rated</p>
            <p className="text-[14px] font-medium text-zinc-600 text-center leading-[150%]">
              {topRatedNoun} ανήκει στο{" "}
              <span className="font-bold text-zinc-900">top 10%</span> των καλύτερων όπως
              βαθμολογήθηκε από τους χρήστες
            </p>
          </div>
        )}

        {/* Histogram — only when we have at least one non-zero bar */}
        {showHistogram && (
          <div className="w-full flex flex-col gap-5 px-2">
            {ratingDistribution.map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-[16px] font-semibold text-zinc-700 w-3 shrink-0 text-right">
                  {stars}
                </span>
                <SmallStar />
                <div
                  className="flex-1 h-[10px] rounded-full bg-white overflow-hidden"
                  style={{ boxShadow: "inset 1px 1px 4px rgba(0,0,0,0.18)" }}
                >
                  <div
                    className="h-full rounded-full bg-zinc-800 transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[16px] font-semibold text-zinc-800 w-10 text-right shrink-0">
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate-this-item form */}
      {!hideForm && (
        <div
          className="w-full rounded-[12px] bg-white flex flex-col items-center gap-6 py-12 px-6"
          style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}
        >
          <p className="text-[18px] font-semibold text-zinc-900 text-center leading-[140%]">
            {question}
          </p>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeRating?.(s)}
                aria-label={`${s} αστέρια`}
                className="active:scale-90 transition-transform"
              >
                <BigStar filled={s <= userRating} />
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <>
              <textarea
                value={userText}
                onChange={(e) => onChangeText?.(e.target.value)}
                placeholder="Γράψε γιατί (προαιρετικό)"
                maxLength={4000}
                rows={3}
                className="w-full rounded-[12px] border border-zinc-300 px-4 py-3 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-coral-600 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={onSave}
                disabled={saving || userRating === savedRating}
                className="w-full h-12 rounded-[12px] bg-zinc-900 text-white text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {saving
                  ? "Αποθήκευση…"
                  : savedRating === userRating
                    ? "✓ Αποθηκεύτηκε"
                    : "Αποθήκευσε αξιολόγηση"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const GRADIENT_BG: CSSProperties = {
  background:
    "linear-gradient(180deg, #FFFFFF 0%, #F2F2F7 12%, #F7F7FA 88%, #FFFFFF 100%)",
};

function GoldStarsRow() {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <svg key={i} width="32" height="30" viewBox="0 0 30 28" fill="none" aria-hidden>
          <path
            d="M15 2L18.5 9.5L26.5 10.5L20.5 16.5L22 24.5L15 21L8 24.5L9.5 16.5L3.5 10.5L11.5 9.5L15 2Z"
            fill="#F8D160"
            stroke="#D4A93C"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

function SmallStar() {
  return (
    <svg width="11" height="11" viewBox="0 0 13 12" fill="#27272A" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" />
    </svg>
  );
}

function BigStar({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="38" height="36" viewBox="0 0 38 36" fill="none" aria-hidden>
      <path
        d="M19 2L23.7 12.5L35 14L26.5 22L28.5 33.5L19 28L9.5 33.5L11.5 22L3 14L14.3 12.5L19 2Z"
        fill={filled ? "#27272A" : "none"}
        stroke="#27272A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
