import Image from "next/image";
import Link from "next/link";

interface HeroDiscoverProps {
  suggestionCount: number;
}

const CATEGORY_TILES = [
  { slug: "books",   label: "Βιβλία",     href: "/books",   image: "/heroes/discover_books.png",   color: "#CE3F0F", border: "#4D1300", x: 24,  y: 0,   w: 160, h: 187 },
  { slug: "movies",  label: "Ταινίες",    href: "/movies",  image: "/heroes/discover_movies.png",  color: "#9747FF", border: "#250055", x: 248, y: 40,  w: 144, h: 148 },
  { slug: "food",    label: "Φαγητό",     href: "/food",    image: "/heroes/discover_food.png",    color: "#B25A12", border: "#4C2200", x: 64,  y: 232, w: 160, h: 168 },
  { slug: "series",  label: "Σειρές",     href: "/series",  image: "/heroes/discover_series.png",  color: "#58328A", border: "#1C0041", x: 304, y: 232, w: 160, h: 188 },
  { slug: "recipes", label: "Συνταγές",   href: "/recipes", image: "/heroes/discover_recipes.png", color: "#DB2333", border: "#520007", x: 488, y: 16,  w: 168, h: 196 },
  { slug: "bars",    label: "Καφέ/Μπαρ", href: "/bars",    image: "/heroes/discover_bars.png",    color: "#014274", border: "#00213A", x: 544, y: 264, w: 168, h: 136 },
  { slug: "theater", label: "Θέατρο",     href: "/theater", image: "/heroes/discover_theater.png", color: "#DBA300", border: "#3A2B00", x: 720, y: 40,  w: 208, h: 180 },
  { slug: "hotels",  label: "Διαμονή",    href: "/hotels",  image: "/heroes/discover_hotels.png",  color: "#06795E", border: "#002A20", x: 800, y: 224, w: 168, h: 196 },
  { slug: "events",  label: "Εκδηλώσεις", href: "/events",  image: "/heroes/discover_events.png",  color: "#25BA00", border: "#082600", x: 992, y: 32,  w: 168, h: 192 },
] as const;

const STRIP_HEIGHT = 460;
const STRIP_WIDTH = 1180;
const TILE_RADIUS = 20;
const TILE_SHADOW = "0 8px 20px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)";
const LABEL_SHADOW = "0 4px 12px rgba(0, 0, 0, 0.24)";

export function HeroDiscover({ suggestionCount }: HeroDiscoverProps) {
  const formatted = suggestionCount.toLocaleString("el-GR");
  return (
    <section className="flex flex-col bg-white pt-10">
      <div className="px-6 space-y-3">
        <h1 className="text-[40px] font-extrabold text-zinc-900 leading-[110%]">
          Προτάσεις<br />Πραγματικές
        </h1>
        <p className="text-[18px] font-medium text-zinc-800 leading-[140%] max-w-[340px]">
          Αληθινοί χρήστες μοιράζονται τις θετικές τους προτάσεις μαζί σου
        </p>
      </div>

      <div className="mt-8 overflow-x-auto no-scrollbar" style={{ height: STRIP_HEIGHT }}>
        <div className="relative" style={{ width: STRIP_WIDTH, height: STRIP_HEIGHT }}>
          {CATEGORY_TILES.map((tile) => (
            <Link
              key={tile.slug}
              href={tile.href}
              className="absolute active:opacity-90 transition-opacity"
              style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
              aria-label={tile.label}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ borderRadius: TILE_RADIUS, boxShadow: TILE_SHADOW }}
              >
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>

              <div
                className="absolute"
                style={{
                  left: 14,
                  bottom: -16,
                  backgroundColor: tile.color,
                  border: `1.5px solid ${tile.border}`,
                  borderRadius: 10,
                  padding: "10px 18px",
                  boxShadow: LABEL_SHADOW,
                }}
              >
                <span
                  className="text-white font-bold leading-none whitespace-nowrap"
                  style={{ fontSize: 17, letterSpacing: 0.1 }}
                >
                  {tile.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 px-6 pb-10 flex items-center justify-between gap-4">
        <div className="shrink-0">
          <p className="text-[36px] font-extrabold text-zinc-900 leading-none tracking-tight">
            {formatted}
          </p>
          <p className="text-[13px] font-bold text-zinc-700 uppercase tracking-[0.12em] mt-2">
            ΠΡΟΤΑΣΕΙΣ
          </p>
        </div>
        <Link
          href="/food"
          className="flex-1 max-w-[260px] h-[64px] rounded-2xl bg-zinc-950 text-white text-[18px] font-bold flex items-center justify-center gap-3 active:bg-zinc-800 transition-colors"
          style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }}
        >
          Ανακάλυψέ τες
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

function ArrowRight() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden>
      <path d="M14 1L20 7L14 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 7H1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
