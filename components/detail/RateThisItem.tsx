"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { composerCopy, STAR_LABELS } from "@/lib/reviews/composer-copy";
import {
  evaluateQuality,
  HARD_MAX_CHARS,
  SOFT_WARN_CHARS,
  TONE_TO_COLOR,
} from "@/lib/reviews/quality";

/**
 * Inline review composer + success modal with FLIP morph.
 *
 * Three visible phases on the page:
 *   IDLE      → empty stars + question. Tap a star to commit + expand.
 *   COMPOSING → expanded card with thanks line, calibration label, textarea,
 *               progress bar + tiered praise, "Άκυρο / Δημοσίευση" buttons.
 *   SAVED     → filled stars + "Η αξιολόγησή σου" headline + edit pencil.
 *
 * On every star tap and on Publish, POSTs to /api/reviews. The rating is
 * committed instantly (first tap = saved); the text is committed on Publish.
 *
 * On Publish (with or without text), opens an internal portaled success modal:
 *   • Green check + "Ευχαριστούμε για την αξιολόγηση"
 *   • "Δες τις αξιολογήσεις σου" link to /profile/{handle}/reviews
 *   • On close (auto-dismiss 3s OR tap), FLIP-morphs the card down into the
 *     user's newly-published review card in the carousel. The parent renders
 *     the new card with `data-review-id={review_id}`; the morph finds it,
 *     animates this card → that card's rect, then unmounts. If the target
 *     doesn't exist (parent didn't insert), falls back to a clean slide-down.
 */

interface PublishResult {
  review_id: string;
  rating: number;
  reflection: string | null;
  avg_rating: number;
  rating_count: number;
}

interface Props {
  question: string;
  category: string;
  itemId: string;
  initialRating: number | null;
  initialReflection: string | null;
  /** Viewer's profile handle — used for the success link to /profile/{handle}/reviews. */
  userHandle?: string | null;
  /** Wraps the action in the parent's guest guard. Called with `() => { ...the action }`. */
  authGate?: (action: () => void) => void;
  /** Fires after every successful server write. Parent should mirror state + insert into carousel. */
  onPublished: (result: PublishResult) => void;
}

type Phase = "idle" | "composing" | "saved";

