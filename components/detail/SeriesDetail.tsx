"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { useFlipReorder } from "@/hooks/useFlipReorder";
import type { AchievementData } from "@/hooks/useSubmission";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { BookmarkStatusChips } from "@/components/detail/BookmarkStatusChips";
import { BookmarkSavedModal, type BookmarkSaveResult } from "@/components/detail/BookmarkSavedModal";
import { useBookmark } from "@/hooks/useBookmark";
import { RateThisItem } from "@/components/detail/RateThisItem";
import { mergeLiveReview } from "@/lib/reviews/merge-live";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import { RelatedSections } from "@/components/detail/RelatedSections";
import { useToast } from "@/components/ui/Toast";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { UserBadge } from "@/components/ui/UserBadge";
import { Icon } from "@/components/ui/Icon";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { PersonBubble } from "@/components/detail/PersonBubble";
import { streamingIconForChannel, badgeLabelForSuggestions } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(suggestionCount: number): "Expert" | "Platinum" | "Gold" | "Verified" {
  return badgeLabelForSuggestions(suggestionCount) ?? "Verified";
}

function getActorData(actor: unknown): { name: string; avatarUrl: string | null } {
  if (typeof actor === "string") return { name: actor, avatarUrl: null };
  if (actor && typeof actor === "object") {
    const o = actor as any;
    const name = typeof o.name === "string" ? o.name : "-";
    const avatarUrl =
      (typeof o.avatar === "string" && o.avatar) ||
      (typeof o.photo === "string" && o.photo) ||
      (typeof o.avatar_url === "string" && o.avatar_url) ||
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

export function SeriesDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const bookmark = useBookmark(data.item.id, "series", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const [savedRating, setSavedRating] = useState<number | null>(data.myReview?.rating ?? null);
  const [savedReflection, setSavedReflection] = useState<string | null>(data.myReview?.reflection ?? null);
  const [liveReview, setLiveReview] = useState<{ id: string; rating: number; reflection: string | null } | null>(null);
  const [achievement, setAchievement] = useState<AchievementData | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const reviewsCarouselRef = useRef<HTMLDivElement>(null);

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
  const trailerUrl = typeof ext.trailer_url === "string" && ext.trailer_url ? ext.trailer_url : null;

  const actors: { name: string; avatarUrl: string | null }[] = Array.isArray(ext.actors)
    ? ext.actors.map((a: unknown) => getActorData(a)).filter((a) => a.name !== "-")
    : [];

  const featured = suggestions[0];

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const mergedReviews = mergeLiveReview(data.reviews, liveReview, data.currentUser);
  const reviews = mergedReviews.map(r => ({
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

  useFlipReorder(reviewsCarouselRef, "data-review-id", [reviews.map((r) => r.id).join(",")]);

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <DetailHeaderActions
            category="series"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
            showBookmark={!mySuggestion}
          />
        }
      />

      {/* Cover */}
      <div className="px-6 pt-6">
        <div data-orbit-source className="relative w-full h-[228px] rounded-[12px] overflow-hidden bg-zinc-800 flex items-center justify-center">
          {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-4xl">📺</span>}
          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Παρακολούθηση trailer"
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-[60px] h-[60px] rounded-full bg-white/85 flex items-center justify-center shadow-lg transition-transform group-active:scale-95">
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden>
                  <path d="M2 1.5L18 11L2 20.5V1.5Z" fill="#27272A" />
                </svg>
              </div>
            </a>
          )}
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

      {/* Featured suggestion */}
      {featured && (
        <div className="mx-6 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarWithPopup user={featured.user} size={45} />
              <div className="space-y-1">
                <p className="text-[14px] font-bold text-zinc-800">{featured.user.display_name}</p>
                <UserBadge suggestionCount={featured.user.suggestion_count ?? 0} variant="xs" />
              </div>
            </div>
            <span className="text-[14px] font-medium text-zinc-500">{formatDate(featured.created_at)}</span>
          </div>
          {featured.reflection && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{featured.reflection}</p>}
        </div>
      )}

      {/* Information — only render rows where at least one cell has a real value. */}
      <div className="mt-8">
        {(genre !== "-" || seasons > 0) && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {genre !== "-" ? <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={genre} /> : <div className="flex-1" />}
              {seasons > 0 ? <InfoCell label="ΣΕΖΟΝ" value={String(seasons)} /> : <div className="flex-1" />}
            </div>
          </>
        )}
        {(String(year) !== "-" || country !== "-") && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {String(year) !== "-" ? <InfoCell label="ΕΝΑΡΞΗ" value={String(year)} /> : <div className="flex-1" />}
              {country !== "-" ? <InfoCell label="ΧΩΡΑ" value={country} /> : <div className="flex-1" />}
            </div>
          </>
        )}
        {(language !== "-" || network !== "-") && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {language !== "-" ? <InfoCell label="ΓΛΩΣΣΑ" value={language} /> : <div className="flex-1" />}
              {network !== "-" ? (
                <InfoCellWithIcon label="ΔΙΚΤΥΟ" value={network} icon={streamingIconForChannel(network)} />
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </>
        )}
        {directorName !== "-" && (
          <>
            <InfoDivider />
            <div className="pl-6 py-5 space-y-5">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΣΚΗΝΟΘΕΣΙΑ</p>
              <PersonBubble name={directorName} layout="inline" size={50} />
            </div>
          </>
        )}
        {actors.length > 0 && (
          <>
            <InfoDivider />
            <div className="py-5 space-y-5">
              <p className="pl-6 text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΡΩΤΑΓΩΝΙΣΤΕΣ</p>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pb-1">
                {actors.map((actor) => (
                  <PersonBubble
                    key={actor.name}
                    name={actor.name}
                    avatarUrl={actor.avatarUrl}
                    size={50}
                    stackWidth={72}
                  />
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
              <ExpandableText
                text={plot}
                collapsedLines={4}
                className="text-[15px] font-normal text-zinc-800 leading-[150%]"
              />
            </div>
          </>
        )}
      </div>


      {/* Bookmark status chips — always visible, doubles as a save
          affordance + a state setter. */}
      <div className="px-6 mt-8">
        {!mySuggestion && <BookmarkStatusChips category="series" bookmark={bookmark} onToast={showToast} />}
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
            {ratingDistribution.some((d) => d.pct > 0) && (
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
            <RateThisItem
              question="Με πόσα αστέρια θα βαθμολογούσες τη σειρά;"
              category="series"
              itemId={data.item.id}
              initialRating={savedRating}
              initialReflection={savedReflection}
              userHandle={data.currentUserHandle ?? null}
              authGate={requireAuthRating}
              onPublished={(result) => {
                setSavedRating(result.rating);
                setSavedReflection(result.reflection);
                setLiveReview({ id: result.review_id, rating: result.rating, reflection: result.reflection });
                if (result.achievement) setAchievement(result.achievement);
                if (bookmark.status === "wishlist") {
                  bookmark.setStatus("done");
                  showToast("Μετακινήθηκε στα Είδα ✓");
                }
              }}
            />
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="flex flex-col items-center w-full gap-6">
              <div ref={reviewsCarouselRef} className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
                {reviews.map(review => (
                  <ReviewCard
                  key={review.id}
                  variant="carousel"
                  id={review.id}
                  rating={review.rating}
                  text={review.text}
                  date={review.date}
                  name={review.name}
                  userData={review.userData}
                  badge={review.badge}
                  likes={review.likes}
                  dislikes={review.dislikes}
                  myVote={review.myVote}
                  appearAnimation={!!liveReview && review.id === liveReview.id}
                />
                ))}
                <div className="flex-none w-6 shrink-0" />
              </div>
            </div>
          )}

          <AllReviewsButton itemSlug={item.slug} count={ratingCount} />
        </div>
      </div>

      <RelatedSections sections={data.relatedSections} category="series" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="series"
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

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800 leading-[140%] whitespace-pre-line">{value}</p>
    </div>
  );
}

function InfoCellWithIcon({ label, value, icon }: { label: string; value: string; icon: ReturnType<typeof streamingIconForChannel> }) {
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
