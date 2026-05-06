import { Icon } from "@/components/ui/Icon";

export type RatingBrand = "google" | "booking";

interface RatingCardProps {
  brand: RatingBrand;
  /** Score as a string so we can preserve "9.9" vs "5" formatting verbatim. */
  score: string;
  /** Scale suffix shown after the score, e.g. "/5" or "/10". */
  scale?: string;
  /** Optional review count — rendered as "188 κριτικές" / "91 κρ." */
  count?: number | null;
  /** When set, the card becomes a clickable link with arrow chip top-right. */
  href?: string;
}

const BRANDS: Record<RatingBrand, { label: string; icon: "google-pin" | "booking"; countSuffix: string }> = {
  google: { label: "Google", icon: "google-pin", countSuffix: "κριτικές" },
  booking: { label: "Booking", icon: "booking", countSuffix: "κρ." },
};

/**
 * External rating card (Google or Booking) shown side-by-side on hotels.
 *
 * Layout:
 *   [icon] Brand name              [↗ chip]
 *   9.9/10                           188 κριτικές
 */
export function RatingCard({ brand, score, scale, count, href }: RatingCardProps) {
  const meta = BRANDS[brand];
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name={meta.icon} size={20} />
          <span className="text-[15px] font-semibold text-zinc-800">{meta.label}</span>
        </div>
        {href && (
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0" aria-hidden>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
              <path d="M7 17l10-10M9 7h8v8" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[28px] font-bold text-zinc-900 tabular-nums leading-none">
          {score}
          {scale && <span className="text-[18px] text-zinc-500 font-semibold ml-0.5">{scale}</span>}
        </span>
        {count != null && (
          <span className="text-[12px] font-medium text-zinc-500">
            {count} {meta.countSuffix}
          </span>
        )}
      </div>
    </>
  );

  const className = "rounded-[12px] bg-zinc-100 p-4 flex flex-col";

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} active:bg-zinc-200 transition-colors`}
    >
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
