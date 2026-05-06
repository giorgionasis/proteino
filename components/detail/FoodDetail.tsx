"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { InnerHeader } from "@/components/layout/Header";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { ItemGalleryViewer, type GalleryImage } from "@/components/detail/ItemGalleryViewer";
import { useBookmark } from "@/hooks/useBookmark";
import { useRating } from "@/hooks/useRating";
import { useShareLink } from "@/hooks/useShareLink";
import { CommentComposer } from "@/components/detail/CommentComposer";
import { CommentThread } from "@/components/detail/CommentThread";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { ExtraRatingsRow } from "@/components/detail/ExtraRatingsRow";
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
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "food", data.isBookmarked);
  const { share, copied: shareCopied } = useShareLink({ title: data.item.title });
  const [userRating, setUserRating] = useState(data.userRating ?? 0);
  const { save: saveRating, busy: ratingBusy, savedScore } = useRating(data.item.id, data.userRating);
  const [plotExpanded, setPlotExpanded] = useState(false);

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

  const reviews: ReviewItem[] = suggestions.slice(1).map(s => ({
    id: s.id,
    name: s.user.display_name,
    badge: getBadge(s.user.level),
    color: "#a5b5c4",
    rating: s.rating ?? 0,
    date: formatDate(s.created_at),
    text: s.reflection ?? "",
    likes: 0,
    dislikes: 0,
    userData: s.user,
  }));

  return (
    <div className="pb-8">

      <InnerHeader
        title=""
        onBack={() => router.back()}
        rightSlot={
          <>
            <button onClick={toggleBookmark} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", bookmarked ? "bg-zinc-800" : "bg-zinc-100 active:bg-zinc-200")} aria-label="Αποθήκευση">
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
        <div className="mx-6 mt-6 rounded-[16px] p-6 space-y-2" style={{ backgroundColor: "#FFF2F1" }}>
          <p className="text-[16px] font-bold" style={{ color: "#4A0800" }}>Delivery</p>
          <div className="divide-y divide-zinc-200/60">
            {deliveryLinks.efood && (
              <div className="flex items-center justify-between py-4">
                <Icon name="efood" width={94} height={32} alt="efood" />
                <OutlinedPill href={deliveryLinks.efood}>Παραγγελία</OutlinedPill>
              </div>
            )}
            {deliveryLinks.box && (
              <div className="flex items-center justify-between py-4">
                <Icon name="box" width={104} height={32} alt="BOX" />
                <OutlinedPill href={deliveryLinks.box}>Παραγγελία</OutlinedPill>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Το εστιατόριο" communityRating={avgRating} reviews={reviews} extraRatings={data.extraRatings} userRating={userRating} setUserRating={setUserRating} saveRating={saveRating} ratingBusy={ratingBusy} savedScore={savedScore} question="Με πόσα αστέρια θα βαθμολογούσες το εστιατόριο;" mySuggestion={mySuggestion} itemTitle={title} />

      {data.suggestions[0] && (
        <div className="px-6 flex flex-col gap-4">
          <CommentComposer suggestionId={data.suggestions[0].id} />
          <CommentThread suggestionId={data.suggestions[0].id} />
        </div>
      )}

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

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; userData?: any; }

function CommunitySection({ ratings, ratingCount, isTopRated, topRatedNoun, communityRating, reviews, extraRatings, userRating, setUserRating, saveRating, ratingBusy, savedScore, question, mySuggestion, itemTitle }: {
  ratings: { stars: number; pct: number }[];
  ratingCount: number;
  isTopRated: boolean;
  topRatedNoun: string;
  communityRating: number;
  reviews: ReviewItem[];
  extraRatings: ItemDetailData["extraRatings"];
  userRating: number;
  setUserRating: (n: number) => void;
  saveRating: (score: number) => void;
  ratingBusy: boolean;
  savedScore: number | null;
  question: string;
  mySuggestion: { id: string; reflection: string | null; rating: number | null } | null;
  itemTitle: string;
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
          {ratingCount > 0 && (
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
              <button
                onClick={() => saveRating(userRating)}
                disabled={ratingBusy || userRating === savedScore}
                className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {ratingBusy ? "Αποθήκευση..." : savedScore === userRating ? "✓ Αποθηκεύτηκε" : "Αποθήκευσε βαθμολογία"}
              </button>
            )}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex flex-col items-center w-full gap-6">
          <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 pl-6 w-full">
            {reviews.map(r => (
              <div key={r.id} className="flex-none w-[310px] h-[323px] bg-white rounded-[12px] flex flex-col justify-between overflow-hidden" style={{ boxShadow: "2px 2px 9px -2px rgba(0,0,0,0.1)" }}>
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <StarIcon key={s} size={10} filled={s <= r.rating} />)}</div>
                    <span className="w-[2px] h-[2px] rounded-full bg-zinc-500 shrink-0" />
                    <span className="text-[13px] font-medium text-zinc-500">{r.date}</span>
                  </div>
                  <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-5">{r.text}</p>
                  <div className="flex items-center gap-3">
                    <UserAvatarWithPopup user={r.userData ?? { display_name: r.name }} size={50} />
                    <div className="space-y-1">
                      <p className="text-[14px] font-bold text-zinc-800">{r.name}</p>
                      <UserBadge kind={r.badge} />
                    </div>
                  </div>
                </div>
                <ReviewCardFooter reviewId={r.id} likes={r.likes} dislikes={r.dislikes} />
              </div>
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
          <button className="w-[342px] py-[18px] rounded-full border-[1.5px] border-zinc-600 text-[16px] font-semibold text-zinc-700 uppercase tracking-[0.1px] active:bg-zinc-50 transition-colors">
            Εμφάνιση αξιολογήσεων
          </button>
        </div>
      )}

      <ExtraRatingsRow ratings={extraRatings} />
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

