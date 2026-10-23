import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import type { HomeItemRef } from "@/lib/home/personal";

const PORTRAIT = new Set(["movies", "series", "books"]);

/**
 * "Η λίστα σου" — what the member saved for later (bookmarks with status
 * wishlist), so home reflects their own intent. Hidden when empty.
 */
export function MyWishlist({ items, handle }: { items: HomeItemRef[]; handle: string | null }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="px-6 flex items-baseline justify-between">
        <h2 className="text-[13px] font-bold tracking-[0.12em] uppercase text-zinc-800">
          Η λίστα σου <span className="text-zinc-400 font-semibold">· {items.length}</span>
        </h2>
        {handle && (
          <Link href={`/profile/${encodeURIComponent(handle)}/bookmarks`} className="text-[13px] font-semibold text-coral-700">
            Όλη η λίστα
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-3 px-6 pb-1 w-max">
          {items.map((it) => (
            <Link key={it.id} href={it.href} className="w-[112px] flex flex-col gap-2 active:opacity-80 transition-opacity">
              <div className="relative w-[112px] rounded-[8px] overflow-hidden bg-zinc-100" style={{ aspectRatio: PORTRAIT.has(it.category) ? "2 / 3" : "1 / 1" }}>
                <ItemImage images={it.image} fallbackUrl={it.coverUrl} alt={it.title} sizes="112px" className="absolute inset-0 bg-transparent" />
              </div>
              <p className="text-[13px] font-semibold text-zinc-800 leading-tight line-clamp-2">{it.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
