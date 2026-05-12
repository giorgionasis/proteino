"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Item {
  id:         string;
  title:      string;
  cover_url:  string | null;
  avg_rating: number | null;
  href:       string;
  reason?:    string;
}

interface Section {
  category: string;
  label:    string;
  items:    Item[];
}

interface Props {
  interests:  string[];
  onContinue: () => void;
  onBack:     () => void;
}

/**
 * Screen 3 — Reward.
 *
 * Hits /api/onboarding/reward-feed with the picked categories and
 * renders a per-category horizontal carousel of the top-rated items.
 * The promise from step 1 ("we'll show you what you love") is
 * fulfilled before any further work is asked of the user.
 *
 * Skeleton while loading. If no sections come back (empty data, fresh
 * deploy), show a small fallback line and still let them advance.
 */
export function RewardScreen({ interests, onContinue, onBack }: Props) {
  const [sections, setSections] = useState<Section[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = encodeURIComponent(interests.join(","));
        const res = await fetch(`/api/onboarding/reward-feed?categories=${qs}`);
        const data = await res.json();
        if (!cancelled) setSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch {
        if (!cancelled) setSections([]);
      }
    })();
    return () => { cancelled = true; };
  }, [interests]);

  const loading = sections === null;

  return (
    <div className="min-h-screen flex flex-col pb-28 animate-fade-in">
      {/* Header: back + step indicator */}
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
        <span className="text-[13px] font-medium text-zinc-500 tracking-wider">2 / 3</span>
        <div className="w-9 h-9" />
      </div>

      {/* Step progress dots */}
      <div className="mt-3 flex gap-2 justify-center">
        <span className="w-8 h-1 rounded-full bg-coral-500" />
        <span className="w-8 h-1 rounded-full bg-coral-500" />
        <span className="w-8 h-1 rounded-full bg-zinc-200" />
      </div>

      {/* Headline */}
      <div className="px-6 mt-8 space-y-2 text-center">
        <h1 className="text-[24px] font-extrabold leading-[1.2] text-zinc-900">
          Το feed σου είναι έτοιμο.
        </h1>
        <p className="text-[15px] leading-[1.45] text-zinc-600">
          Αυτά διαλέξαμε για σένα ήδη:
        </p>
      </div>

      {/* Sections */}
      <div className="mt-7 space-y-7">
        {loading && (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        )}

        {!loading && sections!.length === 0 && (
          <p className="px-6 text-center text-[14px] text-zinc-500">
            Δεν βρήκαμε ακόμα προτάσεις για τις κατηγορίες σου. Δώσε μας λίγες μέρες!
          </p>
        )}

        {!loading && sections!.map((s) => (
          <CategorySection key={s.category} section={s} />
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-zinc-200 z-10 max-w-[390px] mx-auto">
        <button
          onClick={onContinue}
          className="w-full h-[52px] rounded-[12px] text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}
        >
          Δες ποιοι σε ξέρουν →
        </button>
      </div>
    </div>
  );
}

function CategorySection({ section }: { section: Section }) {
  return (
    <section>
      <h2 className="px-6 text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-3">
        {section.label}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-6 scrollbar-none pb-1">
        {section.items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="shrink-0 w-[128px] active:opacity-80 transition-opacity"
          >
            <div className="w-[128px] h-[192px] rounded-[10px] bg-zinc-100 overflow-hidden mb-2">
              {item.cover_url ? (
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl opacity-30">★</span>
                </div>
              )}
            </div>
            <p className="text-[13px] font-semibold text-zinc-800 leading-[1.25] line-clamp-2">
              {item.title}
            </p>
            {/* Reason: the "AI explains itself" beat. Coral so it's
             *  visually distinct from the rating line + signals this
             *  is the platform talking, not metadata. */}
            {item.reason && (
              <p className="mt-1 text-[11px] font-medium text-coral-600 leading-snug line-clamp-2">
                {item.reason}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton() {
  return (
    <section>
      <div className="px-6 mb-3">
        <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-3 px-6 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-[128px]">
            <div className="w-[128px] h-[192px] rounded-[10px] bg-zinc-100 animate-pulse" />
            <div className="h-3 w-20 bg-zinc-100 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
