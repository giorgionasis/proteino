"use client";

/**
 * useBookmarkOrbit — fly a clone of the item's hero image along a
 * parabolic arc into the bookmark icon at the top-right of the header.
 *
 * Memorable micro-interaction for the bookmark save action: matches
 * the user's Figma spec — the suggestion image leaves its position,
 * orbits along a curved path, lands on the bookmark icon. The icon
 * itself swaps from outlined → filled with a bounce on landing
 * (handled separately by DetailHeaderActions, which awaits this
 * promise before flipping its visual state).
 *
 * ── Element discovery (DOM-based, not React refs) ───────────────────
 *
 *   • `data-orbit-source` — the source element (hero cover wrapper).
 *     Looks for a child <img> for the visual; falls back to a
 *     coral-gradient placeholder if none.
 *   • `data-orbit-target` — the bookmark IconButton.
 *
 * Using data-attributes (not refs) keeps the hook free of plumbing
 * — any page that adds the two attributes gets the orbit for free,
 * and the host detail page doesn't have to pass refs through props.
 *
 * ── Curve math ───────────────────────────────────────────────────────
 *
 * Quadratic Bezier from source-center to target-center, with a
 * control point lifted UP from the midpoint to produce the upward
 * arc. The visual scales from 1.0 → ~match-target-size, opacity
 * fades to 0 in the last 15% so it appears to "absorb" into the
 * icon rather than visibly land.
 *
 * Honours `prefers-reduced-motion` — falls back to a 1-frame
 * straight-line fade so the action still feels responsive
 * without the orbit flourish.
 */

const DURATION_MS = 700;
const ARC_HEIGHT  = 220;   // px the path's control point lifts above the midpoint
const KEYFRAMES   = 24;    // path smoothness
const FADE_START  = 0.97;  // near-zero fade; shrinkage to ~1px handles the disappearance
const END_PX      = 1;     // final clone size in pixels — vanishes to a point at the icon centre

export function useBookmarkOrbit() {
  return async (): Promise<void> => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const source = document.querySelector<HTMLElement>("[data-orbit-source]");
    const target = document.querySelector<HTMLElement>("[data-orbit-target]");
    if (!source || !target) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sRect = source.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();

    // ── Build the clone ───────────────────────────────────────────────
    // Pulls the cover <img> if present, else paints a coral gradient.
    const img    = source.querySelector("img");
    const imgSrc = img?.currentSrc || img?.src || null;

    const clone = document.createElement("div");
    Object.assign(clone.style, {
      position:        "fixed",
      left:            `${sRect.left}px`,
      top:             `${sRect.top}px`,
      width:           `${sRect.width}px`,
      height:          `${sRect.height}px`,
      borderRadius:    "12px",
      zIndex:          "9999",
      pointerEvents:   "none",
      willChange:      "transform, opacity",
      transformOrigin: "top left",
      boxShadow:       "0 10px 30px rgba(0,0,0,0.25)",
    });
    if (imgSrc) {
      clone.style.backgroundImage    = `url("${imgSrc}")`;
      clone.style.backgroundSize     = "cover";
      clone.style.backgroundPosition = "center";
    } else {
      clone.style.background = "linear-gradient(135deg, #FE6F5E, #FF9980)";
    }
    document.body.appendChild(clone);

    // ── Geometry — Bezier defined in VIEWPORT coords ──────────────────
    // P0 = source-center, P2 = target-center, P1 = lifted midpoint.
    const p0x = sRect.left + sRect.width  / 2;
    const p0y = sRect.top  + sRect.height / 2;
    const p2x = tRect.left + tRect.width  / 2;
    const p2y = tRect.top  + tRect.height / 2;
    const p1x = (p0x + p2x) / 2;
    const p1y = Math.min(p0y, p2y) - ARC_HEIGHT;

    // End scale: shrink continuously to ~1px at the icon's centre, so the
    // clone visually collapses into a point rather than landing icon-sized.
    const sourceMaxSide = Math.max(sRect.width, sRect.height);
    const endScale      = END_PX / sourceMaxSide;

    /**
     * Position the clone so its centre lands at (cx, cy) at the given scale.
     * With `position:fixed; left:sRect.left; top:sRect.top` and
     * `transform-origin: top-left`, applying `scale(s)` keeps the
     * top-left pinned at (sRect.left, sRect.top); the centre shifts
     * to (sRect.left + sRect.w*s/2, sRect.top + sRect.h*s/2). A
     * subsequent translate adds onto that. To put the scaled-centre
     * at viewport (cx, cy) we solve:
     *   tx = cx − sRect.left − sRect.w * s / 2
     *   ty = cy − sRect.top  − sRect.h * s / 2
     */
    function transformFor(cx: number, cy: number, scale: number): string {
      const tx = cx - sRect.left - (sRect.width  * scale) / 2;
      const ty = cy - sRect.top  - (sRect.height * scale) / 2;
      return `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    if (reduced) {
      // Reduced-motion: skip the arc, just fade out at the source.
      const anim = clone.animate(
        [
          { transform: transformFor(p0x, p0y, 1),        opacity: 1 },
          { transform: transformFor(p2x, p2y, endScale), opacity: 0 },
        ],
        { duration: 200, easing: "ease-out", fill: "forwards" },
      );
      await anim.finished.catch(() => {});
      clone.remove();
      return;
    }

    // ── Sample the Bezier ─────────────────────────────────────────────
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= KEYFRAMES; i++) {
      const t       = i / KEYFRAMES;
      const u       = 1 - t;
      const cx      = u * u * p0x + 2 * u * t * p1x + t * t * p2x;
      const cy      = u * u * p0y + 2 * u * t * p1y + t * t * p2y;
      const scale   = 1 + (endScale - 1) * t;
      const opacity = t < FADE_START ? 1 : 1 - (t - FADE_START) / (1 - FADE_START);

      keyframes.push({
        transform: transformFor(cx, cy, scale),
        opacity,
        offset:    t,
      });
    }

    const anim = clone.animate(keyframes, {
      duration: DURATION_MS,
      easing:   "cubic-bezier(0.4, 0, 0.2, 1)", // ease-soft
      fill:     "forwards",
    });

    await anim.finished.catch(() => {});
    clone.remove();
  };
}
