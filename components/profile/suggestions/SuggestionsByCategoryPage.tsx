"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OwnSuggestionCard } from "./OwnSuggestionCard";

/* ── Sort options ─────────────────────────────────────────────── */

type SortKey = "recent" | "popular" | "high" | "low";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent",  label: "Πιο Πρόσφατες" },
  { key: "popular", label: "Πιο Δημοφιλή" },
  { key: "high",    label: "Υψηλ. Βαθμολ." },
  { key: "low",     label: "Χαμ. Βαθμολ." },
];

/* ── Mock data ────────────────────────────────────────────────── */

const MOCK_SUGGESTIONS = [
  {
    id: "1",
    imageSrc: "/figma-assets/profile/food-3.png",
    title: "Sense",
    rating: 4.85,
    reviewCount: 24,
    isTopRated: true,
    isProcessing: true,
  },
  {
    id: "2",
    imageSrc: "/figma-assets/profile/food-3.png",
    title: "Sense",
    rating: 4.85,
    reviewCount: 24,
    isTopRated: true,
    isProcessing: false,
  },
];

/* ── Main component ───────────────────────────────────────────── */

interface Props {
  handle: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  vivlia:   "Βιβλία",
  tainies:  "Ταινίες",
  fagito:   "Φαγητό",
  syntages: "Συνταγές",
};

export function SuggestionsByCategoryPage({ handle, category }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("recent");

  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const count = MOCK_SUGGESTIONS.length;

  return (
    <div className="bg-white min-h-screen">
      {/* Page sub-header (back + title) */}
      <div
        className="sticky top-0 z-20 bg-white flex items-center h-14 border-b border-zinc-200"
        style={{ paddingLeft: 12 }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Πίσω"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="flex-1 text-center text-base font-bold text-[#3F3F46] pr-11">
          Οι προτάσεις μου
        </p>
      </div>

      <div className="flex flex-col gap-8 pb-10">
        {/* Stats pill */}
        <div className="mx-6 mt-6">
          <div
            className="flex items-center gap-2.5 rounded-[8px] px-4 py-4"
            style={{ backgroundColor: "#F2F2F7" }}
          >
            <span
              className="font-bold text-[#27272A] leading-none"
              style={{ fontSize: 52, lineHeight: "37px" }}
            >
              {count}
            </span>
            <span className="text-base text-[#3F3F46] leading-snug" style={{ fontWeight: 500 }}>
              προτάσεις σε <strong className="font-bold">{categoryLabel}</strong>
            </span>
          </div>
        </div>

        {/* Sort bar */}
        <div className="flex flex-col gap-3">
          <p className="pl-6 text-base font-bold text-[#3F3F46]">Ταξινόμηση ανά</p>
          <div className="overflow-x-auto pl-6 pr-4 no-scrollbar">
            <div className="flex gap-3 w-max">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className="flex items-center justify-center px-5 py-[17px] rounded-full whitespace-nowrap transition-colors"
                  style={
                    sort === key
                      ? { backgroundColor: "#52525B", border: "none" }
                      : { backgroundColor: "#FFFFFF", border: "1px solid #D4D4D8" }
                  }
                >
                  <span
                    className="text-base leading-[19.5px]"
                    style={{
                      fontWeight: sort === key ? 700 : 600,
                      color: sort === key ? "#FAFAFA" : "#3F3F46",
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion cards */}
        <div className="flex flex-col gap-12 px-6">
          {MOCK_SUGGESTIONS.map((s) => (
            <OwnSuggestionCard key={s.id} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
