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
import { useShareLink } from "@/hooks/useShareLink";
import { CommentComposer } from "@/components/detail/CommentComposer";
import { CommentThread } from "@/components/detail/CommentThread";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { ExtraRatingsRow } from "@/components/detail/ExtraRatingsRow";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

interface RelatedBook {
  title?: string;
  author?: string;
  pages?: number;
  cover_url?: string;
  href?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(level: number): "Verified" | "Expert" | "Platinum" | "Gold" {
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

function formatDates(dates: unknown): string {
  if (typeof dates === "string") return dates;
  if (Array.isArray(dates) && dates.length > 0) {
    if (typeof dates[0] === "string") return dates.join(", ");
    if (dates[0] && typeof dates[0] === "object" && "label" in dates[0]) return dates.map((d: any) => d.label).join(", ");
  }
  return "-";
}

export function TheaterDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "theater", data.isBookmarked);
  const { share, copied: shareCopied } = useShareLink({ title: data.item.title });
  const [plotExpanded, setPlotExpanded] = useState(false);
  const [userRating, setUserRating] = useState(data.userRating ?? 0);
  const { save: saveRating, busy: ratingBusy, savedScore } = useRating(data.item.id, data.userRating);

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const category = ext.type ?? item.metadata?.tags?.[0] ?? "-";
  const year = ext.year ? String(ext.year) : "-";
  const writer = ext.writer ?? "-";
  const director = ext.director ?? "-";
  const venue = ext.name_place ?? "-";
  const address = ext.address ?? "-";
  const availability = ext.availability ?? "-";
  const ticketUrl = ext.ticket_url ?? "";
  const price = ext.price ?? "";
  const plot = ext.plot ?? "";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;
  const dates = formatDates(ext.dates);

  const actors: { name: string; color: string }[] = Array.isArray(ext.actors)
    ? ext.actors.map((a: unknown, i: number) => ({
        name: getActorName(a),
        color: ["#5a4a3a","#3a4a5a","#4a3a3a","#5a3a4a","#3a5a4a","#4a4a3a"][i % 6],
      }))
    : [];

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  // Cross-promo: book version of the play, when admin has linked one.
  const relatedBook: RelatedBook | null = item.metadata?.related_book ?? null;

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
            <button onClick={share} className={cn("relative w-9 h-9 flex items-center justify-center rounded-full transition-colors", shareCopied ? "bg-emerald-100" : "bg-zinc-100 active:bg-zinc-200")} aria-label={shareCopied ? "Αντιγράφηκε" : "Κοινοποίηση"}>
              <Share2 size={16} className={shareCopied ? "text-emerald-700" : "text-zinc-700"} />
              {shareCopied && <span className="absolute -bottom-7 right-0 whitespace-nowrap px-2 py-1 rounded bg-zinc-900 text-white text-[11px] font-medium">✓ Αντιγράφηκε</span>}
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

