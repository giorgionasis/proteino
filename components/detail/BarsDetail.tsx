"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { useFlipReorder } from "@/hooks/useFlipReorder";
import type { AchievementData } from "@/hooks/useSubmission";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { InnerHeader } from "@/components/layout/Header";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { ItemGalleryViewer, type GalleryImage } from "@/components/detail/ItemGalleryViewer";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { RateThisItem } from "@/components/detail/RateThisItem";
import { mergeLiveReview } from "@/lib/reviews/merge-live";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import { RelatedSections } from "@/components/detail/RelatedSections";
import { useBookmark } from "@/hooks/useBookmark";
import { BookmarkStatusChips } from "@/components/detail/BookmarkStatusChips";
import { BookmarkSavedModal, type BookmarkSaveResult } from "@/components/detail/BookmarkSavedModal";
import { useToast } from "@/components/ui/Toast";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { Icon } from "@/components/ui/Icon";
import { ICON_PATHS } from "@/lib/icons";
import { PlatformLinksCard } from "@/components/detail/PlatformLinksCard";
import { UserBadge } from "@/components/ui/UserBadge";
import { AMENITY_ICON_MAP, AMENITY_LABELS, getActiveAmenities, badgeLabelForSuggestions } from "@/lib/icons";
import type { ItemDetailData } from "@/app/(main)/[category]/[id]/page";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBadge(suggestionCount: number): "Verified" | "Expert" | "Platinum" | "Gold" {
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

/** Google's price_level integer (0-4) → "€" / "€€" / "€€€" / "€€€€".
 *  Used in the InfoCell row alongside category so users see the price
 *  band at a glance. Pulled from information.price_level (stamped by
 *  Google Places at submission time). */
function priceBand(pl: unknown): string {
  if (typeof pl !== "number") return "-";
  if (pl <= 1) return "€";
  if (pl === 2) return "€€";
  if (pl === 3) return "€€€";
  return "€€€€";
}

// ── Component ──────────────────────────────────────────────────────────────────

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
  const mapUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : address !== "-"
        ? `https://www.google.com/maps/search/${encodeURIComponent(`${title} ${address}`)}`
        : null;

  const information = ext.information ?? {};
  const infoSources = collectInfoSources(information);
  const price = priceBand(information.price_level);
  const activeAmenities = getActiveAmenities(information.amenities);
  // Bars/cafes don't have a delivery_links column on item_bars (only
  // item_food does) — admin stores them under information.delivery_links.
  const deliveryLinks =
    information.delivery_links && typeof information.delivery_links === "object"
      ? (information.delivery_links as Record<string, string>)
      : {};

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

  const mergedReviews = mergeLiveReview(data.reviews, liveReview, data.currentUser);
  const reviews: ReviewItem[] = mergedReviews.map(r => ({
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
    appearAnimation: !!liveReview && r.id === liveReview.id,
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
            shareTitle={title}
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

      {/* Photo gallery */}
      {Array.isArray((item as any).images) && (item as any).images.length > 0 && (
        <div className="mt-6">
          <ItemGalleryViewer
            images={(item as any).images as GalleryImage[]}
            tabs={["Εξωτερικά", "Εσωτερικά"]}
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
                <UserBadge suggestionCount={featured.user.suggestion_count ?? 0} variant="xs" />
              </div>
            </div>
            <span className="text-[14px] font-medium text-zinc-500">{formatDate(featured.created_at)}</span>
          </div>
          {featured.reflection && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{featured.reflection}</p>}
        </div>
      )}

      {/* Amenities row — same icon-strip pattern as FoodDetail /
          HotelDetail. Bar attributes share AMENITY_ICON_MAP with the
          hotel set (lib/icons.ts) — every active key is expected to
          resolve to an icon. Keys without registered icons are
          silently skipped so the row never breaks. */}
      {activeAmenities.length > 0 && (
        <div className="mt-6 space-y-6">
          <InfoDivider />
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
                  {/* Height-pinned, width-auto wrapper so icons with
                      different viewBox aspect ratios (e.g. 32×32
                      reservations vs 45×40 breakfast) all render at
                      exactly 44px tall. Centered horizontally inside
                      the 72px-wide column. */}
                  <div className="h-11 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ICON_PATHS[iconName]} alt="" className="h-11 w-auto" draggable={false} />
                  </div>
                  <span className="text-[12px] font-semibold text-zinc-800 text-center leading-tight">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* External ratings block intentionally omitted for bars/cafes —
          dropped per product decision (the InfoCell metadata table +
          venue type label already give enough signal; bars don't need
          a separate Βαθμολογίες block). The data still flows into
          item_bars.external_ratings JSONB and is available in admin /
          via the API; we just don't render it on the public page. */}

      {/* Metadata — InfoCell pattern identical to FoodDetail. Rows hide
          when their values are all empty so the layout doesn't render
          empty bars. */}
      <div className="mt-8">
        {(category !== "-" || price !== "-") && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {category !== "-" ? <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={category} /> : <div className="flex-1" />}
              {price !== "-" ? <InfoCell label="ΤΙΜΗ" value={price} /> : <div className="flex-1" />}
            </div>
          </>
        )}
        {address !== "-" && (
          <>
            <InfoDivider />
            <div className="pl-6 pr-6 py-5 space-y-5">
              <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΤΟΠΟΘΕΣΙΑ</p>
              <p className="text-[18px] font-bold text-zinc-800">{address}</p>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] font-bold text-zinc-700 underline active:opacity-70 transition-opacity"
                >
                  <Icon name="google-maps-pin" width={12} height={16} /> Άνοιγμα στους χάρτες
                </a>
              )}
            </div>
          </>
        )}
        {(phone !== "-" || infoSources.length > 0) && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {phone !== "-" ? <InfoCell label="ΤΗΛΕΦΩΝΟ" value={phone} /> : <div className="flex-1" />}
              {infoSources.length > 0 ? <InfoSourcesCell sources={infoSources} /> : <div className="flex-1" />}
            </div>
          </>
        )}
      </div>

      {/* Delivery — only show rows for platforms that actually have a link.
          Bars/cafes store these under information.delivery_links (no
          dedicated column on item_bars; admin manages via the Delivery
          section in the editor). */}
      {(deliveryLinks.efood || deliveryLinks.box || deliveryLinks.wolt) && (
        <div className="mx-6 mt-6">
          <PlatformLinksCard
            title="Delivery"
            ctaLabel="Παραγγελία"
            links={[
              ...(deliveryLinks.efood
                ? [{ key: "efood", brandIcon: "efood" as const, brandIconWidth: 94, href: deliveryLinks.efood }]
                : []),
              ...(deliveryLinks.wolt
                ? [{ key: "wolt", brandIcon: "wolt" as const, brandIconWidth: 80, href: deliveryLinks.wolt }]
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
        {!mySuggestion && <BookmarkStatusChips category="bars" bookmark={bookmark} onToast={showToast} />}
      </div>

      {/* Community */}
      <CommunitySection
        ratings={ratingDistribution}
        ratingCount={ratingCount}
        isTopRated={isTopRated}
        topRatedNoun="Το μαγαζί"
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
            showToast("Μετακινήθηκε στα Έχω πάει ✓");
          }
        }}
        question="Με πόσα αστέρια θα το βαθμολογούσες;"
        mySuggestion={mySuggestion}
        itemTitle={title}
        itemSlug={item.slug}
      />

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

/** Mirror of FoodDetail's InfoSourcesCell. Same shape on purpose so
 *  the two detail pages render identical ΠΛΗΡΟΦΟΡΙΕΣ blocks. */
type SourceIconType = (props: { size?: number; strokeWidth?: number }) => JSX.Element;
type InfoSource = { key: "website" | "instagram" | "facebook"; label: string; url: string; Icon: SourceIconType };

function WebsiteIcon({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 010 20 15 15 0 010-20" />
    </svg>
  );
}
function InstagramIcon({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function FacebookIcon({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

function collectInfoSources(information: Record<string, any>): InfoSource[] {
  const out: InfoSource[] = [];
  if (typeof information.website === "string" && information.website.trim()) {
    out.push({ key: "website", label: "Website", url: information.website.trim(), Icon: WebsiteIcon });
  }
  if (typeof information.instagram === "string" && information.instagram.trim()) {
    out.push({ key: "instagram", label: "Instagram", url: information.instagram.trim(), Icon: InstagramIcon });
  }
  if (typeof information.facebook === "string" && information.facebook.trim()) {
    out.push({ key: "facebook", label: "Facebook", url: information.facebook.trim(), Icon: FacebookIcon });
  }
  return out;
}

function InfoSourcesCell({ sources }: { sources: InfoSource[] }) {
  const ensureUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΛΗΡΟΦΟΡΙΕΣ</p>
      <div className="flex flex-col gap-3">
        {sources.map(({ key, label, url, Icon: SourceIcon }) => (
          <a
            key={key}
            href={ensureUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[18px] font-bold text-[#FE6F5E] underline w-fit active:opacity-70 transition-opacity"
          >
            <SourceIcon size={18} strokeWidth={2.2} />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; myVote: 1 | -1 | null; userData?: any; appearAnimation?: boolean; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, savedRating, savedReflection, itemId, userHandle, authGate, onPublished, question, mySuggestion, itemTitle, itemSlug }: {
  ratings: { stars: number; pct: number }[];
  ratingCount: number;
  isTopRated: boolean;
  topRatedNoun: string;
  communityRating: number;
  reviews: ReviewItem[];
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
            category="bars"
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

