import Image from "next/image";
import Link from "next/link";

const CHIP_RADIUS = 22;
const CHIP_SHADOW = "0 10px 28px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)";
const PHOTO_RADIUS = 14;
const PHOTO_SHADOW = "0 8px 20px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)";
const MAN_DROP_SHADOW =
  "drop-shadow(0 22px 32px rgba(0, 0, 0, 0.22)) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.12))";

export function HeroPersonalise() {
  return (
    <section className="flex flex-col bg-white pt-10">
      <div className="px-6 space-y-3">
        <h1 className="text-[40px] font-extrabold text-zinc-900 leading-[110%]">
          Προτάσεις που<br />σου ταιριάζουν
        </h1>
        <p className="text-[18px] font-medium text-zinc-800 leading-[140%] max-w-[340px]">
          Ξεκλείδωσε εξατομικευμένες προτάσεις και μια προσωποποιημένη εμπειρία
        </p>
      </div>

      {/* Center composition */}
      <div className="relative mt-10 mx-auto w-full" style={{ height: 720, maxWidth: 440 }}>
        {/* Large soft coral radial glow */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 480,
            height: 580,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#FE6F5E",
            opacity: 0.3,
            filter: "blur(120px)",
          }}
        />

        {/* Man — sitting cross-legged, drop shadow elevates him */}
        <div
          className="absolute"
          style={{
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 260,
            height: 380,
            zIndex: 5,
            filter: MAN_DROP_SHADOW,
          }}
        >
          <Image
            src="/heroes/personalise_man.png"
            alt=""
            fill
            sizes="260px"
            className="object-contain"
            priority
          />
        </div>

        {/* ───── Chip 1: mezedes (top-left, photo+chip side-by-side, photo sticks up) ───── */}
        <div className="absolute" style={{ top: 0, left: 12, zIndex: 20 }}>
          <div className="relative" style={{ width: 340, height: 200 }}>
            {/* Photo */}
            <div
              className="absolute overflow-hidden"
              style={{
                top: 0,
                left: 0,
                width: 130,
                height: 130,
                borderRadius: PHOTO_RADIUS,
                boxShadow: PHOTO_SHADOW,
              }}
            >
              <Image src="/heroes/personalise_mezedes.png" alt="" fill sizes="130px" className="object-cover" />
            </div>
            {/* Chip extends to the right + below, overlapping photo bottom-right corner */}
            <div
              className="absolute"
              style={{
                top: 80,
                left: 80,
                width: 260,
                padding: "18px 24px 18px 70px",
                borderRadius: CHIP_RADIUS,
                boxShadow: CHIP_SHADOW,
                backgroundColor: "#FFEEEA",
              }}
            >
              <p className="text-[16px] leading-[135%]" style={{ color: "#4A0800" }}>
                Οι ιδιαίτερες μεζέδες είναι η <strong className="font-bold">αδυναμία</strong> σου.
              </p>
            </div>
          </div>
        </div>

        {/* ───── Chip 2: Star Wars (mid-right, photo on right, chip extends left) ───── */}
        <div className="absolute" style={{ top: 260, right: 8, zIndex: 20 }}>
          <div className="relative" style={{ width: 340, height: 230 }}>
            {/* Photo (poster) */}
            <div
              className="absolute overflow-hidden"
              style={{
                top: 0,
                right: 0,
                width: 138,
                height: 200,
                borderRadius: PHOTO_RADIUS,
                boxShadow: PHOTO_SHADOW,
              }}
            >
              <Image src="/heroes/personalise_starwars.png" alt="" fill sizes="138px" className="object-cover" />
            </div>
            {/* Chip extends to the left + below, overlapping photo bottom-left corner */}
            <div
              className="absolute"
              style={{
                top: 120,
                right: 90,
                width: 240,
                padding: "18px 70px 18px 24px",
                borderRadius: CHIP_RADIUS,
                boxShadow: CHIP_SHADOW,
                backgroundColor: "#FFFFFF",
              }}
            >
              <p className="text-[16px] leading-[135%]" style={{ color: "#001E35" }}>
                Αφού είσαι <strong className="font-bold">φαν</strong><br />του Star Wars
              </p>
            </div>
          </div>
        </div>

        {/* ───── Chip 3: scifi (bottom-left, photo on left, chip extends right) ───── */}
        <div className="absolute" style={{ top: 480, left: 0, zIndex: 20 }}>
          <div className="relative" style={{ width: 380, height: 230 }}>
            {/* Photo (poster) */}
            <div
              className="absolute overflow-hidden"
              style={{
                top: 0,
                left: 16,
                width: 138,
                height: 200,
                borderRadius: PHOTO_RADIUS,
                boxShadow: PHOTO_SHADOW,
              }}
            >
              <Image src="/heroes/personalise_scifi.png" alt="" fill sizes="138px" className="object-cover" />
            </div>
            {/* Chip extends to the right + below, overlapping photo bottom-right corner */}
            <div
              className="absolute"
              style={{
                top: 130,
                left: 110,
                width: 280,
                padding: "18px 24px 18px 70px",
                borderRadius: CHIP_RADIUS,
                boxShadow: CHIP_SHADOW,
                backgroundColor: "#F4F4F5",
              }}
            >
              <p className="text-[16px] leading-[135%] text-zinc-800">
                Και <strong className="font-bold">αγαπάς</strong> την επιστημονική φαντασία
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex gap-3 px-6 pb-10 mt-2">
        <Link
          href="/support"
          className="flex-1 h-[68px] flex items-center justify-center bg-zinc-100 rounded-2xl text-[15px] font-medium text-zinc-700 underline active:bg-zinc-200 transition-colors"
        >
          Μάθε περισσότερα
        </Link>
        <Link
          href="/register"
          className="flex-1 h-[68px] flex items-center justify-center bg-zinc-950 rounded-2xl text-[20px] font-bold text-white active:bg-zinc-800 transition-colors"
          style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }}
        >
          Εγγραφή
        </Link>
      </div>
    </section>
  );
}
