"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { useFlipReorder } from "@/hooks/useFlipReorder";
import type { AchievementData } from "@/hooks/useSubmission";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { RateThisItem } from "@/components/detail/RateThisItem";
import { mergeLiveReview } from "@/lib/reviews/merge-live";
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
import { PersonBubble } from "@/components/detail/PersonBubble";
import { badgeLabelForSuggestions } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(suggestionCount: number): "Verified" | "Expert" | "Platinum" | "Gold" {
  return badgeLabelForSuggestions(suggestionCount) ?? "Verified";
}

function getPerformerData(p: unknown): { name: string; avatarUrl: string | null } {
  if (typeof p === "string") return { name: p, avatarUrl: null };
  if (p && typeof p === "object") {
    const o = p as any;
    const name = typeof o.name === "string" ? o.name : "-";
    const avatarUrl =
      (typeof o.avatar === "string" && o.avatar) ||
      (typeof o.photo === "string" && o.photo) ||
      (typeof o.avatar_url === "string" && o.avatar_url) ||
      (typeof o.image === "string" && o.image) ||
      null;
    return { name, avatarUrl };
  }
  return { name: "-", avatarUrl: null };
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
  const bookmark = useBookmark(data.item.id, "events", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const [savedRating, setSavedRating] = useState<number | null>(data.myReview?.rating ?? null);
  const [savedReflection, setSavedReflection] = useState<string | null>(data.myReview?.reflection ?? null);
  const [liveReview, setLiveReview] = useState<{ id: string; rating: number; reflection: string | null } | null>(null);
  const [achievement, setAchievement] = useState<AchievementData | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    const delay = typeof achievement.display.delay_ms === "number"
      ? achievement.display.delay_ms
      : 2000;
    const t = setTimeout(() => setAchievementOpen(true), delay);
    return () => clearTimeout(t);
  }, [achievement]);

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const eventType = ext.event_type ?? "-";
  const address = ext.address ?? "-";
  const venue = ext.name_place ?? "";
  const lat = typeof ext.lat === "number" ? ext.lat : null;
  const lng = typeof ext.lng === "number" ? ext.lng : null;
  const availability = ext.availability ?? ext.status ?? "-";
  const ticketUrl = ext.ticket_url ?? "";
  const price = ext.price ?? "";
  const description = ext.description ?? "";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;
  const dates = formatDates(ext.dates);
  const venueLine = venue || (address !== "-" ? address : "");
  const mapUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : venueLine
        ? `https://www.google.com/maps/search/${encodeURIComponent(venueLine)}`
        : null;

  const performers: { name: string; avatarUrl: string | null }[] = Array.isArray(ext.performers)
    ? ext.performers.map((p: unknown) => getPerformerData(p)).filter((p) => p.name !== "-")
    : [];

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

  const mergedReviews = mergeLiveReview(data.reviews, liveReview, data.currentUser);
  const reviews: ReviewItem[] = mergedReviews.map(r => ({
    appearAnimation: !!liveReview && r.id === liveReview.id,
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
            showBookmark={!mySuggestion}
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

      {/* Event info block — only when there's something to show. */}
      {(eventType !== "-" || venueLine || dates !== "-" || availability !== "-") && (
        <div className="mx-6 mt-6 rounded-[12px] p-6 space-y-4" style={{ backgroundColor: "#F2F2F7" }}>
          {eventType !== "-" && (
            <p className="text-[22px] font-bold text-[#27272A] leading-[140%]">{eventType}</p>
          )}
          {venueLine && (
            mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 active:opacity-70 transition-opacity"
              >
                <MapPinIcon />
                <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%] flex-1 underline">{venueLine}</p>
              </a>
            ) : (
              <div className="flex items-start gap-3">
                <MapPinIcon />
                <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%] flex-1">{venueLine}</p>
              </div>
            )
          )}
          {dates !== "-" && (
            <div className="flex items-center gap-3">
              <CalendarIcon />
              <p className="text-[16px] font-semibold text-[#3F3F46] leading-[140%]">{dates}</p>
            </div>
          )}

          {availability !== "-" && (
            <div className="pl-4 py-3 flex items-center gap-3 mt-2" style={{ borderLeft: "5px solid #FABB05" }}>
              <div>
                <span className="text-[20px] font-bold text-zinc-900">Διαθεσιμότητα: </span>
                <span className="text-[16px] font-semibold text-zinc-800">{availability}</span>
              </div>
            </div>
          )}
        </div>
      )}

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
                {performers.map((p) => (
                  <PersonBubble
                    key={p.name}
                    name={p.name}
                    avatarUrl={p.avatarUrl}
                    size={50}
                    stackWidth={80}
                  />
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
        {!mySuggestion && <BookmarkStatusChips category="events" bookmark={bookmark} onToast={showToast} />}
      </div>

      {/* Community */}
      <CommunitySection
        ratings={ratingDistribution}
        ratingCount={ratingCount}
        isTopRated={isTopRated}
        topRatedNoun="Η εκδήλωση"
        communityRating={avgRating}
        reviews={reviews}
        savedRating={savedRating}
        savedReflection={savedReflection}
        itemId={data.item.id}
        userHandle={data.currentUserHandle ?? null}
        authGate={requireAuthRating}
        onPublished={(result) => {
          setSavedRating(result.rating);
          setSavedReflection(result.reflection);
          setLiveReview({ id: result.review_id, rating: result.rating, reflection: result.reflection });
          if (result.achievement) setAchievement(result.achievement);
          if (bookmark.status === "wishlist") {
            bookmark.setStatus("done");
            showToast("Μετακινήθηκε στα Πήγα ✓");
          }
        }}
        question="Με πόσα αστέρια θα βαθμολογούσες την εκδήλωση;"
        mySuggestion={mySuggestion}
        itemTitle={title}
        itemSlug={item.slug}
      />

      <RelatedSections sections={data.relatedSections} category="events" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="events"
        onClose={() => setSavedModal(null)}
      />
      <AchievementUnlockedModal
        open={achievementOpen}
        achievement={achievement}
        onClose={() => setAchievementOpen(false)}
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

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; myVote: 1 | -1 | null; userData?: any; appearAnimation?: boolean; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, savedRating, savedReflection, itemId, userHandle, authGate, onPublished, question, mySuggestion, itemTitle, itemSlug }: {
  ratings: { stars: number; pct: number }[]; ratingCount: number; isTopRated: boolean; topRatedNoun: string;
  communityRating: number; reviews: ReviewItem[];
  savedRating: number | null;
  savedReflection: string | null;
  itemId: string;
  userHandle: string | null;
  authGate: (fn: () => void) => boolean;
  onPublished: (result: { review_id: string; rating: number; reflection: string | null; avg_rating: number; rating_count: number; achievement: AchievementData | null }) => void;
  question: string;
  mySuggestion: { id: string; reflection: string | null; rating: number | null } | null;
  itemTitle: string; itemSlug: string;
}) {
  const reviewsCarouselRef = useRef<HTMLDivElement>(null);
  useFlipReorder(reviewsCarouselRef, "data-review-id", [reviews.map((r) => r.id).join(",")]);
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
          <RateThisItem
            question={question}
            category="events"
            itemId={itemId}
            initialRating={savedRating}
            initialReflection={savedReflection}
            userHandle={userHandle}
            authGate={authGate}
            onPublished={onPublished}
          />
        )}
      </div>
      {reviews.length > 0 && (
        <div className="flex flex-col items-center w-full gap-6">
          <div ref={reviewsCarouselRef} className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
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
                  appearAnimation={r.appearAnimation}
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
