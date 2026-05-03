import Link from "next/link";

export function HeroPersonalise() {
  return (
    <section className="flex flex-col bg-white" style={{ height: 733 }}>
      {/* Header */}
      <div className="px-6 pt-10">
        <h2 className="text-[28px] font-extrabold leading-[120%] w-[323px]" style={{ color: "#333333" }}>
          Προτάσεις που<br />σου ταιριάζουν
        </h2>
        <p className="text-base font-medium text-zinc-800 leading-[140%] mt-3 w-[323px]">
          Ξεκλείδωσε εξατομικευμένες προτάσεις βασισμένες στα γούστα σου
        </p>
      </div>

      {/* Image collage */}
      <div className="relative flex-1 mx-6 mt-6">
        {/* Coral glow */}
        <div
          className="absolute rounded-full opacity-50 pointer-events-none"
          style={{
            width: 259,
            height: 259,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#FE6F5E",
            filter: "blur(70px)",
          }}
        />

        {/* Chip: food lover */}
        <div
          className="absolute left-0 top-0 flex items-center gap-2 px-3 py-2.5 rounded-sm"
          style={{
            backgroundColor: "#FFF2F1",
            boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
            opacity: 0.9,
            maxWidth: 220,
          }}
        >
          <div className="w-[60px] h-[40px] rounded-xs overflow-hidden bg-zinc-300 shrink-0" />
          <p className="text-sm leading-[130%]" style={{ color: "#4A0800" }}>
            <span className="font-bold">Οι ιδιαίτερες μεζέδες</span>
            {" "}είναι η{" "}
            <span className="font-bold">αδυναμία</span>{" "}σου.
          </p>
        </div>

        {/* Chip: sci-fi */}
        <div
          className="absolute right-0 top-[80px] flex items-center gap-2 px-3 py-2.5 rounded-sm"
          style={{
            backgroundColor: "#E5F4FF",
            boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
            opacity: 0.9,
            maxWidth: 200,
          }}
        >
          <div className="w-[55px] h-[70px] rounded-xs overflow-hidden bg-zinc-400 shrink-0" />
          <p className="text-sm leading-[130%]" style={{ color: "#001E35" }}>
            <span className="font-semibold">Αφού είσαι φαν</span>
            {" "}του{" "}
            <span className="font-semibold">Star Wars</span>
          </p>
        </div>

        {/* Chip: sci-fi fan */}
        <div
          className="absolute left-0 bottom-[80px] flex items-center gap-2 px-3 py-2.5 rounded-sm"
          style={{
            backgroundColor: "#F4F4F5",
            boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
            opacity: 0.9,
            maxWidth: 200,
          }}
        >
          <div className="w-[55px] h-[70px] rounded-xs overflow-hidden bg-zinc-500 shrink-0" />
          <p className="text-sm leading-[130%] text-zinc-800">
            <span className="font-semibold">Και αγαπάς</span>
            {" "}την{" "}
            <span className="font-semibold">επιστημονική φαντασία</span>
          </p>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex gap-4 px-6 pb-8">
        <Link
          href="/support"
          className="flex-1 h-14 flex items-center justify-center bg-zinc-100 rounded-sm text-sm font-medium text-zinc-600 underline active:bg-zinc-200 transition-colors"
        >
          Μάθε περισσότερα
        </Link>
        <Link
          href="/register"
          className="flex-1 h-14 flex items-center justify-center bg-zinc-950 rounded-sm text-[18px] font-bold text-zinc-50 active:bg-zinc-800 transition-colors"
          style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
        >
          Εγγραφή
        </Link>
      </div>
    </section>
  );
}
