import Link from "next/link";
import type { ReactNode } from "react";

interface RatingInfo {
  score: number;
  count: number;
}

export interface SuggestionCardLandscapeProps {
  /** 16:9 image. */
  imageUrl: string | null;
  href: string;
  title: string;
  /** Optional pre-line above the title — recipe chef byline ("👨 του Πετρετζίκη"). */
  byline?: ReactNode;
  /** Greyed secondary line below the title. */
  subtitle?: string;
  rating?: RatingInfo;
  /** When true, shows the "Top rated" pill at the top-left of the image. */
  topRated?: boolean;
  /** Suggester avatar overlapping the bottom-left of the image (white border). */
  suggesterAvatarUrl?: string | null;
  /** Card width. Defaults to 320 (carousel size). */
  width?: number;
}

/**
 * Landscape suggestion card (16:9) — used for food, bars, hotels, recipes,
 * theater, events.
 *
 * Image area can carry:
 *   - Top-left: "Top rated" pill
 *   - Bottom-left: suggester avatar (overlaps the image edge)
 *
 * Below image:
 *   [optional byline (chef avatar + name for recipe)]
 *   <bold title>
 *   <optional subtitle ("Cuisine • Area")>
 *   ★score (count αξιολογήσεις)
 */
export function SuggestionCardLandscape({
  imageUrl,
  href,
  title,
  byline,
  subtitle,
  rating,
  topRated = false,
  suggesterAvatarUrl,
  width = 320,
}: SuggestionCardLandscapeProps) {
  const hasOverlay = topRated || suggesterAvatarUrl;
  return (
    <Link href={href} className="block shrink-0 active:opacity-90 transition-opacity" style={{ width }}>
      <div
        className="relative w-full rounded-[12px] overflow-hidden bg-zinc-200"
        style={{ aspectRatio: "16 / 10" }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        {hasOverlay && (
          <>
            {topRated && (
              <span className="absolute top-3 left-3 inline-flex items-center px-3 h-7 rounded-full bg-white text-[12px] font-semibold text-zinc-800 shadow-sm">
                Top rated
              </span>
            )}
            {suggesterAvatarUrl && (
              <span
                className="absolute bottom-3 left-3 w-14 h-14 rounded-full overflow-hidden bg-zinc-300 border-[3px] border-white shadow"
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={suggesterAvatarUrl} alt="" className="w-full h-full object-cover" />
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {byline && <div className="leading-none">{byline}</div>}
        <p className="text-[18px] font-bold text-zinc-900 leading-tight line-clamp-2">{title}</p>
        {subtitle && <p className="text-[14px] font-medium text-zinc-500 leading-snug">{subtitle}</p>}
        {rating && <RatingLine {...rating} />}
      </div>
    </Link>
  );
}

function RatingLine({ score, count }: RatingInfo) {
  return (
    <div className="flex items-baseline gap-1.5 text-[14px] text-zinc-700">
      <span className="text-zinc-900 leading-none">★</span>
      <span className="font-semibold text-zinc-900 leading-none">{score.toFixed(2)}</span>
      <span className="text-zinc-500 leading-none">({count} αξιολογήσεις)</span>
    </div>
  );
}
