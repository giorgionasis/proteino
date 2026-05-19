import Link from "next/link";
import { isPortraitCategory } from "@/components/category/CategoryCard";
import type { CategorySlug } from "@/types";

/**
 * Shared poster cell for profile lists (suggestions / bookmarks / reviews).
 *
 * Orientation respects the design-system rule from CLAUDE.md §21:
 *   - movies / series / books → portrait (2:3)
 *   - food / bars / hotels / theater / events / recipes → landscape (3:2)
 *
 * Three render modes:
 *   - "thumb"  : compact inline cell next to text (review/suggestions row)
 *   - "hero"   : full-width image on top of a stacked card (venues)
 *   - "tile"   : grid cell at the page's natural width (bookmarks grid)
 */

interface Props {
  category: CategorySlug | string;
  src: string | null;
  alt: string;
  href?: string;
  mode?: "thumb" | "hero" | "tile";
  /** Show category emoji as fallback when src is missing. */
  fallbackIcon?: string;
  /** Optional overlay (status badge, top-rated chip, etc.). */
  overlay?: React.ReactNode;
  className?: string;
}

export function ProfilePoster({
  category,
  src,
  alt,
  href,
  mode = "thumb",
  fallbackIcon,
  overlay,
  className = "",
}: Props) {
  const portrait = isPortraitCategory(category as CategorySlug);

  // mode → tailwind dimensions
  const dims =
    mode === "thumb"
      ? portrait
        ? "w-[76px] h-[114px]"   // 2:3
        : "w-[120px] h-20"       // 3:2
      : mode === "hero"
        ? portrait
          ? "w-full aspect-[2/3]"
          : "w-full aspect-[3/2]"
        : /* tile */ portrait
          ? "w-full aspect-[2/3]"
          : "w-full aspect-[3/2]";

  const rounded = mode === "thumb" ? "rounded-xl" : "rounded-2xl";

  const inner = (
    <div className={`relative ${dims} ${rounded} overflow-hidden bg-zinc-100 ${className}`}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-3xl">
          {fallbackIcon ?? "🖼️"}
        </div>
      )}
      {overlay}
    </div>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      className="block active:opacity-80 transition-opacity"
      aria-label={alt}
    >
      {inner}
    </Link>
  );
}
