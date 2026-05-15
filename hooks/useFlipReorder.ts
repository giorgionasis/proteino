"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * FLIP animation for a list whose order/membership can change between
 * renders. Captures child positions per render, compares to the previous
 * render, and any child that moved gets an inverse-transform-then-release
 * (FLIP: First-Last-Invert-Play).
 *
 * Used on the reviews carousel — when the user publishes a new review,
 * the new card is prepended to the list and the existing cards shift
 * right by `card-width + gap`. Without this hook, the shift is instant
 * (React reconciles the new DOM and the browser paints). With it, the
 * existing cards slide smoothly into their new positions while the new
 * card fades in at position 0 via its own `review-card-appear` keyframe.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFlipReorder(ref, "data-review-id", [reviews.map((r) => r.id).join(",")]);
 *   return <div ref={ref}>{reviews.map((r) => <Card data-review-id={r.id} … />)}</div>;
 *
 * Children must carry a stable identifying attribute (default
 * `data-flip-id`, overridable per usage). Children present on both the
 * previous and current render whose position changed by more than 1px
 * get animated.
 *
 * Skips animation when `prefers-reduced-motion: reduce` is set — the
 * reorder still happens, just without the slide.
 */
export function useFlipReorder(
  containerRef: React.RefObject<HTMLElement>,
  attrName: string = "data-flip-id",
  deps: unknown[],
  options: { durationMs?: number; easing?: string } = {},
) {
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const { durationMs = 480, easing = "cubic-bezier(0.32, 0.72, 0, 1)" } = options;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(`[${attrName}]`),
    );

    if (!reduceMotion) {
      cards.forEach((card) => {
        const id = card.getAttribute(attrName);
        if (!id) return;
        const newRect = card.getBoundingClientRect();
        const oldRect = prevRects.current.get(id);
        if (oldRect) {
          const dx = oldRect.left - newRect.left;
          const dy = oldRect.top - newRect.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            // Apply inverse transform with no transition so the browser
            // commits the "moved-back" frame in the same paint.
            card.style.transform = `translate(${dx}px, ${dy}px)`;
            card.style.transition = "transform 0s";
            // Two RAFs: the first gives the browser a frame to commit
            // the inverse transform, the second flips on the transition
            // and removes the transform so the card animates back.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                card.style.transition = `transform ${durationMs}ms ${easing}`;
                card.style.transform = "";
              });
            });
          }
        }
      });
    }

    // Capture current positions for the next render — done after the
    // animations are kicked off because getBoundingClientRect on a
    // transformed element returns its transformed rect. We want the
    // final ("at rest") position.
    const newRects = new Map<string, DOMRect>();
    cards.forEach((card) => {
      const id = card.getAttribute(attrName);
      if (!id) return;
      // Read after style was just reset to "" — the element's final
      // position is what matters for the next FLIP. We compute it from
      // offsetLeft/offsetTop relative to the container so it's stable
      // even mid-animation.
      const rect = card.getBoundingClientRect();
      // If we just applied a translate, the bounding rect is offset by
      // (dx, dy). Subtract it back so we capture the "destination" rect.
      const t = card.style.transform;
      if (t && t.startsWith("translate(")) {
        const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(t);
        if (m) {
          const dx = parseFloat(m[1]);
          const dy = parseFloat(m[2]);
          newRects.set(id, new DOMRect(
            rect.left - dx,
            rect.top  - dy,
            rect.width,
            rect.height,
          ));
          return;
        }
      }
      newRects.set(id, rect);
    });
    prevRects.current = newRects;
    // deps are intentionally caller-controlled — usually a join of the
    // ordered list of ids, so any reorder or insertion triggers the
    // effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
