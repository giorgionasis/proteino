import Image from "next/image";
import Link from "next/link";
import { HERO_VIGNETTES } from "@/constants/heroSuggestions";

const PLACEHOLDER: Record<string, { emoji: string; bg: string }> = {
  recipe: { emoji: "🥗", bg: "linear-gradient(135deg, #c47a5a 0%, #e8a87c 100%)" },
  food:   { emoji: "🍽️", bg: "linear-gradient(135deg, #b25a12 0%, #d97a3a 100%)" },
  movie:  { emoji: "🎬", bg: "linear-gradient(135deg, #58328a 0%, #7c4dab 100%)" },
  bar:    { emoji: "🍹", bg: "linear-gradient(135deg, #b8860b 0%, #dba35a 100%)" },
  book:   { emoji: "📖", bg: "linear-gradient(135deg, #8b5a3c 0%, #c89878 100%)" },
  hotel:  { emoji: "🏖️", bg: "linear-gradient(135deg, #4a90b8 0%, #82b9d4 100%)" },
};

export function HeroSuggest() {
  if (HERO_VIGNETTES.length === 0) return null;

  return (
    <section className="flex flex-col bg-white">
      <div className="px-6 pt-10">
        <h2 className="text-[28px] font-extrabold text-zinc-800 leading-[120%] w-[305px]">
          Η πρόταση<br />σου έχει αξία
        </h2>
        <p className="text-base font-medium text-zinc-800 leading-[140%] mt-3 w-[342px]">
          Μοιράσου και εσύ κάτι που σου άρεσε και βοήθησε άλλους χρήστες να ανακαλύψουν νέες προτάσεις
        </p>
      </div>

      <div
        className="mt-6 flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pl-6 pb-2"
        style={{ scrollPaddingLeft: 24 }}
      >
        {HERO_VIGNETTES.map((v, i) => {
          const ph = PLACEHOLDER[v.slug];
          const isLast = i === HERO_VIGNETTES.length - 1;
          return (
            <article
              key={v.slug}
              className="relative flex-none w-[78%] aspect-[4/5] rounded-[20px] overflow-hidden snap-start"
              style={isLast ? { marginRight: 24 } : undefined}
            >
              {v.ready ? (
                <Image
                  src={v.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 80vw, 400px"
                  className="object-cover"
                  priority={i === 0}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: ph?.bg ?? "#a1a1aa" }}
                >
                  <span className="text-[80px] opacity-90" aria-hidden>{ph?.emoji ?? "✨"}</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <p className="absolute bottom-6 left-6 right-6 text-white font-bold text-[20px] leading-[130%]">
                {v.line}
              </p>
            </article>
          );
        })}
      </div>

      <div className="px-6 pt-6 pb-8">
        <Link
          href="/register"
          className="flex items-center justify-center w-full h-14 bg-zinc-950 text-white text-[22px] font-bold rounded-sm active:bg-zinc-800 transition-colors"
        >
          Προτείνω
        </Link>
      </div>
    </section>
  );
}
