import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import { AvatarImage } from "@/components/ui/AvatarImage";
import type { FollowingFeedEntry } from "@/lib/home/personal";

/**
 * "Από όσους ακολουθείς" — the latest recommendations of people the
 * member follows. Home already suggested people to follow but never
 * showed what they recommend; this closes that loop. Hidden when empty.
 */
export function FollowingFeed({ entries }: { entries: FollowingFeedEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="px-6 flex flex-col gap-4">
      <h2 className="text-[13px] font-bold tracking-[0.12em] uppercase text-zinc-800">Από όσους ακολουθείς</h2>
      <ul className="flex flex-col gap-4">
        {entries.map((e) => (
          <li key={e.id}>
            <Link href={e.item.href} className="flex gap-3 active:opacity-80 transition-opacity">
              <div className="relative shrink-0 w-[64px] h-[88px] rounded-[8px] overflow-hidden bg-zinc-100">
                <ItemImage images={e.item.image} fallbackUrl={e.item.coverUrl} alt={e.item.title} sizes="64px" className="absolute inset-0 bg-transparent" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <AvatarImage url={e.user.avatar_url} name={e.user.display_name} size={20} className="rounded-full shrink-0" />
                  <span className="text-[13px] text-zinc-600 truncate">
                    <span className="font-bold text-zinc-800">{e.user.display_name}</span> πρότεινε
                  </span>
                </div>
                <p className="text-[16px] font-bold text-zinc-900 leading-tight line-clamp-1">{e.item.title}</p>
                {e.quote && <p className="text-[13px] italic text-zinc-600 leading-snug line-clamp-2">«{e.quote}»</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
