"use client";

/**
 * useFollow — toggle/persist follow state for another user.
 *
 * Mirrors useBookmark: optimistic flip, revert on failure, redirect to
 * login on 401. Server-side initial state should be fetched and passed in
 * (so the button doesn't flicker).
 *
 * Usage:
 *   const { following, toggle, busy } = useFollow(targetUserId, initialFollowing);
 */

import { useState, useCallback } from "react";

export function useFollow(targetUserId: string, initialFollowing = false) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (busy || !targetUserId) return;
    const next = !following;
    setFollowing(next); // optimistic
    setBusy(true);

    try {
      let res: Response;
      if (next) {
        res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: targetUserId }),
        });
      } else {
        const url = new URL("/api/follows", window.location.origin);
        url.searchParams.set("user_id", targetUserId);
        res = await fetch(url.toString(), { method: "DELETE" });
      }

      if (!res.ok) {
        if (res.status === 401) {
          setFollowing(false);
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error(`Follow ${next ? "save" : "remove"} failed`);
      }
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }, [following, busy, targetUserId]);

  return { following, toggle, busy };
}
