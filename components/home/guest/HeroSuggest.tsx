import Link from "next/link";

export function HeroSuggest() {
  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{ height: 733 }}
    >
      {/* Background — warm gradient placeholder for the full-bleed photo */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(160deg, #c47a5a 0%, #e8a87c 35%, #f5c9a4 60%, #ffffff 85%)",
        }}
      />

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 236,
          background: "linear-gradient(180deg, rgba(255,255,255,0) 5%, rgba(255,255,255,0.47) 53%, rgba(255,255,255,1) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-between px-6 pt-10 pb-7 z-10">
        {/* Header text */}
        <div>
          <h2 className="text-[28px] font-extrabold text-zinc-800 leading-[120%] w-[305px]">
            Η πρότασή<br />σου έχει αξία
          </h2>
          <p className="text-base font-medium text-zinc-800 leading-[140%] mt-3 w-[342px]">
            Μοιράσου και εσύ κάτι που σου άρεσε...
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="space-y-5">
          <p className="text-base font-bold text-zinc-950 leading-[120%] w-[323px]">
            *Η Κατερίνα πρότεινε την μεξικάνικη σαλάτα της
          </p>
          <Link
            href="/register"
            className="flex items-center justify-center w-full h-14 bg-zinc-950 text-white text-[22px] font-bold rounded-sm active:bg-zinc-800 transition-colors"
          >
            Προτείνω
          </Link>
        </div>
      </div>
    </section>
  );
}
