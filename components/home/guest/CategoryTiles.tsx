import Link from "next/link";

const ROWS = [
  [
    { label: "ΒΙΒΛΙΑ",     href: "/books",   bg: "#7a3520" },
    { label: "ΤΑΙΝΙΕΣ",    href: "/movies",  bg: "#3d1a6e" },
    { label: "ΦΑΓΗΤΟ",     href: "/food",    bg: "#6b3810" },
  ],
  [
    { label: "ΣΥΝΤΑΓΕΣ",   href: "/recipes", bg: "#8a1420" },
    { label: "ΣΕΙΡΕΣ",     href: "/series",  bg: "#2e1a50" },
    { label: "ΚΑΦΕ/ΜΠΑΡ", href: "/bars",    bg: "#01294a" },
  ],
  [
    { label: "ΔΙΑΜΟΝΗ",    href: "/hotels",  bg: "#034a3a" },
    { label: "ΘΕΑΤΡΟ",     href: "/theater", bg: "#7a5c00" },
    { label: "ΕΚΔΗΛΩΣΕΙΣ", href: "/events",  bg: "#145e00" },
  ],
] as const;

export function CategoryTiles() {
  return (
    <section className="space-y-4 px-6">
      {/* Section header */}
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Κατηγορίες Προτάσεων
        </h2>
        <div className="h-px w-[150px] bg-zinc-300" />
      </div>

      {/* 3×3 grid */}
      <div className="space-y-12">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-between">
            {row.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="flex flex-col items-center gap-4 w-[112px] active:opacity-70 transition-opacity"
              >
                {/* Circular image cluster */}
                <div
                  className="w-[90px] h-[90px] rounded-full overflow-hidden"
                  style={{ backgroundColor: tile.bg }}
                />
                {/* Label */}
                <span className="text-base font-bold text-zinc-800 text-center leading-[21.64px]">
                  {tile.label}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
