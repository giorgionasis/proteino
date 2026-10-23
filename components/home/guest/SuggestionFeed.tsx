"use client";

import { useState } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import type { CompactMainImage } from "@/lib/item-images";
import { hasRatings, ratingCountLabel } from "@/lib/ratings";
import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/category-images";

export interface SuggestionFeedItem {
  id: string;
  title: string;
  subtitle: string;
  location?: string;
  avg_rating: number;
  rating_count: number;
  is_top_rated?: boolean;
  cover_url?: string | null;
  /** Compact images.main for <ItemImage>. */
  image?: CompactMainImage | null;
  /** First ~120 chars of the recommendation. */
  quote?: string;
  suggester_name?: string;
  href: string;
  category: string;
}

const PORTRAIT = new Set(["movies", "series", "books"]);

const CATEGORIES = [
  { label: "Βιβλία",     key: "books" },
  { label: "Ταινίες",    key: "movies" },
  { label: "Συνταγές",   key: "recipes" },
  { label: "Σειρές",     key: "series" },
  { label: "Φαγητό",     key: "food" },
  { label: "Καφέ/Μπαρ",  key: "bars" },
  { label: "Εκδηλώσεις", key: "events" },
  { label: "Θέατρο",     key: "theater" },
  { label: "Διαμονή",    key: "hotels" },
] as const;

interface Props {
  items: SuggestionFeedItem[];
}

export function SuggestionFeed({ items }: Props) {
  const [activeCategory, setActiveCategory] = useState("books");

  const filtered = items.filter((item) => item.category === activeCategory);

  return (
    <section className="space-y-0">
      {/* Section header */}
      <div className="flex items-center gap-4 px-6 pb-4">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px] shrink-0">
          Νέες Προτάσεις
        </h2>
        <div className="h-px w-[150px] bg-zinc-300" />
      </div>

      {/* Category nav — horizontal scroll */}
      <div className="overflow-x-auto no-scrollbar px-5 pb-6">
        <div className="flex gap-0 min-w-max">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const img = categoryImage(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="flex flex-col items-center gap-4 px-4"
              >
                <div
                  className="w-[65px] h-[65px] rounded-full overflow-hidden transition-all"
                  style={{
                    boxShadow: isActive ? "0 0 0 2.5px #18181b" : undefined,
                    backgroundColor: img ? undefined : "#e4e4e7",
                  }}
                >
                  {img && (
                    <Image
                      src={img}
                      alt=""
                      width={65}
                      height={65}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`text-base font-semibold leading-none ${
                      isActive ? "text-zinc-950" : "text-zinc-600"
                    }`}
                  >
                    {cat.label}
                  </span>
                  {isActive && (
                    <div className="w-full h-0.5 bg-zinc-950 rounded-full" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggestion cards (vertical list) */}
      <div className="px-6 space-y-9">
        {filtered.length === 0 && (
          <p className="text-center text-zinc-400 py-8">
            Δεν υπάρχουν ακόμα προτάσεις σε αυτή την κατηγορία
          </p>
        )}
        {filtered.map((card) =>
          PORTRAIT.has(card.category) ? (
            // Books / movies / series: whole cover + the recommendation.
            // A 228px landscape box used to keep only the middle third of
            // the cover (UX review, session 40).
            <Link key={card.id} href={card.href} className="flex gap-4 active:opacity-80 transition-opacity">
              <div className="shrink-0 w-[96px] h-[144px] rounded-[8px] overflow-hidden relative bg-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
                <ItemImage images={card.image} fallbackUrl={card.cover_url} alt={card.title} sizes="96px" className="absolute inset-0 bg-transparent" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="text-[17px] font-bold text-zinc-950 leading-tight line-clamp-2">{card.title}</p>
                {card.subtitle && <p className="text-[14px] font-medium text-zinc-600 line-clamp-1">{card.subtitle}</p>}
                {card.quote && <p className="text-[14px] italic text-zinc-700 leading-snug line-clamp-3">«{card.quote}»</p>}
                {card.suggester_name && <p className="text-[13px] font-medium text-zinc-500 line-clamp-1">{card.suggester_name}</p>}
                {hasRatings(card.rating_count) && (
                  <div className="flex items-center gap-1.5 mt-auto">
                    <StarIcon />
                    <span className="text-[14px] font-semibold text-zinc-800">{card.avg_rating.toFixed(2)}</span>
                    <span className="text-[14px] font-medium text-zinc-600">({ratingCountLabel(card.rating_count)})</span>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link key={card.id} href={card.href} className="block active:opacity-80 transition-opacity">
              {/* 3:2 at the stored focal point */}
              <div className="relative w-full overflow-hidden bg-zinc-200" style={{ aspectRatio: "3 / 2", borderRadius: 12 }}>
                <ItemImage images={card.image} fallbackUrl={card.cover_url} alt={card.title} sizes="(min-width: 512px) 480px, 100vw" className="absolute inset-0 bg-transparent" />
                {card.is_top_rated && (
                  <span className="absolute top-4 left-4 bg-[#EDEDED] border border-white rounded-full px-2.5 py-[7px] text-sm font-medium text-zinc-800 shadow-[4px_4px_9px_-4px_rgba(0,0,0,0.25)] leading-none">
                    Top rated
                  </span>
                )}
              </div>
              <div className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[18px] font-bold text-zinc-950 leading-tight">{card.title}</p>
                  <div className="flex items-center gap-1 text-base font-medium text-zinc-600">
                    <span>{card.subtitle}</span>
                    {card.location && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                        <span>{card.location}</span>
                      </>
                    )}
                  </div>
                </div>
                {card.quote && <p className="text-[14px] italic text-zinc-700 leading-snug line-clamp-2">«{card.quote}»</p>}
                {hasRatings(card.rating_count) && (
                  <div className="flex items-center gap-1.5">
                    <StarIcon />
                    <span className="text-base font-semibold text-zinc-800">{card.avg_rating.toFixed(2)}</span>
                    <span className="text-base font-medium text-zinc-800">({ratingCountLabel(card.rating_count)})</span>
                  </div>
                )}
              </div>
            </Link>
          ),
        )}
      </div>

      {/* Load more button */}
      {filtered.length > 0 && (
        <div className="px-6 pt-9">
          <Link
            href={`/${activeCategory}`}
            className="w-full flex items-center justify-center gap-2.5 py-[18px] border-[1.5px] border-zinc-600 rounded-full text-base font-semibold text-zinc-700 active:bg-zinc-50 transition-colors"
          >
            Εξερεύνησε περισσότερα
          </Link>
        </div>
      )}
    </section>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill="#FE6F5E"
      />
    </svg>
  );
}
