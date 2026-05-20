"use client";

import Link from "next/link";
import type { CategorySlug } from "@/types";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";

export interface CategoryItem {
  id:                string;
  slug?:             string;
  title:             string;
  subcategory:       string;
  area?:             string;
  /** Sub-region ID (uuid) from regions table — used by region-picker filter. */
  regionId?:         string;
  /** Geocoded lat/lng — used by map view. */
  lat?:              number;
  lng?:              number;
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
  /** Food only — the cuisine label (Ελληνική, Ιταλική, …). Surfaced as
   *  a bottom-sheet multi-select filter; the tabs themselves render
   *  `subcategory` which now holds establishment type (ταβέρνα, …). */
  cuisine?:          string;
  hotelType?:        string;
  channel?:          string;
  tags?:             string[];
  /** Series only — populated from `item_series.end_date`. Truthy
   *  value means the show finished its run, which drives the
   *  `characteristics.completed` filter. */
  endDate?:          string | null;
  /** Series only — drives `characteristics.single_season` filter. */
  seasons?:          number;
  /** Recipes only — normalized dietary flags from `nutrition` jsonb:
   *  any of "vegan" / "no_milk" / "no_sugar". Drives the `diet` filter. */
  diet?:             string[];
  /** Recipes only — drives the `origin` filter (a single string
   *  like "Ελληνική" / "Ιταλική"). */
  origin?:           string;
  /** Theater + events — array of ISO date strings extracted from
   *  the category extension's `dates` jsonb. Drives the `when`
   *  filter (this_week / this_month). */
  dates?:            string[];
  /** Hotels only — raw price band from `item_hotels.price_range`,
   *  matched literally by the `price` filter. */
  priceRange?:       string;
  /** Movies + series — truthy when `item_*.awards` jsonb has any
   *  content. Drives the `awards` filter, which currently filters
   *  to "has any award on record" rather than matching against the
   *  free-form taxonomy. */
  hasAwards?:        boolean;
  /** Original suggester — populates the avatar overlay on landscape
   *  cards and (when tapped) opens ProfilePopup. Optional because not
   *  every item has a suggestion attached. */
  suggester?:        {
    id:               string;
    handle:           string;
    display_name:     string;
    avatar_url?:      string | null;
    level?:           number;
    suggestion_count?:number;
    avg_quality_score?:number | null;
  } | null;
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
      className="block w-full active:scale-[0.98] active:opacity-95 transition-[transform,opacity] duration-150 ease-out"
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

        {/* Suggester avatar — interactive when we have user data
         *  (UserAvatarWithPopup renders avatar / initials and opens
         *  the profile popup on tap, with click propagation stopped
         *  so the surrounding card Link doesn't fire). Falls back to
         *  a colored ring when no suggester is attached to the item. */}
        {item.suggester ? (
          <div
            className="absolute bottom-3 left-3 rounded-full"
            style={{ boxShadow: "0 0 0 3px #fff" }}
          >
            <UserAvatarWithPopup user={item.suggester} size={50} />
          </div>
        ) : (
          <div
            className="absolute bottom-3 left-3 w-[50px] h-[50px] rounded-full"
            style={{ border: "3px solid #fff", backgroundColor: item.avatar_color ?? "#d4d4d8" }}
          />
        )}
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
      className="block active:scale-[0.98] active:opacity-90 transition-[transform,opacity] duration-150 ease-out"
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

/* ── Row card — used for category LIST view (1-col across all categories) ── */
/*
 * Portrait categories (movies/series/books) get a small poster left + info
 * right. Landscape categories (food/bars/hotels/theater/events/recipes)
 * keep their full-width landscape layout via LandscapeCard.
 *
 * PortraitCard above is preserved because CarouselPortrait still uses the
 * tall poster format for home/category-page carousels.
 */

function RowCard({ item, category }: { item: CategoryItem; category: CategorySlug }) {
  // Per-category byline + meta line under title.
  const meta: string[] = [];
  if (item.subcategory) meta.push(item.subcategory);
  if (item.year)        meta.push(String(item.year));

  const byline = (() => {
    switch (category) {
      case "movies": return item.director;
      case "series": return item.channel;
      case "books":  return item.writer;
      default:       return undefined;
    }
  })();

  return (
    <Link
      href={`/${category}/${item.slug ?? item.id}`}
      className="flex gap-4 active:scale-[0.98] active:opacity-90 transition-[transform,opacity] duration-150 ease-out"
    >
      {/* Poster — 2:3, fixed 88px wide */}
      <div
        className="shrink-0 w-[88px] h-[132px] rounded-[8px] overflow-hidden relative"
        style={{ backgroundColor: item.placeholder_color ?? BG[category] }}
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
        <h3 className="text-[16px] font-bold text-[#18181B] leading-tight line-clamp-2">
          {item.title}
        </h3>

        {meta.length > 0 && (
          <p className="text-[13px] font-medium text-[#52525B] line-clamp-1">
            {meta.join(" · ")}
          </p>
        )}

        {byline && (
          <p className="text-[13px] font-semibold text-[#3F3F46] line-clamp-1">
            {byline}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <Star size={12} />
          <span className="text-[13px] font-semibold text-[#27272A]">
            {item.avg_rating.toFixed(1)}
          </span>
          {item.rating_count > 0 && (
            <span className="text-[12px] font-medium text-zinc-500">
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
  // The category-page LIST uses LandscapeCard for every category — even
  // movies/series/books. Carousels (CategoryPageShell static_carousel
  // bridge + home page) keep the portrait/landscape branch via
  // isPortraitCategory; only the under-the-filter list standardises on
  // landscape. RowCard kept around for callers that still want it.
  void RowCard;
  return (
    <div className={className}>
      <LandscapeCard item={item} category={category} />
    </div>
  );
}
