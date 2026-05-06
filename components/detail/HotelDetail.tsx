"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { formatDistance } from "@/lib/activities";
import { ItemGalleryViewer, type GalleryImage } from "@/components/detail/ItemGalleryViewer";
import { useBookmark } from "@/hooks/useBookmark";
import { useReview } from "@/hooks/useReview";
import { useShareLink } from "@/hooks/useShareLink";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { RatingCard } from "@/components/detail/RatingCard";
import { BookingAvailabilityCard } from "@/components/detail/BookingAvailabilityCard";
import { ActivityCard } from "@/components/detail/ActivityCard";
import { AmenitiesRow } from "@/components/detail/AmenitiesRow";
import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { AMENITY_ICON_MAP, AMENITY_LABELS, getActiveAmenities } from "@/lib/icons";
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


export function HotelDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "hotels", data.isBookmarked);
  const { share, copied: shareCopied } = useShareLink({ title: data.item.title });
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const { save: saveReview, busy: reviewBusy, savedRating } = useReview(data.item.id, { rating: data.myReview?.rating ?? null, reflection: data.myReview?.reflection ?? null });
  const [userText, setUserText] = useState(data.myReview?.reflection ?? "");

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

  const title = item.title ?? "-";
  const address = ext.address ?? "-";
  const phone = ext.telephone ?? "-";
  const type = ext.type ?? "-";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;
  const priceRange = ext.price_range ?? "";

  const information = ext.information ?? {};
  const infoLink = information.website ?? "-";
  const rooms = information.rooms ?? "-";
  const breakfast = information.breakfast ?? "-";
  const parking = information.parking ?? "-";

  const facilities = ext.facilities ?? {};

  const externalRatings = ext.external_ratings ?? {};
  const googleR = parseRating(externalRatings.google);
  const bookingR = parseRating(externalRatings.booking);

  // Up-to-2 rating cards (Google + Booking) shown side-by-side per Figma.
  // Tripadvisor (if present) is intentionally omitted — out of scope for this layout.
  const ratingCards = [
    googleR.score !== "-" && {
      brand: "google" as const,
      label: "Google",
      score: googleR.score,
      count: googleR.count,
      scale: "/5",
      icon: "google-pin" as const,
      href: address !== "-" ? `https://www.google.com/maps/search/${encodeURIComponent(`${title} ${address}`)}` : undefined,
    },
    bookingR.score !== "-" && {
      brand: "booking" as const,
      label: "Booking",
      score: bookingR.score,
      count: bookingR.count,
      scale: "/10",
      icon: "booking" as const,
      href: undefined as string | undefined,
    },
  ].filter(Boolean) as Array<{ brand: string; label: string; score: string; count?: number; scale: string; icon: "google-pin" | "booking"; href?: string }>;

  const activeAmenities = getActiveAmenities(ext.facilities);

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  // Parse price range (could be "110-140" or "110" or object)
  let priceFrom = "";
  let priceTo = "";
  if (typeof priceRange === "string" && priceRange.includes("-")) {
    const [a, b] = priceRange.split("-");
    priceFrom = a.trim();
    priceTo = b.trim();
  } else if (priceRange) {
    priceFrom = String(priceRange);
  }

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

  // Nearby activities — admin-curated, proximity-matched server-side.
  const nearby = data.nearbyActivities ?? [];

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <>
            <button onClick={toggleBookmark} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", bookmarked ? "bg-zinc-800" : "bg-zinc-100 active:bg-zinc-200")} aria-label={bookmarked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}>
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

      {/* Gallery */}
      {Array.isArray((item as any).images) && (item as any).images.length > 0 && (
        <div className="mt-6">
          <ItemGalleryViewer
            images={(item as any).images as GalleryImage[]}
            tabs={["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"]}
          />
        </div>
      )}

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

      {/* Amenities row — directly under the user reflection. */}
      {activeAmenities.length > 0 && (
        <div className="mt-6 px-6">
          <AmenitiesRow
            items={activeAmenities
              .map((key) => {
                const iconName = AMENITY_ICON_MAP[key];
                if (!iconName) return null;
                return { key, icon: iconName, label: AMENITY_LABELS[key] ?? key };
              })
              .filter((x): x is { key: string; icon: typeof AMENITY_ICON_MAP[string]; label: string } => x !== null)}
          />
        </div>
      )}

      {/* Side-by-side rating cards — Google + Booking */}
      {ratingCards.length > 0 && (
        <div className={cn("mx-6 mt-6 gap-3", ratingCards.length === 2 ? "grid grid-cols-2" : "flex")}>
          {ratingCards.map((r) => (
            <RatingCard
              key={r.brand}
              brand={r.brand as "google" | "booking"}
              score={r.score}
              scale={r.scale}
              count={r.count}
              href={r.href}
            />
          ))}
        </div>
      )}

      {/* Room price */}
      {priceFrom && (
        <div className="mx-6 mt-6 rounded-[12px] p-8 space-y-3" style={{ backgroundColor: "#FFF2F1" }}>
          <p className="text-[16px] font-bold" style={{ color: "#4A0800" }}>Τιμή Δωματίου</p>
          <div className="flex items-baseline gap-2">
            <span className="font-bold" style={{ fontSize: 36, color: "#4A0800" }}>{priceTo ? `${priceFrom}-${priceTo}` : priceFrom}</span>
            <span className="text-[22px] font-semibold" style={{ color: "#4A0800" }}>€ / βράδυ</span>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-8">
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
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΤΥΠΟΣ"      value={type} />
          <InfoCell label="ΔΩΜΑΤΙΑ"    value={rooms} />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΠΡΩΙΝΟ"    value={breakfast} />
          <InfoCell label="PARKING"   value={parking} />
        </div>
      </div>

      {/* Nearby activities */}
      {nearby.length > 0 && (
        <div className="mt-8 space-y-4">
          <p className="pl-6 text-[20px] font-semibold text-zinc-800">Κοντινές Δραστηριότητες</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pr-6">
            {nearby.map(act => (
              <ActivityCard
                key={act.id}
                title={act.type_name ?? ""}
                subtitle={act.name}
                distance={formatDistance(act.distance_km)}
                imageUrl={act.image_url}
                href={
                  act.website_url ||
                  (act.lat && act.lng
                    ? `https://www.google.com/maps?q=${act.lat},${act.lng}`
                    : undefined)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Booking availability CTA — affiliate placement */}
      <div className="mx-6 mt-6">
        <BookingAvailabilityCard itemTitle={title} />
      </div>

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Το ξενοδοχείο" communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} saveReview={saveReview} userText={userText} setUserText={setUserText} reviewBusy={reviewBusy} savedRating={savedRating} question="Με πόσα αστέρια θα βαθμολογούσες το ξενοδοχείο;" mySuggestion={mySuggestion} itemTitle={title} itemSlug={item.slug} />
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

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

// ── Icons ──────────────────────────────────────────────────────────────────────
function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return <svg width={size} height={size*12/13} viewBox="0 0 13 12" fill="none" aria-hidden><path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1}/></svg>;
}
function MapPinIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }

