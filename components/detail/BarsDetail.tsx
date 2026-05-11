"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { ItemGalleryViewer, type GalleryImage } from "@/components/detail/ItemGalleryViewer";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { useReview } from "@/hooks/useReview";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
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

export function BarsDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const bookmark = useBookmark(data.item.id, "bars", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { save: saveReview, busy: reviewBusy, savedRating } = useReview(
    data.item.id,
    { rating: data.myReview?.rating ?? null, reflection: data.myReview?.reflection ?? null },
    {
      onSaved: () => {
        if (bookmark.status === "wishlist") {
          bookmark.setStatus("done");
          showToast("Μετακινήθηκε στα Έχω πάει ✓");
        }
      },
    },
  );
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const [userText, setUserText] = useState(data.myReview?.reflection ?? "");

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

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

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const reviews = data.reviews.map(r => ({
    id: r.id,
    name: r.user.display_name,
    badge: getBadge(r.user.level),
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
            category="bars"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
          />
        }
      />

      {/* Hero / gallery */}
      {Array.isArray((item as any).images) && (item as any).images.length > 0 ? (
        <div className="pt-6">
          <ItemGalleryViewer
            images={(item as any).images as GalleryImage[]}
            tabs={["Εσωτερικά", "Εξωτερικά"]}
          />
        </div>
      ) : (
        <div className="px-6 pt-6">
          <div className="w-full h-[220px] rounded-[12px] overflow-hidden bg-zinc-800 flex items-center justify-center">
            {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-5xl">☕</span>}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="px-6 pt-5">
        <h1 className="font-bold text-zinc-800" style={{ fontSize: 26, lineHeight: "130%" }}>{title}</h1>
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

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        <BookmarkStatusChips category="bars" bookmark={bookmark} onToast={showToast} />
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
                <>
                  <textarea
                  value={userText}
                  onChange={e => setUserText(e.target.value)}
                  placeholder="Γράψε γιατί (προαιρετικό)"
                  maxLength={4000}
                  rows={3}
                  className="w-full rounded-[12px] border border-zinc-300 px-4 py-3 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-coral-600 focus:outline-none resize-none"
                />
                  <button
                  onClick={() => requireAuthRating(() => saveReview(userRating, userText.trim() || null))}
                  disabled={reviewBusy || userRating === savedRating}
                  className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {reviewBusy ? "Αποθήκευση..." : savedRating === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}
                </button>
                </>
              )}
            </div>
          )}

          {reviews.length > 0 && (
            <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
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
                />
              ))}
              <div className="flex-none w-6 shrink-0" />
            </div>
          )}

          <AllReviewsButton itemSlug={item.slug} count={ratingCount} />
        </div>
      </div>

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="bars"
        onClose={() => setSavedModal(null)}
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
