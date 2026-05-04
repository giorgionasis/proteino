"use client";

/**
 * useBookmark — toggle/persist bookmark state for a single item.
 *
 * Optimistic update: state flips immediately, then syncs with the server.
 * Reverts on failure.
 *
 * Usage:
 *   const { bookmarked, toggle, busy } = useBookmark(itemId, category, initialBookmarked);
 *
 * `initialBookmarked` should come from a server-side fetch (so the initial
 * UI is correct without a flicker).
 */

import { useState, useCallback } from "react";

export function useBookmark(
  itemId: string,
  category: string,
  initialBookmarked = false
) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (busy) return;
    const next = !bookmarked;
    setBookmarked(next);   // optimistic
    setBusy(true);

    try {
      let res: Response;
      if (next) {
        res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId, category }),
        });
      } else {
        const url = new URL("/api/bookmarks", window.location.origin);
        url.searchParams.set("item_id", itemId);
        res = await fetch(url.toString(), { method: "DELETE" });
      }
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in — reset state & redirect to login
          setBookmarked(false);
          window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error(`Bookmark ${next ? "save" : "remove"} failed`);
      }
    } catch (e) {
      // Revert optimistic update on failure
      setBookmarked(!next);
    } finally {
      setBusy(false);
    }
  }, [bookmarked, busy, itemId, category]);

  return { bookmarked, toggle, busy };
}
