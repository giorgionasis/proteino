"use client";

import { useEffect, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icons";
import type { AchievementData } from "@/hooks/useSubmission";

/**
 * Achievement celebration modal.
 *
 * Reads its title/subtitle/body from the DB-driven `moments` table
 * (see migration 026/027 + lib/moments). The modal is now a pure
 * renderer — `variant` ("progress" | "tier_unlock"), `badge`, `target`,
 * `count` come from `achievement.display`. Copy strings come from
 * `achievement.copy` already interpolated server-side. **Bold**
 * markdown is parsed inline here for emphasis on numbers/key values.
 *
 * Card architecture mirrors BookmarkSavedModal:
 *   - Portal-mounted to <body>
 *   - 3-phase mount (next-frame transform target)
 *   - Slide-up + scale entrance, fade-out exit
 *   - Body scroll lock while open
 *   - Backdrop click + X both close, NO auto-dismiss
 */

export type AchievementVariant = "progress" | "tier_unlock";
export type BadgeTier = "verified" | "gold" | "expert" | "platinum";

interface Props {
  open:        boolean;
  achievement: AchievementData | null;
  onClose:     () => void;
}

// ── Badge metadata ─────────────────────────────────────────────────────

const TIER_ICON: Record<BadgeTier, IconName> = {
  verified: "badge-verified",
  gold:     "badge-gold",
  expert:   "badge-expert",
  platinum: "badge-platinum",
};

/** Greek display label per tier ("Επαληθευμένος χρήστης" under the hex).
 *  Two-word labels render on two lines. */
const TIER_LABEL: Record<BadgeTier, [string, string]> = {
  verified: ["Επαληθευμένος", "χρήστης"],
  gold:     ["Έμπειρος",      "χρήστης"],
  expert:   ["Expert",        "χρήστης"],
  platinum: ["Platinum",      "χρήστης"],
};

/** Color used for the tier label + sparkles in the unlock variant. */
const TIER_COLOR: Record<BadgeTier, string> = {
  verified: "#1D9E75",
  gold:     "#3B82F6",
  expert:   "#7C3AED",
  platinum: "#64748B",
};

// ── Component ─────────────────────────────────────────────────────────

export function AchievementUnlockedModal({ open, achievement, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted || !achievement) return null;
  if (typeof document === "undefined") return null;

  // Pull variant/badge/target/count from the resolved moment's display.
  // Defaults are defensive — if a misconfigured DB row omits them, the
  // modal still renders something coherent rather than crashing.
  const variant: AchievementVariant =
    (achievement.display.variant as AchievementVariant) ?? "progress";
  const badge: BadgeTier =
    (achievement.display.badge as BadgeTier) ?? "verified";
  const target = typeof achievement.display.target === "number"
    ? achievement.display.target
    : 3;
  const count = typeof achievement.display.count === "number"
    ? achievement.display.count
    : 0;

  const isUnlock = variant === "tier_unlock";
  const [labelLine1, labelLine2] = TIER_LABEL[badge];
  const tierColor = TIER_COLOR[badge];

  const dots = variant === "progress" ? buildDots(count, target) : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
      className={cn(
        "fixed inset-0 z-[110] flex items-center justify-center px-5 transition-opacity duration-200 ease-soft",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-200 ease-soft",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-[420px] rounded-[28px] bg-white shadow-2xl px-7 pt-9 pb-8",
          "transition-all duration-300 ease-spring",
          visible ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.95]",
        )}
      >
        {/* Close (X) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6"  y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <h1
          id="achievement-title"
          className="text-center text-[24px] font-extrabold text-zinc-900 leading-[120%] tracking-[-0.005em] px-2"
        >
          <Bold>{achievement.copy.title}</Bold>
        </h1>

        {/* Unlock subtitle sits directly below the title */}
        {isUnlock && achievement.copy.subtitle && (
          <p className="mt-2 text-center text-[15px] text-zinc-600">
            <Bold>{achievement.copy.subtitle}</Bold>
          </p>
        )}

        {/* Progress dots (progress variant only) */}
        {dots && (
          <div className="mt-7 flex items-center justify-center gap-1.5">
            {dots.map((d, i) => (
              <div key={d.count} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-zinc-300 text-[14px] leading-none">—</span>}
                <ProgressDot count={d.count} done={d.done} />
              </div>
            ))}
          </div>
        )}

        {/* Progress subtitle sits below the dots */}
        {!isUnlock && achievement.copy.subtitle && (
          <p className="mt-4 text-center text-[15px] text-zinc-600 leading-[150%] px-2">
            <Bold>{achievement.copy.subtitle}</Bold>
          </p>
        )}

        {/* Badge area — laurel + hex + sparkles + tier label */}
        <div className={cn("relative mt-6 flex items-center justify-center", isUnlock ? "min-h-[200px]" : "min-h-[180px]")}>
          <Icon name="profile-leaves-left"  size={120} className="absolute left-2  top-1/2 -translate-y-1/2 opacity-30" />
          <Icon name="profile-leaves-right" size={120} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30" />

          <div className="relative flex flex-col items-center">
            {isUnlock && <SparkleField color={tierColor} />}
            {!isUnlock && <SparkleField color="#CBD5E1" subtle />}

            {/* Hex badge */}
            <div
              className={cn(
                "relative transition-transform duration-500 ease-pop",
                visible ? "scale-100" : "scale-50",
                !isUnlock && "opacity-50 grayscale",
              )}
              style={{ transitionDelay: isUnlock ? "200ms" : "0ms" }}
            >
              <Icon name={TIER_ICON[badge]} size={isUnlock ? 110 : 84} />
            </div>

            {/* Tier label */}
            <p
              className="mt-3 text-center text-[18px] font-extrabold leading-[120%]"
              style={{ color: isUnlock ? tierColor : "#9CA3AF" }}
            >
              {labelLine1}<br />{labelLine2}
            </p>
          </div>
        </div>

        {/* Bottom copy */}
        {achievement.copy.body && (
          <p className="mt-5 text-center text-[14px] text-zinc-600 leading-[150%] px-2">
            <Bold>{achievement.copy.body}</Bold>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Inline **bold** parser ────────────────────────────────────────────
// Templates in the moments table use **N** to emphasise numbers and key
// words. This tiny renderer splits on **…** and wraps the matches in a
// <strong> with the zinc-900 emphasis we used before. No nested markup,
// no HTML injection — pure string-to-React.

function Bold({ children }: { children: string }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  if (!text.includes("**")) return <>{text}</>;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-zinc-900">{p}</strong>
          : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────

interface DotState {
  count: number;
  done:  boolean;
}

function buildDots(count: number, target: number): DotState[] {
  const remaining = Math.max(0, target - count);
  const dotCount  = Math.max(3, remaining + 1);
  const start     = Math.max(1, target - dotCount + 1);
  const dots: DotState[] = [];
  for (let n = start; n <= target; n++) {
    dots.push({ count: n, done: n <= count });
  }
  return dots;
}

function ProgressDot({ count, done }: DotState) {
  if (done) {
    return (
      <div
        className="w-9 h-9 rounded-full bg-success flex items-center justify-center"
        aria-label={`Πρόταση ${count} ολοκληρωμένη`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{ border: "1.5px dashed #CBD5E1" }}
      aria-label={`Πρόταση ${count} (εκκρεμεί)`}
    >
      <span className="text-[14px] font-semibold text-zinc-400">{count}</span>
    </div>
  );
}

// ── Sparkles ──────────────────────────────────────────────────────────

interface SparkleSpec {
  x:     number;
  y:     number;
  size:  number;
  delay: number;
}

const SPARKLES: SparkleSpec[] = [
  { x: -55, y: -50, size: 16, delay: 320 },
  { x:  55, y: -30, size: 22, delay: 420 },
  { x: -45, y:  35, size: 14, delay: 500 },
  { x:  50, y:  20, size: 18, delay: 380 },
];

function SparkleField({ color, subtle = false }: { color: string; subtle?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} {...s} color={color} subtle={subtle} />
      ))}
    </div>
  );
}

function Sparkle({ x, y, size, delay, color, subtle }: SparkleSpec & { color: string; subtle?: boolean }) {
  return (
    <span
      className={cn(
        "absolute animate-pop-in",
        subtle && "opacity-40",
      )}
      style={{
        left: `calc(50% + ${x}px)`,
        top:  `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%)",
        animationDelay: `${delay}ms`,
        color,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0 L13.5 9 L24 12 L13.5 15 L12 24 L10.5 15 L0 12 L10.5 9 Z" />
      </svg>
    </span>
  );
}
