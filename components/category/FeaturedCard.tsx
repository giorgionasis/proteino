"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CategorySlug } from "@/types";

export interface FeaturedItem {
  id:           string;
  title:        string;
  subcategory:  string;
  area?:        string;
  year?:        number;
  avg_rating:   number;
  cover_url:    string | null;
  badge?:       string;
}

const GRADIENTS: Record<CategorySlug, string> = {
  movies:  "from-indigo-900 via-purple-900 to-zinc-900",
  series:  "from-blue-900 via-indigo-900 to-zinc-900",
  books:   "from-emerald-900 via-teal-900 to-zinc-900",
  food:    "from-orange-800 via-red-900 to-zinc-900",
  recipes: "from-green-800 via-emerald-900 to-zinc-900",
  bars:    "from-amber-900 via-orange-900 to-zinc-900",
  hotels:  "from-sky-900 via-blue-900 to-zinc-900",
  theater: "from-rose-900 via-pink-900 to-zinc-900",
  events:  "from-violet-900 via-purple-900 to-zinc-900",
};

const ICONS: Record<CategorySlug, string> = {
  movies:  "🎬",
  series:  "📺",
  books:   "📚",
  food:    "🍽️",
  recipes: "👨‍🍳",
  bars:    "☕",
  hotels:  "🏨",
  theater: "🎭",
  events:  "🎉",
};

interface FeaturedCardProps {
  item:      FeaturedItem;
  category:  CategorySlug;
  className?: string;
}

export function FeaturedCard({ item, category, className }: FeaturedCardProps) {
  const gradient = GRADIENTS[category];
  const icon     = ICONS[category];
  const badge    = item.badge ?? "ΠΡΟΤΕΙΝΕΤΑΙ";
  const subLine  = [item.subcategory, item.area, item.year].filter(Boolean).join(" · ");

  return (
    <Link href={`/${category}/${item.id}`} className={cn("block mx-4 rounded-card overflow-hidden", className)}>
      {/* Image area */}
      <div className={cn("relative w-full aspect-[16/9] bg-gradient-to-br", gradient)}>
        {/* Placeholder icon */}
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30 select-none">
          {icon}
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
          {/* Badge */}
          <span className="inline-block px-2 py-0.5 rounded-sm bg-coral-600 text-white text-[10px] font-bold tracking-wider uppercase">
            {badge}
          </span>

          {/* Title */}
          <p className="text-white text-lg font-bold leading-tight line-clamp-2">{item.title}</p>

          {/* Sub info + rating */}
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-xs">{subLine}</p>
            <div className="flex items-center gap-1 text-white text-xs font-semibold">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              {item.avg_rating.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
