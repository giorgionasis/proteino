"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type ModalSize = "sm" | "md" | "lg" | "full";

export interface ModalProps {
  open:        boolean;
  onClose:     () => void;
  title?:      string;
  children:    React.ReactNode;
  size?:       ModalSize;
  showHandle?: boolean;
  className?:  string;
}

// ── Heights by size ────────────────────────────────────────────
const SIZE_CLASSES: Record<ModalSize, string> = {
  sm:   "max-h-[40vh]",
  md:   "max-h-[60vh]",
  lg:   "max-h-[85vh]",
  full: "h-[92vh]",
};

// ── Component ──────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  size       = "md",
  showHandle = true,
  className,
}: ModalProps) {
  const [mounted,  setMounted]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Portal: mount only on client
  useEffect(() => setMounted(true), []);

  // Drive open → visible transition
  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      // Let the slide-down animation finish before unmounting
      const t = setTimeout(() => setVisible(false), 260);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Overlay */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 overlay",
          open ? "animate-fade-in" : "opacity-0",
        )}
        style={{ animation: open ? "fadeIn 200ms ease forwards" : "fadeIn 200ms ease reverse forwards" }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          // Layout
          "relative w-full max-w-md bg-white",
          "rounded-t-3xl overflow-hidden",
          "flex flex-col",
          "shadow-modal",

          // Size
          SIZE_CLASSES[size],

          // Animation
          open ? "animate-slide-up" : "animate-slide-down",

          className,
        )}
        style={{
          animation: open
            ? "slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "slideDown 240ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        }}
      >
        {/* Drag handle */}
        {showHandle && (
          <div aria-hidden className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-200" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
            <h3 className="text-base font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Close button (when no title) */}
        {!title && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-safe">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
