"use client";

import Link from "next/link";
import type { CategorySlug } from "@/types";

export interface CategoryItem {
  id:                string;
  slug?:             string;
  title:             string;
  subcategory:       string;
  area?:             string;
  year?:             number;
  avg_rating:        number;
  rating_count:      number;
  cover_url:         string | null;
  delivery?:         string[];
  platform?:         string;
  suggestedBy:       { names: string[]; extra: number };
  isNew?:            boolean;
  placeholder_color?: string;
  avatar_color?:     string;
  writer?:           string;
  publisher?:        string;
  director?:         string;
  actors?:           string;
  duration_min?:     number;
  level?:            string;
  foodType?:         string;
  hotelType?:        string;
  channel?:          string;
  tags?:             string[];
}

/* ── Category orientation ──────────────────────────────────── */

const PORTRAIT_CATS: CategorySlug[] = ["movies", "series", "books"];

export function isPortraitCategory(category: CategorySlug): boolean {
  return PORTRAIT_CATS.includes(category);
}

/* ── Design tokens ─────────────────────────────────────────── */

const BG: Record<CategorySlug, string> = {
  movies:  "#3730a3",
  series:  "#1e3a8a",
  books:   "#064e3b",
  food:    "#9a3412",
  recipes: "#14532d",
  bars:    "#78350f",
  hotels:  "#0c4a6e",
  theater: "#881337",
  events:  "#4c1d95",
};

const DELIVERY_COLORS: Record<string, string> = {
  efood: "bg-[#f44336]/10 text-[#c62828]",
  Wolt:  "bg-[#009de0]/10 text-[#0077b3]",
  Box:   "bg-zinc-100 text-zinc-600",
};

function Star({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill="#27272A"
      />
    </svg>
  );
}

/* ── Landscape card — food, bars, hotels, theater, events, recipes ── */

function LandscapeCard({ item, category }: { item: CategoryItem; category: CategorySlug }) {
  const meta = [item.subcategory, item.area].filter(Boolean);

  return (
    <Link
      href={`/${category}/${item.slug ?? item.id}`}
      className="block w-full active:opacity-90 transition-opacity"
    >
      {/* Image */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 200, borderRadius: 12, backgroundColor: item.placeholder_color ?? BG[category] }}
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Top rated badge */}
        {item.isNew && (
          <span
            className="absolute top-3 left-3 px-2.5 py-[7px] rounded-full text-[14px] font-medium text-zinc-800 leading-none"
            style={{
              backgroundColor: "#EDEDED",
              border: "1px solid #fff",
              boxShadow: "4px 4px 9px -4px rgba(0,0,0,0.25)",
            }}
          >
            Top rated
          </span>
        )}

        {/* Suggester avatar ring */}
        <div
          className="absolute bottom-3 left-3 w-[50px] h-[50px] rounded-full"
          style={{ border: "3px solid #fff", backgroundColor: item.avatar_color ?? "#d4d4d8" }}
        />
      </div>

      {/* Info */}
      <div className="pt-4 flex flex-col gap-3">
        <p className="text-[18px] font-bold text-[#18181B] leading-none line-clamp-1">
          {item.title}
        </p>

        {meta.length > 0 && (
          <div className="flex items-center gap-1 text-[16px] font-medium text-[#52525B]">
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-1">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-[#52525B] shrink-0" />}
                {m}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 pb-0.5">
          <Star />
          <span className="text-[16px] font-semibold text-[#27272A]">
            {item.avg_rating.toFixed(2)}
          </span>
          <span className="text-[16px] font-medium text-[#27272A]">
            ({item.rating_count} αξιολογήσεις)
          </span>
        </div>

        {/* Delivery chips — food only */}
        {item.delivery && item.delivery.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {item.delivery.map((d) => (
              <span
                key={d}
                className={`px-2.5 py-1 rounded-sm text-[12px] font-semibold ${DELIVERY_COLORS[d] ?? "bg-zinc-100 text-zinc-600"}`}
              >
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Portrait card — movies, series, books ─────────────────── */

function PortraitCard({ item, category }: { item: CategoryItem; category: CategorySlug }) {
  const meta = [item.subcategory, item.year].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/${category}/${item.slug ?? item.id}`}
      className="block active:opacity-80 transition-opacity"
    >
      {/* Image — 2:3 aspect ratio */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "2/3",
          borderRadius: 8,
          backgroundColor: item.placeholder_color ?? BG[category],
        }}
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {item.isNew && (
          <span
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-[11px] font-medium text-zinc-800 leading-none"
            style={{
              backgroundColor: "#EDEDED",
              border: "1px solid #fff",
              boxShadow: "4px 4px 9px -4px rgba(0,0,0,0.25)",
            }}
          >
            Top rated
          </span>
        )}
      </div>

      {/* Info */}
      <div className="pt-3 flex flex-col gap-1.5">
        <p className="text-[14px] font-bold text-[#18181B] leading-tight line-clamp-2">
          {item.title}
        </p>
        {meta && (
          <p className="text-[12px] font-medium text-[#52525B] line-clamp-1">{meta}</p>
        )}
        <div className="flex items-center gap-1 pb-0.5">
          <Star size={10} />
          <span className="text-[12px] font-semibold text-[#27272A]">
            {item.avg_rating.toFixed(1)}
          </span>
          {item.rating_count > 0 && (
            <span className="text-[11px] font-medium text-zinc-500">
              ({item.rating_count})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Public API ────────────────────────────────────────────── */

interface CategoryCardProps {
  item:       CategoryItem;
  category:   CategorySlug;
  className?: string;
}

export function CategoryCard({ item, category, className }: CategoryCardProps) {
  const Card = isPortraitCategory(category) ? PortraitCard : LandscapeCard;
  return (
    <div className={className}>
      <Card item={item} category={category} />
    </div>
  );
}
