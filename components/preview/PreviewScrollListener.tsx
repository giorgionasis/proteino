"use client";

import { useEffect } from "react";

/**
 * Mounted in app/preview/layout.tsx — listens for postMessage from the
 * /admin/layout admin shell asking to scroll the iframe to a specific
 * section row. Pattern:
 *
 *   admin: iframe.contentWindow.postMessage(
 *     { type: 'scroll-to-section', sectionId },
 *     window.location.origin,
 *   )
 *
 *   preview: receives the message → finds [data-section-id="..."] →
 *            smooth-scrolls + applies a transient highlight ring.
 *
 * Origin check: only accept messages from the same origin (the admin
 * lives at the same host since /preview is a route of this Next.js
 * project). Defense against postMessage from arbitrary external pages
 * if the preview is ever embedded elsewhere.
 */
export function PreviewScrollListener() {
  useEffect(() => {
    function handle(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "scroll-to-section") return;
      const sectionId = data.sectionId;
      if (typeof sectionId !== "string") return;

      const el = document.querySelector<HTMLElement>(
        `[data-section-id="${cssEscape(sectionId)}"]`,
      );
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "start" });

      el.classList.remove("section-highlight");
      // Force reflow so re-adding the class restarts the animation when
      // the same section is clicked twice in a row.
      void el.offsetWidth;
      el.classList.add("section-highlight");
      window.setTimeout(() => el.classList.remove("section-highlight"), 1600);
    }

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);

  return null;
}

function cssEscape(value: string): string {
  // CSS.escape is widely supported but guard for old environments.
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}
