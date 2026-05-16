import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/category-images";

const ROWS = [
  [
    { slug: "books",   label: "ΒΙΒΛΙΑ",     href: "/books",   bg: "#7a3520" },
    { slug: "movies",  label: "ΤΑΙΝΙΕΣ",    href: "/movies",  bg: "#3d1a6e" },
    { slug: "food",    label: "ΦΑΓΗΤΟ",     href: "/food",    bg: "#6b3810" },
  ],
  [
    { slug: "recipes", label: "ΣΥΝΤΑΓΕΣ",   href: "/recipes", bg: "#8a1420" },
    { slug: "series",  label: "ΣΕΙΡΕΣ",     href: "/series",  bg: "#2e1a50" },
    { slug: "bars",    label: "ΚΑΦΕ/ΜΠΑΡ", href: "/bars",    bg: "#01294a" },
  ],
  [
    { slug: "hotels",  label: "ΔΙΑΜΟΝΗ",    href: "/hotels",  bg: "#034a3a" },
    { slug: "theater", label: "ΘΕΑΤΡΟ",     href: "/theater", bg: "#7a5c00" },
    { slug: "events",  label: "ΕΚΔΗΛΩΣΕΙΣ", href: "/events",  bg: "#145e00" },
  ],
] as const;

export function CategoryTiles() {
  return (
    <section className="space-y-4 px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Κατηγορίες Προτάσεων
        </h2>
        <div className="h-px w-[150px] bg-zinc-300" />
      </div>

      <div className="space-y-12">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-between">
            {row.map((tile) => {
              const img = categoryImage(tile.slug);
              return (
                <Link
                  key={tile.label}
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