      {/* Venue block */}
      <div className="mx-6 mt-6 rounded-[12px] p-6 space-y-3" style={{ backgroundColor: "#F2F2F7" }}>
        <p className="text-[20px] font-bold text-[#27272A] leading-[140%]">{venue}</p>
        <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%]">{address}</p>
        <button className="flex items-center gap-2 text-[14px] font-semibold text-zinc-700 underline">
          <MapPinIcon /> Άνοιγμα στους χάρτες
        </button>
      </div>

      {/* Availability banner */}
      {availability !== "-" && (
        <div className="mx-6 mt-4 pl-4 py-3 flex items-center gap-3" style={{ borderLeft: "5px solid #FE402B" }}>
          <div>
            <span className="text-[20px] font-bold text-zinc-900">Διαθεσιμότητα: </span>
            <span className="text-[16px] font-semibold text-zinc-800">{availability}</span>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-8">
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={category} />
          <InfoCell label="ΧΡΟΝΟΣ"    value={year} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΣΥΓΓΡΑΦΕΑΣ" value={writer} />
          <InfoCell label="ΣΚΗΝΟΘΕΣΙΑ" value={director} />
        </div>
        <InfoDivider />
        <div className="pl-6 py-5">
          <InfoCell label="ΠΑΡΑΣΤΑΣΕΙΣ" value={dates} />
        </div>
      </div>

      {/* Cast */}
      {actors.length > 0 && (
        <div className="mt-2 py-5 space-y-5">
          <p className="pl-6 text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΕΡΜΗΝΕΥΤΕΣ</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pb-1">
            {actors.map(actor => (
              <div key={actor.name} className="flex-none flex flex-col items-center gap-3 w-[72px]">
                <div className="w-[50px] h-[50px] rounded-full shrink-0" style={{ backgroundColor: actor.color }} />
                <p className="text-[12px] font-semibold text-zinc-900 text-center leading-tight">{actor.name}</p>
              </div>
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
        </div>
      )}

      {/* Plot */}
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

      {/* Ticket CTA */}
      <div className="mx-6 mt-6 rounded-[16px] p-7 flex flex-col gap-5" style={{ backgroundColor: "rgba(112,27,255,0.07)" }}>
        <p className="text-[15px] font-medium leading-[150%]" style={{ color: "#13052B" }}>
          Αν ενδιαφέρεσαι για εισητήρια
        </p>
        <OutlinedPill href={ticketUrl || undefined} width="full" size="lg">
          Έλεγχος Διαθεσιμότητας
        </OutlinedPill>
      </div>

      {/* Public book ad — cross-promo when the play has a book version */}
      {relatedBook && relatedBook.title && (
        <div className="mx-6 mt-6 rounded-[16px] p-6" style={{ backgroundColor: "#EFF1FA" }}>
          <Icon name="public" width={102} height={36} alt="Public" />
          <p className="text-[16px] font-medium text-zinc-700 mt-2 leading-tight">
            Κυκλοφορεί και το ομώνυμο έργο
          </p>
          <div className="mt-5 flex items-start gap-4">
            <div className="w-[102px] h-[150px] shrink-0 rounded-[6px] overflow-hidden bg-zinc-200">
              {relatedBook.cover_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={relatedBook.cover_url} alt={relatedBook.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <p className="text-[18px] font-bold text-zinc-900 leading-tight line-clamp-3">
                {relatedBook.title}
              </p>
              {relatedBook.author && (
                <p className="text-[14px] font-medium text-zinc-700">{relatedBook.author}</p>
              )}
              {relatedBook.pages != null && (
                <p className="text-[14px] font-medium text-zinc-600">{relatedBook.pages} σ.</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <OutlinedPill
              href={relatedBook.href}
              className="border-coral-600 text-coral-700"
            >
              Δες το
            </OutlinedPill>
          </div>
        </div>
      )}

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Η παράσταση" communityRating={avgRating} reviews={reviews} extraRatings={data.extraRatings} userRating={userRating} setUserRating={setUserRating} saveRating={saveRating} ratingBusy={ratingBusy} savedScore={savedScore} question="Με πόσα αστέρια θα βαθμολογούσες την παράσταση;" mySuggestion={mySuggestion} itemTitle={title} />

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

function SuggestionBlock({ author, date, text, badge, user }: { author: string; date: string; text: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; user?: any }) {
  return (
    <div className="mx-6 mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatarWithPopup user={user ?? { display_name: author }} size={45} />
          <div className="space-y-1">
            <p className="text-[14px] font-bold text-zinc-800">{author}</p>
            <UserBadge kind={badge} variant="xs" />
          </div>
        </div>
        <span className="text-[14px] font-medium text-zinc-500">{date}</span>
      </div>
      {text && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{text}</p>}
    </div>
  );
}

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800 leading-[140%]">{value}</p>
    </div>
  );
}

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; userData?: any; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, extraRatings, userRating, setUserRating, saveRating, ratingBusy, savedScore, question, mySuggestion, itemTitle }: {
  ratings: { stars: number; pct: number }[]; ratingCount: number; isTopRated: boolean; topRatedNoun: string;
  communityRating: number; reviews: ReviewItem[];
  extraRatings: ItemDetailData["extraRatings"];
  userRating: number; setUserRating: (n: number) => void; question: string;
  saveRating: (score: number) => void; ratingBusy: boolean; savedScore: number | null;
  mySuggestion: { id: string; reflection: string | null; rating: number | null } | null;
  itemTitle: string;
}) {
  return (
    <div className="mt-8 py-8 flex flex-col items-center gap-[42px]" style={{ background: "linear-gradient(180deg,#fff 0%,#F2F2F7 10%,#F7F7FA 91%,#fff 100%)" }}>
      <div className="w-[342px] flex flex-col gap-12">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <StarIcon size={24} filled />
            <span className="font-bold text-zinc-800" style={{ fontSize: 72, lineHeight: 1 }}>{communityRating.toFixed(2)}</span>
          </div>
          {isTopRated && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[22px] font-semibold text-zinc-800 text-center">Top Rated</p>
              <p className="text-[14px] font-medium text-zinc-600 text-center leading-[150%] max-w-[300px]">
                {topRatedNoun} ανήκει στο <span className="font-bold">top 10%</span> των καλύτερων όπως βαθμολογήθηκε από τους χρήστες
              </p>
            </div>
          )}
          {ratingCount > 0 && (
            <div className="w-full flex flex-col gap-5 px-6">
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
          )}
        </div>
        {mySuggestion ? (
          <OwnSuggestionActions suggestion={mySuggestion} itemTitle={itemTitle} />
        ) : (
          <div className="rounded-[12px] bg-white flex flex-col items-center gap-6 py-12 px-6" style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}>
            <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">{question}</p>
            <div className="flex items-center gap-3">
              {[1,2,3,4,5].map(s => <button key={s} onClick={() => setUserRating(s)}><StarIcon size={34} filled={s <= userRating} /></button>)}
            </div>
            {userRating > 0 && <button onClick={() => saveRating(userRating)} disabled={ratingBusy || userRating === savedScore} className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50">{ratingBusy ? "Αποθήκευση..." : savedScore === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}</button>}
          </div>
        )}
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
                  <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-5">{r.text}</p>
                  <div className="flex items-center gap-3">
                    <UserAvatarWithPopup user={r.userData ?? { display_name: r.name }} size={50} />
                    <div className="space-y-1"><p className="text-[14px] font-bold text-zinc-800">{r.name}</p><UserBadge kind={r.badge} /></div>
                  </div>
                </div>
                <ReviewCardFooter reviewId={r.id} likes={r.likes} dislikes={r.dislikes} />
              </div>
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
          <button className="w-[342px] py-[18px] rounded-full border-[1.5px] border-zinc-600 text-[16px] font-semibold text-zinc-700 uppercase tracking-[0.1px] active:bg-zinc-50 transition-colors">Εμφάνιση αξιολογήσεων</button>
        </div>
      )}

      <ExtraRatingsRow ratings={extraRatings} />
    </div>
  );
}

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return <svg width={size} height={size*12/13} viewBox="0 0 13 12" fill="none" aria-hidden><path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1}/></svg>;
}
function MapPinIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
