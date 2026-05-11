"use client";

import { useEffect, useState } from "react";

export type ToastTone = "success" | "info" | "error";

interface ToastProps {
  /** Message text. */
  message: string;
  /** Visual tone — drives bg + icon color. Default "success". */
  tone?: ToastTone;
  /** When true, the toast is visible. Caller controls visibility. */
  open: boolean;
  /** Auto-dismiss timeout in ms. 0 = manual close only. Default 1800. */
  autoCloseMs?: number;
  /** Called when the auto-close timer fires. */
  onClose?: () => void;
  /** Position on the screen. Default "bottom" (centered above bottom nav). */
  position?: "top" | "bottom" | "inline";
}

const TONE_STYLES: Record<ToastTone, { bg: string; text: string; icon: string }> = {
  success: { bg: "bg-zinc-900", text: "text-white", icon: "✓" },
  info:    { bg: "bg-zinc-700", text: "text-white", icon: "ℹ" },
  error:   { bg: "bg-red-600",  text: "text-white", icon: "✕" },
};

/**
 * Single-line toast. Use for inline confirmations like "Αντιγράφηκε ✓",
 * "Αποθηκεύτηκε", "Σφάλμα δικτύου".
 *
 * Caller owns the open state. Pair with the useToast() hook for the most
 * common pattern (show + auto-dismiss + reset).
 *
 * For bigger success states (post-delete, post-publish), use a Modal/Dialog.
 */
export function Toast({
  message,
  tone = "success",
  open,
  autoCloseMs = 1800,
  onClose,
  position = "bottom",
}: ToastProps) {
  const styles = TONE_STYLES[tone];

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const id = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(id);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const positionClasses =
    position === "inline"
      ? "relative"
      : position === "top"
        ? "fixed top-6 left-1/2 -translate-x-1/2 z-50"
        : "fixed bottom-24 left-1/2 -translate-x-1/2 z-50";

  // Animate in from the chosen edge — top toast slides down from above,
  // bottom toast slides up from below (reading direction). Inline
  // toasts just fade in. 250ms ease-spring keeps the motion confident
  // without being slow.
  const motionClasses =
    position === "top"
      ? "animate-in slide-in-from-top-3 fade-in duration-250 ease-spring"
      : position === "bottom"
        ? "animate-in slide-in-from-bottom-3 fade-in duration-250 ease-spring"
        : "animate-in fade-in duration-200 ease-soft";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${positionClasses} ${motionClasses} ${styles.bg} ${styles.text} px-4 py-2.5 rounded-full text-[13px] font-medium shadow-lg flex items-center gap-2 max-w-[90vw]`}
    >
      <span aria-hidden>{styles.icon}</span>
      <span className="truncate">{message}</span>
    </div>
  );
}

/**
 * Tiny helper hook for the most common "show + auto-dismiss" pattern.
 *
 *   const { toast, show } = useToast();
 *   <button onClick={() => show("Αντιγράφηκε")}>Copy</button>
 *   {toast}
 */
export function useToast() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("success");

  function show(msg: string, opts: { tone?: ToastTone } = {}) {
    setMessage(msg);
    setTone(opts.tone ?? "success");
    setOpen(true);
  }

  return {
    show,
    toast: (
      <Toast
        message={message}
        tone={tone}
        open={open}
        onClose={() => setOpen(false)}
      />
    ),
  };
}
