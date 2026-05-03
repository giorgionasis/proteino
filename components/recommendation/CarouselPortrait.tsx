import Link from "next/link";

export interface PortraitItem {
  id: string;
  title: string;
  cover_url?: string | null;
  genre?: string;
  year?: number;
  seasons?: number;
  platform?: string | null;
  avg_rating?: number;
  href: string;
  placeholder_color?: string;
}

interface Props {
  title: string;
  items: PortraitItem[];
  seeAllHref?: string;
  showLiveIndicator?: boolean;
}

export function CarouselPortrait({ title, items, seeAllHref, showLiveIndicator }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[18px] font-bold text-zinc-700 uppercase tracking-[0.1px]">
            {title}
          </h2>
          {showLiveIndicator && (
            <span className="w-2 h-2 rounded-full bg-coral-600 animate-pulse" />
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-semibold text-coral-600 active:text-coral-700 transition-colors"
          >
            Δες όλα
          </Link>
        )}
      </div>

      <div className="flex gap-6 overflow-x-auto no-scrollbar pl-6">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex-none w-[200px] pb-1 active:opacity-80 transition-opacity"
          >
            {/* Poster */}
            <div
              className="w-[200px] h-[300px] rounded-xs overflow-hidden"
              style={{ backgroundColor: item.placeholder_color ?? "#d4d4d8" }}
            >
              {item.cover_url && (
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Description */}
            <div className="pt-4 space-y-3">
              {(item.platform || item.seasons !== undefined) && (
                <div className="flex items-center gap-2">
                  {item.platform && <PlatformBadge platform={item.platform} />}
                  {item.seasons !== undefined && (
                    <span className="text-sm font-medium text-zinc-500">
                      {item.seasons} Σεζόν
                    </span>
                  )}
                </div>
              )}
              <p className="text-[20px] font-bold text-zinc-950 leading-none line-clamp-1">
                {item.title}
              </p>
              {item.genre && (
                <p className="text-sm text-zinc-600">{item.genre}</p>
              )}
              {item.year && !item.genre && (
                <p className="text-sm text-zinc-600">{item.year}</p>
              )}
            </div>
          </Link>
        ))}
        {/* Right edge padding */}
        <div className="flex-none w-6 shrink-0" />
      </div>
    </section>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const lower = platform.toLowerCase();
  if (lower === "netflix") {
    return (
      <span
        className="font-black text-[11px] tracking-tight leading-none"
        style={{ color: "#E50914" }}
      >
        NETFLIX
      </span>
    );
  }
  if (lower === "hbo") {
    return (
      <span className="font-black text-[11px] text-purple-700 tracking-tight leading-none">
        HBO
      </span>
    );
  }
  if (lower === "apple tv+") {
    return (
      <span className="font-semibold text-[11px] text-zinc-800 tracking-tight leading-none">
        Apple TV+
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-tight">
      {platform}
    </span>
  );
}
