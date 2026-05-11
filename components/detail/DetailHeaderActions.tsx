"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { useShareLink } from "@/hooks/useShareLink";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import type { BookmarkController } from "@/components/detail/BookmarkStatusChips";
import type { BookmarkSaveResult } from "@/components/detail/BookmarkSavedModal";

/**
 * Bookmark + Share action pair for the right-slot of <InnerHeader> on
 * every detail page. The bookmark controller is owned by the detail
 * page (single useBookmark instance shared with BookmarkStatusChips)
 * so both surfaces stay in sync without re-fetching.
 *
 * On successful save the host page receives a `BookmarkSaveResult`
 * via `onSaved` and opens the celebration modal with the bookmarker
 * avatar stack. Removal is silent — the icon flip is enough feedback.
 */
interface Props {
  category:    string;
  bookmark:    BookmarkController;
  shareTitle:  string;
  /** Called with the server result on successful SAVE (not on remove). */
  onSaved?:    (result: BookmarkSaveResult) => void;
  /** Toast for inline error messages (failed save). */
  onToast?:    (message: string) => void;
}

export function DetailHeaderActions({ category, bookmark, shareTitle, onSaved, onToast }: Props) {
  const { bookmarked, toggle } = bookmark;
  const { share, copied } = useShareLink({ title: shareTitle });
  // Bookmark is a logged-in action; sharing is fine for guests too.
  const { requireAuth, modalProps } = useGuestGuard("να σώσεις στα αγαπημένα σου");

  // Pop the bookmark icon every time the bookmarked state actually
  // flips (skip the initial mount). 280ms scale 1 → 1.3 → 1 via the
  // existing `pop-in` keyframe — feels tactile without being noisy.
  const [popKey, setPopKey] = useState(0);
  const lastBookmark = useRef(bookmarked);
  useEffect(() => {
    if (lastBookmark.current !== bookmarked) {
      setPopKey((k) => k + 1);
      lastBookmark.current = bookmarked;
    }
  }, [bookmarked]);

  async function handleToggle() {
    requireAuth(async () => {
      const wasBookmarked = bookmarked;
      const result = await toggle();
      if (!result.ok) {
        onToast?.("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
        return;
      }
      // Open the celebration modal on SAVE only (not on remove).
      // Remove is silent — the icon flip is enough feedback.
      if (!wasBookmarked && result.status) {
        onSaved?.({
          status:  result.status,
          context: result.context,
        });
      }
    });
  }

  return (
    <>
      <IconButton
        onClick={handleToggle}
        aria-label="Αποθήκευση"
      >
        <span
          key={popKey}
          className={popKey > 0 ? "inline-flex animate-pop-in" : "inline-flex"}
        >
          <Icon
            name={bookmarked ? "bookmark-added" : "bookmark-add"}
            width={16}
            height={20}
            alt=""
          />
        </span>
      </IconButton>

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
