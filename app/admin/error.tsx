"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl mb-3" aria-hidden>
        ⚠️
      </div>
      <h2 className="text-[18px] font-bold text-zinc-900 mb-1">Admin error</h2>
      <p className="text-sm text-zinc-500 max-w-md mb-2">
        Something failed while rendering this admin page.
      </p>
      {error?.message && (
        <p className="text-[12px] text-zinc-600 font-mono max-w-md mb-2 break-all">
          {error.message}
        </p>
      )}
      {error?.digest && (
        <p className="text-[11px] text-zinc-400 font-mono mb-6">Digest: {error.digest}</p>
      )}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => reset()}
          className="h-10 px-5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Retry
        </button>
        <Link
          href="/admin"
          className="h-10 px-5 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 inline-flex items-center transition-colors"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
