import Link from "next/link";

export interface CategoryChip {
  label: string;
  count: number;
  href: string;
  cover_url?: string | null;
  placeholder_color?: string;
}

interface AIChipsProps {
  chips: CategoryChip[];
}

export function AIChips({ chips }: AIChipsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-6">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Εξατομικευμένα για σένα
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-5 px-6">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="bg-white border border-zinc-200 rounded-sm p-4 h-[140px] flex flex-col justify-between active:bg-zinc-50 transition-colors"
          >
            {/* Thumbnail */}
            <div
              className="w-11 h-11 rounded-xs overflow-hidden shrink-0"
              style={{ backgroundColor: chip.placeholder_color ?? "#e4e4e7" }}
            >
              {chip.cover_url && (
                <img
                  src={chip.cover_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Title + count */}
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-zinc-800 uppercase leading-[1.3] line-clamp-2">
                {chip.label}
              </p>
              <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-[0.12em] leading-none">
                <span className="text-base font-bold text-zinc-800 mr-1 normal-case tracking-normal">
                  {chip.count}
                </span>
                ΠΡΟΤΑΣΕΙΣ
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
