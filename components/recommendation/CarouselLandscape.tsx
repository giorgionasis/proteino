import Link from "next/link";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";

/** Slim user shape consumed by the avatar overlay → ProfilePopup. */
export interface LandscapeItemSuggester {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  level?: number;
  suggestion_count?: number;
  avg_quality_score?: number | null;
}

export interface LandscapeItem {
  id: string;
  title: string;
  cover_url?: string | null;
  avg_rating?: number;
  rating_count?: number;
  subtitle?: string;
  location?: string;
  /** Legacy: just the URL — renders a non-interactive overlay. Prefer
   *  `suggester` so the avatar opens the user popup on tap. */
  avatar_url?: string | null;
  /** Original suggester — when present, renders <UserAvatarWithPopup>
   *  in place of the plain avatar overlay so users can drill into the
   *  suggester's profile from any carousel card. */
  suggester?: LandscapeItemSuggester | null;
  is_top_rated?: boolean;
  href: string;
  placeholder_color?: string;
}

interface Props {
  title: string;
  items: LandscapeItem[];
  seeAllHref?: string;
  portrait?: boolean;
}

export function CarouselLandscape({ title, items, seeAllHref, portrait = false }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6">
        <h2 className="text-[16px] font-bold text-[#3F3F46] uppercase tracking-[0.1px]">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-semibold text-coral-600 active:text-coral-700 transition-colors"
          >
            Δες όλα
          </Link>
        )}
      </div>

      {/* Cards */}
      <div className="flex gap-8 overflow-x-auto no-scrollbar pl-6">
        {items.map((item) =>
          portrait ? (
            <PortraitCard key={item.id} item={item} />
          ) : (
            <LandscapeCard key={item.id} item={item} />
          )
        )}
        <div className="flex-none w-6 shrink-0" />
      </div>
    </section>
  );
}

/* ── Landscape card (300×200) ──────────────────────────────── */

function LandscapeCard({ item }: { item: LandscapeItem }) {
  return (
    <Link
      href={item.href}
      className="flex-none w-[300px] pb-1 active:scale-[0.97] active:opacity-90 transition-[transform,opacity] duration-150 ease-out"
    >
      {/* Image */}
      <div
        className="relative w-[300px] h-[200px] overflow-hidden"
        style={{ borderRadius: 8, backgroundColor: item.placeholder_color ?? "#d4d4d8" }}
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {item.is_top_rated && (
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
        {/* Suggester avatar overlay. When `suggester` user data is
         *  attached we render the interactive popup wrapper (tap →
         *  ProfilePopup). UserAvatarWithPopup is a client component and
         *  internally stops click propagation, so the surrounding Link
         *  doesn't fire alongside the popup open. */}
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
            style={{ border: "3px solid #fff", backgroundColor: item.avatar_url ? "transparent" : "#d4d4d8" }}
          >
            {item.avatar_url && (
              <img src={item.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="pt-4 flex flex-col gap-3">
        <p className="text-[18px] font-bold text-[#18181B] leading-none line-clamp-1">
          {item.title}
        </p>
        {(item.subtitle || item.location) && (
          <div className="flex items-center gap-1 text-[16px] font-medium text-[#52525B]">
            {item.subtitle && <span>{item.subtitle}</span>}
            {item.subtitle && item.location && (
              <span className="w-1 h-1 rounded-full bg-[#52525B] shrink-0" />
            )}
            {item.location && <span>{item.location}</span>}
          </div>
        )}
        {item.avg_rating !== undefined && (
          <div className="flex items-center gap-1.5 pb-0.5">
            <Star />
            <span className="text-[16px] font-semibold text-[#27272A]">
              {item.avg_rating.toFixed(2)}
            </span>
            {item.rating_count !== undefined && (
              <span className="text-[16px] font-medium text-[#27272A]">
                ({item.rating_count} αξιολογήσεις)
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Portrait card (160×240) ───────────────────────────────── */

function PortraitCard({ item }: { item: LandscapeItem }) {
  return (
    <Link
      href={item.href}
      className="flex-none w-[160px] pb-1 active:scale-[0.97] active:opacity-90 transition-[transform,opacity] duration-150 ease-out"
    >
      {/* Image — 2:3 */}
      <div
        className="relative w-[160px] h-[240px] overflow-hidden"
        style={{ borderRadius: 8, backgroundColor: item.placeholder_color ?? "#3730a3" }}
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {item.is_top_rated && (
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

      {/* Description */}
      <div className="pt-3 flex flex-col gap-1.5">
        <p className="text-[14px] font-bold text-[#18181B] leading-tight line-clamp-2">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[12px] font-medium text-[#52525B] line-clamp-1">{item.subtitle}</p>
        )}
        {item.avg_rating !== undefined && (
          <div className="flex items-center gap-1 pb-0.5">
            <Star size={10} />
            <span className="text-[12px] font-semibold text-[#27272A]">
              {item.avg_rating.toFixed(1)}
            </span>
            {item.rating_count !== undefined && item.rating_count > 0 && (
              <span className="text-[11px] font-medium text-zinc-500">
                ({item.rating_count})
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Icon ──────────────────────────────────────────────────── */

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
