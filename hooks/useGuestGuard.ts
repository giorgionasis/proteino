"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook for gating user actions that require login. Returns:
 *
 *   - `isGuest`         — true when no Supabase session is loaded
 *   - `requireAuth(fn)` — runs `fn` if logged in, opens the
 *                          GuestPromptModal otherwise
 *   - `modalProps`     — spread onto <GuestPromptModal> so the host
 *                          page controls when it shows
 *
 * Usage in any client component:
 *
 *   const { requireAuth, modalProps } = useGuestGuard("να σώσεις στα αγαπημένα σου");
 *
 *   <button onClick={() => requireAuth(() => toggleBookmark())}>...</button>
 *   <GuestPromptModal {...modalProps} />
 *
 * The action verb passed to the hook is the second half of the modal
 * headline ("Σύνδεση για να σώσεις στα αγαπημένα σου"), so each
 * caller customises the prompt to its specific action.
 */
export function useGuestGuard(action: string) {
  const supabaseUser = useAuthStore((s) => s.supabaseUser);
  const isGuest = supabaseUser === null;
  const [open, setOpen] = useState(false);

  const requireAuth = (fn: () => void) => {
    if (isGuest) {
      setOpen(true);
      return false;
    }
    fn();
    return true;
  };

  return {
    isGuest,
    requireAuth,
    modalProps: {
      open,
      onClose: () => setOpen(false),
      action,
    },
  };
}
