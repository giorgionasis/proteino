"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Link2, List, Mic, RotateCcw, Star, X } from "lucide-react";
import { OverlayHeader } from "@/components/layout/Header";
import { useSubmission, type AchievementData } from "@/hooks/useSubmission";
import { AchievementProgress } from "@/components/submission/AchievementProgress";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────

const ANALYZING_MESSAGES = [
  "Keep going, I'm analyzing context...",
  "Detecting category and title...",
  "Matching against community database...",
  "Calculating quality score...",
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function WaveformIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2"  y="8"  width="3" height="8"  rx="1.5" />
      <rect x="7"  y="4"  width="3" height="16" rx="1.5" />
      <rect x="12" y="6"  width="3" height="12" rx="1.5" />
      <rect x="17" y="9"  width="3" height="6"  rx="1.5" />
    </svg>
  );
}

// ── Input mode bar ────────────────────────────────────────────────────────────

const MODES = [
  { key: "scan",  label: "Scan",  Icon: Camera },
  { key: "link",  label: "Link",  Icon: Link2  },
  { key: "list",  label: "List",  Icon: List   },
  { key: "voice", label: "",      Icon: Mic    },
] as const;

function InputModes() {
  return (
    <div className="flex gap-2">
      {MODES.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={cn(
            "flex items-center gap-1.5 h-10 rounded-card bg-zinc-100",
            "text-sm font-medium text-zinc-600 transition-colors active:bg-zinc-200",
            key === "voice" ? "w-10 justify-center text-coral-600 bg-coral-50 active:bg-coral-100" : "px-3",
          )}
        >
          <Icon size={15} strokeWidth={2} />
          {label && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Intelligence panel ────────────────────────────────────────────────────────

type QualityLabel = "poor" | "fair" | "good" | "excellent";

const QUALITY_COLOR: Record<QualityLabel, string> = {
  poor:      "text-zinc-400",
  fair:      "text-warning",       // yellow
  good:      "text-emerald-400",
  excellent: "text-coral-600",
};

function IntelligencePanel({
  progress,
  message,
  lockedTitle,
  lockedCategory,
  qualityLabel,
  qualityBadge,
  coachingStatus,
  coachingReady,
}: {
  progress:       number;
  message:        string;
  /** When set, the panel surfaces a prominent "Κλειδωμένο" banner with this
   *  title — unambiguous lock signal. Null while AI is still searching. */
  lockedTitle:    string | null;
  lockedCategory: string | null;
  qualityLabel:   QualityLabel | null;
  qualityBadge:   string | null;
  /** "thinking" → animated dot + reduced opacity on tip. "fresh" →
   *  brief glow on the tip line. "idle" → static. */
  coachingStatus: "idle" | "thinking" | "fresh";
  /** Gemini judged the writing as rich + personal — show celebration
   *  state above the tip. */
  coachingReady:  boolean;
}) {
  return (
    <div className="bg-zinc-900 rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-coral-600 tracking-[0.2em] uppercase">
          Proteino Intelligence
        </span>
        <div className="flex items-center gap-2">
          {coachingStatus === "thinking" && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-coral-400 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-coral-400 animate-pulse" />
              Σκέφτεται
            </span>
          )}
          {qualityBadge ? (
            <span className={cn("text-[10px] font-bold tracking-widest uppercase", qualityLabel ? QUALITY_COLOR[qualityLabel] : "text-zinc-400")}>
              {qualityBadge}
            </span>
          ) : (
            <span className="text-xs text-zinc-500 tabular-nums">{progress}%</span>
          )}
        </div>
      </div>

      {/* Locked match banner — prominent, unambiguous. Shown above the
          coaching message so the user can't miss what AI committed to.
          Enters with `animate-pop-in` (scale-up + fade) and the
          ✓ Κλειδωμένο badge slides in from the right just after for a
          two-beat reward feel. The whole card is keyed off `lockedTitle`
          so a different match restarts the entrance. */}
      {lockedTitle && (
        <div
          key={lockedTitle}
          className="rounded-card px-3 py-2.5 border border-coral-600/40 animate-in zoom-in-95 fade-in duration-300 ease-pop"
          style={{ background: "linear-gradient(135deg, rgba(254,111,94,0.18), rgba(255,153,128,0.10))" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-coral-600 tracking-widest uppercase shrink-0 animate-in slide-in-from-right-3 fade-in duration-300 ease-spring delay-150">
              ✓ Κλειδωμένο
            </span>
            {lockedCategory && (
              <span className="text-[10px] font-medium text-zinc-400 tracking-widest uppercase">
                · {lockedCategory}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white leading-snug mt-0.5">{lockedTitle}</p>
        </div>
      )}

      {coachingReady && (
        <div
          className="rounded-card px-3 py-2.5 border border-success/40 animate-in zoom-in-95 fade-in duration-300 ease-pop"
          style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.18), rgba(29,158,117,0.08))" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-success tracking-widest uppercase">
              ✓ Έτοιμη πρόταση
            </span>
          </div>
          <p className="text-sm font-bold text-white leading-snug mt-0.5">
            Εξαιρετική περιγραφή — μπορείς να δημοσιεύσεις
          </p>
        </div>
      )}

      <p
        className={cn(
          "text-sm font-medium leading-snug transition-all duration-300",
          coachingStatus === "thinking" ? "text-white/60" : "text-white",
          coachingStatus === "fresh" && "animate-in fade-in duration-500",
        )}
      >
        {message}
      </p>

      <div className="h-[3px] bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
        />
      </div>
    </div>
  );
}

// ── Match confirm card (medium-tier "Σωστό;" prompt) ─────────────────────────

/**
 * For medium-confidence matches the AI doesn't lock — instead it shows
 * this card with the picked title, a poster thumbnail, and Ναι/Όχι pills.
 * "Ναι" promotes to a real lock; "Όχι" demotes the tier to low so the
 * alternatives carousel takes over as the primary UI.
 */
function MatchConfirmCard({
  title,
  year,
  posterUrl,
  onConfirm,
  onReject,
}: {
  title: string;
  year: number | null;
  posterUrl: string | null;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-card border border-coral-600/40 bg-coral-50/40 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-16 rounded-xs overflow-hidden bg-zinc-100 shrink-0">
          {posterUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={posterUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-coral-600 tracking-widest uppercase">Νομίζω είναι</p>
          <p className="text-sm font-bold text-zinc-800 truncate">
            {title}
            {year && <span className="ml-1.5 text-zinc-500 font-medium">({year})</span>}
          </p>
          <p className="text-[12px] text-zinc-500 mt-0.5">Σωστό;</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 h-10 rounded-card text-sm font-bold tracking-widest uppercase text-white active:opacity-90 transition-colors"
          style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
        >
          Ναι, αυτό
        </button>
        <button
          onClick={onReject}
          className="flex-1 h-10 rounded-card text-sm font-bold tracking-widest uppercase text-zinc-700 bg-white border border-zinc-200 active:bg-zinc-50 transition-colors"
        >
          Όχι, άλλο
        </button>
      </div>
    </div>
  );
}

// ── Match alternatives (confidence tier surface) ──────────────────────────────

interface AlternativeCard {
  title: string;
  year: number | null;
  posterUrl: string | null;
}

/**
 * Small horizontal card grid the overlay shows when AI isn't confident
 * enough to auto-lock — or when the user explicitly asks "όχι αυτό?". Each
 * card carries a poster, title and year. Tap → swap analysis to that
 * candidate via useSubmission.chooseAlternative().
 */
function MatchAlternatives({
  heading,
  alternatives,
  onPick,
}: {
  heading: string;
  alternatives: AlternativeCard[];
  onPick: (index: number) => void;
}) {
  if (alternatives.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
        {heading}
      </p>
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {alternatives.map((alt, i) => (
          <button
            key={`${alt.title}-${i}`}
            onClick={() => onPick(i)}
            className={cn(
              "shrink-0 w-32 rounded-card border border-zinc-200 bg-white overflow-hidden text-left",
              "active:bg-zinc-50 active:border-coral-600 transition-colors",
            )}
          >
            <div className="relative aspect-[2/3] bg-zinc-100">
              {alt.posterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={alt.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs">
                  Χωρίς εικόνα
                </div>
              )}
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-[12px] font-semibold text-zinc-800 leading-tight line-clamp-2">{alt.title}</p>
              {alt.year && <p className="text-[11px] text-zinc-500">{alt.year}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Syncing screen (dark takeover) ────────────────────────────────────────────

function SyncingScreen() {
  const [step, setStep] = useState(0);
  const steps = ["Category identified", "Match confirmed", "Enriching metadata..."];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">
      <svg className="w-20 h-20 animate-spin-slow" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="36" stroke="#27272a" strokeWidth="3" />
        <circle cx="40" cy="40" r="36" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="226" strokeDashoffset="170" />
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FE6F5E" />
            <stop offset="100%" stopColor="#FF9980" />
          </linearGradient>
        </defs>
      </svg>
      <div className="w-full space-y-3">
        {steps.map((label, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <div key={label} className={cn("flex items-center gap-3 transition-opacity duration-500", i > step && "opacity-25")}>
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                done ? "bg-success" : current ? "bg-coral-600" : "bg-zinc-700")}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                )}
              </span>
              <span className="text-sm font-medium text-white">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Preview screen ────────────────────────────────────────────────────────────

interface MatchPreview {
  posterUrl: string | null;
  backdropUrl: string | null;
  director: string | null;
  cast: Array<{ name: string; avatar: string | null }>;
  year: number | null;
}

function PreviewScreen({
  text,
  title,
  rating,
  preview,
  isPublishing,
  setRating,
  onShare,
  onEdit,
  onClose,
}: {
  text:    string;
  title:   string;
  rating:  number;
  preview: MatchPreview;
  isPublishing: boolean;
  setRating: (n: number) => void;
  onShare: () => void;
  onEdit:  () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="flex items-center justify-end h-14 px-5 border-b border-zinc-200">
        <button onClick={onClose} aria-label="Κλείσιμο"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors">
          <X size={16} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">Preview Recommendation</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">This is how your suggestion will appear to the community.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-card">
          {/* Hero — uses TMDB backdrop when present, falls back to poster
              centered on a soft surface, falls back to a label-only block. */}
          <div className="relative h-44 bg-zinc-100 overflow-hidden">
            {preview.backdropUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </>
            ) : preview.posterUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.posterUrl} alt="" className="h-full w-auto object-contain" />
              </div>
            ) : null}
            <span className="absolute bottom-3 left-3 bg-coral-600 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-xs">
              Enriched Match
            </span>
          </div>
          <div className="p-4 space-y-5 bg-white">
            <div>
              <h3 className="text-xl font-bold text-zinc-800">
                {title}
                {preview.year && (
                  <span className="ml-2 text-base font-medium text-zinc-400">({preview.year})</span>
                )}
              </h3>
              {preview.director && (
                <div className="mt-2 text-[13px] text-zinc-600">
                  <p>
                    <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mr-2">Σκηνοθεσία</span>
                    <span className="font-semibold text-zinc-800">{preview.director}</span>
                  </p>
                </div>
              )}
              {preview.cast.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-2">Πρωταγωνιστούν</p>
                  <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {preview.cast.slice(0, 6).map((c, i) => (
                      <div key={`${c.name}-${i}`} className="flex flex-col items-center gap-1 shrink-0 w-16">
                        <div className="w-14 h-14 rounded-full bg-zinc-100 overflow-hidden">
                          {c.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[11px] font-bold">
                              {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-700 text-center leading-tight line-clamp-2">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Star rating — embedded with the suggestion (CLAUDE.md §11) */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Η βαθμολογία σου</p>
              <div className="flex items-center gap-1.5">
                {[1,2,3,4,5].map((s) => {
                  const filled = s <= rating;
                  return (
                    <button
                      key={s}
                      onClick={() => setRating(rating === s ? 0 : s)}
                      aria-label={`${s} αστέρια`}
                      className="active:scale-95 transition-transform"
                    >
                      <Star
                        size={28}
                        strokeWidth={1.5}
                        fill={filled ? "#FE6F5E" : "transparent"}
                        stroke={filled ? "#FE6F5E" : "#a1a1aa"}
                      />
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span className="ml-2 text-xs text-zinc-500 tabular-nums">{rating}/5</span>
                )}
              </div>
            </div>

            {/* Reflection — full text, no truncation */}
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-zinc-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-1">Η προσωπική σου σκέψη</p>
                <p className="text-sm text-zinc-600 italic leading-relaxed whitespace-pre-wrap break-words">
                  &ldquo;{text}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-8 pt-4 border-t border-zinc-100 space-y-3">
        {rating === 0 && !isPublishing && (
          <p className="text-[12px] text-zinc-500 text-center">
            Δώσε βαθμολογία για να δημοσιεύσεις
          </p>
        )}
        <button
          onClick={onShare}
          disabled={rating === 0 || isPublishing}
          className={cn(
            "w-full h-13 rounded-card text-sm font-bold tracking-widest uppercase transition-colors",
            rating === 0 && !isPublishing
              ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-900 text-white active:bg-zinc-800 disabled:opacity-70",
          )}
        >
          {isPublishing ? "Δημοσίευση..." : "Share"}
        </button>
        <button
          onClick={onEdit}
          disabled={isPublishing}
          className="w-full h-11 text-sm font-semibold text-zinc-400 tracking-widest uppercase active:text-zinc-600 transition-colors disabled:opacity-50"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Published screen (dark celebration) ───────────────────────────────────────

// Format week-position with Greek ordinal suffix.
function ordinalEl(n: number): string {
  return `${n}ος`;
}

interface HookMoments {
  weeklyCount: number;
  categoryAudienceCount: number;
  myFollowersCount: number;
}

function PublishedScreen({
  title,
  itemSlug,
  category,
  posterUrl,
  rating,
  reflection,
  onDismiss,
  onSuggestAnother,
  newSuggestionCount,
  hooks,
  achievement,
}: {
  title:              string;
  itemSlug:           string;
  category:           string | null;
  posterUrl:          string | null;
  rating:             number;
  reflection:         string;
  onDismiss:          () => void;
  onSuggestAnother:   () => void;
  newSuggestionCount: number | null;
  hooks:              HookMoments | null;
  achievement:        AchievementData | null;
}) {
  const [shareToast, setShareToast] = useState<string | null>(null);

  const shareUrl = itemSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/${itemSlug}` : "";

  const handleShareClick = async () => {
    if (!shareUrl) return;
    const sharePayload = { title: `Proteino: ${title}`, url: shareUrl };

    // Native share on mobile (and Safari desktop). Fallback to clipboard.
    const nav = navigator as Navigator & { share?: (data: any) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share(sharePayload);
        return;
      } catch {
        /* user cancelled or unavailable — try clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast("✓ Αντιγράφηκε ο σύνδεσμος");
      setTimeout(() => setShareToast(null), 2200);
    } catch {
      setShareToast("Αντιγραφή απέτυχε");
      setTimeout(() => setShareToast(null), 2200);
    }
  };

  // HOOKS.md §2B — pick the most impactful 1-2 lines. We always show
  // weekly position (works for any user). Audience and followers only
  // when they're > 0 (otherwise zeros feel sad).
  const hookLines: string[] = [];
  if (hooks) {
    if (hooks.weeklyCount > 0) {
      hookLines.push(`Είσαι ο ${ordinalEl(hooks.weeklyCount)} που πρότεινε αυτή την εβδομάδα 🔥`);
    }
    if (hooks.categoryAudienceCount > 0) {
      hookLines.push(
        `${hooks.categoryAudienceCount} ${hooks.categoryAudienceCount === 1 ? "άνθρωπος ενδιαφέρεται" : "άνθρωποι ενδιαφέρονται"} για αυτή την κατηγορία`
      );
    }
    if (hooks.myFollowersCount > 0) {
      hookLines.push(
        `${hooks.myFollowersCount} ${hooks.myFollowersCount === 1 ? "χρήστης σε ακολουθεί" : "χρήστες σε ακολουθούν"} — θα το δουν στο feed τους`
      );
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="flex items-center justify-end h-14 px-5">
        <button
          onClick={onDismiss}
          aria-label="Κλείσιμο"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors"
        >
          <X size={16} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 overflow-y-auto">
        {/* Hero — coral checkmark on a soft halo, generous breathing room */}
        <div className="flex flex-col items-center pt-6 pb-10">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{ background: "radial-gradient(circle, #FE6F5E 0%, transparent 70%)" }}
            />
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center animate-scale-in shadow-[0_8px_32px_rgba(254,111,94,0.32)]"
              style={{ background: "linear-gradient(135deg, #FE6F5E, #FF9980)" }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] font-bold text-coral-600 tracking-[0.25em] uppercase mt-6">
            Δημοσιεύτηκε
          </p>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight mt-2 text-center">
            Είσαι στην κοινότητα 🎉
          </h1>
        </div>

        {/* Published item — clean white card, the centerpiece */}
        <Link
          href={itemSlug ? `/${itemSlug}` : "#"}
          onClick={(e) => { if (!itemSlug) e.preventDefault(); else onDismiss(); }}
          className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-card overflow-hidden active:bg-zinc-50 transition-colors"
        >
          <div className="flex gap-4 p-4">
            <div className="w-20 h-28 rounded-card overflow-hidden bg-zinc-100 shrink-0">
              {posterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={posterUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-1">
                  Η πρότασή σου
                </p>
                <p className="text-base font-bold text-zinc-900 leading-tight line-clamp-2">{title}</p>
                {rating > 0 && (
                  <div className="flex items-center gap-0.5 mt-2">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={14} strokeWidth={1.5}
                        fill={s <= rating ? "#FE6F5E" : "transparent"}
                        stroke={s <= rating ? "#FE6F5E" : "#d4d4d8"} />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] font-bold text-coral-600 tracking-widest uppercase">
                Δες την →
              </p>
            </div>
          </div>
          {reflection && (
            <div className="px-4 pb-4 pt-1">
              <p className="text-[13px] text-zinc-600 italic leading-relaxed line-clamp-3 border-l-2 border-coral-600/30 pl-3">
                {reflection}
              </p>
            </div>
          )}
        </Link>

        {/* Hook moments — soft, tasteful, not spammy */}
        {hookLines.length > 0 && (
          <div className="w-full max-w-md mt-8 space-y-2">
            {hookLines.map((line, i) => (
              <div
                key={i}
                className="rounded-card bg-zinc-50 border border-zinc-100 px-4 py-3"
              >
                <p className="text-[13px] font-medium text-zinc-700 leading-snug text-center">{line}</p>
              </div>
            ))}
          </div>
        )}

        {/* Achievement progress — already light-themed */}
        {typeof newSuggestionCount === "number" && newSuggestionCount > 0 && (
          <div className="w-full max-w-md mt-8">
            <AchievementProgress suggestionCount={newSuggestionCount} />
          </div>
        )}

        {/* Επόμενο βήμα — keep momentum */}
        <div className="w-full max-w-md mt-10 mb-6">
          <p className="text-[10px] font-bold text-zinc-400 tracking-[0.25em] uppercase text-center mb-3">
            Επόμενο βήμα
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onSuggestAnother}
              className="rounded-card bg-white border border-zinc-200 p-4 text-left active:bg-zinc-50 transition-colors"
            >
              <p className="text-2xl mb-2">🔥</p>
              <p className="text-[13px] font-bold text-zinc-900 leading-tight">Πρότεινε ακόμα μία</p>
              <p className="text-[11px] text-zinc-500 mt-1">Συνέχισε το streak</p>
            </button>
            <Link
              href={category ? `/${category}` : "/"}
              onClick={onDismiss}
              className="rounded-card bg-white border border-zinc-200 p-4 text-left active:bg-zinc-50 transition-colors block"
            >
              <p className="text-2xl mb-2">🎬</p>
              <p className="text-[13px] font-bold text-zinc-900 leading-tight">Δες παρόμοια</p>
              <p className="text-[11px] text-zinc-500 mt-1">Στην κατηγορία</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t border-zinc-100 flex flex-col gap-3">
        {shareToast && (
          <p className="text-center text-[12px] text-emerald-600 font-medium">{shareToast}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 h-12 rounded-card bg-zinc-100 text-zinc-700 text-sm font-bold tracking-widest uppercase active:bg-zinc-200 transition-colors"
          >
            Κλείσιμο
          </button>
          <button
            onClick={handleShareClick}
            disabled={!shareUrl}
            className="flex-1 h-12 rounded-card text-white text-sm font-bold tracking-widest uppercase active:opacity-90 transition-colors disabled:opacity-40"
            style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
          >
            Share Link
          </button>
        </div>
      </div>

      <AchievementOverlay achievement={achievement} />
    </div>
  );
}

/** Auto-opens the AchievementUnlockedModal a beat after the Published
 *  screen mounts so the user gets the ✓ moment first, then the badge
 *  celebration lands cleanly on top. Closing the modal returns the
 *  user to the Published screen — they can still hit Share or Δες
 *  την →. */
function AchievementOverlay({ achievement }: { achievement: AchievementData | null }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [achievement]);
  return (
    <AchievementUnlockedModal
      open={open}
      achievement={achievement}
      onClose={() => setOpen(false)}
    />
  );
}

// ── Duplicate screen (HOOKS.md §8) ────────────────────────────────────────────

function DuplicateScreen({
  kind,
  suggester,
  itemSlug,
  category,
  title,
  year,
  posterUrl,
  onTryAgain,
  onWrongMatch,
  onClose,
}: {
  kind:         "own" | "other";
  suggester:    { handle: string; display_name: string } | null;
  itemSlug:     string;
  category:     string | null;
  title:        string;
  year:         number | null;
  posterUrl:    string | null;
  /** "Πρότεινε κάτι άλλο" — full reset of the overlay. */
  onTryAgain:   () => void;
  /** "Όχι, διαφορετική" — AI matched the wrong thing. Drop lock + return
   *  to typing so the user can keep writing and let AI re-analyze. */
  onWrongMatch: () => void;
  onClose:      () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="flex items-center justify-end h-14 px-5 border-b border-zinc-100">
        <button onClick={onClose} aria-label="Κλείσιμο"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors">
          <X size={16} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold text-coral-600 tracking-[0.25em] uppercase mb-2">
            Ήδη στο Proteino
          </p>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight">
            Αυτό βρήκα στην κοινότητα
          </h1>
        </div>

        {/* Item card — same visual language as PreviewScreen */}
        <div className="max-w-md mx-auto rounded-2xl bg-white border border-zinc-200 shadow-card overflow-hidden mb-8">
          <div className="flex gap-4 p-4">
            <div className="w-20 h-28 rounded-card overflow-hidden bg-zinc-100 shrink-0">
              {posterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={posterUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-base font-bold text-zinc-900 leading-tight">{title}</p>
              {year && <p className="text-[13px] text-zinc-500 mt-1">{year}</p>}
              {kind === "other" && suggester && (
                <p className="text-[12px] text-zinc-600 mt-2">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mr-1.5">Από</span>
                  <span className="font-semibold">@{suggester.handle}</span>
                </p>
              )}
              {kind === "own" && (
                <p className="text-[12px] text-coral-600 mt-2 font-semibold">
                  Δική σου πρόταση
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Verification step OR action CTAs */}
        {!confirmed ? (
          <div className="max-w-md mx-auto">
            <p className="text-center text-[15px] font-semibold text-zinc-800 mb-4">
              Είναι αυτή η πρόταση που εννοείς;
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmed(true)}
                className="h-12 rounded-card text-sm font-bold tracking-widest uppercase text-white active:opacity-90 transition-colors"
                style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
              >
                Ναι, αυτή
              </button>
              <button
                onClick={onWrongMatch}
                className="h-12 rounded-card text-sm font-bold tracking-widest uppercase text-zinc-700 bg-white border border-zinc-200 active:bg-zinc-50 transition-colors"
              >
                Όχι, άλλη
              </button>
            </div>
            <p className="text-center text-[11px] text-zinc-400 mt-3 leading-relaxed">
              Αν είναι λάθος, συνέχισε να γράφεις και θα ξαναβρώ.
            </p>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            {/* Context message — varies by kind */}
            <div className="rounded-card bg-zinc-50 border border-zinc-100 px-4 py-3">
              <p className="text-[13px] text-zinc-700 leading-relaxed text-center">
                {kind === "own" ? (
                  <>
                    Το έχεις προτείνει εσύ — ίσως δε το θυμόσουν 😄
                    <br />
                    <span className="text-zinc-500 text-[12px]">Δοκίμασε κάτι διαφορετικό για να εμπλουτίσεις το feed.</span>
                  </>
                ) : (
                  <>
                    {suggester ? (
                      <>Το έχει ήδη προτείνει ο/η <span className="font-semibold text-zinc-800">@{suggester.handle}</span>. </>
                    ) : (
                      <>Έχει ήδη προταθεί από κάποιον άλλο. </>
                    )}
                    <br />
                    <span className="text-zinc-500 text-[12px]">Μπορείς να βαθμολογήσεις, να δεις παρόμοια, ή να προτείνεις κάτι άλλο.</span>
                  </>
                )}
              </p>
            </div>

            {/* Action CTAs */}
            <div className="space-y-2">
              {kind === "own" ? (
                <>
                  {itemSlug && (
                    <Link
                      href={`/${itemSlug}`}
                      onClick={onClose}
                      className="block w-full h-12 rounded-card text-white text-sm font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
                      style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
                    >
                      Δες την πρότασή σου
                    </Link>
                  )}
                  <button
                    onClick={onTryAgain}
                    className="w-full h-12 rounded-card bg-white border border-zinc-200 text-zinc-700 text-sm font-bold tracking-widest uppercase active:bg-zinc-50 transition-colors"
                  >
                    Πρότεινε κάτι άλλο
                  </button>
                </>
              ) : (
                <>
                  {itemSlug && (
                    <Link
                      href={`/${itemSlug}`}
                      onClick={onClose}
                      className="block w-full h-12 rounded-card text-white text-sm font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
                      style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
                    >
                      ★ Βαθμολόγησέ το
                    </Link>
                  )}
                  {category && (
                    <Link
                      href={`/${category}`}
                      onClick={onClose}
                      className="block w-full h-12 rounded-card bg-white border border-zinc-200 text-zinc-700 text-sm font-bold tracking-widest uppercase active:bg-zinc-50 transition-colors flex items-center justify-center"
                    >
                      Δες παρόμοια
                    </Link>
                  )}
                  <button
                    onClick={onTryAgain}
                    className="w-full h-12 rounded-card bg-white border border-zinc-200 text-zinc-700 text-sm font-bold tracking-widest uppercase active:bg-zinc-50 transition-colors"
                  >
                    Πρότεινε κάτι άλλο
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="flex items-center justify-end h-14 px-5 border-b border-zinc-200">
        <button onClick={onClose} aria-label="Κλείσιμο"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors">
          <X size={16} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-zinc-800">Κάτι πήγε στραβά</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">{message}</p>
      </div>
      <div className="px-5 pb-10 pt-4 border-t border-zinc-100">
        <button onClick={onRetry} className="w-full h-13 rounded-card bg-coral-600 text-white text-sm font-bold tracking-widest uppercase active:bg-coral-700 transition-colors">
          Δοκίμασε ξανά
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SuggestionOverlayProps {
  onClose: () => void;
}

export function SuggestionOverlay({ onClose }: SuggestionOverlayProps) {
  const {
    state: hookState,
    text,
    analysis,
    quality,
    rating,
    isPublishing,
    publishResult,
    duplicate,
    errorMessage,
    coachingStatus,
    coachingReady,
    setText,
    setRating,
    unlock,
    confirmMatch,
    rejectMatch,
    chooseAlternative,
    dismissAndReject,
    verify,
    publish,
    reset,
  } = useSubmission();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  // Local quality coaching (always fresh — runs in the hook on every keystroke).
  const qualityTip = quality?.tip ?? null;
  const qualityLabel = quality?.label ?? null;
  const qualityBadge = quality?.badge ?? null;
  const qualityScore = quality?.score ?? 0;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tickerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Consume any pre-fill set by another surface (e.g. search overlay's
  // "Πρότεινέ το πρώτος" chip carries the user's query in). Runs once on
  // mount; useOverlay.consumeSuggestionPrefill clears the value after read.
  const overlayPrefillConsumedRef = useRef(false);
  useEffect(() => {
    if (overlayPrefillConsumedRef.current) return;
    overlayPrefillConsumedRef.current = true;
    // Lazy import keeps the suggestion overlay's bundle independent of the
    // overlay store unless this mount actually runs (it always does, but
    // let's be explicit about the cross-cut).
    import("@/hooks/useOverlay").then(({ useOverlay }) => {
      const prefill = useOverlay.getState().consumeSuggestionPrefill();
      if (prefill) setText(prefill);
    });
  }, [setText]);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  useEffect(() => () => stopTicker(), [stopTicker]);

  // Drive animation ticker from hook state transitions
  useEffect(() => {
    if (hookState === "empty") {
      stopTicker();
      setProgress(0);
      setMsgIndex(0);
      return;
    }
    if (hookState === "typing") {
      stopTicker();
      let m = 0;
      tickerRef.current = setInterval(() => {
        m = (m + 1) % ANALYZING_MESSAGES.length;
        setMsgIndex(m);
      }, 700);
      return;
    }
    if (hookState === "match_found") {
      stopTicker();
    }
  }, [hookState, stopTicker]);

  // Progress now reflects local quality score (always fresh) — typing OR
  // locked, the bar moves as the user writes. Floors at 10% once anything
  // is typed so the bar isn't dead-empty during the first few characters.
  useEffect(() => {
    if (hookState === "empty") {
      setProgress(0);
      return;
    }
    setProgress(Math.max(qualityScore, text.length > 0 ? 10 : 0));
  }, [qualityScore, hookState, text.length]);

  // Confidence tier — read here (above early returns) so we can use it
  // throughout the component without violating React hooks ordering.
  const tier =
    (analysis?.matchData as Record<string, unknown> | null)?.confidence_tier as
      | "high"
      | "medium"
      | "low"
      | undefined;

  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setTimeout(resizeTextarea, 0);
  };

  const handleVerify    = () => verify();
  const handleShare     = () => publish();
  const handleEdit      = () => { reset(); };
  const handleDismiss   = () => { reset(); onClose(); };

  // Derive match display from analysis
  const matchTitle = analysis?.matched && analysis.title ? analysis.title : null;

  // ── Full-screen takeover states ────────────────────────────────────────────

  if (hookState === "syncing") {
    return (
      <div className="flex flex-col h-full min-h-screen bg-zinc-950">
        <SyncingScreen />
      </div>
    );
  }

  if (hookState === "preview") {
    const md = (analysis?.matchData ?? {}) as Record<string, any>;
    const preview: MatchPreview = {
      posterUrl: typeof md.poster_url === "string" ? md.poster_url : null,
      backdropUrl: typeof md.backdrop_url === "string" ? md.backdrop_url : null,
      director: typeof md.director === "string" ? md.director : null,
      year: typeof md.year === "number" ? md.year : null,
      cast: Array.isArray(md.cast)
        ? md.cast.slice(0, 5).map((c: any) => ({
            name: typeof c?.name === "string" ? c.name : "",
            avatar: typeof c?.avatar === "string" ? c.avatar : null,
          })).filter((c) => c.name)
        : [],
    };
    return (
      <PreviewScreen
        text={text}
        title={matchTitle ?? "Your Recommendation"}
        rating={rating}
        preview={preview}
        isPublishing={isPublishing}
        setRating={setRating}
        onShare={handleShare}
        onEdit={handleEdit}
        onClose={onClose}
      />
    );
  }

  if (hookState === "published") {
    const md = (analysis?.matchData ?? {}) as Record<string, any>;
    const publishedPoster = typeof md.poster_url === "string" ? md.poster_url : null;
    return (
      <PublishedScreen
        title={matchTitle ?? "Your Recommendation"}
        itemSlug={publishResult?.itemSlug ?? ""}
        category={analysis?.category ?? null}
        posterUrl={publishedPoster}
        rating={rating}
        reflection={text}
        onDismiss={handleDismiss}
        onSuggestAnother={() => reset()}
        newSuggestionCount={publishResult?.newSuggestionCount ?? null}
        hooks={publishResult ? {
          weeklyCount: publishResult.weeklyCount,
          categoryAudienceCount: publishResult.categoryAudienceCount,
          myFollowersCount: publishResult.myFollowersCount,
        } : null}
        achievement={publishResult?.achievement ?? null}
      />
    );
  }

  if (hookState === "duplicate" && duplicate) {
    const md = (analysis?.matchData ?? {}) as Record<string, any>;
    const dupPoster = typeof md.poster_url === "string" ? md.poster_url : null;
    const dupYear = typeof md.year === "number" ? md.year : null;
    return (
      <DuplicateScreen
        kind={duplicate.kind}
        suggester={duplicate.suggester}
        itemSlug={duplicate.item_slug}
        category={analysis?.category ?? null}
        title={matchTitle ?? "Your match"}
        year={dupYear}
        posterUrl={dupPoster}
        onTryAgain={() => reset()}
        onWrongMatch={() => {
          // User said the AI matched the wrong thing. Drop the duplicate
          // state + the lock, blacklist this match so AI doesn't re-suggest
          // it on the next keystroke, and return to typing — preserves the
          // text so the user can keep refining.
          dismissAndReject();
        }}
        onClose={handleDismiss}
      />
    );
  }

  if (hookState === "error") {
    return (
      <ErrorScreen
        message={errorMessage ?? "Δοκίμασε ξανά."}
        onRetry={() => reset()}
        onClose={handleDismiss}
      />
    );
  }

  // ── Input phase: empty / typing / match_found ─────────────────────────────

  const isLocked  = hookState === "match_found";
  const canVerify = isLocked && matchTitle !== null;

  // (tier is hoisted above the early returns — see comment up there.)
  const rawAlts = (analysis?.matchData as Record<string, unknown> | null)?.alternatives;
  const alternatives: AlternativeCard[] = Array.isArray(rawAlts)
    ? rawAlts.slice(0, 3).map((a: any) => ({
        title: typeof a?.title === "string" ? a.title : "",
        year: typeof a?.year === "number" ? a.year : null,
        posterUrl: typeof a?.poster_url === "string" ? a.poster_url : null,
      })).filter((a) => a.title)
    : [];

  // (qualityTip / qualityLabel / qualityBadge / qualityScore declared above
  // so the progress useEffect can read qualityScore.)

  // Locked-banner content for the panel. Only show when state is actually
  // locked (high tier or user-confirmed). Medium-tier "Σωστό?" lives on
  // its own confirm card below; low-tier shows the alternatives carousel.
  const panelLockedTitle = isLocked && matchTitle ? matchTitle : null;
  const panelLockedCategory = isLocked && analysis?.category ? analysis.category.toUpperCase() : null;

  // Quality tip (always fresh) wins over the rotating analyzing fallback.
  // When AI is asking-uncertain (medium → confirm card below; low →
  // alternatives below) the panel doesn't need to repeat that — coach the
  // user's writing instead. When locked, celebrate.
  const panelMessage =
    hookState === "empty"
      ? "Πες μας τι σου άρεσε. Ακούω."
      : qualityTip ?? (hookState === "match_found"
          ? "Τέλεια! Πρόσθεσε γιατί το προτείνεις."
          : ANALYZING_MESSAGES[msgIndex]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      {/* Header */}
      {isLocked ? (
        <div className="flex items-center justify-between h-14 px-5 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-coral-600 text-coral-600 text-xs font-bold tracking-widest uppercase">
              Locked
            </span>
            <button
              onClick={unlock}
              aria-label="Άλλαξε αντιστοιχία"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 active:text-zinc-700"
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>Άλλαξε</span>
            </button>
          </div>
          <button onClick={onClose} aria-label="Κλείσιμο"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors">
            <X size={16} strokeWidth={2.5} className="text-zinc-700" />
          </button>
        </div>
      ) : (
        <OverlayHeader label="Listening Live" icon={<WaveformIcon />} onClose={onClose} />
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          placeholder={isLocked ? "Πρόσθεσε γιατί το προτείνεις..." : "Describe, scan, or paste..."}
          rows={4}
          className={cn(
            "w-full resize-none overflow-hidden",
            "bg-zinc-50 border border-zinc-200 rounded-card",
            "px-4 py-3.5 text-base font-medium text-zinc-800 placeholder:text-zinc-400",
            "focus:outline-none focus:border-zinc-400 transition-colors",
            "leading-relaxed",
          )}
        />

        {hookState === "empty" && <InputModes />}

        <IntelligencePanel
          progress={progress}
          message={panelMessage}
          lockedTitle={panelLockedTitle}
          lockedCategory={panelLockedCategory}
          qualityLabel={qualityLabel}
          qualityBadge={qualityBadge}
          coachingStatus={coachingStatus}
          coachingReady={coachingReady}
        />

        {/* Medium tier: AI picked something but isn't 100% sure. Don't lock —
            ask the user to confirm via Ναι/Όχι pills. Όχι demotes to low so
            the alternatives carousel takes over below. */}
        {!isLocked && tier === "medium" && analysis?.matched && analysis.title && (
          <MatchConfirmCard
            title={analysis.title}
            year={typeof (analysis.matchData as any)?.year === "number" ? (analysis.matchData as any).year : null}
            posterUrl={typeof (analysis.matchData as any)?.poster_url === "string" ? (analysis.matchData as any).poster_url : null}
            onConfirm={confirmMatch}
            onReject={rejectMatch}
          />
        )}

        {/* Low tier (or rejected medium → demoted to low): alternatives carousel
            is the primary UI. User picks → chooseAlternative locks. */}
        {tier === "low" && hookState !== "empty" && alternatives.length > 0 && (
          <MatchAlternatives
            heading="Ποιο εννοείς;"
            alternatives={alternatives}
            onPick={chooseAlternative}
          />
        )}
      </div>

      {/* VERIFY button */}
      <div className="px-5 pb-8 pt-4 border-t border-zinc-100">
        <button
          onClick={handleVerify}
          disabled={!canVerify}
          className={cn(
            "w-full h-13 rounded-card text-sm font-bold tracking-widest uppercase transition-all duration-300",
            canVerify ? "text-white active:opacity-90" : "bg-zinc-100 text-zinc-400 pointer-events-none",
          )}
          style={canVerify ? { background: "linear-gradient(to right, #FE6F5E, #FF9980)" } : {}}
        >
          Verify with AI ›
        </button>
      </div>
    </div>
  );
}
