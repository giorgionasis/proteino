"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export interface BookmarkedItem {
  id: string;
  itemId: string;
  category: string;
  title: string;
  cover_url: string | null;
  avg_rating: number;
  rating_count: number;
  href: string;
}

interface Props {
  handle: string;
  isOwnProfile: boolean;
  groups: { category: string; label: string; icon: string; items: BookmarkedItem[] }[];
  total: number;
}

export function BookmarksCategoryPage({ handle, isOwnProfile, groups, total }: Props) {
  const router = useRouter();

  return (
    <div className="bg-white min-h-screen">
      <div
        className="sticky top-0 z-20 bg-white flex items-center h-14 border-b border-zinc-200"
        style={{ paddingLeft: 12 }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Πίσω"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="flex-1 text-center text-base font-bold text-[#3F3F46] pr-11">
          {isOwnProfile ? "Τα αγαπημένα μου" : `Αγαπημένα του @${handle}`}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState isOwnProfile={isOwnProfile} />
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          <div className="mx-6 mt-6">
            <div className="flex items-center gap-2.5 rounded-[8px] px-4 py-4 bg-[#F2F2F7]">
              <span className="font-bold text-[#27272A] leading-none" style={{ fontSize: 40, lineHeight: 1 }}>
                {total}
              </span>
              <span className="text-sm text-[#3F3F46]">
                {total === 1 ? "αποθηκευμένη πρόταση" : "αποθηκευμένες προτάσεις"}
              </span>
            </div>
          </div>

          {groups.map((g) => (
            <section key={g.category} className="space-y-3">
              <div className="flex items-center justify-between px-6">
                <h2 className="text-[15px] font-bold text-zinc-700 uppercase tracking-[0.1px]">
                  {g.icon} {g.label}
                </h2>
                <span className="text-xs text-zinc-500">{g.items.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6">
                {g.items.map((b) => (
                  <Link key={b.id} href={b.href} className="group">
                    <div className="aspect-[4/5] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden mb-2">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-2xl">
                          {g.icon}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight">{b.title}</p>
                    {b.avg_rating > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ★ {b.avg_rating.toFixed(1)}
                        {b.rating_count > 0 && <span className="text-zinc-400"> ({b.rating_count})</span>}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-3">🔖</div>
      <h2 className="text-lg font-bold text-zinc-800 mb-1">
        {isOwnProfile ? "Δεν έχεις αποθηκεύσεις ακόμη" : "Καμία αποθήκευση"}
      </h2>
      <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-5">
        {isOwnProfile
          ? "Πάτησε το 🔖 σε όποια πρόταση σε ενδιαφέρει για να την βρεις εδώ."
          : "Αυτός ο χρήστης δεν έχει αποθηκεύσει ακόμη."}
      </p>
      {isOwnProfile && (
        <Link
          href="/"
          className="inline-block px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
        >
          Εξερεύνηση
        </Link>
      )}
    </div>
  );
}
