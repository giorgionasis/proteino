"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SubCategoryTabsProps {
  tabs:      string[];
  active:    string;
  onChange:  (tab: string) => void;
  className?: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Sub-category tabs row with a SLIDING coral underline. Replaces the
 * old per-tab `border-b-2` (which snapped instantly between tabs) with
 * a single absolute-positioned bar that translates + resizes between
 * the active tab's bounds.
 *
 * Measure on mount + on tabs/active change + on window resize so the
 * underline lands precisely under the active button regardless of
 * scroll-x or text wrapping.
 */
export function SubCategoryTabs({ tabs, active, onChange, className }: SubCategoryTabsProps) {
  const all = ["Όλα", ...tabs];
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Use layoutEffect so the underline is positioned BEFORE paint —
  // avoids a flash of mis-positioned bar on initial render.
  useLayoutEffect(() => {
    const idx = all.indexOf(active);
    const btn = buttonRefs.current[idx >= 0 ? idx : 0];
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, all.join("|")]);

  // Reposition on resize — tabs may wrap or rescale, the indicator must
  // follow.
  useEffect(() => {
    const onResize = () => {
      const idx = all.indexOf(active);
      const btn = buttonRefs.current[idx >= 0 ? idx : 0];
      if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, all]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex overflow-x-auto no-scrollbar",
        "bg-white border-b border-zinc-200",
        "sticky z-20",
        className,
      )}
    >
      {all.map((tab, i) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            ref={(el) => { buttonRefs.current[i] = el; }}
            onClick={() => onChange(tab)}
            className={cn(
              "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap",
              "transition-colors duration-200 ease-soft",
              isActive ? "text-zinc-900 font-semibold" : "text-zinc-400 active:text-zinc-700",
            )}
          >
            {capitalize(tab)}
          </button>
        );
      })}

      {/* Sliding indicator — single 2px coral bar that translates + resizes
       *  between tab bounds. transition on transform + width gives a smooth
       *  glide instead of the instant border-class swap we had before. */}
      {indicator && (
        <span
          aria-hidden
          className="absolute bottom-0 h-[2px] bg-coral-600 transition-[transform,width] duration-300 ease-spring will-change-transform"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
      )}
    </div>
  );
}
