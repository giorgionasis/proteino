"use client";

import { useEffect } from "react";

interface Props {
  title: string;
  itemTitle: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Reusable destructive-confirm dialog. Used from profile rows for
 * suggestion + rating deletes. Coral-danger primary button, body scroll
 * locked while open, dismisses on Esc.
 */
export function ConfirmDeleteDialog({
  title,
  itemTitle,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div onClick={pending ? undefined : onCancel} className="absolute inset-0" aria-hidden />
      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
        <div className="px-5 pt-6 pb-4">
          <div className="w-10 h-10 rounded-full bg-coral-50 flex items-center justify-center mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FE402B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 leading-tight">{title}</h2>
          <p className="text-sm font-semibold text-zinc-500 mt-1 truncate">{itemTitle}</p>
          <p className="text-sm text-zinc-700 mt-3 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-100">
          <button
            onClick={onCancel}
            disabled={pending}
            className="px-4 h-10 rounded-card text-sm font-semibold text-zinc-700 active:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            Άκυρο
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="px-4 h-10 rounded-card text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#FE402B" }}
          >
            {pending ? "Διαγραφή..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
