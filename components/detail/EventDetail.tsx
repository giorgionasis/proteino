"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { useReview } from "@/hooks/useReview";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import { RelatedSections } from "@/components/detail/RelatedSections";
import { useBookmark } from "@/hooks/useBookmark";
import { BookmarkStatusChips } from "@/components/detail/BookmarkStatusChips";
import { BookmarkSavedModal, type BookmarkSaveResult } from "@/components/detail/BookmarkSavedModal";
import { useToast } from "@/components/ui/Toast";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { badgeLabelForSuggestions } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(suggestionCount: number): "Verified" | "Expert" | "Platinum" | "Gold" {
  return badgeLabelForSuggestions(suggestionCount) ?? "Verified";
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
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const bookmark = useBookmark(data.item.id, "events", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { save: saveReview, busy: reviewBusy, savedRating } = useReview(
    data.item.id,
    { rating: data.myReview?.rating ?? null, reflection: data.myReview?.reflection ?? null },
    {
      onSaved: () => {
        if (bookmark.status === "wishlist") {
          bookmark.setStatus("done");
          showToast("Μετακινήθηκε στα Πήγα ✓");
        }
      },
    },
  );
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const gatedSaveReview = async (r: number, t: string | null) => {
    let p: Promise<unknown> = Promise.resolve();
    requireAuthRating(() => { p = saveReview(r, t); });
    return p;
  };
  const [userText, setUserText] = useState(data.myReview?.reflection ?? "");

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

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

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

  const reviews: ReviewItem[] = data.reviews.map(r => ({
    id: r.id,
    name: r.user.display_name,
    badge: getBadge(r.user.suggestion_count ?? 0),
    color: "#a5b5c4",
    rating: r.rating,
    date: formatDate(r.created_at),
    text: r.reflection ?? "",
    likes: r.vote_up,
    dislikes: r.vote_down,
    myVote: r.my_vote,
    userData: r.user,
  }));

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <DetailHeaderActions
            category="events"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
          />
        }
      />

      {/* Hero */}
      <div className="px-6 pt-6">
        <div data-orbit-source className="relative w-full h-[228px] rounded-[12px] overflow-hidden bg-zinc-200">
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
          badge={getBadge(featured.user.suggestion_count ?? 0)}
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
            <ExpandableText
              text={description}
              collapsedLines={4}
              className="text-[15px] font-normal text-zinc-800 leading-[150%]"
            />
          </div>
        </>
      )}

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        <BookmarkStatusChips category="events" bookmark={bookmark} onToast={showToast} />
      </div>

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Η εκδήλωση" communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} saveReview={gatedSaveReview} userText={userText} setUserText={setUserText} reviewBusy={reviewBusy} savedRating={savedRating} question="Με πόσα αστέρια θα βαθμολογούσες την εκδήλωση;" mySuggestion={mySuggestion} itemTitle={title} itemSlug={item.slug} />

      <RelatedSections sections={data.relatedSections} category="events" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="events"
        onClose={() => setSavedModal(null)}
      />
      {toast}
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

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; myVote: 1 | -1 | null; userData?: any; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, userRating, setUserRating, userText, setUserText, saveReview, reviewBusy, savedRating, question, mySuggestion, itemTitle, itemSlug }: {
  ratings: { stars: number; pct: number }[]; ratingCount: number; isTopRated: boolean; topRatedNoun: string;
  communityRating: number; reviews: ReviewItem[];
  userRating: number; setUserRating: (n: number) => void; question: string;
  saveReview: (rating: number, reflection: string | null) => Promise<unknown>;
  userText: string;
  setUserText: (s: string) => void; reviewBusy: boolean; savedRating: number | null;
  mySuggestion: { id: string; reflection: string | null; rating: number | null } | null;
  itemTitle: string; itemSlug: string;
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
          {ratings.some((d) => d.pct > 0) && (
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
            {userRating > 0 && (
              <>
                <textarea
                  value={userText}
                  onChange={e => setUserText(e.target.value)}
                  placeholder="Γράψε γιατί (προαιρετικό)"
                  maxLength={4000}
                  rows={3}
                  className="w-full rounded-[12px] border border-zinc-300 px-4 py-3 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-coral-600 focus:outline-none resize-none"
                />
                <button onClick={() => saveReview(userRating, userText.trim() || null)} disabled={reviewBusy || userRating === savedRating} className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50">{reviewBusy ? "Αποθήκευση..." : savedRating === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}</button>
              </>
            )}
          </div>
        )}
      </div>
      {reviews.length > 0 && (
        <div className="flex flex-col items-center w-full gap-6">
          <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
            {reviews.map(r => (
              <ReviewCard
                  key={r.id}
                  variant="carousel"
                  id={r.id}
                  rating={r.rating}
                  text={r.text}
                  date={r.date}
                  name={r.name}
                  userData={r.userData}
                  badge={r.badge}
                  likes={r.likes}
                  dislikes={r.dislikes}
                />
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
        </div>
      )}

      <AllReviewsButton itemSlug={itemSlug} count={ratingCount} />
    </div>
  );
}

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return <svg width={size} height={size*12/13} viewBox="0 0 13 12" fill="none" aria-hidden><path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1}/></svg>;
}
function MapPinIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0 mt-0.5" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function CalendarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
