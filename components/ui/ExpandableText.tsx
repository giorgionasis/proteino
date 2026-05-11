"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Animated "show more / less" wrapper for long text passages (movie /
 * series / book / theater plots, food shop descriptions, …).
 *
 * Why this beats the inline-slice pattern:
 *   - DOM content stays whole — copy-paste and screen readers see all
 *     of it even while collapsed.
 *   - Height animates smoothly via measured ref (`scrollHeight`) instead
 *     of swapping between truncated / full strings, which causes layout
 *     jumps and breaks word-spacing.
 *   - Reduced-motion users get the instant resolution from the
 *     globals.css override.
 *
 * Behavior: collapsed = clamped to ~`collapsedLines` × line-height,
 * expanded = full scrollHeight. Animation is on `max-height` for 350ms
 * ease-spring; the toggle button swaps label.
 *
 * Pass `text` (preferred) for a paragraph, OR `children` for richer
 * markup. The component decides whether to show the toggle by
 * comparing scrollHeight to clamp height after mount.
 */
interface Props {
  text?:           string;
  children?:       React.ReactNode;
  /** Lines visible while collapsed. Default 4 (~140 chars). */
  collapsedLines?: number;
  /** Localized labels. Defaults to Greek. */
  moreLabel?:      string;
  lessLabel?:      string;
  className?:      string;
}

export function ExpandableText({
  text,
  children,
  collapsedLines = 4,
  moreLabel = "Περισσότερα",
  lessLabel = "Λιγότερα",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [collapsedPx, setCollapsedPx] = useState<number>(0);
  const [fullPx, setFullPx] = useState<number>(0);

  // Measure both states on mount + when content reflows. Re-running on
  // text change is essential — different items have different
  // scrollHeights.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Read computed line-height to compute collapsed px from line count.
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    const computedCollapsed = Number.isFinite(lh) ? Math.round(lh * collapsedLines) : 96;
    const fullHeight = el.scrollHeight;
    setCollapsedPx(computedCollapsed);
    setFullPx(fullHeight);
    setNeedsToggle(fullHeight > computedCollapsed + 2);
  }, [text, collapsedLines, children]);

  const maxHeight = expanded || !needsToggle ? fullPx : collapsedPx;

  return (
    <div className={className}>
      <div
        ref={ref}
        className={cn(
          "overflow-hidden",
          // 350ms ease-spring on max-height — feels organic, doesn't
          // outstay its welcome.
          "transition-[max-height] duration-[350ms] ease-spring",
        )}
        style={{ maxHeight: needsToggle ? maxHeight : undefined }}
      >
        {text ?? children}
      </div>

      {needsToggle && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[14px] font-bold text-zinc-800 underline transition-colors duration-150 active:text-zinc-600"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
