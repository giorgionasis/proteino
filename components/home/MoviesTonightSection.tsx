/**
 * "Απόψε στην TV" home section.
 *
 * Renders today's curated movie airings as horizontal-scroll cards.
 * Returns null when there are no airings — never an empty section.
 */

import Link from "next/link";
import { formatAirTime, type TonightAiring } from "@/lib/movies-tonight";

export function MoviesTonightSection({ airings }: { airings: TonightAiring[] }) {
  if (airings.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2 px-6">
        <h2 className="text-[18px] font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Απόψε στην TV
        </h2>
        <span className="text-xs font-medium text-zinc-400">
          {airings.length} {airings.length === 1 ? "ταινία" : "ταινίες"}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-2">
        {airings.map((a) => (
          <Link
            key={a.id}
            href={`/movies/${a.movie.slug}`}
            className="flex-none w-[150px] active:opacity-80 transition-opacity"
          >
            <div className="aspect-[2/3] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden mb-2 relative">
              {a.movie.cover_url ? (
                <img
                  src={a.movie.cover_url}
                  alt={a.movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                </div>
              )}
              {/* Time + channel badge */}
              <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900/85 backdrop-blur text-white text-[10px] font-bold tabular-nums">
                {formatAirTime(a.air_time)}
              </div>
            </div>

            <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight">
              {a.movie.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
              <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 font-bold text-zinc-700">
                {a.channel}
              </span>
              {a.movie.avg_rating > 0 && (
                <span className="inline-flex items-center gap-0.5 text-amber-600">
                  ★ {a.movie.avg_rating.toFixed(1)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
