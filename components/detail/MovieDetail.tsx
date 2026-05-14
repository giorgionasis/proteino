"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { CarouselPortrait, type PortraitItem } from "@/components/recommendation/CarouselPortrait";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
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
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { Icon } from "@/components/ui/Icon";
import { UserBadge } from "@/components/ui/UserBadge";
import { badgeLabelForSuggestions, platformIconForChannel, ICON_PATHS } from "@/lib/icons";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { oscarIconForCategory } from "@/lib/icons";
import { safeImageUrl } from "@/lib/image-url";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Badge tier resolution moved to lib/icons:badgeLabelForSuggestions.
// `users.level` is unreliable (always 1 across the migrated corpus);
// suggestion_count is the real signal.
function getBadge(suggestionCount: number): "Expert" | "Platinum" | "Gold" | "Verified" {
  return badgeLabelForSuggestions(suggestionCount) ?? "Verified";
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewUser {
  id?: string;
  handle?: string;
  name: string;
  badge: "Verified" | "Expert" | "Platinum" | "Gold";
  placeholder_color: string;
  avatar_url: string | null;
  suggestion_count?: number;
  avg_quality_score?: number | null;
}

interface Review {
  id: string;
  user: ReviewUser;
  rating: number;
  date: string;
  text: string;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovieDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const bookmark = useBookmark(data.item.id, "movies", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const [savedRating, setSavedRating] = useState<number | null>(data.myReview?.rating ?? null);
  const [savedReflection, setSavedReflection] = useState<string | null>(data.myReview?.reflection ?? null);
  const [liveReview, setLiveReview] = useState<{ id: string; rating: number; reflection: string | null } | null>(null);
  const [openAwardType, setOpenAwardType] = useState<string | null>(null);
  const { item, extension: ext, suggestions, related } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const genre = item.metadata?.tags?.[0] ?? "-";
  const year = ext.release_date ? new Date(ext.release_date).getFullYear() : "-";
  const duration = ext.duration_min ? `${ext.duration_min}'` : "-";
  const country = ext.country ?? "-";
  const language = ext.language ?? "-";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const plot = ext.plot ?? "";
  const coverUrl = safeImageUrl(item.cover_url);
  const trailerUrl = ext.trailer_url;

  // Actor cards — use real avatar URLs when admin has saved them
  const actors: { name: string; avatar: string | null; placeholder_color: string }[] = Array.isArray(ext.actors)
    ? ext.actors.map((a: unknown, i: number) => {
        const obj = (a && typeof a === "object") ? (a as any) : null;
        return {
          name: getActorName(a).toUpperCase().split(" ").join("\n"),
          avatar: obj?.avatar ?? obj?.avatar_url ?? null,
          placeholder_color: ["#5a4a3a","#3a4a5a","#4a3a3a","#5a3a4a","#3a5a4a","#4a4a3a"][i % 6],
        };
      })
    : [];

  // Director — admin form saves `directors[]` (array). Older data has flat `director` string.
  // Each entry can be a string or `{name, avatar}`.
  const directorEntries: { name: string; avatar: string | null }[] = (() => {
    const src = (Array.isArray(ext.directors) && ext.directors.length > 0)
      ? ext.directors
      : ext.director
        ? [ext.director]
        : [];
    return src
      .map((d: any) => {
        if (typeof d === "string") return { name: d, avatar: null };
        if (d && typeof d === "object") return { name: d.name ?? "", avatar: d.avatar ?? d.avatar_url ?? null };
        return { name: "", avatar: null };
      })
      .filter((d: { name: string }) => d.name);
  })();
  const directorName = directorEntries[0]?.name ?? "-";

  // Awards — group by type (Oscar / BAFTA / Golden Globe / Cannes / Venice).
  // Admin saves [{type, category, year}]. We bucket by type for accordion rendering.
  type Award = { type: string; category: string; year?: number | string };
  const awardsByType: Record<string, Award[]> = {};
  if (Array.isArray(ext.awards)) {
    for (const a of ext.awards) {
      if (!a || typeof a !== "object") continue;
      const award = a as any;
      const type = String(award.type ?? "Άλλο").trim();
      if (!type) continue;
      if (!awardsByType[type]) awardsByType[type] = [];
      awardsByType[type].push({
        type,
        category: String(award.category ?? "").trim(),
        year: award.year,
      });
    }
  }
  // Sort award types by count desc — most-decorated first
  const awardTypes = Object.keys(awardsByType).sort(
    (a, b) => awardsByType[b].length - awardsByType[a].length
  );
  const totalAwards = awardTypes.reduce((sum, t) => sum + awardsByType[t].length, 0);
  // Default-expanded type = first in the sorted list when none chosen yet
  const expandedType = openAwardType ?? awardTypes[0] ?? null;

  const externalRatings = ext.external_ratings ?? item.metadata?.external_ratings;
  const imdb = externalRatings?.imdb ?? "-";
  const rt = externalRatings?.rt ?? externalRatings?.rotten_tomatoes ?? "-";
  const metacritic = externalRatings?.metacritic ?? "-";

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  // Featured suggestion (first one)
  const featured = suggestions[0];

  // Reviews come from the new `reviews` table (post migration 016) — one row
  // per (user, item) with mandatory rating + optional text. No more
  // suggestions.slice(1) — that featured the K2 submitter as a review.
  const mergedReviews = mergeLiveReview(data.reviews, liveReview, data.currentUser);
  const reviews: Review[] = mergedReviews.map(r => ({
    id: r.id,
    user: {
      id: r.user.id,
      handle: r.user.handle,
      name: r.user.display_name,
      badge: getBadge(r.user.suggestion_count ?? 0),
      placeholder_color: "#a5b5c4",
      avatar_url: r.user.avatar_url,
    },
    rating: r.rating,
    date: formatDate(r.created_at),
    text: r.reflection ?? "",
    likes: r.vote_up,
    dislikes: r.vote_down,
    myVote: r.my_vote,
  }));

  // Related items
  const relatedItems: PortraitItem[] = related.map(r => ({
    id: r.id,
    title: r.title,
    genre: r.metadata?.tags?.[0],
    year: r.ext?.release_date ? new Date(r.ext.release_date).getFullYear() : undefined,
    platform: r.ext?.channel ?? undefined,
    href: `/movies/${r.slug}`,
    cover_url: r.cover_url,
  }));

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <DetailHeaderActions
            category="movies"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
            showBookmark={!mySuggestion}
          />
        }
      />

      {/* ── Trailer image ─────────────────────────────────── */}
      <div className="px-6 pt-6">
        <div data-orbit-source className="relative w-full h-[228px] rounded-[12px] overflow-hidden bg-zinc-200">
          {coverUrl && <Image src={coverUrl} alt={title} fill className="object-cover" priority />}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[60px] h-[60px] rounded-full bg-white/80 flex items-center justify-center shadow-lg">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden>
                <path d="M2 1.5L18 11L2 20.5V1.5Z" fill="#27272A" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Airing-today strip — sits below the hero so it can't be
          missed on the way down to the title. Only renders when the
          admin booked this movie in `movies_tonight` for today; the
          page server self-clears at midnight on the next render. */}
      {data.airingToday && (
        <div className="px-6 pt-3">
          <AiringTodayBadge airing={data.airingToday} />
        </div>
      )}

      {/* ── Title + rating ──────────────────────────────────── */}
      <div className="px-6 pt-5 space-y-3">
        <h1 className="font-bold text-zinc-800" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
        <div className="flex items-center gap-2">
          <StarIcon size={14} filled />
          <span className="text-[15px] font-semibold text-zinc-700">{avgRating.toFixed(2)}</span>
          <span className="w-[5px] h-[5px] rounded-full bg-zinc-400" />
          <span className="text-[15px] font-medium text-zinc-600">{ratingCount} αξιολογήσεις</span>
        </div>
      </div>


      {/* ── Special-occasion stat bar — ONLY for Oscar movies with high rating */}
      {(awardsByType["Oscar"]?.length ?? 0) > 0 && avgRating >= 4.5 && (
        <div className="mx-6 mt-5 rounded-[12px] border border-zinc-200 px-4 py-6 flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[18px] font-bold text-zinc-800 leading-none">{avgRating.toFixed(2)}</span>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <StarIcon key={s} size={11} filled={s <= Math.round(avgRating)} />)}
            </div>
          </div>
          <div className="w-px h-[34px] bg-zinc-200" />
          <div className="flex items-center gap-1.5">
            <OscarIcon />
            <span className="text-[16px] font-bold text-zinc-800 text-center leading-tight whitespace-pre-line">
              {`${awardsByType["Oscar"].length}\nΌσκαρ`}
            </span>
          </div>
          <div className="w-px h-[34px] bg-zinc-200" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[18px] font-bold text-zinc-800 leading-none">{ratingCount}</span>
            <span className="text-[12px] font-semibold text-zinc-700 underline">αξιολογήσεις</span>
          </div>
        </div>
      )}

      {/* ── Featured suggestion ───────────────────────────── */}
      {featured && (
        <div className="mx-6 mt-6 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarWithPopup user={featured.user} size={50} />
              <div className="space-y-1">
                <p className="text-[14px] font-bold text-zinc-800 leading-none">{featured.user.display_name}</p>
                <UserBadge suggestionCount={featured.user.suggestion_count ?? 0} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500">
              <CalendarIcon />
              <span>{formatDate(featured.created_at)}</span>
            </div>
          </div>
          {/* Review text */}
          {featured.reflection && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{featured.reflection}</p>}
        </div>
      )}

      {/* ── Βαθμολογίες (platform ratings only) ──────────── */}
      {(imdb !== "-" || rt !== "-" || metacritic !== "-") && (
        <div className="mx-6 mt-6 rounded-[12px] bg-[#F2F2F7] px-5 pt-8 pb-[18px] space-y-[18px]">
          <p className="text-[16px] font-bold text-zinc-800" style={{ lineHeight: "130%" }}>Βαθμολογίες</p>
          <div className="space-y-1.5">
            {[
              { name: "IMDb",            score: imdb,       logo: <Icon name="imdb" size={32} alt="IMDb" /> },
              { name: "Rotten\nTomatoes",score: rt,          logo: <Icon name="rotten-tomatoes" size={32} alt="Rotten Tomatoes" /> },
              { name: "Metacritic",      score: metacritic,  logo: <Icon name="metacritic" size={32} alt="Metacritic" /> },
            ].filter(r => r.score !== "-").map(({ name, score, logo }, i) => (
              <div key={name}>
                {i > 0 && <div className="h-px bg-zinc-200 w-[302px] mx-auto my-1.5" />}
                <div className="flex items-center justify-between w-[302px] mx-auto py-2.5">
                  <div className="flex items-center gap-3">
                    {logo}
                    <span className="text-[16px] font-semibold text-zinc-800 whitespace-pre-line leading-tight">{name}</span>
                  </div>
                  <div className="h-10 flex items-center px-3 rounded-full border border-zinc-200 bg-white">
                    <span className="text-[18px] font-semibold text-zinc-900">{score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Information section ───────────────────────────── */}
      <div className="mt-8">
        {/* Category + Duration */}
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ"   value={genre} />
          <InfoCell label="ΔΙΑΡΚΕΙΑ"    value={duration} />
        </div>

        {/* Release + Country */}
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΥΚΛΟΦΟΡΙΑ"       value={String(year)} />
          <InfoCell label="ΧΩΡΑ ΠΑΡΑΓΩΓΗΣ"   value={country} />
        </div>

        {/* Language */}
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΓΛΩΣΣΑ" value={language} />
        </div>

        {/* Director(s) */}
        {directorEntries.length > 0 && (
          <>
            <InfoDivider />
            <div className="pl-6 py-5 space-y-5">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΣΚΗΝΟΘΕΣΙΑ</p>
              <div className="flex flex-col gap-4">
                {directorEntries.map((d, i) => (
                  <div key={`${d.name}-${i}`} className="flex items-center gap-5">
                    <div className="w-[50px] h-[50px] rounded-full shrink-0 bg-zinc-300 overflow-hidden">
                      {d.avatar ? (
                        <img src={d.avatar} alt={d.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <p className="text-[18px] font-bold text-zinc-900 leading-tight whitespace-pre-line">
                      {d.name.split(" ").join("\n")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actors — uses real avatar URL if admin saved one */}
        {actors.length > 0 && (
          <>
            <InfoDivider />
            <div className="py-5 space-y-5">
              <p className="pl-6 text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΡΩΤΑΓΩΝΙΣΤΕΣ</p>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pb-1">
                {actors.map((actor, i) => (
                  <div key={`${actor.name}-${i}`} className="flex-none flex flex-col items-center gap-4 w-[68px]">
                    <div
                      className="w-[50px] h-[50px] rounded-full shrink-0 overflow-hidden"
                      style={{ backgroundColor: actor.avatar ? "transparent" : actor.placeholder_color }}
                    >
                      {actor.avatar && (
                        <img src={actor.avatar} alt={actor.name.replace(/\n/g, " ")} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="text-[12px] font-bold text-zinc-900 text-center uppercase leading-tight whitespace-pre-line">{actor.name}</p>
                  </div>
                ))}
                <div className="flex-none w-6 shrink-0" />
              </div>
            </div>
          </>
        )}

        {/* Awards — accordion grouped by type (Oscar / BAFTA / Golden Globe / Cannes / Venice) */}
        {totalAwards > 0 && (
          <>
            <InfoDivider />
            <div className="pl-6 pr-6 py-5 space-y-5">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΒΡΑΒΕΙΑ</p>

              <div className="bg-white rounded-lg flex flex-col gap-2">
                {awardTypes.map((type) => {
                  const items = awardsByType[type];
                  const open = expandedType === type;
                  return (
                    <div key={type} className="flex flex-col gap-3">
                      {/* Header row */}
                      <button
                        onClick={() => setOpenAwardType(open ? null : type)}
                        className="flex items-center gap-2 px-2 active:opacity-70 transition-opacity"
                        aria-expanded={open}
                      >
                        <span className="text-[18px] font-bold text-zinc-800 uppercase tracking-wide">
                          {awardTypeLabel(type)}
                        </span>
                        <ChevronIcon open={open} />
                        <span className="ml-1 text-[12px] font-medium text-zinc-400">({items.length})</span>
                      </button>

                      {/* Expanded: horizontal scroll of award cards */}
                      {open && (
                        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-1">
                          {items.map((aw, i) => {
                            const oscarIcon = oscarIconForCategory(type, aw.category);
                            return (
                            <div key={`${type}-${i}`} className="flex-none flex flex-col items-center gap-3 w-[110px]">
                              {oscarIcon ? (
                                <Icon name={oscarIcon} size={72} alt={aw.category} />
                              ) : (
                                <AwardBadge category={aw.category} />
                              )}
                              <p className="text-[13px] font-semibold text-zinc-800 text-center leading-tight whitespace-pre-line">
                                {greekCategoryLabel(aw.category)}
                              </p>
                            </div>
                            );
                          })}
                          <div className="flex-none w-2 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Plot */}
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


      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        {!mySuggestion && <BookmarkStatusChips category="movies" bookmark={bookmark} onToast={showToast} />}
      </div>

      {/* ── Community section ─────────────────────────────── */}
      <div
        className="mt-8 py-8 flex flex-col items-center gap-[42px]"
        style={{ background: "linear-gradient(180deg,#fff 0%,#F2F2F7 10%,#F7F7FA 91%,#fff 100%)" }}
      >
        {/* Rating display + bars + input card */}
        <div className="w-[342px] flex flex-col gap-12">

          {/* Big rating number + Top Rated badge + histogram */}
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
                  Η ταινία ανήκει στο <span className="font-bold">top 10%</span> των καλύτερων όπως βαθμολογήθηκε από τους χρήστες
                </p>
              </div>
            )}

            {/* Star distribution histogram — always shown when there are ratings */}
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
              question="Με πόσα αστέρια θα βαθμολογούσες την ταινία;"
              category="movies"
              itemId={data.item.id}
              initialRating={savedRating}
              initialReflection={savedReflection}
              userHandle={data.currentUserHandle ?? null}
              authGate={requireAuthRating}
              onPublished={(result) => {
                setSavedRating(result.rating);
                setSavedReflection(result.reflection);
                setLiveReview({ id: result.review_id, rating: result.rating, reflection: result.reflection });
                if (bookmark.status === "wishlist") {
                  bookmark.setStatus("done");
                  showToast("Μετακινήθηκε στα Είδα ✓");
                }
              }}
            />
          )}
        </div>

        {/* Reviews carousel + load more */}
        {reviews.length > 0 && (
          <div className="flex flex-col items-center w-full gap-6">
            {/* Carousel */}
            <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
              {reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  variant="carousel"
                  id={review.id}
                  rating={review.rating}
                  text={review.text}
                  date={review.date}
                  name={review.user.name}
                  userData={{ ...review.user, display_name: review.user.name }}
                  badge={review.user.badge as any}
                  likes={review.likes}
                  dislikes={review.dislikes}
                  myVote={review.myVote}
                  appearAnimation={!!liveReview && review.id === liveReview.id}
                />
              ))}
              <div className="flex-none w-6 shrink-0" />
            </div>

            {/* Load more */}
          </div>
        )}

        <AllReviewsButton itemSlug={item.slug} count={ratingCount} />
      </div>

      {/* Admin-configured "More from {director|actor}" carousels.
          Auto-hides per rule when fewer than min_items siblings.
          See lib/related-sections.ts + migration 034. */}
      <RelatedSections sections={data.relatedSections} category="movies" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="movies"
        onClose={() => setSavedModal(null)}
      />
      {toast}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoDivider() {
  return <div className="h-px bg-zinc-200 ml-5" />;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800 leading-[140%] whitespace-pre-line">{value}</p>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12 / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}

function OscarIcon({ size = 20 }: { size?: number }) {
  const w = size * 13 / 32;
  return (
    <svg width={w} height={size} viewBox="0 0 13 32" fill="none" aria-hidden>
      <ellipse cx="6.5" cy="6" rx="4" ry="5" fill="#F8D160" stroke="#c9a800" strokeWidth="1" />
      <rect x="5" y="11" width="3" height="9" fill="#F8D160" stroke="#c9a800" strokeWidth="0.8" />
      <rect x="3" y="20" width="7" height="4" rx="1" fill="#F8D160" stroke="#c9a800" strokeWidth="0.8" />
      <rect x="2" y="24" width="9" height="2.5" rx="0.5" fill="#c9a800" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/* ── Award accordion helpers ─────────────────────────────────── */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`text-zinc-700 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Display label for an award type (DB stores English keys, screen shows mixed casing)
function awardTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === "oscar" || t === "oscars" || t === "academy award" || t === "academy awards") return "ΟΣΚΑΡ";
  if (t === "bafta" || t === "baftas") return "BAFTA";
  if (t === "golden globe" || t === "golden globes") return "Χρυσές Σφαίρες";
  if (t === "cannes") return "Cannes";
  if (t === "venice") return "Venice";
  if (t === "berlin") return "Berlin";
  return type;
}

// English category → Greek translation shown below the badge.
// Falls back to the English category if no mapping exists.
const GREEK_CATEGORY: Record<string, string> = {
  "best picture":              "Καλύτερης\nΤαινίας",
  "best film":                 "Καλύτερης\nΤαινίας",
  "best motion picture":       "Καλύτερης\nΤαινίας",
  "best director":             "Σκηνοθεσίας",
  "best actor":                "Α'\nΑνδρικού",
  "best leading actor":        "Α'\nΑνδρικού",
  "best actress":              "Α'\nΓυναικείου",
  "best leading actress":      "Α'\nΓυναικείου",
  "best supporting actor":     "Β'\nΑνδρικού",
  "best supporting actress":   "Β'\nΓυναικείου",
  "best screenplay":           "Σεναρίου",
  "best original screenplay":  "Πρωτότυπου\nΣεναρίου",
  "best adapted screenplay":   "Διασκευασμένου\nΣεναρίου",
  "best cinematography":       "Φωτογραφίας",
  "best score":                "Μουσικής",
  "best original score":       "Πρωτότυπης\nΜουσικής",
  "best song":                 "Τραγουδιού",
  "best original song":        "Πρωτότυπου\nΤραγουδιού",
  "best editing":              "Μοντάζ",
  "best visual effects":       "Ειδικών\nΕφέ",
  "best animated feature":     "Animation",
  "best foreign language film":"Ξενόγλωσσης\nΤαινίας",
  "best documentary":          "Ντοκιμαντέρ",
  "palme d'or":                "Χρυσός\nΦοίνικας",
  "grand prix":                "Grand Prix",
  "jury prize":                "Βραβείο\nΕπιτροπής",
};

function greekCategoryLabel(category: string): string {
  const k = category.trim().toLowerCase();
  return GREEK_CATEGORY[k] ?? category;
}

// English category → 2-line label inside the laurel badge
function badgeLines(category: string): [string, string] {
  const k = category.trim().toUpperCase();
  // Already 2 words? Split. Otherwise fit on one line.
  const parts = k.split(/\s+/);
  if (parts.length >= 2) {
    // Drop "BEST" prefix if present and split remainder by halves
    const rest = parts[0] === "BEST" ? parts.slice(1) : parts;
    if (rest.length === 1) return ["BEST", rest[0]];
    if (rest.length === 2) return [`BEST ${rest[0]}`.trim(), rest[1]];
    const mid = Math.ceil(rest.length / 2);
    return [rest.slice(0, mid).join(" "), rest.slice(mid).join(" ")];
  }
  return [k, ""];
}

/**
 * Laurel-wreath award badge — gold + star + 2-line English category text.
 * Generic (renders any category) so we don't need per-category image assets.
 */
function AwardBadge({ category }: { category: string }) {
  const [line1, line2] = badgeLines(category);
  const gold = "#F8B500";
  const goldDark = "#C58E00";
  return (
    <svg width="92" height="72" viewBox="0 0 92 72" fill="none" aria-hidden>
      {/* Left laurel */}
      <g stroke={gold} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M14 14 C 4 22, 4 50, 18 60" />
        {/* Leaves left */}
        <path d="M11 22 q -4 -1 -7 -4" />
        <path d="M9 30 q -5 -1 -8 -4" />
        <path d="M9 38 q -5 0 -8 -3" />
        <path d="M11 46 q -4 1 -7 -2" />
        <path d="M14 53 q -3 2 -6 0" />
      </g>
      {/* Right laurel */}
      <g stroke={gold} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M78 14 C 88 22, 88 50, 74 60" />
        <path d="M81 22 q 4 -1 7 -4" />
        <path d="M83 30 q 5 -1 8 -4" />
        <path d="M83 38 q 5 0 8 -3" />
        <path d="M81 46 q 4 1 7 -2" />
        <path d="M78 53 q 3 2 6 0" />
      </g>
      {/* 2-line category text */}
      <text x="46" y={line2 ? "30" : "36"} textAnchor="middle" fontFamily="Open Sans, system-ui, sans-serif" fontWeight="700" fontSize="9" fill="#27272A">
        {line1}
      </text>
      {line2 && (
        <text x="46" y="42" textAnchor="middle" fontFamily="Open Sans, system-ui, sans-serif" fontWeight="700" fontSize="9" fill="#27272A">
          {line2}
        </text>
      )}
      {/* Star — gold filled, anchored at bottom */}
      <g transform="translate(36, 50)">
        <polygon
          points="10,0 12.4,7.4 20,7.4 13.8,11.8 16.2,19.2 10,14.8 3.8,19.2 6.2,11.8 0,7.4 7.6,7.4"
          fill={gold}
          stroke={goldDark}
          strokeWidth="0.6"
        />
      </g>
    </svg>
  );
}

/**
 * Airing-today strip — full-width white card sitting just under the
 * hero. White surface with a subtle border (not coral — coral was too
 * loud per design call). The coral live-dot is the only accent colour,
 * doing the "you're seeing this today" job on its own.
 *
 * Layout: pulse-dot + ΑΠΟΨΕ ΣΤΗΝ TV on the left, air time + channel
 * logo on the right, divider between time and logo.
 */
function AiringTodayBadge({ airing }: { airing: { channel: string; air_time: string } }) {
  const iconName = platformIconForChannel(airing.channel);
  const time = airing.air_time?.slice(0, 5) ?? "";
  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] bg-white border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative inline-flex w-2.5 h-2.5 shrink-0" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-coral-600 animate-ping opacity-60" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-coral-600" />
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-zinc-900 truncate">
          Απόψε στην TV
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {time && (
          <span className="text-[14px] font-bold tabular-nums text-zinc-900">{time}</span>
        )}
        <span className="w-px h-4 bg-zinc-200" aria-hidden />
        {iconName ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={ICON_PATHS[iconName]}
            alt={airing.channel}
            title={airing.channel}
            style={{ height: 18, width: "auto" }}
          />
        ) : (
          <span className="text-[13px] font-bold text-zinc-800">{airing.channel}</span>
        )}
      </div>
    </div>
  );
}
