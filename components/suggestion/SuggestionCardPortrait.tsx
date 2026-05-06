import Link from "next/link";
import type { ReactNode } from "react";

interface RatingInfo {
  score: number;
  count: number;
}

export interface SuggestionCardPortraitProps {
  /** 2:3 cover image. */
  imageUrl: string | null;
  /** Click target. */
  href: string;
  /** Bold title under the image. */
  title: string;
  /** Optional pre-line above title — e.g. "NETFLIX · 3 Σεζόν" or chef byline.
   *  Pass any JSX so each category can compose its own. */
  header?: ReactNode;
  /** Greyed secondary line below the title — genre / year / "Cuisine • Area". */
  subtitle?: string;
  /** Star score + review count rendered as "★4.74 (123 αξιολογήσεις)". */
  rating?: RatingInfo;
  /** Width of the card. Defaults to 200 (carousel size). */
  width?: number;
  /** When true, shows the "Top rated" pill at the top-left of the image. */
  topRated?: boolean;
}

/**
 * Portrait suggestion card (2:3) — used for movies, series, books.
 *
 * Bottom info area is composed:
 *   [optional header row]
 *   <bold title>
 *   <optional subtitle (genre / year / etc.)>
 *   ★score (count αξιολογήσεις)
 *
 * Each category passes a different `header` and `subtitle` to fit its
 * vocabulary (Series → "NETFLIX 3 Σεζόν"; Movies → no header, genre subtitle;
 * Books → no header, year subtitle).
 */
export function SuggestionCardPortrait({
  imageUrl,
  href,
  title,
  header,
  subtitle,
  rating,
  width = 200,
  topRated = false,
}: SuggestionCardPortraitProps) {
  return (
    <Link href={href} className="block shrink-0 active:opacity-90 transition-opacity" style={{ width }}>
      <div className="relative w-full rounded-[12px] overflow-hidden bg-zinc-200" style={{ aspectRatio: "2 / 3" }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        {topRated && <TopRatedPill />}
      </div>
      <div className="mt-3 space-y-1">
        {header && <div className="leading-none">{header}</div>}
        <p className="text-[16px] font-bold text-zinc-900 leading-tight line-clamp-2">{title}</p>
        {subtitle && <p className="text-[14px] font-medium text-zinc-500 leading-snug">{subtitle}</p>}
        {rating && <RatingLine {...rating} />}
      </div>
    </Link>
  );
}

function TopRatedPill() {
  return (
    <span className="absolute top-3 left-3 inline-flex items-center px-3 h-7 rounded-full bg-white text-[12px] font-semibold text-zinc-800 shadow-sm">
      Top rated
    </span>
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
