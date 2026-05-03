"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { InnerHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(level: number): "Expert" | "Platinum" | "Gold" | "Verified" {
  if (level >= 10) return "Expert";
  if (level >= 5) return "Gold";
  return "Verified";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ώρες πριν`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "χθες";
  if (days < 30) return `${days} μέρες πριν`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} μήνες πριν`;
  return d.toLocaleDateString("el-GR", { month: "short", year: "2-digit" });
}

const BADGE_STYLE: Record<"Expert" | "Platinum" | "Gold" | "Verified", string> = {
  Expert:   "bg-zinc-800 text-zinc-50",
  Platinum: "bg-[#c4a5b5] text-white",
  Gold:     "bg-[#F8D160] text-zinc-800",
  Verified: "bg-[#1D9E75] text-white",
};

const PHOTO_TABS = ["Εξωτερικά", "Εσωτερικά", "Cocktails"] as const;

export function BarsDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [photoTab, setPhotoTab]     = useState(0);
  const [userRating, setUserRating] = useState(0);

  const { item, extension: ext, suggestions } = data;

  const title = item.title ?? "-";
  const category = ext.type ?? item.metadata?.tags?.[0] ?? "-";
  const address = ext.address ?? "-";
  const phone = ext.telephone ?? "-";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;

  const externalRatings = ext.external_ratings ?? {};
  const google = externalRatings.google ?? "-";
  const tripadvisor = externalRatings.tripadvisor ?? "-";

  const information = ext.information ?? {};
  const infoLink = information.website ?? information.instagram ?? "-";

  const ratingDistribution: { stars: number; pct: number }[] = (item.metadata?.rating_distribution as any) ?? [
    { stars: 5, pct: 0 }, { stars: 4, pct: 0 }, { stars: 3, pct: 0 }, { stars: 2, pct: 0 }, { stars: 1, pct: 0 },
  ];

  const reviews = suggestions.slice(1).map(s => ({
    id: s.id,
    name: s.user.display_name,
    badge: getBadge(s.user.level),
    color: "#a5b5c4",
    rating: s.rating ?? 0,
    date: formatDate(s.created_at),
    text: s.reflection ?? "",
    likes: 0,
    dislikes: 0,
    userData: s.user,
  }));

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <>
            <button onClick={() => setBookmarked(v => !v)} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", bookmarked ? "bg-zinc-800" : "bg-zinc-100 active:bg-zinc-200")} aria-label="Αποθήκευση">
              <Bookmark size={16} className={bookmarked ? "text-white fill-white" : "text-zinc-700"} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors" aria-label="Κοινοποίηση">
              <Share2 size={16} className="text-zinc-700" />
            </button>
          </>
        }
      />

      {/* Photos */}
      <div className="px-6 pt-6 space-y-3">
        <div className="flex gap-2">
          {PHOTO_TABS.map((tab, i) => (
            <button key={tab} onClick={() => setPhotoTab(i)}
              className={cn("px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors",
                photoTab === i ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-600 active:bg-zinc-200")}>
              {tab}
            </button>
          ))}
        </div>
        <div className="w-full h-[220px] rounded-[12px] overflow-hidden bg-zinc-800 flex items-center justify-center">
          {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-5xl">☕</span>}
        </div>
      </div>

      {/* Title + chips */}
      <div className="px-6 pt-5 space-y-3">
        <h1 className="font-bold text-zinc-800" style={{ fontSize: 26, lineHeight: "22px" }}>{title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full border border-zinc-200 text-[13px] font-medium text-zinc-600">{category}</span>
          <span className="px-3 py-1 rounded-full border border-zinc-200 text-[13px] font-medium text-zinc-600">{address}</span>
        </div>
      </div>

      {/* Rating bar */}
      <div className="mx-6 mt-5 rounded-[12px] border border-zinc-200 px-4 py-6 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[18px] font-bold text-zinc-800 leading-none">{avgRating.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => <StarIcon key={s} size={11} filled={s <= Math.round(avgRating)} />)}
          </div>
        </div>
        <div className="w-px h-[34px] bg-zinc-200" />
        <div className="space-y-1 text-center">
          <p className="text-[14px] font-bold text-zinc-800">Google</p>
          <p className="text-[13px] font-medium text-zinc-600">{google}</p>
        </div>
        <div className="w-px h-[34px] bg-zinc-200" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-[18px] font-bold text-zinc-800 leading-none">{ratingCount}</span>
          <span className="text-[12px] font-semibold text-zinc-700 underline">αξιολογήσεις</span>
        </div>
      </div>

      {/* Contact info */}
      <div className="mx-6 mt-6 rounded-[12px] bg-[#F2F2F7] px-5 py-6 space-y-5">
        <p className="text-[16px] font-bold text-zinc-800">Πληροφορίες</p>
        {[
          { label: "Διεύθυνση", value: address },
          { label: "Τηλέφωνο",  value: phone   },
          { label: "Περισσότερα", value: infoLink },
        ].map(({ label, value }, i) => (
          <div key={label}>
            {i > 0 && <div className="h-px bg-zinc-200 mb-5" />}
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-zinc-500">{label}</p>
              <p className="text-[15px] font-medium text-zinc-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Community ratings */}
      <div className="mt-8 py-8 flex flex-col items-center gap-[42px]"
        style={{ background: "linear-gradient(180deg,#fff 0%,#F2F2F7 10%,#F7F7FA 91%,#fff 100%)" }}>
        <div className="w-[342px] flex flex-col gap-12">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <StarIcon size={24} filled />
              <span className="font-bold text-zinc-800" style={{ fontSize: 72, lineHeight: 1 }}>
                {avgRating.toFixed(2)}
              </span>
            </div>
            <div className="w-full flex flex-col gap-7 px-6">
              {ratingDistribution.map(({ stars, pct }) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-[16px] font-semibold text-zinc-700 w-3 shrink-0 text-right">{stars}</span>
                  <StarIcon size={11} filled />
                  <div className="flex-1 h-[10px] rounded-full bg-white overflow-hidden" style={{ boxShadow: "inset 1px 1px 4px rgba(0,0,0,0.25)" }}>
                    <div className="h-full rounded-full bg-zinc-800" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[16px] font-semibold text-zinc-800 w-10 text-right shrink-0">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] bg-white flex flex-col items-center gap-6 py-12 px-6" style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}>
            <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">Με πόσα αστέρια θα βαθμολογούσες;</p>
            <div className="flex items-center gap-3">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setUserRating(s)} aria-label={`${s} αστέρια`}>
                  <StarIcon size={34} filled={s <= userRating} />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <button className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity">
                Αποθήκευσε βαθμολογία
              </button>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
              {reviews.map(review => (
                <div key={review.id} className="flex-none w-[310px] bg-white rounded-[12px] flex flex-col justify-between overflow-hidden" style={{ boxShadow: "2px 2px 9px -2px rgba(0,0,0,0.1)" }}>
                  <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => <StarIcon key={s} size={10} filled={s <= review.rating} />)}
                      </div>
                      <span className="w-[2px] h-[2px] rounded-full bg-zinc-500 shrink-0" />
                      <span className="text-[13px] font-medium text-zinc-500">{review.date}</span>
                    </div>
                    <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-4">{review.text}</p>
                    <div className="flex items-center gap-3">
                      <UserAvatarWithPopup user={review.userData ?? { display_name: review.name }} size={50} />
                      <div className="space-y-1">
                        <p className="text-[14px] font-bold text-zinc-800 leading-none">{review.name}</p>
                        <span className={cn("inline-block px-2 py-0.5 rounded-sm text-[11px] font-medium", BADGE_STYLE[review.badge])}>{review.badge}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5]">
                    <span className="text-[13px] font-semibold text-zinc-600">{review.likes} 👍  {review.dislikes} 👎</span>
                    <button className="text-[12px] font-medium text-zinc-500 underline">αναφορά</button>
                  </div>
                </div>
              ))}
              <div className="flex-none w-6 shrink-0" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12 / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}
