"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { InnerHeader } from "@/components/layout/Header";
import { DetailHeaderActions } from "@/components/detail/DetailHeaderActions";
import { useReview } from "@/hooks/useReview";
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
import { NutritionRow } from "@/components/detail/NutritionRow";
import { DurationCard } from "@/components/detail/DurationCard";
import { Icon } from "@/components/ui/Icon";
import { UserBadge } from "@/components/ui/UserBadge";
import { ReportLink } from "@/components/report/ReportLink";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { badgeLabelForSuggestions, type IconName } from "@/lib/icons";
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

// ── Component ──────────────────────────────────────────────────────────────────

export function RecipeDetail({ data }: { data: ItemDetailData }) {
  const router = useRouter();
  const [userRating, setUserRating] = useState(data.myReview?.rating ?? 0);
  const bookmark = useBookmark(data.item.id, "recipes", data.bookmarkStatus);
  const { show: showToast, toast } = useToast();
  const [savedModal, setSavedModal] = useState<BookmarkSaveResult | null>(null);
  const { save: saveReview, busy: reviewBusy, savedRating } = useReview(
    data.item.id,
    { rating: data.myReview?.rating ?? null, reflection: data.myReview?.reflection ?? null },
    {
      onSaved: () => {
        if (bookmark.status === "wishlist") {
          bookmark.setStatus("done");
          showToast("Μετακινήθηκε στα Έφτιαξα ✓");
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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const { item, extension: ext, suggestions } = data;
  const mySuggestion = data.currentUserId ? suggestions.find(s => s.user.id === data.currentUserId) ?? null : null;

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

  // Nutrition/dietary flags — rendered as illustrated icon row.
  const nutrition = ext.nutrition ?? {};
  const dietaryFlags: { icon: IconName; label: string }[] = [];
  if (nutrition.dairy_free || nutrition.milk === false || nutrition.no_milk) {
    dietaryFlags.push({ icon: "no-milk", label: "Χωρίς γάλα" });
  }
  if (nutrition.vegan) {
    dietaryFlags.push({ icon: "vegan", label: "Vegan" });
  }
  if (nutrition.sugar_free || nutrition.sugar === false || nutrition.no_sugar) {
    dietaryFlags.push({ icon: "sugar-free", label: "Χωρίς ζάχαρη" });
  }

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

  const ratingDistribution = data.ratingDistribution;
  const isTopRated = data.isTopRated;

  const featured = suggestions[0];

  const reviews: ReviewItem[] = data.reviews.map(r => ({
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
          <DetailHeaderActions
            category="recipes"
            bookmark={bookmark}
            shareTitle={data.item.title}
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

      {/* Duration card */}
      <div className="mx-6 mt-6">
        <DurationCard
          metrics={[
            { label: "ΣΥΝΟΛΟ",       value: String(durationTotal) },
            { label: "ΠΡΟΕΤΟΙΜΑΣΙΑ", value: String(durationPrep) },
            { label: "ΨΗΣΙΜΟ",       value: String(durationBaking) },
          ]}
        />
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

      {/* Nutrition row — illustrated icons under the user reflection */}
      {dietaryFlags.length > 0 && (
        <div className="mx-6 mt-6">
          <NutritionRow items={dietaryFlags} />
        </div>
      )}

      {/* Metadata — hide rows where everything is empty. */}
      <div className="mt-6">
        {(category !== "-" || level !== "-") && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {category !== "-" ? <InfoCell label="ΚΑΤΗΓΟΡΙΑ" value={category} /> : <div className="flex-1" />}
              {level !== "-" ? <InfoCell label="ΕΠΙΠΕΔΟ" value={level} /> : <div className="flex-1" />}
            </div>
          </>
        )}
        {(servings > 0 || calories !== "-") && (
          <>
            <InfoDivider />
            <div className="flex pl-6 py-5">
              {servings > 0 ? <InfoCell label="ΜΕΡΙΔΕΣ" value={String(servings)} /> : <div className="flex-1" />}
              {calories !== "-" ? <InfoCell label="ΘΕΡΜΙΔΕΣ" value={calories} /> : <div className="flex-1" />}
            </div>
          </>
        )}
        {origin !== "-" && (
          <>
            <InfoDivider />
            <div className="pl-6 pr-6 py-5">
              <InfoCell label="ΠΡΟΕΛΕΥΣΗ" value={origin} />
            </div>
          </>
        )}
      </div>

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

      {/* Bookmark status chips — always visible, save affordance + state setter. */}
      <div className="px-6 mt-8">
        {!mySuggestion && <BookmarkStatusChips category="recipes" bookmark={bookmark} onToast={showToast} />}
      </div>

      {/* Community */}
      <CommunitySection ratings={ratingDistribution} ratingCount={ratingCount} isTopRated={isTopRated} topRatedNoun="Η συνταγή" communityRating={avgRating} reviews={reviews} userRating={userRating} setUserRating={setUserRating} saveReview={gatedSaveReview} userText={userText} setUserText={setUserText} reviewBusy={reviewBusy} savedRating={savedRating} question="Με πόσα αστέρια θα βαθμολογούσες τη συνταγή;" mySuggestion={mySuggestion} itemTitle={title} itemSlug={item.slug} />

      <RelatedSections sections={data.relatedSections} category="recipes" />

      <GuestPromptModal {...ratingGuardProps} />
      <BookmarkSavedModal
        open={savedModal !== null}
        result={savedModal}
        category="recipes"
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

// ── Icons ──────────────────────────────────────────────────────────────────────

function StarIcon({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size * 12/13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill={filled ? "#27272A" : "none"} stroke="#27272A" strokeWidth={filled ? 0 : 1} />
    </svg>
  );
}

