"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ConfirmTone = "default" | "danger" | "warning";

interface Props {
  open: boolean;
  title: string;
  /** Subtitle or affected item name. Optional. */
  subtitle?: string;
  /** Body copy explaining what will happen. */
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  tone?: ConfirmTone;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Reusable confirm dialog for non-destructive AND destructive flows.
 * Body-scroll locks, Esc-dismisses, portals to <body>. For destructive
 * actions specifically prefer `tone="danger"` to surface a red CTA.
 */
export function ConfirmDialog({
  open,
  title,
  subtitle,
  message,
  confirmLabel,
  cancelLabel = "Άκυρο",
  pending = false,
  tone = "default",
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, pending]);

  if (!open || typeof document === "undefined") return null;

  const confirmStyle =
    tone === "danger"
      ? { background: "#FE402B" }
      : tone === "warning"
        ? { background: "#FE6F5E" }
        : { background: "#18181B" };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div
        onClick={pending ? undefined : onCancel}
        className="absolute inset-0"
        aria-hidden
      />
      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
        <div className="px-5 pt-6 pb-4">
          <h2 className="text-lg font-bold text-zinc-900 leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm font-semibold text-zinc-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
          <div className="text-sm text-zinc-700 mt-3 leading-relaxed">
            {message}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 h-10 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-4 h-10 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={confirmStyle}
          >
            {pending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
