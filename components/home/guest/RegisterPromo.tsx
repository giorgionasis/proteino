import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export interface ContributorsSummary {
  /** Members with at least one published recommendation. */
  total: number;
  /** Top contributors by count — real avatars, initials when missing. */
  people: { id: string; name: string; avatarUrl: string | null }[];
}

export function RegisterPromo({ total, people }: ContributorsSummary) {
  const rows = [people.slice(0, 4), people.slice(4, 8), people.slice(8, 12)].filter((r) => r.length > 0);

  return (
    <section className="px-6 space-y-8">
      {/* Title */}
      <div className="space-y-5 text-center">
        <h2 className="text-[28px] font-bold text-zinc-800 leading-6">
          Γίνε ένας από εμάς
        </h2>
        <p className="text-[18px] font-medium text-zinc-800 leading-[130%]">
          <span className="font-extrabold">{total.toLocaleString("el-GR")} μέλη</span> έχουν μοιραστεί τις προτάσεις τους
        </p>
      </div>

      {/* Real contributors with fade */}
      {rows.length > 0 && (
        <div className="relative">
          <div className="space-y-4">
            {rows.map((row, r) => (
              <div key={r} className="flex gap-4 justify-center">
                {row.map((p) => (
                  <Avatar key={p.id} src={p.avatarUrl} name={p.name} size="xl" alt={p.name} />
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
      )}

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
