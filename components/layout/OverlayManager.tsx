"use client";

import { useOverlay }          from "@/hooks/useOverlay";
import { FullScreenOverlay }   from "@/components/layout/FullScreenOverlay";
import { SearchOverlay }       from "@/components/search/SearchOverlay";
import { SuggestionOverlay }   from "@/components/submission/SuggestionOverlay";

interface OverlayManagerProps {
  /** Server-resolved nav-published categories. Threaded through to
   *  SearchOverlay so the category picker + group labels reflect
   *  admin edits. Falls back to the code constant when omitted. */
  categories?: { slug: string; labelEl: string; icon: string }[];
}

export function OverlayManager({ categories }: OverlayManagerProps = {}) {
  const { overlay, close } = useOverlay();

  return (
    <>
      <FullScreenOverlay open={overlay === "search"} onClose={close}>
        <SearchOverlay onClose={close} categories={categories} />
      </FullScreenOverlay>

      <FullScreenOverlay open={overlay === "suggestion"} onClose={close}>
        <SuggestionOverlay onClose={close} />
      </FullScreenOverlay>
    </>
  );
}
