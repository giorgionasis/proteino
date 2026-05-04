"use client";

/**
 * useUnsavedGuard — warn before losing unsaved form changes.
 *
 * Strategy:
 *   1. Browser-level `beforeunload` covers tab close, reload, URL change.
 *      The browser shows its native dialog ("Leave site?"). Required
 *      because the App Router doesn't expose a route-change event we can
 *      intercept reliably.
 *   2. Returns a `confirmIfDirty()` helper for in-app actions (e.g. clicking
 *      "Cancel" or "Skip") so the caller can show their own confirm before
 *      navigating.
 */

import { useEffect, useCallback } from "react";

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";   // Chrome requires this, Firefox uses the message return
      return "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** Returns true if it's OK to proceed; false if the user cancelled. */
  const confirmIfDirty = useCallback((message?: string): boolean => {
    if (!dirty) return true;
    return window.confirm(
      message ?? "Έχεις μη αποθηκευμένες αλλαγές. Σίγουρα θέλεις να φύγεις χωρίς αποθήκευση;"
    );
  }, [dirty]);

  return { confirmIfDirty };
}
