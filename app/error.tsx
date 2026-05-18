"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4" aria-hidden>
        ⚠️
      </div>
      <h1 className="text-[22px] font-bold text-zinc-900 mb-2">Κάτι πήγε στραβά</h1>
      <p className="text-sm text-zinc-500 max-w-sm mb-2">
        Κάτι δεν δούλεψε όπως έπρεπε. Δοκίμασε ξανά — αν συνεχίζεται, δες την αρχική.
      </p>
      {error?.digest && (
        <p className="text-[11px] text-zinc-400 font-mono mb-6">Code: {error.digest}</p>
      )}
      <div className="flex flex-col w-full max-w-xs gap-3 mt-4">
        <button
          onClick={() => reset()}
          className="h-12 rounded-full bg-coral-600 active:bg-coral-700 text-white font-semibold flex items-center justify-center transition-colors"
        >
          Δοκίμασε ξανά
        </button>
        <Link
          href="/"
          className="h-12 rounded-full border border-zinc-200 active:bg-zinc-50 text-zinc-800 font-semibold flex items-center justify-center transition-colors"
        >
          Πίσω στην αρχική
        </Link>
      </div>
    </main>
  );
}
