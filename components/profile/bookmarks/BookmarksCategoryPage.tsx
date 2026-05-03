"use client";

import { useRouter } from "next/navigation";
import { BookmarkedCard } from "./BookmarkedCard";

/* ── Mock data ────────────────────────────────────────────────── */

const MOCK_BOOKMARKS = [
  {
    id: "1",
    imageSrc: "/figma-assets/profile/book-plasmata.png",
    avatarSrc: "/figma-assets/profile/avatar-kostaspap.png",
    title: "Πλάσματα μιας μέρας",
    rating: 4.74,
    reviewCount: 123,
  },
  {
    id: "2",
    imageSrc: "/figma-assets/profile/book-plasmata-2.png",
    avatarSrc: "/figma-assets/profile/avatar-kostaspap.png",
    title: "Πλάσματα μιας μέρας",
    rating: 4.74,
    reviewCount: 123,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  vivlia:   "Βιβλία",
  tainies:  "Ταινίες",
  fagito:   "Φαγητό",
  syntages: "Συνταγές",
};

/* ── Main component ───────────────────────────────────────────── */

interface Props {
  handle: string;
  category: string;
}

export function BookmarksCategoryPage({ handle, category }: Props) {
  const router = useRouter();
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const count = MOCK_BOOKMARKS.length;

  return (
    <div className="bg-white min-h-screen">
      {/* Page sub-header */}
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
          Τα αγαπημένα μου
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

        {/* Card list */}
        <div className="flex flex-col gap-12 px-6">
          {MOCK_BOOKMARKS.map((b) => (
            <BookmarkedCard key={b.id} {...b} />
          ))}
        </div>
      </div>
    </div>
  );
}
