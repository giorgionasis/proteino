"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/hooks/useOverlay";
import { useMapMode } from "@/hooks/useMapMode";

export function FAB({ className }: { className?: string }) {
  const { openSuggestion, overlay } = useOverlay();
  const mapActive = useMapMode((s) => s.active);
  const tucked = useTuckOnScroll();

  // Hide when any overlay is open OR when the user is on a category map
  // view (the suggest action doesn't fit the map-browse context).
  if (overlay !== null) return null;
  if (mapActive) return null;

  return (
    // Constrained to the mobile column — mirrors max-w-lg container
    <div
      className="fixed left-0 right-0 max-w-lg mx-auto z-30 pointer-events-none"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 16px)", height: 56 }}
    >
      <button
        onClick={() => openSuggestion()}
        aria-label="Νέα πρόταση"
        className={cn(
          "absolute right-4 bottom-0 pointer-events-auto",
          "w-14 h-14 rounded-full",
          "gradient-coral text-white shadow-fab",
          "flex items-center justify-center",
          "transition-[transform,opacity] duration-200 ease-out will-change-transform",
          "active:scale-95",
          // Slides away while scrolling down so it never sits on top of
          // "Δες όλα" links or text; returns on any upward scroll.
          tucked ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100",
          // Initial-mount entrance: scale-in 350ms ease-pop. Re-fires
          // whenever the FAB becomes visible again after an overlay
          // closes (FAB unmounts when overlay !== null, so a return
          // mount triggers the keyframe again — exactly the right
          // "tada, I'm back" feel without extra logic).
          "animate-scale-in",
          className,
        )}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** True while the user scrolls down (past the first screen); false on
 *  scroll up, near the top, or at the bottom of the page. */
function useTuckOnScroll(): boolean {
  const [tucked, setTucked] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
      const delta = y - lastY.current;
      if (y < 200 || atBottom) setTucked(false);
      else if (delta > 6) setTucked(true);
      else if (delta < -6) setTucked(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return tucked;
}
