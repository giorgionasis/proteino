"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { InnerHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { useBookmark } from "@/hooks/useBookmark";
import { useRating } from "@/hooks/useRating";
import { useShareLink } from "@/hooks/useShareLink";
import { CommentComposer } from "@/components/detail/CommentComposer";
import { CommentThread } from "@/components/detail/CommentThread";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { UserBadge } from "@/components/ui/UserBadge";
import { Icon } from "@/components/ui/Icon";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { ExtraRatingsRow } from "@/components/detail/ExtraRatingsRow";
import { platformIconForChannel } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(level: number): "Expert" | "Platinum" | "Gold" | "Verified" {
  if (level >= 10) return "Expert";
  if (level >= 5) return "Gold";
  return "Verified";
}

function getActorName(actor: unknown): string {
  if (typeof actor === "string") return actor;
  if (actor && typeof actor === "object" && "name" in actor) return String((actor as any).name);
  return "-";
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

export function SeriesDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "series", data.isBookmarked);
  const { share, copied: shareCopied } = useShareLink({ title: data.item.title });
  const [userRating,   setUserRating]   = useState(data.userRating ?? 0);
  const { save: saveRating, busy: ratingBusy, savedScore } = useRating(data.item.id, data.userRating);
  const [plotExpanded, setPlotExpanded] = useState(false);

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const genre = item.metadata?.tags?.[0] ?? "-";
  const seasons = ext.seasons ?? 0;
  const year = ext.release_date ? new Date(ext.release_date).getFullYear() : "-";
  const country = ext.country ?? "-";
  const language = ext.language ?? "-";
  const network = ext.channel ?? "-";
  const directorName = ext.director ?? "-";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const plot = ext.plot ?? "";
  const coverUrl = item.cover_url;

  const actors: { name: string; placeholder_color: string }[] = Array.isArray(ext.actors)
    ? ext.actors.map((a: unknown, i: number) => ({
        name: getActorName(a).toUpperCase().replace(" ", "\n"),
        placeholder_color: ["#5a4a3a","#3a4a5a","#4a3a3a","#5a3a4a","#3a5a4a"][i % 5],
      }))
    : [];

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

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
            <button onClick={share} className={cn("relative w-9 h-9 flex items-center justify-center rounded-full transition-colors", shareCopied ? "bg-emerald-100" : "bg-zinc-100 active:bg-zinc-200")} aria-label={shareCopied ? "Αντιγράφηκε" : "Κοινοποίηση"}>
              <Share2 size={16} className={shareCopied ? "text-emerald-700" : "text-zinc-700"} />
              {shareCopied && <span className="absolute -bottom-7 right-0 whitespace-nowrap px-2 py-1 rounded bg-zinc-900 text-white text-[11px] font-medium">✓ Αντιγράφηκε</span>}
            </button>
          </>
        }
      />

      {/* Cover placeholder */}
      <div className="px-6 pt-6">
        <div className="relative w-full h-[228px] rounded-[12px] overflow-hidden bg-zinc-800 flex items-center justify-center">
          {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-4xl">📺</span>}
          {/* Trailer play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[60px] h-[60px] rounded-full bg-white/80 flex items-center justify-center shadow-lg">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden>
                <path d="M2 1.5L18 11L2 20.5V1.5Z" fill="#27272A" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Title + rating */}
      <div className="px-6 pt-5 space-y-3">
        <h1 className="font-bold text-zinc-800" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
        <div className="flex items-center gap-2">
          <StarIcon size={14} filled />
          <span className="text-[15px] font-semibold text-zinc-700">{avgRating.toFixed(2)}</span>
          <span className="w-[5px] h-[5px] rounded-full bg-zinc-400" />
          <span className="text-[15px] font-medium text-zinc-600">{ratingCount} αξιολογήσεις</span>
        </div>
      </div>

      {/* Information */}
      <div className="mt-8">
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ"  value={genre} />
          <InfoCell label="ΣΕΖΟΝ"      value={seasons > 0 ? String(seasons) : "-"} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΕΝΑΡΞΗ"     value={String(year)} />
          <InfoCell label="ΧΩΡΑ"       value={country} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΓΛΩΣΣΑ"     value={language} />
          <InfoCellWithIcon label="ΔΙΚΤΥΟ" value={network} icon={platformIconForChannel(network)} />
        </div>
        <InfoDivider />
        <div className="pl-6 py-5 space-y-5">
          <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΣΚΗΝΟΘΕΣΙΑ</p>
          <div className="flex items-center gap-5">
            <div className="w-[50px] h-[50px] rounded-full shrink-0" style={{ backgroundColor: "#3a3a4a" }} />
            <p className="text-[18px] font-bold text-zinc-900">{directorName}</p>
          </div>
        </div>
        {actors.length > 0 && (
          <>
            <InfoDivider />
            <div className="py-5 space-y-5">
              <p className="pl-6 text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΡΩΤΑΓΩΝΙΣΤΕΣ</p>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pb-1">
                {actors.map(actor => (
                  <div key={actor.name} className="flex-none flex flex-col items-center gap-4 w-[68px]">
                    <div className="w-[50px] h-[50px] rounded-full shrink-0" style={{ backgroundColor: actor.placeholder_color }} />
                    <p className="text-[12px] font-bold text-zinc-900 text-center uppercase leading-tight whitespace-pre-line">{actor.name}</p>
                  </div>
                ))}
                <div className="flex-none w-6 shrink-0" />
              </div>
            </div>
          </>
        )}
        {plot && (
          <>
            <InfoDivider />
            <div className="pl-6 pr-6 py-5 space-y-4">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΛΟΚΗ</p>
              <p className="text-[15px] font-normal text-zinc-800 leading-[150%]">
                {plotExpanded ? plot : plot.slice(0, 140) + (plot.length > 140 ? "…" : "")}
              </p>
              {plot.length > 140 && (
                <button onClick={() => setPlotExpanded(v => !v)} className="text-[14px] font-bold text-zinc-800 underline">
                  {plotExpanded ? "Λιγότερα" : "Περισσότερα"}
                </button>
              )}
            </div>
          </>
        )}
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
            {isTopRated && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[22px] font-semibold text-zinc-800 text-center">Top Rated</p>
                <p className="text-[14px] font-medium text-zinc-600 text-center leading-[150%] max-w-[300px]">
                  Η σειρά ανήκει στο <span className="font-bold">top 10%</span> των καλύτερων όπως βαθμολογήθηκε από τους χρήστες
                </p>
              </div>
            )}
            {ratingCount > 0 && (
              <div className="w-full flex flex-col gap-5 px-6">
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
            )}
          </div>

          {mySuggestion ? (
            <OwnSuggestionActions suggestion={mySuggestion} itemTitle={title} />
          ) : (
            <div className="rounded-[12px] bg-white flex flex-col items-center gap-6 py-12 px-6" style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}>
              <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">Με πόσα αστέρια θα βαθμολογούσες τη σειρά;</p>
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
          )}

          {data.suggestions[0] && (
            <div className="flex flex-col gap-4">
              <CommentComposer suggestionId={data.suggestions[0].id} />
              <CommentThread suggestionId={data.suggestions[0].id} />
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="flex flex-col items-center w-full gap-6">
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
                      <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-5">{review.text}</p>
                      <div className="flex items-center gap-3">
                        <UserAvatarWithPopup user={review.userData ?? { display_name: review.name }} size={50} />
                        <div className="space-y-1">
                          <p className="text-[14px] font-bold text-zinc-800 leading-none">{review.name}</p>
                          <UserBadge kind={review.badge} />
                        </div>
                      </div>
                    </div>
                    <ReviewCardFooter reviewId={review.id} likes={review.likes} dislikes={review.dislikes} />
                  </div>
                ))}
                <div className="flex-none w-6 shrink-0" />
              </div>
            </div>
          )}

          <ExtraRatingsRow ratings={data.extraRatings} />
        </div>
      </div>

    </div>
  );
}

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800 leading-[140%] whitespace-pre-line">{value}</p>
    </div>
  );
}

function InfoCellWithIcon({ label, value, icon }: { label: string; value: string; icon: ReturnType<typeof platformIconForChannel> }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={28} />}
        <p className="text-[18px] font-bold text-zinc-800 leading-[140%]">{value}</p>
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