export function RateThisItem({
  question,
  category,
  itemId,
  initialRating,
  initialReflection,
  userHandle,
  authGate,
  onPublished,
}: Props) {
  const initialPhase: Phase = initialRating ? "saved" : "idle";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [text, setText] = useState<string>(initialReflection ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  // Publish result is held here until the success modal closes — the parent's
  // onPublished is called only AFTER the modal fades, so the new review
  // enters the carousel right as the modal vanishes (pushing other reviews
  // to the right). This is the cleaner "fade modal → fade-in card" flow.
  const [pendingPublish, setPendingPublish] = useState<PublishResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copy = composerCopy(category);
  const visualRating = hoveredRating ?? rating;
  const calibrationLabel = visualRating > 0 ? STAR_LABELS[visualRating] : null;

  // Focus textarea when the form expands to compose mode
  useEffect(() => {
    if (phase === "composing") {
      const t = setTimeout(() => textareaRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [phase]);

  async function commit(newRating: number, newText: string | null): Promise<PublishResult | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, rating: newRating, reflection: newText }),
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return null;
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || `Σφάλμα (${res.status})`);
        return null;
      }
      const body = (await res.json()) as Omit<PublishResult, "rating" | "reflection">;
      return {
        review_id: body.review_id,
        avg_rating: body.avg_rating,
        rating_count: body.rating_count,
        rating: newRating,
        reflection: newText,
      };
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function handleStarPick(s: number) {
    const action = async () => {
      setRating(s);
      if (phase === "idle") setPhase("composing");
      // Instant-save server-side so the rating is never lost. We
      // intentionally do NOT call onPublished here — the parent's
      // carousel insert + success modal are reserved for the explicit
      // Publish action below. The server has the row either way.
      await commit(s, text.trim() || null);
    };
    if (authGate) authGate(action);
    else void action();
  }

  async function handlePublish() {
    if (!rating) {
      setError("Επίλεξε αστέρια 1–5");
      return;
    }
    const result = await commit(rating, text.trim() || null);
    if (result) {
      // Store the result and open the modal. Parent is NOT notified yet —
      // the modal will call onPublished after its fade-out, so the new
      // review enters the carousel as the modal vanishes.
      setPendingPublish(result);
      setPhase("saved");
      setSuccessOpen(true);
    }
  }

  function handleCancel() {
    setPhase(rating > 0 ? "saved" : "idle");
    setText(initialReflection ?? "");
    setError(null);
  }

  function handleEdit() {
    const action = () => setPhase("composing");
    if (authGate) authGate(action);
    else action();
  }

  const quality = evaluateQuality(text);
  const tone = TONE_TO_COLOR[quality.tone];
  const charCount = text.length;
  const overSoftWarn = charCount > SOFT_WARN_CHARS;

  return (
    <>
      <div
        className={cn(
          "rounded-[12px] bg-white flex flex-col items-center transition-all duration-300 ease-spring",
          phase === "composing" ? "gap-5 py-8 px-6" : "gap-5 py-10 px-6",
        )}
        style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}
      >
        <p className="text-[18px] font-semibold text-zinc-800 text-center leading-[140%]">
          {phase === "saved"
            ? "Η αξιολόγησή σου"
            : phase === "composing"
              ? copy.thanksLine
              : question}
        </p>

        {/* Stars — interactive in idle + composing, display-only in saved */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStarPick(s)}
              onMouseEnter={() => phase !== "saved" && setHoveredRating(s)}
              onMouseLeave={() => setHoveredRating(null)}
              aria-label={`${s} αστέρια — ${STAR_LABELS[s]}`}
              className="transition-transform active:scale-90"
            >
              <Star size={34} filled={s <= visualRating} />
            </button>
          ))}
        </div>

        {/* Calibration label — visible only in composing */}
        {phase === "composing" && (
          <p
            className={cn(
              "text-[14px] font-semibold transition-colors min-h-[20px] -mt-1",
              rating > 0 ? "text-zinc-700" : "text-zinc-300",
            )}
          >
            {calibrationLabel ? `${calibrationLabel}!` : ""}
          </p>
        )}

        {/* Textarea + progress + actions — composing only */}
        {phase === "composing" && (
          <div className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[13px] font-medium text-zinc-500">{copy.shareLabel}</p>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                maxLength={HARD_MAX_CHARS}
                rows={3}
                className="w-full rounded-[12px] border border-zinc-200 px-3.5 py-3 pr-10 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-coral-600 focus:outline-none focus:ring-2 focus:ring-coral-100 resize-none transition-all"
                style={{ minHeight: 96 }}
              />
              <span
                className="absolute bottom-2.5 right-3 text-zinc-300 text-[18px] pointer-events-none select-none"
                aria-hidden
              >
                🙂
              </span>
            </div>

            {/* Progress bar + quality message */}
            <div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300 ease-soft", tone.bar)}
                  style={{ width: `${quality.progress * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={cn("text-[12px] font-medium truncate", tone.text)}>
                  {quality.message || "Γράψε λίγα ακόμα (προαιρετικό)"}
                </p>
                <p
                  className={cn(
                    "text-[11px] tabular-nums shrink-0",
                    overSoftWarn ? "text-red-600 font-semibold" : "text-zinc-400",
                  )}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {overSoftWarn ? `+${charCount - SOFT_WARN_CHARS}` : `${charCount}`}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 h-11 rounded-[12px] border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-700 active:bg-zinc-50 transition-colors"
              >
                Άκυρο
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={busy || !rating}
                className="flex-[1.4] h-11 rounded-[12px] bg-zinc-900 text-white text-[14px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {busy ? "Αποστολή…" : initialReflection ? "Ενημέρωση" : "Δημοσίευση"}
              </button>
            </div>
          </div>
        )}

        {/* Edit pencil — saved phase only */}
        {phase === "saved" && (
          <button
            onClick={handleEdit}
            className="text-[13px] font-semibold text-coral-700 hover:text-coral-800 transition-colors flex items-center gap-1.5"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
            {initialReflection ? "Επεξεργασία αξιολόγησης" : "Πρόσθεσε σχόλιο"}
          </button>
        )}
      </div>

      <ReviewSuccessModal
        open={successOpen}
        userHandle={userHandle ?? null}
        onClose={() => {
          // Fire the parent notification right as the modal starts to
          // fade — by the time the modal is fully gone, the new card has
          // entered the carousel (with its own fade-in animation) and
          // pushed the others to the right.
          if (pendingPublish) {
            onPublished(pendingPublish);
            setPendingPublish(null);
          }
          setSuccessOpen(false);
        }}
      />
    </>
  );
}

/* ── Success modal (internal, portaled) ─────────────────────
 *
 *  Simple lifecycle:
 *    open=true   →  slide-up + fade-in (mount)
 *    user clicks X / CTA / backdrop  →  fade-out (closing state)
 *    onClose() fires at the START of the fade so the parent inserts the
 *    new review into the carousel; by the time the modal is gone, the
 *    card has entered and pushed the other reviews to the right.
 *    No morph, no FLIP — just a clean fade. */

function ReviewSuccessModal({
  open,
  userHandle,
  onClose,
}: {
  open: boolean;
  userHandle: string | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // 3-phase mount for slide-up animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Body-scroll lock while open
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    // Fire the parent's onClose right away — this triggers setLiveReview
    // in the parent, which inserts the new review at carousel position 0
    // and pushes the other reviews to the right. The modal continues its
    // own fade-out animation independently.
    onClose();
  }

  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-success-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300 ease-soft",
          visible && !closing ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "relative w-full sm:max-w-[420px] bg-white sm:rounded-[20px] rounded-t-[24px] shadow-2xl px-7 pt-12 pb-9 flex flex-col items-center",
          "transition-all duration-300 ease-soft",
          visible && !closing
            ? "translate-y-0 opacity-100"
            : "translate-y-full sm:translate-y-4 opacity-0",
        )}
      >
        {/* X close button — top-right */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Κλείσιμο"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 hover:bg-zinc-50 transition-colors z-10"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-700"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Big green checkmark */}
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-5 animate-in zoom-in-50 duration-300 ease-spring">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p id="review-success-title" className="text-[20px] font-bold text-zinc-900 text-center leading-snug">
          Ευχαριστούμε
          <br />
          για την αξιολόγηση
        </p>

        <p className="mt-3 text-center text-[14px] font-medium text-zinc-500 leading-relaxed max-w-[280px]">
          Η αξιολόγησή σου βοηθάει και άλλους χρήστες να διαλέξουν τι να δοκιμάσουν.
        </p>

        {userHandle ? (
          <Link
            href={`/profile/${userHandle}/reviews`}
            onClick={handleClose}
            className="mt-6 inline-flex h-11 px-5 items-center rounded-full bg-zinc-900 text-white text-[14px] font-semibold active:opacity-80 transition-opacity"
          >
            Δες τις αξιολογήσεις σου
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="mt-6 inline-flex h-11 px-5 items-center rounded-full bg-zinc-900 text-white text-[14px] font-semibold active:opacity-80 transition-opacity"
          >
            Κλείσιμο
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── Star icon ──────────────────────────────────────────── */

function Star({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={(size * 12) / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill={filled ? "#27272A" : "none"}
        stroke="#27272A"
        strokeWidth={filled ? 0 : 1}
      />
    </svg>
  );
}
