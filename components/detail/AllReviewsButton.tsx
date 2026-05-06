import Link from "next/link";

interface AllReviewsButtonProps {
  /** Item slug WITH the category prefix, e.g. "books/agries-anemones". */
  itemSlug: string;
  /** Total rating count (prefer aggregate, fall back to per-user count). */
  count: number;
}

/**
 * "Εμφάνιση X αξιολογήσεων" outlined CTA shown below the review carousel
 * on each detail page. Links to /<category>/<id>/reviews. Hidden when count
 * is 0 — there's nothing to show.
 */
export function AllReviewsButton({ itemSlug, count }: AllReviewsButtonProps) {
  if (count <= 0) return null;
  const label = count === 1 ? "1 αξιολόγηση" : `${count} αξιολογήσεις`;
  return (
    <div className="px-6">
      <Link
        href={`/${itemSlug}/reviews`}
        className="block w-full h-[50px] rounded-[12px] border border-zinc-400 text-center leading-[50px] text-[14px] font-semibold text-zinc-800 active:bg-zinc-50 transition-colors"
      >
        Εμφάνιση {label}
      </Link>
    </div>
  );
}
