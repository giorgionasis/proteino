"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RowMenu } from "@/components/profile/RowMenu";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";

type SortKey = "recent" | "high" | "low";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Πιο Πρόσφατες" },
  { key: "high",   label: "Υψηλ. Βαθμολ." },
  { key: "low",    label: "Χαμ. Βαθμολ." },
];

export interface ProfileReview {
  id: string;
  score: number;
  createdAt: string;
  item: {
    id: string;
    title: string;
    slug: string;
    category: string;
    poster: string | null;
  };
}

interface Props {
  handle: string;
  isOwner: boolean;
  reviews: ProfileReview[];
}

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={s <= score ? "#FE6F5E" : "transparent"}
            stroke={s <= score ? "#FE6F5E" : "#d4d4d8"}
            strokeWidth="1.5"
          />
        </svg>
      ))}
      {score > 0 && <span className="ml-1 text-[12px] text-zinc-500 tabular-nums">{score}/5</span>}
    </div>
  );
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "τώρα";
  if (diff < 3600) return `${Math.floor(diff / 60)} λεπτά πριν`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ώρες πριν`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} μέρες πριν`;
  return d.toLocaleDateString("el-GR", { year: "numeric", month: "short", day: "numeric" });
}

function ReviewCard({
  review,
  isOwner,
  onDelete,
}: {
  review: ProfileReview;
  isOwner: boolean;
  onDelete: () => void;
}) {
  const detailHref = `/${review.item.slug}`;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      <div className="flex gap-4 p-4">
        <Link href={detailHref} className="w-16 h-20 rounded-card overflow-hidden bg-zinc-100 shrink-0 active:opacity-80 transition-opacity">
          {review.item.poster ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={review.item.poster} alt="" className="w-full h-full object-cover" />
          ) : null}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={detailHref} className="block flex-1 min-w-0 active:opacity-80 transition-opacity">
              <p className="text-base font-bold text-zinc-900 leading-tight line-clamp-2">{review.item.title}</p>
            </Link>
            {isOwner && (
              <RowMenu
                items={[
                  { label: "Δες το αντικείμενο", onClick: () => { window.location.href = detailHref; } },
                  { label: "Άλλαξε βαθμολογία", onClick: () => { window.location.href = detailHref; } },
                  { label: "Διαγραφή βαθμολογίας", onClick: onDelete, danger: true },
                ]}
              />
            )}
          </div>
          <div className="mt-2"><StarRow score={review.score} /></div>
          <p className="text-[12px] text-zinc-500 mt-2">{relativeDate(review.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsCategoryPage({ handle, isOwner, reviews }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("recent");
  const [list, setList] = useState(reviews);
  const [deleting, setDeleting] = useState<ProfileReview | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...list];
    switch (sort) {
      case "high": return arr.sort((a, b) => (b.score || 0) - (a.score || 0));
      case "low":  return arr.sort((a, b) => (a.score || 6) - (b.score || 6));
      case "recent":
      default:     return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [list, sort]);

  async function confirmDelete() {
    if (!deleting || pendingDelete) return;
    setPendingDelete(true);
    setError(null);
    try {
      const res = await fetch(`/api/ratings/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        return;
      }
      setList((l) => l.filter((r) => r.id !== deleting.id));
      setDeleting(null);
      setShowDeleteSuccess(true);
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
    } finally {
      setPendingDelete(false);
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <div
        className="sticky top-0 z-20 bg-white flex items-center h-14 border-b border-zinc-200"
        style={{ paddingLeft: 12 }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Πίσω"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="flex-1 text-center text-base font-bold text-[#3F3F46] pr-11">
          {isOwner ? "Οι αξιολογήσεις μου" : `Αξιολογήσεις @${handle}`}
        </p>
      </div>

      <div className="flex flex-col gap-6 pb-10">
        <div className="mx-6 mt-6">
          <div
            className="flex items-center gap-2.5 rounded-[8px] px-4 py-4"
            style={{ backgroundColor: "#F2F2F7" }}
          >
            <span
              className="font-bold text-[#27272A] leading-none"
              style={{ fontSize: 52, lineHeight: "37px" }}
            >
              {list.length}
            </span>
            <span className="text-base text-[#3F3F46] leading-snug" style={{ fontWeight: 500 }}>
              {list.length === 1 ? "αξιολόγηση" : "αξιολογήσεις"} συνολικά
            </span>
          </div>
        </div>

        {list.length > 1 && (
          <div className="flex flex-col gap-3">
            <p className="pl-6 text-sm font-bold text-[#3F3F46]">Ταξινόμηση ανά</p>
            <div className="overflow-x-auto pl-6 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3 w-max">
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className="flex items-center justify-center px-5 py-3 rounded-full whitespace-nowrap transition-colors"
                    style={
                      sort === key
                        ? { backgroundColor: "#52525B", border: "none" }
                        : { backgroundColor: "#FFFFFF", border: "1px solid #D4D4D8" }
                    }
                  >
                    <span
                      className="text-sm leading-tight"
                      style={{
                        fontWeight: sort === key ? 700 : 600,
                        color: sort === key ? "#FAFAFA" : "#3F3F46",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="px-6 text-[12px] text-coral-700">{error}</p>}

        <div className="flex flex-col gap-4 px-6">
          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-5xl mb-4">⭐</p>
              <p className="text-base font-semibold text-zinc-700">Καμία αξιολόγηση ακόμα</p>
              {isOwner && (
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  Βαθμολόγησε προτάσεις από άλλους — θα εμφανιστούν εδώ.
                </p>
              )}
            </div>
          ) : (
            sorted.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                isOwner={isOwner}
                onDelete={() => setDeleting(r)}
              />
            ))
          )}
        </div>
      </div>

      {deleting && (
        <ConfirmDeleteDialog
          title="Διαγραφή αξιολόγησης"
          itemTitle={deleting.item.title}
          message="Η βαθμολογία σου θα διαγραφεί. Μπορείς πάντα να ξαναβαθμολογήσεις."
          confirmLabel="Διαγραφή"
          pending={pendingDelete}
          onCancel={() => { setDeleting(null); setError(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {showDeleteSuccess && (
        <DeleteSuccessDialog
          message="Η αξιολόγηση έχει πλέον διαγραφεί από την πλατφόρμα και από το προφίλ σου"
          onClose={() => setShowDeleteSuccess(false)}
        />
      )}
    </div>
  );
}
