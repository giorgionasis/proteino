"use client";

import Image from "next/image";
import Link from "next/link";

/* ── Category icon (bookmark-style) ──────────────────────────── */

function CategoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="#27272A" strokeWidth="1.5" />
      <path
        d="M8 7h8v10l-4-3-4 3V7z"
        stroke="#27272A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Data ─────────────────────────────────────────────────────── */

interface Category {
  name: string;
  slug: string;
  count: number;
  images: string[];
  overflow?: number;
}

const CATEGORIES: Category[] = [
  {
    name: "Βιβλία",
    slug: "vivlia",
    count: 10,
    images: [
      "/figma-assets/profile/book-akoi.png",
      "/figma-assets/profile/book-ptisi.png",
      "/figma-assets/profile/book-kapetanmixalis.png",
    ],
    overflow: 4,
  },
  {
    name: "Ταινίες",
    slug: "tainies",
    count: 6,
    images: [
      "/figma-assets/profile/movie-bladerunner.png",
      "/figma-assets/profile/movie-oppenheimer.png",
      "/figma-assets/profile/movie-prestige.png",
    ],
  },
  {
    name: "Φαγητό",
    slug: "fagito",
    count: 3,
    images: [
      "/figma-assets/profile/food-1.png",
      "/figma-assets/profile/food-2.png",
      "/figma-assets/profile/food-3.png",
    ],
  },
  {
    name: "Συνταγές",
    slug: "syntages",
    count: 2,
    images: [
      "/figma-assets/profile/recipe-redvelvet.png",
      "/figma-assets/profile/recipe-carrotcake.png",
    ],
  },
];

const TOTAL = 16;

/* ── Stacked covers ───────────────────────────────────────────── */

function StackedCovers({ images, overflow }: { images: string[]; overflow?: number }) {
  return (
    <div className="flex items-center" style={{ gap: -10 }}>
      {images.map((src, i) => (
        <div
          key={i}
          className="w-[50px] h-[50px] rounded-full overflow-hidden shrink-0"
          style={{
            marginLeft: i === 0 ? 0 : -10,
            border: "2px solid #FFFFFF",
            zIndex: i,
          }}
        >
          <Image src={src} alt="" width={50} height={50} className="w-full h-full object-cover" />
        </div>
      ))}
      {overflow && overflow > 0 && (
        <div
          className="w-[50px] h-[50px] rounded-full shrink-0 flex items-center justify-center"
          style={{
            marginLeft: -10,
            backgroundColor: "#3F3F46",
            border: "2px solid #FFFFFF",
            zIndex: images.length,
          }}
        >
          <span className="text-sm font-semibold text-[#FAFAFA]">+{overflow}</span>
        </div>
      )}
    </div>
  );
}

/* ── Category row ─────────────────────────────────────────────── */

function CategoryRow({ category, handle }: { category: Category; handle: string }) {
  return (
    <Link
      href={`/profile/${handle}/suggestions/${category.slug}`}
      className="flex flex-col gap-5 py-5 px-3 active:bg-zinc-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-5">
          <span className="text-[24px] font-bold text-[#27272A] leading-[130%]">{category.name}</span>
          <span className="text-lg font-semibold text-[#52525B] leading-[130%]">
            {category.count} προτάσεις
          </span>
        </div>
        <CategoryIcon />
      </div>
      <StackedCovers images={category.images} overflow={category.overflow} />
    </Link>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export function SuggestionsCategoryList({ handle }: { handle: string }) {
  return (
    <div className="bg-white">
      {/* Stats pill */}
      <div className="mx-6 mt-6 mb-2">
        <div
          className="flex items-center gap-2.5 rounded-[8px] px-4 py-4"
          style={{ backgroundColor: "#F2F2F7" }}
        >
          <span
            className="font-bold text-[#27272A] leading-none"
            style={{ fontSize: 52, lineHeight: "37px" }}
          >
            {TOTAL}
          </span>
          <span className="text-base text-[#3F3F46] leading-snug" style={{ fontWeight: 500 }}>
            αγαπημένες σε <strong className="font-bold">{CATEGORIES.length} κατηγορίες</strong>
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="mx-6 flex flex-col divide-y divide-[#E4E4E7]">
        {CATEGORIES.map((cat) => (
          <CategoryRow key={cat.slug} category={cat} handle={handle} />
        ))}
      </div>
    </div>
  );
}
