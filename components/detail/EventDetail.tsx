"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { useBookmark } from "@/hooks/useBookmark";
import { useRating } from "@/hooks/useRating";
import { CommentComposer } from "@/components/detail/CommentComposer";
import { CommentThread } from "@/components/detail/CommentThread";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(level: number): "Verified" | "Expert" | "Platinum" | "Gold" {
  if (level >= 10) return "Expert";
  if (level >= 5) return "Gold";
  return "Verified";
}

function getPerformerName(p: unknown): string {
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && "name" in p) return String((p as any).name);
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

function formatDates(dates: unknown): string {
  if (typeof dates === "string") return dates;
  if (Array.isArray(dates) && dates.length > 0) {
    if (typeof dates[0] === "string") return dates.join(", ");
    if (dates[0] && typeof dates[0] === "object" && "label" in dates[0]) return dates.map((d: any) => d.label).join(", ");
  }
  return "-";
}

export function EventDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "events", data.isBookmarked);
  const [descExpanded, setDescExpanded] = useState(false);
  const [userRating, setUserRating] = useState(data.userRating ?? 0);
  const { save: saveRating, busy: ratingBusy, savedScore } = useRating(data.item.id, data.userRating);

  const { item, extension: ext, suggestions } = data;

  const title = item.title ?? "-";
  const eventType = ext.event_type ?? "-";
  const address = ext.address ?? "-";
  const venue = ext.name_place ?? "";
  const availability = ext.availability ?? ext.status ?? "-";
  const ticketUrl = ext.ticket_url ?? "";
  const price = ext.price ?? "";
  const description = ext.description ?? "";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;
  const dates = formatDates(ext.dates);

  const performers: { name: string; color: string }[] = Array.isArray(ext.performers)
    ? ext.performers.map((p: unknown, i: number) => ({
        name: getPerformerName(p),
        color: ["#5a4a3a","#3a4a5a","#4a3a3a","#5a3a4a"][i % 4],
      }))
    : [];

  const ratingDistribution: { stars: number; pct: number }[] = (item.metadata?.rating_distribution as any) ?? [
    { stars: 5, pct: 0 }, { stars: 4, pct: 0 }, { stars: 3, pct: 0 }, { stars: 2, pct: 0 }, { stars: 1, pct: 0 },
  ];

  const featured = suggestions[0];

  const reviews: ReviewItem[] = suggestions.slice(1).map(s => ({
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
            <button onClick={toggleBookmark} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", bookmarked ? "bg-zinc-800" : "bg-zinc-100 active:bg-zinc-200")}>
              <Bookmark size={16} className={bookmarked ? "text-white fill-white" : "text-zinc-700"} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors">
              <Share2 size={16} className="text-zinc-700" />
            </button>
          </>
        }
      />

      {/* Hero */}
      <div className="px-6 pt-6">
        <div className="relative w-full h-[228px] rounded-[12px] overflow-hidden bg-zinc-200">
          {coverUrl && <Image src={coverUrl} alt={title} fill className="object-cover" priority />}
        </div>
      </div>

      {/* Title + rating */}
      <div className="px-6 pt-5 space-y-2">
        <h1 className="font-bold text-[#27272A]" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
        <RatingLine rating={avgRating} count={ratingCount} />
      </div>

      {/* Featured suggestion */}
      {featured && (
        <SuggestionBlock
          author={featured.user.display_name}
          date={formatDate(featured.created_at)}
          text={featured.reflection ?? ""}
          badge={getBadge(featured.user.level)}
          user={featured.user}
        />
      )}

      {/* Event info block */}
      <div className="mx-6 mt-6 rounded-[12px] p-6 space-y-4" style={{ backgroundColor: "#F2F2F7" }}>
        <p className="text-[22px] font-bold text-[#27272A] leading-[140%]">{eventType}</p>
        <div className="flex items-start gap-3">
          <MapPinIcon />
          <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%] flex-1">{venue || address}</p>
        </div>
        <div className="flex items-center gap-3">
          <CalendarIcon />
          <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%]">{dates}</p>
        </div>

        {/* Availability banner */}
        {availability !== "-" && (
          <div className="pl-4 py-3 flex items-center gap-3 mt-2" style={{ borderLeft: "5px solid #FABB05" }}>
            <div>
              <span className="text-[20px] font-bold text-zinc-900">Διαθεσιμότητα: </span>
              <span className="text-[16px] font-semibold text-zinc-800">{availability}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ticket price + performers */}
      <div className="mt-8">
        {price && (
          <>
            <InfoDivider />
            <div className="flex items-center justify-between pl-6 pr-6 py-5">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΕΙΣΟΔΟΣ</p>
              <p className="text-[22px] font-bold text-zinc-800">{price}</p>
            </div>
          </>
        )}
        {performers.length > 0 && (
          <>
            <InfoDivider />
            <div className="py-5 space-y-5">
              <p className="pl-6 text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΚΑΛΛΙΤΕΧΝΕΣ</p>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pb-1">
                {performers.map(p => (
                  <div key={p.name} className="flex-none flex flex-col items-center gap-3 w-[80px]">
                    <div className="w-[50px] h-[50px] rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <p className="text-[12px] font-semibold text-zinc-900 text-center leading-tight">{p.name}</p>
                  </div>
                ))}
                <div className="flex-none w-6 shrink-0" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      {description && (
        <>
          <InfoDivider />
          <div className="pl-6 pr-6 py-5 space-y-4">
            <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΕΡΙΓΡΑΦΗ</p>
            <p className="text-[15px] font-normal text-zinc-800 leading-[150%]">
              {descExpanded ? description : description.slice(0, 140) + (description.length > 140 ? "…" : "")}
            </p>
            {description.length > 140 && (
              <button onClick={() => setDescExpanded(v => !v)} className="text-[14px] font-bold text-zinc-800 underline">
                {descExpanded ? "Λιγότερα" : "Περισσότερα"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} saveRating={saveRating} ratingBusy={ratingBusy} savedScore={savedScore} question="Με πόσα αστέρια θα βαθμολογούσες την εκδήλωση;" />

      {data.suggestions[0] && (
        <div className="px-6 flex flex-col gap-4">
          <CommentComposer suggestionId={data.suggestions[0].id} />
          <CommentThread suggestionId={data.suggestions[0].id} />
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function RatingLine({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <StarIcon size={14} filled />
      <span className="text-[18px] font-bold text-[#3F3F46]">{rating.toFixed(2)}</span>
      <span className="w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
      <span className="text-[14px] font-semibold text-[#3F3F46] underline">{count} αξιολογήσεις</span>
    </div>
  );
}

function SuggestionBlock({ author, date, text, badge, user }: { author: string; date: string; text: string; badge: string; user?: any }) {
  return (
    <div className="mx-6 mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatarWithPopup user={user ?? { display_name: author }} size={45} />
          <div className="space-y-1">
            <p className="text-[14px] font-bold text-zinc-800">{author}</p>
            <span className="inline-flex items-center gap-1 text-[12px] text-zinc-800"><VerifiedBadge />{badge}</span>
          </div>
        </div>
        <span className="text-[14px] font-medium text-zinc-500">{date}</span>
      </div>
      {text && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{text}</p>}
      <button className="text-[14px] font-bold text-zinc-800 underline">Περισσότερα</button>
    </div>
  );
}

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; userData?: any; }

function CommunitySection({ ratings, communityRating, reviews, userRating, setUserRating, saveRating, ratingBusy, savedScore, question }: {
  ratings: { stars: number; pct: number }[]; communityRating: number; reviews: ReviewItem[];
  userRating: number; setUserRating: (n: number) => void; question: string;
  saveRating: (score: number) => void; ratingBusy: boolean; savedScore: number | null;
}) {
  return (
    <div className="mt-8 py-8 flex flex-col items-center gap-[42px]" style={{ background: "linear-gradient(180deg,#fff 0%,#F2F2F7 10%,#F7F7FA 91%,#fff 100%)" }}>
      <div className="w-[342px] flex flex-col gap-12">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <StarIcon size={24} filled />
            <span className="font-bold text-zinc-800" style={{ fontSize: 72, lineHeight: 1 }}>{communityRating.toFixed(2)}</span>
          </div>
          <div className="w-full flex flex-col gap-7 px-6">
            {ratings.map(({ stars, pct }) => (
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
          <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">{question}</p>
          <div className="flex items-center gap-3">
            {[1,2,3,4,5].map(s => <button key={s} onClick={() => setUserRating(s)}><StarIcon size={34} filled={s <= userRating} /></button>)}
          </div>
          {userRating > 0 && <button onClick={() => saveRating(userRating)} disabled={ratingBusy || userRating === savedScore} className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50">{ratingBusy ? "Αποθήκευση..." : savedScore === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}</button>}
        </div>
      </div>
      {reviews.length > 0 && (
        <div className="flex flex-col items-center w-full gap-6">
          <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
            {reviews.map(r => (
              <div key={r.id} className="flex-none w-[310px] h-[323px] bg-white rounded-[12px] flex flex-col justify-between overflow-hidden" style={{ boxShadow: "2px 2px 9px -2px rgba(0,0,0,0.1)" }}>
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <StarIcon key={s} size={10} filled={s <= r.rating} />)}</div>
                    <span className="w-[2px] h-[2px] rounded-full bg-zinc-500 shrink-0" /><span className="text-[13px] font-medium text-zinc-500">{r.date}</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-4">{r.text}</p>
                    <button className="text-[13px] font-bold text-zinc-800 underline">Περισσότερα</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserAvatarWithPopup user={r.userData ?? { display_name: r.name }} size={50} />
                    <div className="space-y-1"><p className="text-[14px] font-bold text-zinc-800">{r.name}</p><BadgeChip badge={r.badge} /></div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5]">
                  <div className="flex items-center gap-3 px-3 rounded-full">
                    <button className="flex items-center gap-1.5 h-8"><ThumbUpIcon /><span className="text-[13px] font-semibold text-zinc-700">{r.likes}</span></button>
                    <div className="w-px h-7 bg-white" />
                    <button className="flex items-center gap-1.5 h-8"><ThumbDownIcon /><span className="text-[13px] font-semibold text-zinc-700">{r.dislikes}</span></button>
                  </div>
                  <button className="text-[12px] font-medium text-zinc-500 underline">αναφορά</button>
                </div>
              </div>
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
          <button className="w-[342px] py-[18px] rounded-full border-[1.5px] border-zinc-600 text-[16px] font-semibold text-zinc-700 uppercase tracking-[0.1px] active:bg-zinc-50 transition-colors">Εμφάνιση αξιολογήσεων</button>
        </div>
      )}
    </div>
  );
}

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return <svg width={size} height={size*12/13} viewBox="0 0 13 12" fill="none" aria-hidden><path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1}/></svg>;
}
function MapPinIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0 mt-0.5" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function CalendarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function VerifiedBadge() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M10 2L12.5 4.5H16.5V8.5L19 11L16.5 13.5V17.5H12.5L10 20L7.5 17.5H3.5V13.5L1 11L3.5 8.5V4.5H7.5L10 2Z" fill="#1D9E75"/><path d="M7 10.5L9.5 13L14 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ThumbUpIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600" aria-hidden><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>; }
function ThumbDownIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600" aria-hidden><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>; }
const BADGE_STYLE = { Expert: "bg-zinc-800 text-zinc-50", Platinum: "bg-[#c4a5b5] text-white", Gold: "bg-[#F8D160] text-zinc-800", Verified: "bg-[#1D9E75] text-white" };
function BadgeChip({ badge }: { badge: keyof typeof BADGE_STYLE }) { return <span className={cn("inline-block px-2 py-0.5 rounded-sm text-[11px] font-medium", BADGE_STYLE[badge])}>{badge}</span>; }
