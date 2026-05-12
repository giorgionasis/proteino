"use client";

import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { FollowButton } from "@/components/ui/FollowButton";
import { ProfilePopup } from "@/components/profile/ProfilePopup";
import { useFollow } from "@/hooks/useFollow";
import { badgeLabelForSuggestions } from "@/lib/icons";

interface Suggester {
  id:                string;
  handle:            string;
  display_name:      string | null;
  avatar_url:        string | null;
  suggestion_count:  number;
  level:             number | null;
  avg_quality_score: number | null;
  matched:           number;
  /** One-line "what they're known for" computed server-side. */
  taste:             string;
}

interface Props {
  interests: string[];
  onFinish:  () => void;
  onBack:    () => void;
}

/**
 * Screen 4 — People.
 *
 * Two ranked groups returned by /api/onboarding/suggested-users:
 *   tight  — heaviest specialists in the user's picked categories.
 *            Framed as "high confidence" matches.
 *   broad  — top general contributors. Framed as "and more from the
 *            community."
 *
 * Each user card:
 *   - Avatar + name are wrapped so tapping opens a ProfilePopup with
 *     full stats, badge, and a (currently visual-only) follow button
 *     inside the popup.
 *   - Below that, the canonical <FollowButton> wired to useFollow so
 *     follows actually persist to the database.
 *
 * Either "Ολοκλήρωσε" or "Δες πρώτα μόνος μου" stamps onboarded_at
 * via the parent OnboardingFlow.
 */
export function PeopleScreen({ interests, onFinish, onBack }: Props) {
  const [data, setData] = useState<{ tight: Suggester[]; broad: Suggester[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = encodeURIComponent(interests.join(","));
        const res = await fetch(`/api/onboarding/suggested-users?categories=${qs}`);
        const json = await res.json();
        if (!cancelled) {
          setData({
            tight: Array.isArray(json?.tight) ? json.tight : [],
            broad: Array.isArray(json?.broad) ? json.broad : [],
          });
        }
      } catch {
        if (!cancelled) setData({ tight: [], broad: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [interests]);

  const loading = data === null;
  const total   = (data?.tight.length ?? 0) + (data?.broad.length ?? 0);

  return (
    <div className="min-h-screen flex flex-col pb-32 animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Πίσω"
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-zinc-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[13px] font-medium text-zinc-500 tracking-wider">3 / 3</span>
        <div className="w-9 h-9" />
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex gap-2 justify-center">
        <span className="w-8 h-1 rounded-full bg-coral-500" />
        <span className="w-8 h-1 rounded-full bg-coral-500" />
        <span className="w-8 h-1 rounded-full bg-coral-500" />
      </div>

      {/* Headline */}
      <div className="px-6 mt-8 space-y-2 text-center">
        <h1 className="text-[24px] font-extrabold leading-[1.2] text-zinc-900">
          Άνθρωποι με γούστο
          <br />σαν εσένα
        </h1>
        <p className="text-[15px] leading-[1.45] text-zinc-600 px-4">
          Ξεκίνα ακολουθώντας τους — θα δεις τις προτάσεις τους στο feed σου.
        </p>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="px-5 mt-7 space-y-4">
          <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <UserCardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && total === 0 && (
        <div className="px-8 mt-12 text-center space-y-3">
          <p className="text-[15px] text-zinc-500">
            Η κοινότητα μεγαλώνει — θα δεις περισσότερους χρήστες σύντομα.
          </p>
        </div>
      )}

      {/* Section: tight matches */}
      {!loading && data!.tight.length > 0 && (
        <Section
          label={interests.length > 0 ? "ΜΕ ΒΑΣΗ ΤΑ ΕΝΔΙΑΦΕΡΟΝΤΑ ΣΟΥ" : "ΚΟΡΥΦΑΙΟΙ"}
          users={data!.tight}
        />
      )}

      {/* Section: broad pool */}
      {!loading && data!.broad.length > 0 && (
        <Section
          label={data!.tight.length > 0 ? "ΚΑΙ ΑΛΛΟΙ ΑΠΟ ΤΗΝ ΚΟΙΝΟΤΗΤΑ" : "ΑΠΟ ΤΗΝ ΚΟΙΝΟΤΗΤΑ"}
          users={data!.broad}
        />
      )}

      {/* Sticky CTAs */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-zinc-200 z-10 max-w-[390px] mx-auto space-y-2">
        <button
          onClick={onFinish}
          className="w-full h-[52px] rounded-[12px] text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}
        >
          Ολοκλήρωσε →
        </button>
        <button
          onClick={onFinish}
          className="block w-full text-center text-[14px] font-medium text-zinc-500 py-1.5 active:opacity-60 transition-opacity"
        >
          Δες πρώτα μόνος μου
        </button>
      </div>
    </div>
  );
}

function Section({ label, users }: { label: string; users: Suggester[] }) {
  return (
    <section className="mt-7">
      <h2 className="px-6 text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-3">
        {label}
      </h2>
      <div className="px-5 grid grid-cols-2 gap-3">
        {users.map((u) => <UserCard key={u.id} user={u} />)}
      </div>
    </section>
  );
}

function UserCard({ user }: { user: Suggester }) {
  // Real persistence via useFollow. The button is controlled — local
  // FollowButton state now mirrors `following` thanks to the prop-sync
  // effect added in the FollowButton primitive.
  const { following, toggle } = useFollow(user.id, false);
  const [popupOpen, setPopupOpen] = useState(false);

  const displayName = user.display_name || user.handle;

  return (
    <>
      <div className="rounded-[14px] border border-zinc-200 bg-white p-4 flex flex-col items-center gap-3">
        {/* Avatar + name = popup target */}
        <button
          onClick={() => setPopupOpen(true)}
          className="flex flex-col items-center gap-2 active:opacity-80 transition-opacity w-full"
        >
          <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-zinc-100">
            <AvatarImage url={user.avatar_url} name={displayName} size={72} className="rounded-full" />
          </div>

          <div className="flex flex-col items-center gap-1 min-h-[44px]">
            <p className="text-[14px] font-bold text-zinc-800 leading-[1.2] text-center line-clamp-1 max-w-full">
              {displayName}
            </p>
            <p className="text-[11px] text-zinc-500 leading-snug text-center line-clamp-2 max-w-full">
              {user.taste || `${user.suggestion_count} προτάσεις`}
            </p>
          </div>
        </button>

        <FollowButton
          following={following}
          onToggle={() => toggle()}
          size="md"
          className="w-full"
        />
      </div>

      <ProfilePopup
        user={{
          id:               user.id,
          handle:           user.handle,
          display_name:     displayName,
          avatar_url:       user.avatar_url,
          suggestion_count: user.suggestion_count,
          avg_rating:       user.avg_quality_score ?? 0,
          badge:            badgeLabelForSuggestions(user.suggestion_count),
        }}
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
      />
    </>
  );
}

function UserCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-4 flex flex-col items-center gap-3">
      <div className="w-[72px] h-[72px] rounded-full bg-zinc-100 animate-pulse" />
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
        <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full rounded-full bg-zinc-100 animate-pulse" />
    </div>
  );
}
