"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[(main)/error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl mb-3" aria-hidden>
        ⚠️
      </div>
      <h2 className="text-[18px] font-bold text-zinc-900 mb-2">Κάτι πήγε στραβά</h2>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">
        Δοκίμασε ξανά. Αν συνεχίζεται, μπορεί να βοηθήσει ένα refresh.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="h-11 px-6 rounded-full bg-coral-600 active:bg-coral-700 text-white text-sm font-semibold transition-colors"
        >
          Δοκίμασε ξανά
        </button>
        <Link
          href="/"
          className="h-11 px-6 rounded-full border border-zinc-200 active:bg-zinc-50 text-zinc-800 text-sm font-semibold inline-flex items-center transition-colors"
        >
          Αρχική
        </Link>
      </div>
    </div>
  );
}
