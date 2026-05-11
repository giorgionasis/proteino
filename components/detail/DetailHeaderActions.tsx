"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Share2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useBookmark } from "@/hooks/useBookmark";
import { useShareLink } from "@/hooks/useShareLink";

/**
 * Bookmark + Share action pair for the right-slot of <InnerHeader> on
 * every detail page. Identical across all 9 categories — extracted so
 * each detail page imports one component instead of repeating the
 * button markup + the two hooks.
 *
 * Visual: 36px coral/zinc IconButtons. Bookmark filled when active,
 * Share flashes green + "✓ Αντιγράφηκε" tooltip on copy success.
 *
 * Built on the IconButton design-system primitive — keeps detail
 * pages free of ad-hoc rounded-full button markup.
 */
interface Props {
  itemId: string;
  category: string;
  isBookmarked: boolean;
  shareTitle: string;
}

export function DetailHeaderActions({ itemId, category, isBookmarked, shareTitle }: Props) {
  const { bookmarked, toggle } = useBookmark(itemId, category, isBookmarked);
  const { share, copied } = useShareLink({ title: shareTitle });

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

  return (
    <>
      <IconButton
        onClick={toggle}
        aria-label="Αποθήκευση"
        className={bookmarked ? "bg-zinc-800 hover:bg-zinc-900 active:bg-black" : undefined}
      >
        <Bookmark
          key={popKey}
          size={16}
          className={
            (bookmarked ? "text-white fill-white" : "text-zinc-700") +
            (popKey > 0 ? " animate-pop-in" : "")
          }
        />
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
    </>
  );
}
