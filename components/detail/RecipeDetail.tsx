"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { useBookmark } from "@/hooks/useBookmark";
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

export function RecipeDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(data.item.id, "recipes", data.isBookmarked);
  const [userRating, setUserRating] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const { item, extension: ext, suggestions } = data;

  const title = item.title ?? "-";
  const category = item.metadata?.tags?.[0] ?? "-";
  const level = ext.level ?? "-";
  const servings = ext.yields ?? 0;
  const calories = ext.calories ? `${ext.calories} kcal` : "-";
  const origin = ext.origin ?? ext.channel ?? "-";
  const avgRating = item.avg_rating ?? 0;
  const ratingCount = item.rating_count ?? 0;
  const coverUrl = item.cover_url;
  const tips = ext.tips ?? "";

  // Duration
  const duration = ext.duration ?? {};
  const durationTotal = duration.total ?? "-";
  const durationPrep = duration.prep ?? duration.preparation ?? "-";
  const durationBaking = duration.baking ?? duration.cooking ?? "-";

  // Nutrition/dietary flags
  const nutrition = ext.nutrition ?? {};
  const dietary: string[] = [];
  if (nutrition.vegan) dietary.push("Vegan");
  if (nutrition.dairy_free || nutrition.milk === false) dietary.push("Χωρίς γάλα");
  if (nutrition.sugar_free || nutrition.sugar === false) dietary.push("Χωρίς ζάχαρη");
  if (Array.isArray(nutrition.tags)) dietary.push(...nutrition.tags);

  // Ingredients
  const ingredients: { id: number; text: string }[] = Array.isArray(ext.ingredients)
    ? ext.ingredients.map((ing: unknown, i: number) => {
        if (typeof ing === "string") return { id: i + 1, text: ing };
        if (ing && typeof ing === "object" && "text" in ing) return { id: i + 1, text: String((ing as any).text) };
        if (ing && typeof ing === "object" && "name" in ing) {
          const o = ing as any;
          const qty = o.quantity ? `${o.quantity}${o.unit ? " " + o.unit : ""} ` : "";
          return { id: i + 1, text: `${qty}${o.name}` };
        }
        return { id: i + 1, text: String(ing) };
      })
    : [];

  // Steps
  const steps: { n: number; text: string }[] = Array.isArray(ext.steps)
    ? ext.steps.map((step: unknown, i: number) => {
        if (typeof step === "string") return { n: i + 1, text: step };
        if (step && typeof step === "object" && "text" in step) return { n: i + 1, text: String((step as any).text) };
        return { n: i + 1, text: String(step) };
      })
    : [];

  // Tips as array
  const tipsArr: string[] = Array.isArray(tips) ? tips : (tips ? [tips] : []);

  const ratingDistribution: { stars: number; pct: number }[] = (item.metadata?.rating_distribution as any) ?? [
    { stars: 5, pct: 0 }, { stars: 4, pct: 0 }, { stars: 3, pct: 0 }, { stars: 2, pct: 0 }, { stars: 1, pct: 0 },
  ];

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

  function toggleIngredient(id: number) {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors" aria-label="Κοινοποίηση">
              <Share2 size={16} className="text-zinc-700" />
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

      {/* Duration box */}
      <div className="mx-6 mt-6 rounded-[12px] px-5 py-6" style={{ backgroundColor: "#F2F2F7" }}>
        <div className="flex items-center justify-between">
          <DurationCell label="ΣΥΝΟΛΟ"       value={durationTotal}  />
          <div className="w-px h-12 bg-zinc-300" />
          <DurationCell label="ΠΡΟΕΤΟΙΜΑΣΙΑ" value={durationPrep}   />
          <div className="w-px h-12 bg-zinc-300" />
          <DurationCell label="ΨΗΣΙΜΟ"       value={durationBaking} />
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
                <span className="inline-flex items-center gap-1 text-[12px] text-zinc-800">
                  <VerifiedBadge />
                  {getBadge(featured.user.level)}
                </span>
              </div>
            </div>
            <span className="text-[14px] font-medium text-zinc-500">{formatDate(featured.created_at)}</span>
          </div>
          {featured.reflection && <p className="text-[15px] font-normal text-zinc-900 leading-[150%]">{featured.reflection}</p>}
          <button className="text-[14px] font-bold text-zinc-800 underline">Περισσότερα</button>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-6">
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={category} />
          <InfoCell label="ΕΠΙΠΕΔΟ"   value={level}    />
        </div>
        <InfoDivider />
        <div className="flex pl-6 py-5">
          <InfoCell label="ΜΕΡΙΔΕΣ"   value={servings > 0 ? String(servings) : "-"} />
          <InfoCell label="ΘΕΡΜΙΔΕΣ"  value={calories}         />
        </div>
        <InfoDivider />
        <div className="pl-6 pr-6 py-5 space-y-3">
          <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">ΠΡΟΕΛΕΥΣΗ</p>
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded-full bg-[#c4a5b5] shrink-0" />
            <p className="text-[18px] font-bold text-zinc-800">{origin}</p>
          </div>
        </div>
      </div>

      {/* Dietary flags */}
      {dietary.length > 0 && (
        <div className="px-6 mt-6 flex flex-wrap gap-2">
          {dietary.map(flag => (
            <span key={flag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1D9E75] text-[13px] font-semibold text-[#1D9E75]">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="9" stroke="#1D9E75" strokeWidth="1.5" />
                <path d="M6 10.5l3 3 5-5.5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="px-6 mt-8 space-y-5">
          <p className="text-[18px] font-bold text-zinc-800">Υλικά</p>
          <div className="space-y-4">
            {ingredients.map(({ id, text }) => {
              const checked = checkedIngredients.has(id);
              return (
                <button key={id} onClick={() => toggleIngredient(id)} className="flex items-center gap-4 w-full text-left active:opacity-70 transition-opacity">
                  <span className="shrink-0 w-5 h-5 rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors"
                    style={{ borderColor: checked ? "#FE6F5E" : "#A1A1AA", backgroundColor: checked ? "#FE6F5E" : "white" }}>
                    {checked && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden>
                        <path d="M1.5 4.5L4 7L9.5 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={cn("text-[16px] leading-[150%]", checked ? "line-through text-zinc-400 font-normal" : "text-zinc-800 font-medium")}>{text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="px-6 mt-8 space-y-6">
          <p className="text-[18px] font-bold text-zinc-800">Εκτέλεση</p>
          <div className="space-y-6">
            {steps.map(({ n, text }) => (
              <div key={n} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[13px] font-bold text-white">{n}</span>
                </div>
                <p className="text-[15px] font-normal text-zinc-800 leading-[160%]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {tipsArr.length > 0 && (
        <div className="mx-6 mt-8 rounded-[12px] px-6 py-6 space-y-4" style={{ backgroundColor: "#F0FBF6" }}>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <p className="text-[16px] font-bold" style={{ color: "#1D9E75" }}>Tips</p>
          </div>
          <div className="space-y-3">
            {tipsArr.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: "#1D9E75" }} />
                <p className="text-[14px] font-normal text-zinc-700 leading-[150%]">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online order banner */}
      <div className="mx-6 mt-6 rounded-[12px] px-6 py-5 flex items-center justify-between" style={{ backgroundColor: "#FFF5EC" }}>
        <div className="space-y-1">
          <p className="text-[14px] font-bold" style={{ color: "#4A0800" }}>Αγόρασε τα υλικά online</p>
          <p className="text-[12px] font-medium text-zinc-500">Γρήγορη παράδοση στο σπίτι σου</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FE6F5E] text-[13px] font-semibold text-white active:opacity-80 transition-opacity">
          Παραγγελία
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} question="Με πόσα αστέρια θα βαθμολογούσες τη συνταγή;" />

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

function DurationCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-[0.1px] text-center">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800">{value}</p>
    </div>
  );
}

function InfoDivider() { return <div className="h-px bg-zinc-200 ml-5" />; }

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-5 pr-2">
      <p className="text-[16px] font-semibold text-zinc-500 uppercase tracking-[0.1px]">{label}</p>
      <p className="text-[18px] font-bold text-zinc-800 leading-[140%]">{value}</p>
    </div>
  );
}

interface ReviewItem { id: string; name: string; badge: "Verified"|"Expert"|"Platinum"|"Gold"; color: string; rating: number; date: string; text: string; likes: number; dislikes: number; userData?: any; }

function CommunitySection({ ratings, communityRating, reviews, userRating, setUserRating, question }: {
  ratings: { stars: number; pct: number }[];
  communityRating: number;
  reviews: ReviewItem[];
  userRating: number;
  setUserRating: (n: number) => void;
  question: string;
}) {
  return (
    <div className="mt-8 py-8 flex flex-col items-center gap-[42px]" style={{ background: "linear-gradient(180deg,#fff 0%,#F2F2F7 10%,#F7F7FA 91%,#fff 100%)" }}>
      <div className="w-[342px] flex flex-col gap-12">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <StarIcon size={24} filled />
            <span className="font-bold text-zinc-800" style={{ fontSize: 72, lineHeight: 1 }}>{communityRating.toFixed(2)}</span>
          </div>
          <div className="w-full flex flex-col gap-7 px-6">
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
        </div>

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
            <button className="w-full h-12 rounded-[12px] bg-zinc-800 text-zinc-50 text-[16px] font-semibold active:opacity-80 transition-opacity">
              Αποθήκευσε βαθμολογία
            </button>
          )}
        </div>
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
                  <div className="space-y-3">
                    <p className="text-[14px] font-normal text-zinc-800 leading-[150%] line-clamp-4">{r.text}</p>
                    <button className="text-[13px] font-bold text-zinc-800 underline">Περισσότερα</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserAvatarWithPopup user={r.userData ?? { display_name: r.name }} size={50} />
                    <div className="space-y-1">
                      <p className="text-[14px] font-bold text-zinc-800">{r.name}</p>
                      <BadgeChip badge={r.badge} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-6 py-3 bg-[#F4F4F5]">
                  <div className="flex items-center gap-3 px-3 rounded-full">
                    <button className="flex items-center gap-1.5 h-8"><ThumbUpIcon /><span className="text-[13px] font-semibold text-zinc-700">{r.likes}</span></button>
                    <div className="w-px h-7 bg-white" />
                    <button className="flex items-center gap-1.5 h-8"><ThumbDownIcon /><span className="text-[13px] font-semibold text-zinc-700">{r.dislikes}</span></button>
                  </div>
                  <button className="text-[12px] font-medium text-zinc-500 underline">αναφορά</button>
                </div>
              </div>
            ))}
            <div className="flex-none w-6 shrink-0" />
          </div>
          <button className="w-[342px] py-[18px] rounded-full border-[1.5px] border-zinc-600 text-[16px] font-semibold text-zinc-700 uppercase tracking-[0.1px] active:bg-zinc-50 transition-colors">
            Εμφάνιση αξιολογήσεων
          </button>
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12/13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L12.5 4.5H16.5V8.5L19 11L16.5 13.5V17.5H12.5L10 20L7.5 17.5H3.5V13.5L1 11L3.5 8.5V4.5H7.5L10 2Z" fill="#1D9E75" />
      <path d="M7 10.5L9.5 13L14 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ThumbUpIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600" aria-hidden><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>;
}

function ThumbDownIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600" aria-hidden><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>;
}

const BADGE_STYLE = {
  Expert:   "bg-zinc-800 text-zinc-50",
  Platinum: "bg-[#c4a5b5] text-white",
  Gold:     "bg-[#F8D160] text-zinc-800",
  Verified: "bg-[#1D9E75] text-white",
};

function BadgeChip({ badge }: { badge: keyof typeof BADGE_STYLE }) {
  return <span className={cn("inline-block px-2 py-0.5 rounded-sm text-[11px] font-medium", BADGE_STYLE[badge])}>{badge}</span>;
}
