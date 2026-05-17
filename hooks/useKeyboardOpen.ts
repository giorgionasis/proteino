"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the mobile soft keyboard is currently visible, and
 * how many pixels it's covering at the bottom. Drives the submission
 * overlay's "slim tip-bar above keyboard" mode so the coaching tip
 * stays visible while typing on small phones.
 *
 * Uses the `visualViewport` API (supported in iOS Safari 13+, Chrome
 * Android, etc.). Falls back gracefully on desktop/older browsers:
 * returns `{ open: false, offsetPx: 0 }` — caller just keeps the
 * full IntelligencePanel inline.
 *
 * "Open" heuristic: visualViewport.height is meaningfully smaller
 * than window.innerHeight. iOS Safari URL-bar collapse causes a
 * ~60px discrepancy on its own, so the threshold is 150px.
 */
const KEYBOARD_OPEN_THRESHOLD_PX = 150;

export interface KeyboardState {
  /** True when the soft keyboard is currently visible. */
  open: boolean;
  /** Pixels of the viewport covered by the keyboard at the bottom.
   *  0 when closed or when visualViewport isn't supported. Use for
   *  positioning fixed elements above the keyboard
   *  (e.g. `bottom: offsetPx`). */
  offsetPx: number;
}

export function useKeyboardOpen(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({ open: false, offsetPx: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return; // SSR or older browser — keep the safe default.

    const handle = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({
        open: offset > KEYBOARD_OPEN_THRESHOLD_PX,
        offsetPx: offset,
      });
    };

    handle();
    vv.addEventListener("resize", handle);
    vv.addEventListener("scroll", handle);
    return () => {
      vv.removeEventListener("resize", handle);
      vv.removeEventListener("scroll", handle);
    };
  }, []);

  return state;
}
