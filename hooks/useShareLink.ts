"use client";

import { useState, useCallback } from "react";

/**
 * Centralized share-link handler used by every detail page (and reusable
 * elsewhere). Tries `navigator.share` first (mobile native sheet), falls back
 * to copying the URL to clipboard with a brief "copied" feedback flag.
 *
 * Mirrors the logic in PublishedScreen (session 12) so the user sees the same
 * behavior whether they share from the submission flow or from a detail page.
 */
export function useShareLink(opts?: { title?: string; text?: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const share = useCallback(async () => {
    if (typeof window === "undefined") return;
    setBusy(true);
    const url = window.location.href;
    const payload: ShareData = {
      title: opts?.title ?? document.title,
      text: opts?.text,
      url,
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch (e) {
      // AbortError when user dismisses the native share sheet — silent.
      // Anything else gets logged but doesn't surface to the user.
      const isAbort = (e as DOMException)?.name === "AbortError";
      if (!isAbort) console.warn("share failed:", e);
    } finally {
      setBusy(false);
    }
  }, [opts?.title, opts?.text]);

  return { share, copied, busy };
}
