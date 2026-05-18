import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Δεν βρέθηκε — Proteino",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[64px] font-black text-coral-600 leading-none mb-3">404</div>
      <h1 className="text-[22px] font-bold text-zinc-900 mb-2">Δεν βρήκαμε αυτή τη σελίδα</h1>
      <p className="text-sm text-zinc-500 max-w-sm mb-8">
        Η διεύθυνση που ζήτησες μπορεί να μετακινήθηκε ή να μην υπάρχει πια.
      </p>
      <div className="flex flex-col w-full max-w-xs gap-3">
        <Link
          href="/"
          className="h-12 rounded-full bg-coral-600 active:bg-coral-700 text-white font-semibold flex items-center justify-center transition-colors"
        >
          Πίσω στην αρχική
        </Link>
        <Link
          href="/search"
          className="h-12 rounded-full border border-zinc-200 active:bg-zinc-50 text-zinc-800 font-semibold flex items-center justify-center transition-colors"
        >
          Αναζήτηση
        </Link>
      </div>
    </main>
  );
}
