"use client";

/**
 * useBookmark — track + mutate the bookmark row for a single item.
 *
 * State model (matches `bookmarks.status` enum, migration 023):
 *   - status = null       → not bookmarked
 *   - status = 'wishlist' → saved, want to do
 *   - status = 'done'     → saved, have done it
 *
 * Optimistic update: state flips immediately, then syncs with the
 * server. Reverts on failure. Each action returns an `ok` flag so
 * callers can show success/error toasts correctly (we never want a
 * failed save to be mis-announced as "removed").
 */

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { ResolvedMoment } from "@/lib/moments";

export type BookmarkStatus = "wishlist" | "done";

export interface BookmarkUser {
  handle:       string;
  display_name: string | null;
  avatar_url:   string | null;
}

export interface BookmarkContext {
  categoryCount:    number;
  todayCount:       number;
  bookmarkers:      BookmarkUser[];
  bookmarkersTotal: number;
}

interface ToggleResult {
  ok:      boolean;
  status:  BookmarkStatus | null;
  context: BookmarkContext | null;
  /** Resolved celebration moment from the DB-driven `moments` table.
   *  Null when no row matched OR migration 026/027 not yet applied —
   *  in either case the modal falls back to inline copy. */
  moment:  ResolvedMoment | null;
}

interface SetStatusResult {
  ok:      boolean;
  status:  BookmarkStatus;
  context: BookmarkContext | null;
}

interface BookmarkAction {
  status:      BookmarkStatus | null;
  bookmarked:  boolean;
  busy:        boolean;
  /** Toggle save: null → wishlist, any → null. */
  toggle:      () => Promise<ToggleResult>;
  /** Move to a specific status. Materialises the row if missing. */
  setStatus:   (next: BookmarkStatus) => Promise<SetStatusResult>;
}

export function useBookmark(
  itemId:        string,
  category:      string,
  initialStatus: BookmarkStatus | null = null,
): BookmarkAction {
  const [status, setLocalStatus]   = useState<BookmarkStatus | null>(initialStatus);
  const [busy,   setBusy]          = useState(false);
  const supabaseUser               = useAuthStore((s) => s.supabaseUser);
  const isGuest                    = supabaseUser === null;

  const toggle = async (): Promise<ToggleResult> => {
    if (busy) return { ok: false, status, context: null, moment: null };
    if (isGuest) {
      // No-op for guests — the GuestPromptModal handles the prompt
      // upstream (see useGuestGuard wrappers in detail pages).
      return { ok: false, status, context: null, moment: null };
    }

    const next: BookmarkStatus | null = status === null ? "wishlist" : null;
    const prev = status;
    setLocalStatus(next);
    setBusy(true);

    try {
      if (next === "wishlist") {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId, category, status: "wishlist" }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error("[useBookmark] POST failed", { status: res.status, body });
          throw new Error(body?.error ?? `save_failed_${res.status}`);
        }
        if (body.status === "wishlist" || body.status === "done") {
          setLocalStatus(body.status);
        }
        return {
          ok:      true,
          status:  body.status ?? "wishlist",
          context: body.context ?? null,
          moment:  body.moment  ?? null,
        };
      }

      const url = new URL("/api/bookmarks", window.location.origin);
      url.searchParams.set("item_id", itemId);
      const res = await fetch(url.toString(), { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[useBookmark] DELETE failed", { status: res.status, body });
        throw new Error(body?.error ?? `delete_failed_${res.status}`);
      }
      return { ok: true, status: null, context: null, moment: null };
    } catch (e) {
      console.warn("[useBookmark] toggle failed, reverting", e);
      setLocalStatus(prev);
      return { ok: false, status: prev, context: null, moment: null };
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (nextStatus: BookmarkStatus): Promise<SetStatusResult> => {
    if (busy) return { ok: false, status: status ?? nextStatus, context: null };
    if (isGuest) {
      return { ok: false, status: nextStatus, context: null };
    }

    const prev = status;
    setLocalStatus(nextStatus);
    setBusy(true);

    try {
      const res = await fetch("/api/bookmarks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, category, status: nextStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[useBookmark] PATCH failed", { status: res.status, body });
        throw new Error(body?.error ?? `patch_failed_${res.status}`);
      }
      return { ok: true, status: nextStatus, context: null };
    } catch (e) {
      console.warn("[useBookmark] setStatus failed, reverting", e);
      setLocalStatus(prev);
      return { ok: false, status: prev ?? nextStatus, context: null };
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    bookmarked: status !== null,
    busy,
    toggle,
    setStatus,
  };
}
