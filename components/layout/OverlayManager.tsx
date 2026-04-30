"use client";

import { useOverlay }          from "@/hooks/useOverlay";
import { FullScreenOverlay }   from "@/components/layout/FullScreenOverlay";
import { SearchOverlay }       from "@/components/search/SearchOverlay";
import { SuggestionOverlay }   from "@/components/submission/SuggestionOverlay";

export function OverlayManager() {
  const { overlay, close } = useOverlay();

  return (
    <>
      <FullScreenOverlay open={overlay === "search"} onClose={close}>
        <SearchOverlay onClose={close} />
      </FullScreenOverlay>

      <FullScreenOverlay open={overlay === "suggestion"} onClose={close}>
        <SuggestionOverlay onClose={close} />
      </FullScreenOverlay>
    </>
  );
}
