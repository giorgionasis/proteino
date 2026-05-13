/**
 * Admin layout preview — home page (placeholder until home shell
 * refactor lands in the next session).
 *
 * The home page currently composes its sections inline in
 * app/(main)/page.tsx and hasn't been refactored to consume the
 * layout array yet. So this preview shows a banner explaining what's
 * up + links to the live / home for visual inspection.
 *
 * Once the home shell consumes the layout array, this file becomes a
 * lightweight wrapper around the same data-fetching the live home
 * does — same pattern as preview/category/[slug].
 */

import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { audience?: string };
}

export default function PreviewHomePage({ searchParams }: Props) {
  const audience = searchParams.audience ?? "guest";

  return (
    <div className="min-h-screen flex items-center justify-center px-8 text-center bg-zinc-50">
      <div className="max-w-sm">
        <div className="text-5xl mb-4" aria-hidden>🏠</div>
        <h1 className="text-lg font-bold text-zinc-900 mb-2">Home preview</h1>
        <p className="text-sm text-zinc-600 mb-6">
          Η home σελίδα δεν έχει ακόμη μετατραπεί ώστε να καταναλώνει το layout array.
          Έρχεται στο επόμενο sprint. Μέχρι τότε, μπορείς να δεις τα home sections στη
          λίστα αριστερά + να επεξεργαστείς τη σειρά τους — η αλλαγή θα ενεργοποιηθεί
          αυτόματα μόλις γίνει το refactor.
        </p>
        <p className="text-xs text-zinc-500 mb-4">
          Audience preview: <span className="font-semibold">{audience}</span>
        </p>
        <Link
          href="/"
          target="_top"
          className="inline-block px-4 py-2 text-sm font-semibold text-coral-700 bg-coral-50 hover:bg-coral-100 rounded-md transition-colors"
        >
          Άνοιξε live home →
        </Link>
      </div>
    </div>
  );
}
