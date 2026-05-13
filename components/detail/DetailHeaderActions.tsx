"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { useShareLink } from "@/hooks/useShareLink";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { useBookmarkOrbit } from "@/hooks/useBookmarkOrbit";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import type { BookmarkController } from "@/components/detail/BookmarkStatusChips";
import type { BookmarkSaveResult } from "@/components/detail/BookmarkSavedModal";

/**
 * Bookmark + Share action pair for the right-slot of <InnerHeader> on
 * every detail page. The bookmark controller is owned by the detail
 * page (single useBookmark instance shared with BookmarkStatusChips)
 * so both surfaces stay in sync without re-fetching.
 *
 * On a SAVE action we run the orbit microinteraction: the hero cover
 * image clones, flies along a parabolic arc, and lands on this icon —
 * exactly when the icon flips from `bookmark-add` (outlined) to
 * `bookmark-added` (filled) with a bounce.
 *
 * To keep the icon visual in sync with the orbit timing, we maintain
 * a local `visualBookmarked` that lags the controller's `bookmarked`
 * during the orbit phase. UNBOOKMARK is instant — no reverse orbit.
 */
interface Props {
  category:    string;
  bookmark:    BookmarkController;
  shareTitle:  string;
  /** Called with the server result on successful SAVE (not on remove). */
  onSaved?:    (result: BookmarkSaveResult) => void;
  /** Toast for inline error messages (failed save). */
  onToast?:    (message: string) => void;
  /**
   * Hide the bookmark icon. Set when the viewer is the original
   * suggester of this item — a suggester has demonstrably experienced
   * the item, so wishlist/done states are nonsensical for them.
   * Share button stays visible.
   */
  showBookmark?: boolean;
}

export function DetailHeaderActions({ category, bookmark, shareTitle, onSaved, onToast, showBookmark = true }: Props) {
  const { bookmarked, toggle } = bookmark;
  const { share, copied }      = useShareLink({ title: shareTitle });
  const fly                    = useBookmarkOrbit();
  // Bookmark is a logged-in action; sharing is fine for guests too.
  const { requireAuth, modalProps } = useGuestGuard("να σώσεις στα αγαπημένα σου");

  // Visual override during orbit: the icon stays in the PREVIOUS
  // state until the orbit lands, then flips to the new state. The
  // popKey effect below produces the bounce on flip.
  const [orbiting, setOrbiting]                 = useState(false);
  const [visualBookmarked, setVisualBookmarked] = useState(bookmarked);

  // When NOT orbiting, mirror the controller's bookmarked. When
  // orbiting, hold the previous value — the visual flip happens on
  // setOrbiting(false) at landing.
  useEffect(() => {
    if (!orbiting) setVisualBookmarked(bookmarked);
  }, [bookmarked, orbiting]);

  // Pop the icon on every flip of `visualBookmarked`. Skip the
  // initial mount via the ref guard.
  const [popKey, setPopKey] = useState(0);
  const lastVisual          = useRef(visualBookmarked);
  useEffect(() => {
    if (lastVisual.current !== visualBookmarked) {
      setPopKey((k) => k + 1);
      lastVisual.current = visualBookmarked;
    }
  }, [visualBookmarked]);

  async function handleToggle() {
    requireAuth(async () => {
      const wasBookmarked = bookmarked;

      if (!wasBookmarked) {
        // ── SAVE flow with orbit ───────────────────────────────────────
        // Kick off the orbit + the API write in parallel. The orbit is
        // a fixed-duration visual; the API may resolve faster or
        // slower but we always wait for the orbit to land before
        // flipping the icon visual.
        setOrbiting(true);
        const orbitPromise  = fly();
        const togglePromise = toggle();

        await orbitPromise;
        setOrbiting(false);
        // visualBookmarked will now sync to bookmarked via the effect,
        // triggering the 520ms `bookmark-bounce` animation on the icon button.

        const result = await togglePromise;
        if (!result.ok) {
          onToast?.("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
          return;
        }
        // Hold for ~600ms so the bookmark-bounce on the icon plays out
        // before the celebration modal slides over it.
        await new Promise<void>((resolve) => setTimeout(resolve, 600));
        if (result.status) {
          onSaved?.({ status: result.status, context: result.context, moment: result.moment });
        }
      } else {
        // ── UNBOOKMARK: instant, no orbit ──────────────────────────────
        const result = await toggle();
        if (!result.ok) {
          onToast?.("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
        }
      }
    });
  }

  return (
    <>
      {showBookmark && (
        <span
          key={popKey}
          className={popKey > 0 ? "inline-flex animate-bookmark-bounce" : "inline-flex"}
        >
          <IconButton
            onClick={handleToggle}
            aria-label="Αποθήκευση"
            data-orbit-target
          >
            <Icon
              name={visualBookmarked ? "bookmark-added" : "bookmark-add"}
              width={16}
              height={20}
              alt=""
            />
          </IconButton>
        </span>
      )}

      <IconButton
        onClick={share}
        aria-label={copied ? "Αντιγράφηκε" : "Κοινοποίηση"}
        className={copied ? "bg-emerald-100 hover:bg-emerald-200" : undefined}
      >
        <Share2 size={16} className={copied ? "text-emerald-700" : "text-zinc-700"} />
        {copied && (
          <span className="absolute -bottom-7 right-0 whitespace-nowrap px-2 py-1 rounded bg-zinc-900 text-white text-[11px] font-medium">
            ✓ Αντιγράφηκε
          </span>
        )}
      </IconButton>

      <GuestPromptModal {...modalProps} />
    </>
  );
}
