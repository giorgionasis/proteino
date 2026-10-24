"use client";

import { useOverlay }          from "@/hooks/useOverlay";
import { FullScreenOverlay }   from "@/components/layout/FullScreenOverlay";
import { SearchOverlay }       from "@/components/search/SearchOverlay";
import { SuggestionOverlay }   from "@/components/submission/SuggestionOverlay";
import { GuestPromptModal }    from "@/components/guest/GuestPromptModal";
import { useAuthStore }        from "@/stores/authStore";

interface OverlayManagerProps {
  /** Server-resolved nav-published categories. Threaded through to
   *  SearchOverlay so the category picker + group labels reflect
   *  admin edits. Falls back to the code constant when omitted. */
  categories?: { slug: string; labelEl: string; icon: string }[];
  /** Server-side session check — avoids a guest prompt flashing for a
   *  member while the client session is still loading. */
  isRegistered?: boolean;
}

export function OverlayManager({ categories, isRegistered = false }: OverlayManagerProps = {}) {
  const { overlay, close } = useOverlay();
  const clientUser = useAuthStore((s) => s.supabaseUser);
  // Guests used to get the whole submission flow (AI analysis on every
  // pause) and only hear "you must sign in" on publish, with their text
  // stuck in an error state. Ask first.
  const isGuest = !isRegistered && clientUser === null;

  return (
    <>
      <FullScreenOverlay open={overlay === "search"} onClose={close}>
        <SearchOverlay onClose={close} categories={categories} />
      </FullScreenOverlay>

      <FullScreenOverlay open={overlay === "suggestion" && !isGuest} onClose={close}>
        <SuggestionOverlay onClose={close} />
      </FullScreenOverlay>

      <GuestPromptModal
        open={overlay === "suggestion" && isGuest}
        onClose={close}
        action="να προτείνεις"
      />
    </>
  );
}
