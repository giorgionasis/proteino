"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/**
 * Modal shown when a guest user tries to perform an authenticated
 * action (bookmark, rate, follow, comment). Replaces the previous
 * silent hard-redirect to /login — gives context for the prompt and
 * a soft "Όχι τώρα" exit so a curious guest isn't punished for tapping.
 *
 * The action verb is interpolated into the headline so each entry
 * point reads naturally:
 *   - "Σύνδεση για να σώσεις στα αγαπημένα σου"
 *   - "Σύνδεση για να βαθμολογήσεις"
 *   - "Σύνδεση για να ακολουθήσεις"
 *
 * Login + Register buttons preserve the current URL via ?redirect=
 * so the user lands back where they started after auth.
 */
interface Props {
  open:    boolean;
  onClose: () => void;
  /** What action the user tried — fills the headline.
   *  e.g. "να σώσεις στα αγαπημένα σου", "να βαθμολογήσεις". */
  action:  string;
}

export function GuestPromptModal({ open, onClose, action }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      setVisible(false);
      const t = window.setTimeout(() => setMounted(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [mounted]);

  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  const redirect = encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/");
  const goLogin    = () => { router.push(`/login?redirect=${redirect}`); };
  const goRegister = () => { router.push(`/register?redirect=${redirect}`); };

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) close(e);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={onBackdrop}
    >
      <div
        className="w-full max-w-[420px] bg-white pb-8 will-change-transform"
        style={{
          borderRadius: "22px 22px 0 0",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={stop}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3">
          <span className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FFF5EC" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
          </div>
          <h2 className="text-[22px] font-extrabold text-zinc-900 leading-tight">
            Σύνδεση για {action}
          </h2>
          <p className="text-[15px] font-medium text-zinc-500 leading-snug max-w-[300px]">
            Δωρεάν εγγραφή σε δευτερόλεπτα — δες τις προτάσεις φίλων, σώσε τα αγαπημένα σου και κάνε τις δικές σου.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={goRegister}
            className="w-full h-12 rounded-full bg-coral-600 active:bg-coral-700 text-white text-[15px] font-bold transition-colors"
          >
            Δημιουργία λογαριασμού
          </button>
          <button
            type="button"
            onClick={goLogin}
            className="w-full h-12 rounded-full bg-zinc-100 active:bg-zinc-200 text-zinc-800 text-[15px] font-semibold transition-colors"
          >
            Έχω ήδη λογαριασμό
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full h-10 text-[14px] font-medium text-zinc-500 active:text-zinc-700 transition-colors"
          >
            Όχι τώρα
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
