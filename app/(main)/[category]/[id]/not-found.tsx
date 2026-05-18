import Link from "next/link";

export default function ItemNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-3" aria-hidden>
        🔍
      </div>
      <h1 className="text-[20px] font-bold text-zinc-900 mb-2">
        Δεν βρήκαμε αυτή την πρόταση
      </h1>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">
        Μπορεί να έχει αφαιρεθεί ή να μην έχει δημοσιευθεί ακόμα.
      </p>
      <div className="flex flex-col w-full max-w-xs gap-3">
        <Link
          href="/search"
          className="h-12 rounded-full bg-coral-600 active:bg-coral-700 text-white font-semibold flex items-center justify-center transition-colors"
        >
          Αναζήτησε κάτι άλλο
        </Link>
        <Link
          href="/"
          className="h-12 rounded-full border border-zinc-200 active:bg-zinc-50 text-zinc-800 font-semibold flex items-center justify-center transition-colors"
        >
          Πίσω στην αρχική
        </Link>
      </div>
    </div>
  );
}
