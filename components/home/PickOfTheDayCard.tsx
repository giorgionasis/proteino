import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { UserBadge } from "@/components/ui/UserBadge";
import { CATEGORIES } from "@/constants/categories";
import type { PickOfTheDay } from "@/lib/home/personal";

const PORTRAIT = new Set(["movies", "series", "books"]);

/**
 * "Η πρόταση της ημέρας" — one real recommendation, big: the item, the
 * suggester's own words and who they are. Human first; rotates daily.
 */
export function PickOfTheDayCard({ pick }: { pick: PickOfTheDay }) {
  const label = CATEGORIES.find((c) => c.slug === pick.category)?.labelEl ?? "";
  const portrait = PORTRAIT.has(pick.category);

  return (
    <section className="px-6 flex flex-col gap-4">
      <h2 className="text-[13px] font-bold tracking-[0.12em] uppercase text-coral-700">Η πρόταση της ημέρας</h2>
      <Link href={pick.href} className="block rounded-2xl overflow-hidden border border-zinc-200 bg-white active:scale-[0.99] transition-transform">
        <ItemImage
          images={pick.image}
          fallbackUrl={pick.coverUrl}
          alt={pick.title}
          ratio={portrait ? "4 / 3" : "3 / 2"}
          mode={portrait ? "whole" : "crop"}
          sizes="(min-width: 512px) 480px, 100vw"
        />
        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            {label && <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{label}</span>}
            <p className="text-[22px] font-extrabold text-zinc-900 leading-tight">{pick.title}</p>
          </div>
          <p className="text-[15px] text-zinc-700 leading-[155%]">«{pick.quote}»</p>
          <div className="flex items-center gap-3 pt-1">
            <AvatarImage url={pick.suggester.avatar_url} name={pick.suggester.display_name} size={36} className="rounded-full shrink-0" />
            <div className="min-w-0 flex flex-col">
              <span className="text-[14px] font-bold text-zinc-800 truncate">{pick.suggester.display_name}</span>
              <UserBadge suggestionCount={pick.suggester.suggestion_count} />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
