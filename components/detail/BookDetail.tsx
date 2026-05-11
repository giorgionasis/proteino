"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
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
import { AuthorCard } from "@/components/detail/AuthorCard";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
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

export function BookDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const bookmark = useBookmark(data.item.id, "books", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { save: saveReview, busy: reviewBusy, savedRating } = useReview(
    data.item.id,
    { rating: data.myReview?.rating ?? null, reflection: data.myReview?.reflection ?? null },
    {
      onSaved: () => {
        if (bookmark.status === "wishlist") {
          bookmark.setStatus("done");
          showToast("Μετακινήθηκε στα Διάβασα ✓");
        }
      },
    },
  );
  const { requireAuth: requireAuthRating, modalProps: ratingGuardProps } = useGuestGuard("να βαθμολογήσεις");
  const [userText, setUserText] = useState(data.myReview?.reflection ?? "");
  const [authorBioExpanded, setAuthorBioExpanded] = useState(false);

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

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

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  // Author rich data (admin-managed via metadata.author_* fields).
  // Falls back gracefully when fields are missing — at minimum we have the name.
  const authorPhoto = (meta.author_photo_url as string | undefined) ?? null;
  const authorBirthYear = (meta.author_birth_year as number | undefined) ?? null;
  const authorAge = authorBirthYear ? new Date().getFullYear() - authorBirthYear : null;
  const authorBookCount = (meta.author_book_count as number | undefined) ?? null;
  const authorBio = (meta.author_bio as string | undefined) ?? null;

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
            category="books"
            bookmark={bookmark}
            shareTitle={data.item.title}
            onSaved={(r) => setSavedModal(r)}
            onToast={showToast}
          />
        }
      />

      {/* ── Cover ──────────────────────────────────────────────── */}
      <div className="px-6 pt-6">
        <div data-orbit-source className="relative w-full h-[280px] rounded-[12px] overflow-hidden bg-zinc-200 flex items-center justify-center">
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
          <div className="mx-6 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-[44px] h-[44px] rounded-full shrink-0 overflow-hidden bg-zinc-200 flex items-center justify-center">
                  {s.user.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.user.avatar_url} alt={s.user.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-500 text-base font-bold">{s.user.display_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-zinc-800">{s.user.display_name}</p>
                  <UserBadge level={s.user.level} />
                </div>
              </div>
              <span className="text-[13px] font-medium text-zinc-500">{formatDate(s.created_at)}</span>
            </div>
            {s.reflection && (
              <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{s.reflection}</p>
            )}
            {s.rating != null && s.rating > 0 && (
              <div className="flex items-center gap-0.5">
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

      {/* ── Plot ───────────────────────────────────────────────── */}
      {plot && (
        <div className="px-6 mt-8 space-y-4">
          <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">Πλοκή</p>
          <ExpandableText
            text={plot}
            collapsedLines={5}
            className="text-[15px] font-normal text-zinc-800 leading-[150%]"
          />
        </div>
      )}

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        <BookmarkStatusChips category="books" bookmark={bookmark} onToast={showToast} />
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
            {isTopRated && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[22px] font-semibold text-zinc-800 text-center">Top Rated</p>
                <p className="text-[14px] font-medium text-zinc-600 text-center leading-[150%] max-w-[300px]">
                  Το βιβλίο ανήκει στο <span className="font-bold">top 10%</span> των καλύτερων όπως βαθμολογήθηκε από τους χρήστες
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
              <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;</p>
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

      {/* ── Author card — placed AFTER reviews per Figma; engagement-first ── */}
      {author !== "-" && (
        <div className="mx-6 mt-8">
          <AuthorCard
            name={author}
            photoUrl={authorPhoto}
            age={authorAge}
            bookCount={authorBookCount}
            bio={authorBio}
          />
        </div>
      )}

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="books"
        onClose={() => setSavedModal(null)}
      />
      {toast}
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
