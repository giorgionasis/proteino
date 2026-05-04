/**
 * Renders a hydrated collection in its appropriate visual format.
 *
 * - Carousel collections → CarouselPortrait (movies/series/books) or CarouselLandscape
 * - Card collections     → CollectionCard (compact pill linking to a filtered list)
 *
 * Empty collections are filtered upstream in lib/collections.ts; this component
 * doesn't render anything for an empty list.
 */

import Link from "next/link";
import { CarouselLandscape } from "./CarouselLandscape";
import { CarouselPortrait } from "./CarouselPortrait";
import {
  isPortraitCollection,
  toLandscapeItem,
  toPortraitItem,
  type HydratedCollection,
} from "@/lib/collections";

export function CollectionRenderer({ data }: { data: HydratedCollection }) {
  const { collection, items } = data;
  if (items.length === 0) return null;

  if (collection.type === "card") {
    return <CollectionCard data={data} />;
  }

  const seeAll = collection.source_category ? `/${collection.source_category}` : undefined;

  if (isPortraitCollection(collection)) {
    return (
      <CarouselPortrait
        title={collection.title}
        items={items.map(toPortraitItem)}
        seeAllHref={seeAll}
      />
    );
  }

  return (
    <CarouselLandscape
      title={collection.title}
      items={items.map(toLandscapeItem)}
      seeAllHref={seeAll}
    />
  );
}

function CollectionCard({ data }: { data: HydratedCollection }) {
  const { collection, total } = data;
  const href = `/collections/${collection.alias}`;

  return (
    <section className="px-6">
      <Link
        href={href}
        className="flex items-center gap-3 p-4 border border-zinc-200 rounded-2xl bg-white active:bg-zinc-50 transition-colors"
      >
        <div className="w-14 h-14 shrink-0 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
          {collection.image_url ? (
            <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">🎴</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-zinc-700 leading-tight">
            {collection.title}
            {collection.title_specific && (
              <> <strong className="text-zinc-900">{collection.title_specific}</strong></>
            )}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {total} {total === 1 ? "πρόταση" : "προτάσεις"}
          </p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </section>
  );
}
