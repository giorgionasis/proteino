"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { InnerHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { useBookmark } from "@/hooks/useBookmark";
import { useRating } from "@/hooks/useRating";
import { CommentComposer } from "@/components/detail/CommentComposer";
import { CommentThread } from "@/components/detail/CommentThread";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

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

export function BookDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "books", data.isBookmarked);
  const [readStatus, setReadStatus] = useState<"read" | "want" | null>(null);
  const [userRating, setUserRating] = useState(data.userRating ?? 0);
  const { save: saveRating, busy: ratingBusy, savedScore } = useRating(data.item.id, data.userRating);
  const [plotExpanded, setPlotExpanded] = useState(false);

  const { item, extension: ext, suggestions } = data;

  const meta = item.metadata ?? {};
  const extra = meta.extra_fields_raw ?? {};

  const title = item.title ?? "-";
  const genre = extra["23"] ?? meta.tags?.[0] ?? ext.genre ?? "-";
  const author = ext.writer ?? extra["24"] ?? "-";
  const language = ext.language ?? extra["27"] ?? "-";
  const pages = ext.pages ?? 0;
  const year = ext.publication_year ?? extra["28"] ?? "-";
  const publisher = ext.publication ?? "-";
  const publisherUrl = (meta.publisher_url as string) ?? null;
  const plot = ext.plot ?? "";
  const coverUrl = item.cover_url ?? extra["200"] ?? null;
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;

  const ratingDistribution: { stars: number; pct: number }[] = (meta.rating_distribution as any) ?? [
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
            <button onClick={toggleBookmark} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", bookmarked ? "bg-zinc-800" : "bg-zinc-100 active:bg-zinc-200")} aria-label="Αποθήκευση">
              <Bookmark size={16} className={bookmarked ? "text-white fill-white" : "text-zinc-700"} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors" aria-label="Κοινοποίηση">
              <Share2 size={16} className="text-zinc-700" />
            </button>
          </>
        }
      />

      {/* ── Cover ──────────────────────────────────────────────── */}
      <div className="px-6 pt-6">
        <div className="relative w-full h-[280px] rounded-[12px] overflow-hidden bg-zinc-200 flex items-center justify-center">
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-400 text-6xl">📚</span>
          )}
        </div>
      </div>

      {/* ── Title + Rating line ────────────────────────────────── */}
      <div className="px-6 pt-5 space-y-3">
        <h1 className="font-bold text-zinc-800" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <StarIcon size={14} filled />
            <span className="text-[15px] font-semibold text-zinc-700">{avgRating.toFixed(2)}</span>
          </div>
          <span className="w-[5px] h-[5px] rounded-full bg-zinc-400" />
          <span className="text-[15px] font-medium text-zinc-600">{ratingCount} αξιολογήσεις</span>
        </div>
      </div>

      {/* ── Suggester (who suggested this item) ────────────────── */}
      {suggestions.length > 0 && (() => {
        const s = suggestions[0];
        return (
          <div className="mx-6 mt-6 rounded-[12px] border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[44px] h-[44px] rounded-full shrink-0 overflow-hidden bg-zinc-200 flex items-center justify-center">
                {s.user.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={s.user.avatar_url} alt={s.user.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-base font-bold">{s.user.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-zinc-800">{s.user.display_name}</p>
                  <span className="text-[13px] font-medium text-zinc-500">{formatDate(s.created_at)}</span>
                </div>
                <span className={cn("inline-block px-2 py-0.5 rounded-sm text-[11px] font-medium mt-0.5", BADGE_STYLE[getBadge(s.user.level)])}>{getBadge(s.user.level)}</span>
              </div>
            </div>
            {s.reflection && (
              <p className="text-[14px] font-normal text-zinc-700 leading-[150%] italic line-clamp-3">
                &ldquo;{s.reflection}&rdquo;
              </p>
            )}
            {s.rating != null && s.rating > 0 && (
              <div className="flex items-center gap-0.5 mt-3">
                {[1,2,3,4,5].map(star => <StarIcon key={star} size={12} filled={star <= s.rating!} />)}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Metadata Grid ──────────────────────────────────────── */}
      <div className="mt-8">
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={genre} />
          <InfoCell label="ΣΥΓΓΡΑΦΕΑΣ" value={author} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΕΚΔΟΣΕΙΣ" value={publisher} href={publisherUrl} />
          <InfoCell label="ΓΛΩΣΣΑ ΠΡΩΤΟΤΥΠΟΥ" value={language} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΣΕΛΙΔΕΣ" value={pages > 0 ? String(pages) : "-"} />
          <InfoCell label="ΕΤΟΣ ΕΚΔΟΣΗΣ" value={String(year)} />
        </div>
        <InfoDivider />
      </div>

      {/* ── Author Section ─────────────────────────────────────── */}
      {author !== "-" && (
        <div className="mx-6 mt-6 rounded-[8px] bg-zinc-50 p-5">
          <div className="flex items-center gap-4">
            <div className="w-[50px] h-[50px] rounded-full shrink-0 bg-zinc-300 flex items-center justify-center">
              <span className="text-zinc-500 text-lg font-bold">{author.charAt(0).toUpperCase()}</span>
            </div>
            <div className="space-y-1">
              <p className="text-[18px] font-bold text-zinc-900">{author}</p>
              <p className="text-[13px] font-medium text-zinc-500">Συγγραφέας</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Plot ───────────────────────────────────────────────── */}
      {plot && (
        <div className="px-6 mt-8 space-y-4">
          <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">Πλοκή</p>
          <p className="text-[15px] font-normal text-zinc-800 leading-[150%]">
            {plotExpanded ? plot : plot.slice(0, 200) + (plot.length > 200 ? "…" : "")}
          </p>
          {plot.length > 200 && (
            <button onClick={() => setPlotExpanded(v => !v)} className="text-[14px] font-bold text-zinc-800 underline">
              {plotExpanded ? "Λιγότερα" : "Περισσότερα"}
            </button>
          )}
        </div>
      )}

      {/* ── Read Status ────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="h-px bg-zinc-200 mx-6" />
        <div className="flex gap-3 px-6 py-6">
          {(["read", "want"] as const).map(opt => (
            <button key={opt} onClick={() => setReadStatus(readStatus === opt ? null : opt)}
              className={cn("flex-1 h-[52px] rounded-[12px] text-[15px] font-bold transition-colors active:opacity-80",
                readStatus === opt ? "bg-zinc-800 text-zinc-50" : "border-[1.5px] border-zinc-300 text-zinc-700")}>
              {opt === "read" ? "Το έχω διαβάσει" : "Θέλω να το διαβάσω"}
            </button>
          ))}
        </div>
        <div className="h-px bg-zinc-200 mx-6" />
      </div>

      {/* ── Community Ratings ──────────────────────────────────── */}
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
            <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;</p>
            <div className="flex items-center gap-3">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setUserRating(s)} aria-label={`${s} αστέρια`}>
                  <StarIcon size={34} filled={s <= userRating} />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <button
                onClick={() => saveRating(userRating)}
                disabled={ratingBusy || userRating === savedScore}
                className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {ratingBusy ? "Αποθήκευση..." : savedScore === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}
              </button>
            )}
          </div>

          {data.suggestions[0] && (
            <div className="flex flex-col gap-4">
              <CommentComposer suggestionId={data.suggestions[0].id} />
              <CommentThread suggestionId={data.suggestions[0].id} />
            </div>
          )}

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

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }
function InfoCell({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[18px] font-bold text-coral-600 leading-[140%] whitespace-pre-line underline underline-offset-2">
          {value}
        </a>
      ) : (
        <p className="text-[18px] font-bold text-zinc-800 leading-[140%] whitespace-pre-line">{value}</p>
      )}
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
