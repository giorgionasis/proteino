import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";

interface PublicBookAdProps {
  bookTitle: string;
  author?: string | null;
  /** Page count, rendered as "144 σ." */
  pages?: number | null;
  coverUrl?: string | null;
  /** Public.gr buy link. */
  href?: string;
}

/**
 * Cross-promo card pointing the user to a Public.gr book version of the
 * current item. Shown on theater plays that have a printed counterpart.
 *
 * Layout (lavender bg):
 *   "Public" wordmark (orange, large)
 *   "Κυκλοφορεί και το ομώνυμο έργο"
 *   [book cover] [title / author / page count]
 *                                        [Δες το →]
 */
export function PublicBookAd({ bookTitle, author, pages, coverUrl, href }: PublicBookAdProps) {
  return (
    <div className="rounded-[16px] p-6" style={{ backgroundColor: "#EFF1FA" }}>
      <Icon name="public" width={140} height={48} alt="Public" />
      <p className="text-[16px] font-medium text-zinc-700 mt-2 leading-tight">
        Κυκλοφορεί και το ομώνυμο έργο
      </p>
      <div className="mt-5 flex items-start gap-4">
        <div className="w-[110px] h-[160px] shrink-0 rounded-[6px] overflow-hidden bg-zinc-200">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={bookTitle}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <p className="text-[18px] font-bold text-zinc-900 leading-tight line-clamp-3">
            {bookTitle}
          </p>
          {author && (
            <p className="text-[14px] font-medium text-zinc-700">{author}</p>
          )}
          {pages != null && (
            <p className="text-[14px] font-medium text-zinc-600">{pages} σ.</p>
          )}
        </div>
      </div>
      {href && (
        <div className="mt-5 flex justify-end">
          <OutlinedPill href={href} className="border-coral-600 text-coral-700">
            Δες το
          </OutlinedPill>
        </div>
      )}
    </div>
  );
}
