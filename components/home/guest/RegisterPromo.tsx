import Link from "next/link";

const AVATAR_COLORS = [
  "#b5a0c4", "#a0c4b5", "#c4a0b0", "#b0b5c4",
  "#c4b0a0", "#a0b5c4", "#b5c4a0", "#c4a0a0",
  "#a0c4a0", "#b0a0c4", "#c4b5a0", "#a0a0c4",
];

export function RegisterPromo() {
  return (
    <section className="px-6 space-y-8">
      {/* Title */}
      <div className="space-y-5 text-center">
        <h2 className="text-[28px] font-bold text-zinc-800 leading-6">
          Γίνε ένας από εμάς
        </h2>
        <p className="text-[18px] font-medium text-zinc-800 leading-[130%]">
          <span className="font-extrabold">1.750 χρήστες</span> έχουν μοιραστεί τις προτάσεις τους
        </p>
      </div>

      {/* Avatar grid with fade */}
      <div className="relative" style={{ height: 280 }}>
        {/* Grid rows */}
        <div className="space-y-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-4 justify-center">
              {AVATAR_COLORS.slice(row * 4, row * 4 + 4).map((color, i) => (
                <div
                  key={i}
                  className="w-[75px] h-[75px] rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Bottom fade overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 120,
            background: "linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.84) 50%, rgba(255,255,255,1) 100%)",
          }}
        />
      </div>

      {/* CTA button */}
      <Link
        href="/register"
        className="flex items-center justify-center w-full h-16 bg-zinc-950 rounded-sm text-[22px] font-bold text-white active:bg-zinc-800 transition-colors"
      >
        Εγγραφή
      </Link>
    </section>
  );
}
