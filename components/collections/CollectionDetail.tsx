"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { CATEGORIES } from "@/constants/categories";

const PORTRAIT_CATEGORIES = new Set(["movies", "series", "books"]);

export interface CollectionDetailItem {
  id: string;
  title: string;
  cover_url: string | null;
  category: string;
  subtitle: string;
  avg_rating: number;
  rating_count: number;
  href: string;
}

interface Props {
  title: string;
  titleSpecific?: string | null;
  imageUrl?: string | null;
  type: "card" | "carousel";
  sourceCategory?: string | null;
  tags: string[];
  total: number;
  items: CollectionDetailItem[];
}

export function CollectionDetail({
  title,
  titleSpecific,
  imageUrl,
  sourceCategory,
  tags,
  total,
  items,
}: Props) {
  const router = useRouter();
  const isPortrait = !sourceCategory || PORTRAIT_CATEGORIES.has(sourceCategory);
  const sourceLabel = sourceCategory
    ? CATEGORIES.find((c) => c.slug === sourceCategory)?.labelEl ?? sourceCategory
    : null;

  return (
    <div>
      <InnerHeader title="Συλλογή" onBack={() => router.back()} />

      {/* Hero */}
      <section className="px-6 pt-6 pb-4">
        {imageUrl && (
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden mb-4">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="text-[24px] font-bold text-zinc-900 leading-tight">
          {title}
          {titleSpecific && (
            <> <span className="text-zinc-900">{titleSpecific}</span></>
          )}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
          <span>
            <strong className="text-zinc-700">{total}</strong> {total === 1 ? "πρόταση" : "προτάσεις"}
          </span>
          {sourceLabel && (
            <>
              <span className="text-zinc-300">·</span>
              <Link
                href={`/${sourceCategory}`}
                className="text-coral-600 hover:underline"
              >
                {sourceLabel}
              </Link>
            </>
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Grid */}
      <section className="px-6 pb-10">
        {items.length === 0 ? (
          <EmptyState sourceCategory={sourceCategory} />
        ) : isPortrait ? (
          <PortraitGrid items={items} />
        ) : (
          <LandscapeList items={items} />
        )}
      </section>
    </div>
  );
}

/* ── Portrait grid (movies, series, books) ─────────────────── */

function PortraitGrid({ items }: { items: CollectionDetailItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((it) => (
        <Link key={it.id} href={it.href} className="group">
          <div className="aspect-[2/3] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden mb-2">
            {it.cover_url ? (
              <img
                src={it.cover_url}
                alt={it.title}
                className="w-full h-full object-cover group-active:scale-95 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight">{it.title}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
            <span>{it.subtitle}</span>
            {it.avg_rating > 0 && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-amber-600">
                  ★ {it.avg_rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Landscape list (food, bars, hotels, recipes, theater, events) ── */

function LandscapeList({ items }: { items: CollectionDetailItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          className="flex gap-3 p-2 rounded-xl border border-zinc-200 active:bg-zinc-50 transition-colors"
        >
          <div className="w-24 h-24 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
            {it.cover_url ? (
              <img src={it.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-[15px] font-semibold text-zinc-800 leading-tight line-clamp-2">{it.title}</p>
            <p className="text-xs text-zinc-500 mt-1">{it.subtitle}</p>
            {it.avg_rating > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <span className="text-amber-600">★ {it.avg_rating.toFixed(1)}</span>
                {it.rating_count > 0 && (
                  <span className="text-zinc-400">({it.rating_count})</span>
                )}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────── */

function EmptyState({ sourceCategory }: { sourceCategory?: string | null }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-zinc-300 rounded-xl">
      <div className="text-4xl mb-3">📭</div>
      <h3 className="text-base font-semibold text-zinc-800 mb-1">
        Δεν υπάρχουν προτάσεις ακόμη
      </h3>
      <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
        Αυτή η συλλογή είναι κενή προς το παρόν. Δοκίμασε να εξερευνήσεις την κατηγορία.
      </p>
      {sourceCategory && (
        <Link
          href={`/${sourceCategory}`}
          className="inline-block px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
        >
          Εξερεύνηση κατηγορίας
        </Link>
      )}
    </div>
  );
}
