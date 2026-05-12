"use client";

import { useEffect, useState } from "react";

interface Step {
  /** Label template. Supports `{N}` placeholder, replaced with the
   *  per-step number when provided. */
  label: string;
  /** Optional number to render inline (replaces `{N}` in label).
   *  When omitted the placeholder is stripped. */
  n?:    number | null;
  ms:    number;
}

interface Props {
  steps:    Step[];
  onDone?:  () => void;
  headline?: string;
}

/**
 * OnboardingSyncing — multi-step "we're preparing your feed" screen.
 *
 * Each step has a label template and an optional number (`n`). When
 * `n` is provided the placeholder `{N}` in the label is replaced with
 * a coral-highlighted, large-format number — turning generic copy
 * ("Φιλτράρουμε προτάσεις") into a flex of real work ("Φιλτράραμε
 * 234 προτάσεις"). When `n` is null/undefined the placeholder is
 * removed cleanly so a parent that's still loading numbers can fall
 * back to neutral copy.
 *
 * Steps progress on fixed timers. The redirect after the final step
 * is fired via `onDone` — fully decoupled from any backend writes,
 * which happen fire-and-forget from the parent.
 */
export function OnboardingSyncing({ steps, onDone, headline = "Ετοιμάζουμε το feed σου" }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (steps.length === 0) {
      onDone?.();
      return;
    }
    let cancelled = false;
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (cancelled) return;
      if (cursor >= steps.length) {
        onDone?.();
        return;
      }
      setActiveIdx(cursor);
      timer = setTimeout(() => {
        cursor += 1;
        tick();
      }, steps[cursor].ms);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Sequence runs once per mount; subsequent step-array changes do
    // not restart it (we hot-swap labels while the animation plays).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 gap-10 animate-fade-in">
      {/* Animated ring */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-[3px] border-coral-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-coral-500 animate-spin" />
      </div>

      {/* Headline */}
      <p className="text-[19px] font-bold text-zinc-900 text-center leading-snug">
        {headline}
      </p>

      {/* Checklist */}
      <div className="w-full max-w-[300px] space-y-3.5">
        {steps.map((s, i) => {
          const isDone    = i < activeIdx;
          const isActive  = i === activeIdx;
          const isPending = i > activeIdx;

          return (
            <div
              key={i}
              className={`flex items-start gap-3 transition-opacity duration-300 ${
                isPending ? "opacity-30" : "opacity-100"
              }`}
            >
              {/* Status indicator */}
              <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                {isDone && (
                  <svg viewBox="0 0 20 20" className="w-5 h-5 animate-pop-in" fill="none">
                    <circle cx="10" cy="10" r="9" fill="#1D9E75" />
                    <path d="M6 10.5 L9 13 L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isActive && (
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 rounded-full border-2 border-coral-100" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-coral-500 animate-spin" />
                  </div>
                )}
                {isPending && (
                  <div className="w-2 h-2 rounded-full bg-zinc-300" />
                )}
              </div>

              <span className={`text-[14px] leading-snug ${
                isDone   ? "text-zinc-500" :
                isActive ? "text-zinc-800 font-semibold" :
                           "text-zinc-400"
              }`}>
                {renderLabel(s, isDone || isActive)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderLabel(step: Step, animateNumber: boolean): React.ReactNode {
  // Split on the literal `{N}` placeholder. When `n` is provided the
  // placeholder becomes a coral, bold inline span. When missing, the
  // placeholder is removed and surrounding spaces collapsed so copy
  // stays readable.
  const parts = step.label.split("{N}");
  if (parts.length === 1) {
    return step.label;
  }
  if (step.n == null) {
    return parts.join("").replace(/\s+/g, " ").trim();
  }
  return (
    <>
      {parts[0]}
      <span
        className={`font-bold text-coral-600 ${animateNumber ? "animate-pop-in" : ""}`}
      >
        {step.n.toLocaleString("el-GR")}
      </span>
      {parts[1]}
    </>
  );
}
