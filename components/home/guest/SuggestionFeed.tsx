"use client";

import { useState } from "react";
import Link from "next/link";

export interface SuggestionFeedItem {
  id: string;
  title: string;
  subtitle: string;
  location?: string;
  avg_rating: number;
  rating_count: number;
  is_top_rated?: boolean;
  cover_url?: string | null;
  href: string;
  category: string;
}

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
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="flex flex-col items-center gap-4 px-4"
              >
                <div className="w-[65px] h-[65px] rounded-full bg-zinc-200 overflow-hidden" />
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
        {filtered.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="block active:opacity-80 transition-opacity"
          >
            {/* Image */}
            <div
              className="relative w-full overflow-hidden bg-zinc-200"
              style={{ height: 228, borderRadius: 12 }}
            >
              {card.cover_url && (
                <img
                  src={card.cover_url}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {card.is_top_rated && (
                <span className="absolute top-4 left-4 bg-[#EDEDED] border border-white rounded-full px-2.5 py-[7px] text-sm font-medium text-zinc-800 shadow-[4px_4px_9px_-4px_rgba(0,0,0,0.25)] leading-none">
                  Top rated
                </span>
              )}
              <div className="absolute bottom-4 left-4 w-[50px] h-[50px] rounded-full border-[3px] border-white bg-zinc-300" />
            </div>

            {/* Description */}
            <div className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[18px] font-bold text-zinc-950 leading-none">{card.title}</p>
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
              <div className="flex items-center gap-1.5">
                <StarIcon />
                <span className="text-base font-semibold text-zinc-800">
                  {card.avg_rating.toFixed(2)}
                </span>
                <span className="text-base font-medium text-zinc-800">
                  ({card.rating_count} αξιολογήσεις)
                </span>
              </div>
            </div>
          </Link>
        ))}
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
