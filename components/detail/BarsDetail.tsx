"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { useFlipReorder } from "@/hooks/useFlipReorder";
import type { AchievementData } from "@/hooks/useSubmission";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { ItemGalleryViewer, type GalleryImage } from "@/components/detail/ItemGalleryViewer";
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
import { RatingCard } from "@/components/detail/RatingCard";
import { badgeLabelForSuggestions } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

/** Parse an external_ratings entry that can be plain string or {score, count}. */
function parseRating(v: unknown): { score: string; count?: number } {
  if (v && typeof v === "object" && "score" in v) {
    const o = v as { score?: unknown; count?: unknown };
    return { score: String(o.score ?? "-"), count: typeof o.count === "number" ? o.count : undefined };
  }
  return { score: typeof v === "string" || typeof v === "number" ? String(v) : "-" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(suggestionCount: number): "Expert" | "Platinum" | "Gold" | "Verified" {
  return badgeLabelForSuggestions(suggestionCount) ?? "Verified";
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

export function BarsDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const bookmark = useBookmark(data.item.id, "bars", data.bookmarkStatus);
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
  const category = ext.type ?? item.metadata?.tags?.[0] ?? "-";
  const address = ext.address ?? "-";
  const phone = ext.telephone ?? "-";
  const lat = typeof ext.lat === "number" ? ext.lat : null;
  const lng = typeof ext.lng === "number" ? ext.lng : null;
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;

  const externalRatings = ext.external_ratings ?? {};
  const googleR = parseRating(externalRatings.google);

  const information = ext.information ?? {};
  const infoLink = information.website ?? information.instagram ?? "-";

  const mapUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : address !== "-"
        ? `https://www.google.com/maps/search/${encodeURIComponent(`${title} ${address}`)}`
        : null;

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

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
            category="bars"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
            showBookmark={!mySuggestion}
          />
        }
      />

      {/* Hero / gallery */}
      {Array.isArray((item as any).images) && (item as any).images.length > 0 ? (
        <div data-orbit-source className="pt-6">
          <ItemGalleryViewer
            images={(item as any).images as GalleryImage[]}
            tabs={["Εσωτερικά", "Εξωτερικά"]}
          />
        </div>
      ) : (
        <div className="px-6 pt-6">
          <div data-orbit-source className="w-full h-[220px] rounded-[12px] overflow-hidden bg-zinc-800 flex items-center justify-center">
            {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-5xl">☕</span>}
          </div>
        </div>
      )}

      {/* Title + rating */}
      <div className="px-6 pt-5 space-y-2">
        <h1 className="font-bold text-[#27272A]" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
        <div className="flex items-center gap-2">
          <StarIcon size={14} filled />
          <span className="text-[18px] font-bold text-[#3F3F46]">{avgRating.toFixed(2)}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
          <span className="text-[14px] font-semibold text-[#3F3F46] underline">{ratingCount} αξιολογήσεις</span>
        </div>
        {category !== "-" && (
          <p className="text-[14px] font-semibold text-zinc-500 uppercase tracking-[0.1px] pt-1">{category}</p>
        )}
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

      {/* Google rating card — only when admin has stored a score. */}
      {googleR.score !== "-" && (
        <div className="mx-6 mt-6">
          <RatingCard
            brand="google"
            score={googleR.score}
            scale="/5"
            count={googleR.count}
            href={mapUrl ?? undefined}
          />
        </div>
      )}

      {/* Πληροφορίες — only renders rows that have real data. */}
      {(address !== "-" || phone !== "-" || infoLink !== "-") && (
        <div className="mx-6 mt-6 rounded-[12px] bg-[#F2F2F7] px-5 py-6 space-y-5">
          <p className="text-[16px] font-bold text-zinc-800">Πληροφορίες</p>
          {[
            address !== "-" && {
              label: "Διεύθυνση",
              value: address,
              href: mapUrl,
            },
            phone !== "-" && {
              label: "Τηλέφωνο",
              value: phone,
              href: `tel:${phone}`,
            },
            infoLink !== "-" && {
              label: "Περισσότερα",
              value: infoLink,
              href: /^https?:\/\//.test(infoLink) ? infoLink : `https://${infoLink}`,
            },
          ]
            .filter((x): x is { label: string; value: string; href: string } => Boolean(x))
            .map((row, i) => (
              <div key={row.label}>
                {i > 0 && <div className="h-px bg-zinc-200 mb-5" />}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-zinc-500 shrink-0">{row.label}</p>
                  <a
                    href={row.href}
                    target={row.label === "Τηλέφωνο" ? undefined : "_blank"}
                    rel={row.label === "Τηλέφωνο" ? undefined : "noopener noreferrer"}
                    className="text-[15px] font-medium text-zinc-800 text-right truncate active:opacity-70 transition-opacity"
                  >
                    {row.value}
                  </a>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        {!mySuggestion && <BookmarkStatusChips category="bars" bookmark={bookmark} onToast={showToast} />}
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
                  Το μαγαζί ανήκει στο <span className="font-bold">top 10%</span> των καλύτερων όπως βαθμολογήθηκε από τους χρήστες
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
              question="Με πόσα αστέρια θα το βαθμολογούσες;"
              category="bars"
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
                  showToast("Μετακινήθηκε στα Έχω πάει ✓");
                }
              }}
            />
          )}

          {reviews.length > 0 && (
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
          )}

          <AllReviewsButton itemSlug={item.slug} count={ratingCount} />
        </div>
      </div>

      <RelatedSections sections={data.relatedSections} category="bars" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="bars"
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

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12 / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}
