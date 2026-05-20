import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/category-images";

interface Tile {
  slug:  string;
  label: string;
  href:  string;
  bg:    string;
}

/** Background colour per category, used when no category image is
 *  available. Indexed by slug — falls back to a neutral zinc tone. */
const TILE_BG: Record<string, string> = {
  books:   "#7a3520",
  movies:  "#3d1a6e",
  food:    "#6b3810",
  recipes: "#8a1420",
  series:  "#2e1a50",
  bars:    "#01294a",
  hotels:  "#034a3a",
  theater: "#7a5c00",
  events:  "#145e00",
};

const DEFAULT_ROWS: Tile[][] = [
  [
    { slug: "books",   label: "ΒΙΒΛΙΑ",     href: "/books",   bg: TILE_BG.books },
    { slug: "movies",  label: "ΤΑΙΝΙΕΣ",    href: "/movies",  bg: TILE_BG.movies },
    { slug: "food",    label: "ΦΑΓΗΤΟ",     href: "/food",    bg: TILE_BG.food },
  ],
  [
    { slug: "recipes", label: "ΣΥΝΤΑΓΕΣ",   href: "/recipes", bg: TILE_BG.recipes },
    { slug: "series",  label: "ΣΕΙΡΕΣ",     href: "/series",  bg: TILE_BG.series },
    { slug: "bars",    label: "ΚΑΦΕ/ΜΠΑΡ", href: "/bars",    bg: TILE_BG.bars },
  ],
  [
    { slug: "hotels",  label: "ΔΙΑΜΟΝΗ",    href: "/hotels",  bg: TILE_BG.hotels },
    { slug: "theater", label: "ΘΕΑΤΡΟ",     href: "/theater", bg: TILE_BG.theater },
    { slug: "events",  label: "ΕΚΔΗΛΩΣΕΙΣ", href: "/events",  bg: TILE_BG.events },
  ],
];

/** Optional payload from the admin-editable resolver (`lib/categories-meta.ts`).
 *  When passed, drives both the order and the labels — `isNavPublished=false`
 *  rows are filtered out by the caller. When omitted (e.g. showcase), the
 *  legacy hardcoded ROWS are used. */
export interface CategoryTilesPropsItem {
  slug:           string;
  labelEl:        string;
  isNavPublished: boolean;
}

export function CategoryTiles({ categories }: { categories?: CategoryTilesPropsItem[] }) {
  const rows: Tile[][] = (() => {
    if (!categories || categories.length === 0) return DEFAULT_ROWS;
    const visible = categories.filter((c) => c.isNavPublished);
    const tiles: Tile[] = visible.map((c) => ({
      slug:  c.slug,
      label: c.labelEl.toUpperCase(),
      href:  `/${c.slug}`,
      bg:    TILE_BG[c.slug] ?? "#27272a",
    }));
    const out: Tile[][] = [];
    for (let i = 0; i < tiles.length; i += 3) out.push(tiles.slice(i, i + 3));
    return out;
  })();

  return (
    <section className="space-y-4 px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Κατηγορίες Προτάσεων
        </h2>
        <div className="h-px w-[150px] bg-zinc-300" />
      </div>

      <div className="space-y-12">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-between">
            {row.map((tile) => {
              const img = categoryImage(tile.slug);
              return (
                <Link
                  key={tile.slug}
                  href={tile.href}
                  className="flex flex-col items-center gap-4 w-[112px] active:opacity-70 transition-opacity"
                >
                  <div
                    className="w-[90px] h-[90px] rounded-full overflow-hidden"
                    style={{ backgroundColor: img ? undefined : tile.bg }}
                  >
                    {img && (
                      <Image
                        src={img}
                        alt=""
                        width={90}
                        height={90}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-base font-bold text-zinc-800 text-center leading-[21.64px]">
                    {tile.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
