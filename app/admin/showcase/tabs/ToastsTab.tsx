"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { Toast, useToast } from "@/components/ui/Toast";

export function ToastsTab() {
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [openError, setOpenError] = useState(false);
  const { toast, show } = useToast();

  return (
    <>
      <ShowcaseSection
        name="Toast (primitive)"
        filePath="components/ui/Toast.tsx"
        description="Single-line confirmation toast. Three tones (success / info / error). Three positions (top / bottom / inline). Default auto-dismisses after 1.8s."
      >
        <Variant label="Success (default)">
          <button
            onClick={() => setOpenSuccess(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Show success
          </button>
          <Toast
            message="Αντιγράφηκε στο πρόχειρο"
            tone="success"
            open={openSuccess}
            onClose={() => setOpenSuccess(false)}
          />
        </Variant>
        <Variant label="Info">
          <button
            onClick={() => setOpenInfo(true)}
            className="px-4 h-10 rounded-full bg-zinc-700 text-white text-sm font-semibold"
          >
            Show info
          </button>
          <Toast message="Συγχρονισμός σε εξέλιξη..." tone="info" open={openInfo} onClose={() => setOpenInfo(false)} />
        </Variant>
        <Variant label="Error">
          <button
            onClick={() => setOpenError(true)}
            className="px-4 h-10 rounded-full bg-red-600 text-white text-sm font-semibold"
          >
            Show error
          </button>
          <Toast message="Σφάλμα δικτύου. Δοκίμασε ξανά." tone="error" open={openError} onClose={() => setOpenError(false)} />
        </Variant>
        <Variant label="Inline (always visible — for embed)">
          <Toast message="Inline notice" tone="success" open={true} autoCloseMs={0} position="inline" />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="useToast() hook"
        filePath="components/ui/Toast.tsx (named export)"
        description={`Tiny helper for the show + auto-dismiss pattern. Returns { toast, show }. Drop {toast} once at the bottom of your component, call show("...") wherever needed.`}
      >
        <Variant label="Live demo (clicks fire toasts)">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => show("Αντιγράφηκε ✓")}
                className="px-3 h-9 rounded-full bg-zinc-900 text-white text-xs font-semibold"
              >
                Copy
              </button>
              <button
                onClick={() => show("Δεν βρέθηκε", { tone: "error" })}
                className="px-3 h-9 rounded-full bg-red-600 text-white text-xs font-semibold"
              >
                Trigger error
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">Πάτα ένα κουμπί — toast στο bottom κέντρο.</p>
          </div>
          {toast}
        </Variant>
      </ShowcaseSection>
    </>
  );
}
