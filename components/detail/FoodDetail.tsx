"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { InnerHeader } from "@/components/layout/Header";
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
import { PlatformLinksCard } from "@/components/detail/PlatformLinksCard";
import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { AMENITY_ICON_MAP, AMENITY_LABELS, getActiveAmenities } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(level: number): "Verified" | "Expert" | "Platinum" | "Gold" {
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

// ── Component ──────────────────────────────────────────────────────────────────

export function FoodDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const bookmark = useBookmark(data.item.id, "food", data.bookmarkStatus);
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
  const gatedSaveReview = async (r: number, t: string | null) => {
    let p: Promise<unknown> = Promise.resolve();
    requireAuthRating(() => { p = saveReview(r, t); });
    return p;
  };
  const [userText, setUserText] = useState(data.myReview?.reflection ?? "");

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const category = ext.type ?? item.metadata?.tags?.[0] ?? "-";
  const cuisine = ext.cuisine ?? "-";
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
  const activeAmenities = getActiveAmenities(information.amenities);

  const deliveryLinks = ext.delivery_links ?? {};

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

  const reviews: ReviewItem[] = data.reviews.map(r => ({
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
            category="food"
            bookmark={bookmark}
            shareTitle={title}
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

      {/* Photo gallery */}
      {Array.isArray((item as any).images) && (item as any).images.length > 0 && (
        <div className="mt-6">
          <ItemGalleryViewer
            images={(item as any).images as GalleryImage[]}
            tabs={["Εξωτερικά", "Εσωτερικά", "Πιάτα"]}
          />
        </div>
      )}

      {/* Featured suggestion */}
      {featured && (
        <div className="mx-6 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarWithPopup user={featured.user} size={45} />
              <div className="space-y-1">
                <p className="text-[14px] font-bold text-zinc-800">{featured.user.display_name}</p>
                <UserBadge level={featured.user.level} variant="xs" />
              </div>
            </div>
            <span className="text-[14px] font-medium text-zinc-500">{formatDate(featured.created_at)}</span>
          </div>
          {featured.reflection && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{featured.reflection}</p>}
        </div>
      )}

      {/* Amenities row — under user reflection */}
      {activeAmenities.length > 0 && (
        <div className="mt-6">
          <div
            className={cn(
              "px-6 pb-1",
              activeAmenities.length > 4
                ? "flex gap-6 overflow-x-auto no-scrollbar"
                : "grid grid-cols-4 gap-3",
            )}
          >
            {activeAmenities.map((key) => {
              const iconName = AMENITY_ICON_MAP[key];
              const label = AMENITY_LABELS[key] ?? key;
              if (!iconName) return null;
              return (
                <div key={key} className="flex-none flex flex-col items-center gap-2 w-[72px]">
                  <Icon name={iconName} size={44} />
                  <span className="text-[12px] font-semibold text-zinc-800 text-center leading-tight">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* External ratings */}
      {(google !== "-" || tripadvisor !== "-") && (
        <div className="mx-6 mt-6 rounded-[12px] px-5 pt-8 pb-[18px] space-y-[18px]" style={{ backgroundColor: "#F2F2F7" }}>
          <p className="text-[16px] font-bold text-zinc-800">Βαθμολογίες</p>
          <div className="space-y-1.5">
            {[
              { name: "Google",      score: google,      logo: <Icon name="google-pin" size={28} /> },
              { name: "Tripadvisor", score: tripadvisor, logo: <TripAdvisorLogo /> },
            ].filter(r => r.score !== "-").map(({ name, score, logo }, i) => (
              <div key={name}>
                {i > 0 && <div className="h-px bg-zinc-200 w-[302px] mx-auto my-1.5" />}
                <div className="flex items-center justify-between w-[302px] mx-auto py-2.5">
                  <div className="flex items-center gap-3">{logo}<span className="text-[16px] font-semibold text-zinc-800">{name}</span></div>
                  <div className="h-10 flex items-center px-3 rounded-full border border-zinc-200 bg-white">
                    <span className="text-[18px] font-semibold text-zinc-900">{score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-8">
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={category} />
          <InfoCell label="ΚΟΥΖΙΝΑ"   value={cuisine} />
        </div>
        <InfoDivider />
        <div className="pl-6 pr-6 py-5 space-y-5">
          <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΤΟΠΟΘΕΣΙΑ</p>
          <p className="text-[18px] font-bold text-zinc-800">{address}</p>
          <button className="flex items-center gap-2 text-[14px] font-bold text-zinc-700 underline">
            <MapPinIcon /> Άνοιγμα στους χάρτες
          </button>
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΤΗΛΕΦΩΝΟ"   value={phone} />
          <InfoCell label="ΠΛΗΡΟΦΟΡΙΕΣ" value={infoLink} coral />
        </div>
      </div>

      {/* Delivery — only show rows for platforms that actually have a link */}
      {(deliveryLinks.efood || deliveryLinks.box) && (
        <div className="mx-6 mt-6">
          <PlatformLinksCard
            title="Delivery"
            ctaLabel="Παραγγελία"
            links={[
              ...(deliveryLinks.efood
                ? [{ key: "efood", brandIcon: "efood" as const, brandIconWidth: 94, href: deliveryLinks.efood }]
                : []),
              ...(deliveryLinks.box
                ? [{ key: "box", brandIcon: "box" as const, brandIconWidth: 104, href: deliveryLinks.box }]
                : []),
            ]}
          />
        </div>
      )}

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        <BookmarkStatusChips category="food" bookmark={bookmark} onToast={showToast} />
      </div>

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Το εστιατόριο" communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} saveReview={gatedSaveReview} userText={userText} setUserText={setUserText} reviewBusy={reviewBusy} savedRating={savedRating} question="Με πόσα αστέρια θα βαθμολογούσες το εστιατόριο;" mySuggestion={mySuggestion} itemTitle={title} itemSlug={item.slug} />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="food"
        onClose={() => setSavedModal(null)}
      />
      {toast}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

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

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }

function InfoCell({ label, value, coral }: { label: string; value: string; coral?: boolean }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className={cn("text-[18px] font-bold leading-[140%]", coral ? "text-[#FE6F5E] underline" : "text-zinc-800")}>{value}</p>
    </div>
  );
}

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; myVote: 1 | -1 | null; userData?: any; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, userRating, setUserRating, userText, setUserText, saveReview, reviewBusy, savedRating, question, mySuggestion, itemTitle, itemSlug }: {
  ratings: { stars: number; pct: number }[];
  ratingCount: number;
  isTopRated: boolean;
  topRatedNoun: string;
  communityRating: number;
  reviews: ReviewItem[];
  userRating: number;
  setUserRating: (n: number) => void;
  saveReview: (rating: number, reflection: string | null) => Promise<unknown>;
  userText: string;
  setUserText: (s: string) => void;
  reviewBusy: boolean;
  savedRating: number | null;
  question: string;
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
                onClick={() => saveReview(userRating, userText.trim() || null)}
                disabled={reviewBusy || userRating === savedRating}
                className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {reviewBusy ? "Αποθήκευση..." : savedRating === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}
              </button>
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

// ── Icons & logos ──────────────────────────────────────────────────────────────

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12/13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}

function MapPinIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}

function TripAdvisorLogo() {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#34E0A1" }}>
      <span className="text-[11px] font-black text-white">TA</span>
    </div>
  );
}

