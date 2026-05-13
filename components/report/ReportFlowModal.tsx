"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ReportTargetType = "comment" | "suggestion" | "review";
type ReportReason = "inaccurate" | "fraud" | "offensive" | "other";

interface ReportFlowModalProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Friendly label for whoever the user is reporting; used in error toasts. Optional. */
  targetLabel?: string;
  onClose: () => void;
  /** Fires once the report is successfully created (before user dismisses confirmation step). */
  onReported?: () => void;
}

const REASONS: { key: ReportReason; label: string }[] = [
  { key: "inaccurate", label: "Είναι ανακριβής ή λανθασμένη" },
  { key: "fraud",      label: "Είναι απάτη" },
  { key: "offensive",  label: "Είναι προσβλητική" },
  { key: "other",      label: "Είναι κάτι άλλο" },
];

/** Reason-aware step-2 headline. */
function descriptionPrompt(reason: ReportReason): string {
  switch (reason) {
    case "inaccurate": return "Πες μας πώς είναι ανακριβής ή λανθασμένη";
    case "fraud":      return "Πες μας πώς είναι απάτη";
    case "offensive":  return "Πες μας γιατί είναι προσβλητική";
    case "other":      return "Πες μας τι συμβαίνει";
  }
}

function descriptionPlaceholder(reason: ReportReason): string {
  switch (reason) {
    case "inaccurate": return "Π.χ. Η αξιολόγηση λέει ότι το βιβλίο είναι πολύ μεγάλο, ενώ οι σελίδες του είναι 220";
    case "fraud":      return "Π.χ. Η αξιολόγηση φαίνεται ψεύτικη — ο χρήστης δεν φαίνεται να είδε την ταινία";
    case "offensive":  return "Π.χ. Περιέχει υβριστική ή ρατσιστική γλώσσα";
    case "other":      return "Πες μας τον λόγο της αναφοράς…";
  }
}

const MIN_DESCRIPTION = 10;

/**
 * 3-step report modal — reason → description → confirmation.
 * Reused for reporting both reviews (suggestions) and comments;
 * caller passes targetType. Posts to /api/reports.
 *
 * Layout matches the design system: rounded-card slide-up from bottom on
 * mobile, centered card on sm+. Dark "Επόμενο" button appears active only
 * when validation passes (reason chosen on step 1, ≥10 chars on step 2).
 */
export function ReportFlowModal({ targetType, targetId, targetLabel, onClose, onReported }: ReportFlowModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const trimmed = description.trim();
  const canNextOnStep1 = !!reason;
  const canNextOnStep2 = trimmed.length >= MIN_DESCRIPTION;

  async function submit() {
    if (!reason || !canNextOnStep2 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          description: trimmed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Πρέπει να συνδεθείς για να κάνεις αναφορά.");
        } else {
          setError(body.error || `Αποτυχία (${res.status})`);
        }
        setSubmitting(false);
        return;
      }
      setStep(3);
      onReported?.();
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div onClick={submitting ? undefined : onClose} className="absolute inset-0" aria-hidden />

      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl flex flex-col">
        {/* X close — top right, always available */}
        <button
          onClick={onClose}
          aria-label="Κλείσιμο"
          disabled={submitting}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors disabled:opacity-50 z-10"
        >
          <X size={20} strokeWidth={2.25} className="text-zinc-700" />
        </button>

        {/* Body */}
        <div className="px-6 pt-12 pb-4 min-h-[440px]">
          {step === 1 && (
            <>
              <h2 className="text-[22px] font-bold text-zinc-900 leading-[120%] mb-8 pr-8">
                Για ποιόν λόγο αναφέρετε αυτήν την {targetType === "comment" ? "ανάρτηση" : "αξιολόγηση"};
              </h2>
              <div className="divide-y divide-zinc-200">
                {REASONS.map((r) => {
                  const active = reason === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setReason(r.key)}
                      className="w-full flex items-center justify-between py-5 active:bg-zinc-50 transition-colors text-left"
                      aria-pressed={active}
                    >
                      <span className="text-[16px] text-zinc-900">{r.label}</span>
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0",
                          active ? "border-zinc-900" : "border-zinc-400",
                        )}
                      >
                        {active && <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && reason && (
            <>
              <h2 className="text-[22px] font-bold text-zinc-900 leading-[120%] mb-6 pr-8">
                {descriptionPrompt(reason)}
              </h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descriptionPlaceholder(reason)}
                rows={5}
                maxLength={500}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 leading-[150%] focus:outline-none focus:border-zinc-500 resize-none"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[11px] text-zinc-500">
                  {trimmed.length < MIN_DESCRIPTION
                    ? `Τουλάχιστον ${MIN_DESCRIPTION} χαρακτήρες`
                    : `${trimmed.length}/500`}
                </span>
              </div>
              {error && <p className="mt-3 text-[13px] text-coral-700">{error}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-[22px] font-bold text-zinc-900 leading-[120%] mb-6 pr-8">
                Λάβαμε την αναφορά σου
              </h2>
              <p className="text-[16px] text-zinc-800 leading-[150%]">
                Ευχαριστούμε για τον χρόνο που αφιέρωσες προκειμένου να μας ενημερώσεις.
                Αναφορές όπως η δική σου παίζουν σημαντικό ρόλο στη διατήρηση της
                αυθεντικότητας και της αντικειμενικότητας στην κοινότητα του proteino.
              </p>
            </>
          )}
        </div>

        {/* Footer — Πίσω + Επόμενο/OK */}
        <div className="border-t border-zinc-100 px-6 py-4 flex items-center justify-between">
          {step === 1 && (
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-[15px] font-semibold text-zinc-900 underline underline-offset-2 disabled:opacity-50"
            >
              Πίσω
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => { setError(null); setStep(1); }}
              disabled={submitting}
              className="text-[15px] font-semibold text-zinc-900 underline underline-offset-2 disabled:opacity-50"
            >
              Πίσω
            </button>
          )}
          {step === 3 && <span />}

          {step === 1 && (
            <button
              onClick={() => canNextOnStep1 && setStep(2)}
              disabled={!canNextOnStep1}
              className={cn(
                "h-12 px-7 rounded-[14px] text-[16px] font-semibold transition-colors",
                canNextOnStep1
                  ? "bg-zinc-900 text-white active:bg-zinc-800"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
              )}
            >
              Επόμενο
            </button>
          )}
          {step === 2 && (
            <button
              onClick={submit}
              disabled={!canNextOnStep2 || submitting}
              className={cn(
                "h-12 px-7 rounded-[14px] text-[16px] font-semibold transition-colors",
                canNextOnStep2 && !submitting
                  ? "bg-zinc-900 text-white active:bg-zinc-800"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
              )}
            >
              {submitting ? "Αποστολή…" : "Επόμενο"}
            </button>
          )}
          {step === 3 && (
            <button
              onClick={onClose}
              className="h-12 px-7 rounded-[14px] bg-zinc-900 text-white text-[16px] font-semibold active:bg-zinc-800 transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
