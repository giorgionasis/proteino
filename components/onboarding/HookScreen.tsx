"use client";

import { useEffect, useState } from "react";

interface Props {
  displayName: string | null;
  onContinue: () => void;
  onSkip:     () => void;
}

/**
 * Screen 1 — Hook.
 *
 * Visceral promise + animated AI demo + social proof + single CTA.
 * The demo loops a fake submission: blank textarea → text types in →
 * AI panel goes "LISTENING" → "LOCKED ✓ Mr. Robot · Σειρά · Drama".
 * Same visual grammar as the live submission flow so the user
 * recognises it the first time they hit the FAB.
 *
 * "Παράλειψη" is a real exit, not a delay — calling onSkip marks the
 * user onboarded so they're never nagged again.
 */

type DemoPhase = "idle" | "typing" | "listening" | "locked";

const DEMO_TEXT = "Είδα χθες το Mr. Robot...";

const PHASES: { phase: DemoPhase; durationMs: number }[] = [
  { phase: "idle",      durationMs: 600  },
  { phase: "typing",    durationMs: 1800 },
  { phase: "listening", durationMs: 1200 },
  { phase: "locked",    durationMs: 2200 },
];

export function HookScreen({ displayName, onContinue, onSkip }: Props) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [typedCount, setTypedCount] = useState(0);

  // Loop the demo. Each phase has a fixed duration; "typing" also
  // advances a character counter so the text fills in letter-by-
  // letter rather than appearing all at once.
  useEffect(() => {
    let idx = 0;
    let charTimer: ReturnType<typeof setInterval> | null = null;

    const advance = () => {
      const { phase: next, durationMs } = PHASES[idx];
      setPhase(next);

      if (charTimer) clearInterval(charTimer);
      if (next === "typing") {
        setTypedCount(0);
        const charStep = Math.max(40, Math.floor(durationMs / DEMO_TEXT.length));
        charTimer = setInterval(() => {
          setTypedCount((c) => {
            const n = c + 1;
            if (n >= DEMO_TEXT.length) {
              if (charTimer) clearInterval(charTimer);
            }
            return n;
          });
        }, charStep);
      } else if (next === "idle") {
        setTypedCount(0);
      } else {
        setTypedCount(DEMO_TEXT.length);
      }

      idx = (idx + 1) % PHASES.length;
    };

    // Chain each phase via setTimeout — durations differ per phase
    // so a single setInterval wouldn't work.
    let timeout: ReturnType<typeof setTimeout>;
    advance();
    const chain = () => {
      const dur = PHASES[idx === 0 ? PHASES.length - 1 : idx - 1].durationMs;
      timeout = setTimeout(() => { advance(); chain(); }, dur);
    };
    chain();

    return () => {
      clearTimeout(timeout);
      if (charTimer) clearInterval(charTimer);
    };
  }, []);

  const typedText = DEMO_TEXT.slice(0, typedCount);
  const greetingName = displayName?.split(" ")[0] || null;

  return (
    <div className="min-h-screen flex flex-col px-6 pt-14 pb-8 animate-fade-in">

      {/* Logo */}
      <div className="text-center">
        <span className="text-[28px] font-black tracking-[-0.5px] text-zinc-900">
          Proteino<span className="text-coral-600">•</span>
        </span>
      </div>

      {/* Hero copy */}
      <div className="mt-12 space-y-3 text-center">
        <h1 className="text-[28px] font-extrabold leading-[1.15] text-zinc-900">
          {greetingName ? `Καλώς ήρθες, ${greetingName}.` : "Πες μας τι αγαπάς."}
        </h1>
        <p className="text-[17px] leading-[1.4] text-zinc-600 px-2">
          Γράφεις. Καταλαβαίνουμε. Σου δείχνουμε τα υπόλοιπα.
        </p>
      </div>

      {/* Demo card — phone-textarea + intelligence panel */}
      <div className="mt-10 mx-auto w-full max-w-[330px] space-y-3">

        {/* Textarea-style mock */}
        <div className="rounded-card border border-zinc-200 bg-zinc-50 p-4 min-h-[88px]">
          <p className="text-[15px] text-zinc-800 leading-[1.5]">
            {typedText}
            {phase === "typing" && (
              <span className="inline-block w-[2px] h-[18px] align-middle bg-coral-600 ml-0.5 animate-pulse" />
            )}
            {phase === "idle" && (
              <span className="text-zinc-400">Πες μου τι σου άρεσε…</span>
            )}
          </p>
        </div>

        {/* AI panel */}
        <div
          className={`rounded-card border p-4 space-y-2 transition-colors duration-300 ${
            phase === "locked"    ? "border-success bg-green-50" :
            phase === "listening" ? "border-coral-500 bg-coral-50" :
            phase === "typing"    ? "border-coral-500 bg-coral-50" :
                                    "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-500">
              Proteíno Intelligence
            </span>
            {phase === "listening" && (
              <span className="text-[10px] font-medium tracking-widest text-coral-600 animate-pulse">
                LISTENING LIVE
              </span>
            )}
            {phase === "locked" && (
              <span className="text-[10px] font-medium tracking-widest text-success animate-fade-in">
                LOCKED ✓
              </span>
            )}
          </div>

          {phase === "idle" && (
            <p className="text-sm text-zinc-400">Σε ακούω…</p>
          )}

          {phase === "typing" && (
            <p className="text-sm text-zinc-500">Αναλύω…</p>
          )}

          {phase === "listening" && (
            <p className="text-sm text-zinc-600">
              Βρήκα 3 πιθανές αντιστοιχίες…
            </p>
          )}

          {phase === "locked" && (
            <div className="animate-pop-in">
              <p className="text-[15px] font-semibold text-zinc-900">
                Mr. Robot
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Σειρά · Drama · 2015
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Social proof */}
      <div className="mt-10 text-center">
        <p className="text-[14px] text-zinc-500 leading-[1.5]">
          Κοινότητα από ανθρώπους με γούστο
          <br />
          σαν το δικό σου.
        </p>
      </div>

      {/* CTAs — pushed to bottom */}
      <div className="mt-auto space-y-4 pt-12">
        <button
          onClick={onContinue}
          className="w-full h-[56px] rounded-[12px] text-white text-[17px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}
        >
          Ξεκίνα →
        </button>
        <button
          onClick={onSkip}
          className="block w-full text-center text-[15px] font-medium text-zinc-500 py-2 active:opacity-60 transition-opacity"
        >
          Παράλειψη
        </button>
      </div>
    </div>
  );
}
