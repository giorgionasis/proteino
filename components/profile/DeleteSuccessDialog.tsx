"use client";

import { useEffect } from "react";

interface Props {
  /** Bold headline. Defaults to "Επιτυχής διαγραφή". */
  title?: string;
  /** Body copy. Reuse with different wording for suggestion vs review. */
  message: string;
  /** Auto-dismiss timeout in ms. Set to 0 to require manual close. Defaults to 1800. */
  autoCloseMs?: number;
  onClose: () => void;
}

/**
 * Confirmation dialog shown after a successful destructive action.
 * Coral-tinted circle + trash icon matching the Figma success-state. Body
 * scroll locked while open; auto-dismisses by default to keep the user
 * moving through their flow.
 */
export function DeleteSuccessDialog({
  title = "Επιτυχής διαγραφή",
  message,
  autoCloseMs = 1800,
  onClose,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (autoCloseMs <= 0) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div onClick={onClose} className="absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
        <h2 className="text-center text-lg font-bold text-zinc-900 leading-tight">
          {title}
        </h2>
        <div className="my-6 flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FFF0EE" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-600 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
