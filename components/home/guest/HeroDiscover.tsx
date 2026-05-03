import Link from "next/link";

const CATEGORY_TILES = [
  { label: "Βιβλία",     href: "/books",   color: "#CE3F0F", border: "#4D1300", x: 24,  y: 0,   w: 150, h: 177, bg: "#7a3520" },
  { label: "Ταινίες",    href: "/movies",  color: "#9747FF", border: "#250055", x: 238, y: 35,  w: 133, h: 137, bg: "#3d1a6e" },
  { label: "Φαγητό",     href: "/food",    color: "#B25A12", border: "#4C2200", x: 56,  y: 214, w: 150, h: 156, bg: "#6b3810" },
  { label: "Σειρές",     href: "/series",  color: "#58328A", border: "#1C0041", x: 290, y: 214, w: 150, h: 175, bg: "#2e1a50" },
  { label: "Συνταγές",   href: "/recipes", color: "#DB2333", border: "#520007", x: 462, y: 16,  w: 160, h: 187, bg: "#8a1420" },
  { label: "Καφέ/Μπαρ", href: "/bars",    color: "#014274", border: "#00213A", x: 510, y: 246, w: 160, h: 126, bg: "#01294a" },
  { label: "Θέατρο",     href: "/theater", color: "#DBA300", border: "#3A2B00", x: 681, y: 36,  w: 200, h: 171, bg: "#7a5c00" },
  { label: "Διαμονή",    href: "/hotels",  color: "#06795E", border: "#002A20", x: 754, y: 208, w: 160, h: 187, bg: "#034a3a" },
  { label: "Εκδηλώσεις", href: "/events",  color: "#25BA00", border: "#082600", x: 938, y: 28,  w: 160, h: 183, bg: "#145e00" },
] as const;

export function HeroDiscover() {
  return (
    <section className="flex flex-col bg-white" style={{ height: 733 }}>
      {/* Staggered category tiles — horizontal scroll */}
      <div className="overflow-x-auto no-scrollbar shrink-0" style={{ height: 406 }}>
        <div className="relative" style={{ width: 1120, height: 406 }}>
          {CATEGORY_TILES.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="absolute overflow-hidden active:opacity-80 transition-opacity"
              style={{
                left: tile.x,
                top: tile.y,
                width: tile.w,
                height: tile.h,
                backgroundColor: tile.bg,
                borderRadius: 8,
              }}
            >
              {/* Label chip at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 px-[10px] py-[14px]"
                style={{
                  backgroundColor: tile.color,
                  borderTop: `1px solid ${tile.border}`,
                  borderRadius: "0 0 8px 8px",
                }}
              >
                <span className="text-white font-bold leading-tight" style={{ fontSize: 19 }}>
                  {tile.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Hero text + bottom bar */}
      <div className="flex-1 flex flex-col justify-between px-6 pt-5 pb-7">
        <div>
          <h1 className="text-[28px] font-extrabold text-zinc-800 leading-[120%]">
            Προτάσεις<br />Πραγματικές
          </h1>
          <p className="text-base font-medium text-zinc-800 leading-[140%] mt-2 w-[305px]">
            Αληθινοί χρήστες μοιράζονται τις θετικές τους προτάσεις μαζί σου
          </p>
        </div>

        {/* Stats + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold text-zinc-800 leading-6">3.185</span>
            <span className="text-base font-semibold text-zinc-700 leading-6">ΠΡΟΤΑΣΕΙΣ</span>
          </div>
          <Link
            href="/food"
            className="flex items-center justify-center bg-zinc-950 text-zinc-50 font-bold text-base rounded-sm active:bg-zinc-800 transition-colors"
            style={{ width: 220, height: 56, boxShadow: "2px 2px 8px 0px rgba(0,0,0,0.25)" }}
          >
            Ανακάλυψέ τες
          </Link>
        </div>
      </div>
    </section>
  );
}
