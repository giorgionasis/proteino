"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CategorySlug } from "@/types";
import { CATEGORIES } from "@/constants/categories";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  /** Currently-effective category (AI-detected OR user-picked).
   *  Highlighted in the grid so the user sees what they're overriding. */
  current: CategorySlug | null;
  /** Whether the current selection is a manual override (vs AI-detected).
   *  Drives the "Επανέφερε στο AI" link at the bottom. */
  isManual: boolean;
  onPick: (slug: CategorySlug) => void;
  /** Clear the manual override → AI's detection takes over again. */
  onClear: () => void;
  onClose: () => void;
  /** Optional server-resolved categories (DB-overlaid labels/icons).
   *  Falls back to the constants when omitted. */
  categories?: Array<{ slug: CategorySlug; labelEl: string; icon: string }>;
}

/**
 * Slide-up bottom sheet for picking the submission category manually.
 * Triggered from the inline chip in SuggestionOverlay when the user
 * wants to override the AI's category detection.
 *
 * Visual: portal-mounted to document.body (sidesteps the transformed-
 * ancestor → position:fixed containing-block trap noted in
 * docs/design-system.md). 3×3 emoji grid mirroring the onboarding
 * InterestsScreen, but smaller — this is a quick decision, not a
 * 4-step flow.
 */
export function CategoryPicker({
  open,
  current,
  isManual,
  onPick,
  onClear,
  onClose,
  categories,
}: Props) {
  // mount = render-and-hide for the open animation. The component
  // stays mounted while closing so the slide-down animation can play
  // before unmount (the "conditional mount kills exit animations"
  // gotcha from design-system.md).
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Defer visible:true by one frame so the browser commits the
      // initial transform=translateY(100%) before transitioning to 0.
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const list = categories ?? CATEGORIES.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }));

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col justify-end",
        "transition-colors duration-300 ease-soft",
        visible ? "bg-black/40" : "bg-black/0 pointer-events-none",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-white rounded-t-2xl shadow-2xl pb-safe",
          "transform-gpu will-change-transform transition-transform duration-300 ease-spring",
          visible ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar — visual affordance + drag target if we wire it later */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>

        <div className="px-6 pt-3 pb-2">
          <h2 className="text-base font-semibold text-zinc-900">Τι προτείνεις;</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Διάλεξε την κατηγορία αν δεν την βρήκε το AI</p>
        </div>

        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {list.map((cat) => {
            const isActive = current === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  onPick(cat.slug);
                  onClose();
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5",
                  "py-4 px-2 rounded-xl border transition-all duration-150 ease-soft",
                  "active:scale-95",
                  isActive
                    ? "border-coral-600 bg-coral-50 text-coral-700"
                    : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
                )}
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-xs font-medium leading-tight text-center">{cat.labelEl}</span>
              </button>
            );
          })}
        </div>

        {isManual && (
          <div className="px-6 pt-1 pb-4">
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
            >
              Επανέφερε στο AI
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
