"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CategorySlug } from "@/types";
import { RowMenu } from "@/components/profile/RowMenu";
import { EditSuggestionModal } from "@/components/profile/EditSuggestionModal";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";

/* ── Sort options ─────────────────────────────────────────────── */

type SortKey = "recent" | "high" | "low";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Πιο Πρόσφατες" },
  { key: "high",   label: "Υψηλ. Βαθμολ." },
  { key: "low",    label: "Χαμ. Βαθμολ." },
];

export interface ProfileSuggestion {
  id: string;
  reflection: string;
  rating: number;
  createdAt: string;
  item: {
    id: string;
    title: string;
    slug: string;
    fullSlug: string;
    poster: string | null;
    avgRating: number;
    ratingCount: number;
  };
}

interface Props {
  handle: string;
  category: CategorySlug;
  categoryLabel: string;
  isOwner: boolean;
  suggestions: ProfileSuggestion[];
}

function StarIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill="#FE6F5E" />
    </svg>
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

function SuggestionCard({
  suggestion,
  isOwner,
  onEdit,
  onDelete,
}: {
  suggestion: ProfileSuggestion;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { item, rating, reflection, createdAt } = suggestion;
  const detailHref = `/${item.fullSlug}`;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      <div className="flex gap-4 p-4">
        <Link href={detailHref} className="w-20 h-28 rounded-card overflow-hidden bg-zinc-100 shrink-0 active:opacity-80 transition-opacity">
          {item.poster ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.poster} alt="" className="w-full h-full object-cover" />
          ) : null}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={detailHref} className="block flex-1 min-w-0 active:opacity-80 transition-opacity">
              <p className="text-base font-bold text-zinc-900 leading-tight line-clamp-2">{item.title}</p>
            </Link>
            {isOwner && (
              <RowMenu
                items={[
                  { label: "Δες την πρόταση", onClick: () => { window.location.href = detailHref; } },
                  { label: "Επεξεργασία", onClick: onEdit },
                  { label: "Διαγραφή", onClick: onDelete, danger: true },
                ]}
              />
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-zinc-500">
            {rating > 0 && (
              <span className="flex items-center gap-1">
                <StarIcon />
                <span className="font-semibold text-zinc-700">{rating}/5</span>
              </span>
            )}
            <span>{relativeDate(createdAt)}</span>
          </div>
        </div>
      </div>
      {reflection && (
        <div className="px-4 pb-4">
          <p className="text-[13px] text-zinc-600 italic leading-relaxed line-clamp-3 border-l-2 border-coral-600/30 pl-3">
            {reflection}
          </p>
        </div>
      )}
    </div>
  );
}

export function SuggestionsByCategoryPage({ handle, category, categoryLabel, isOwner, suggestions }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("recent");
  const [list, setList] = useState(suggestions);
  const [editing, setEditing] = useState<ProfileSuggestion | null>(null);
  const [deleting, setDeleting] = useState<ProfileSuggestion | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...list];
    switch (sort) {
      case "high": return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "low":  return arr.sort((a, b) => (a.rating || 6) - (b.rating || 6));
      case "recent":
      default:     return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [list, sort]);

  async function confirmDelete() {
    if (!deleting || pendingDelete) return;
    setPendingDelete(true);
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        return;
      }
      setList((l) => l.filter((s) => s.id !== deleting.id));
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
          {isOwner ? "Οι προτάσεις μου" : `Προτάσεις @${handle}`}
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
              {list.length === 1 ? "πρόταση" : "προτάσεις"} σε <strong className="font-bold">{categoryLabel}</strong>
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

        {error && (
          <p className="px-6 text-[12px] text-coral-700">{error}</p>
        )}

        <div className="flex flex-col gap-4 px-6">
          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-base font-semibold text-zinc-700">Καμία πρόταση εδώ</p>
              {isOwner && (
                <p className="text-sm text-zinc-500 mt-2">
                  Πρότεινε κάτι από την κατηγορία {categoryLabel.toLowerCase()}.
                </p>
              )}
            </div>
          ) : (
            sorted.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isOwner={isOwner}
                onEdit={() => setEditing(s)}
                onDelete={() => setDeleting(s)}
              />
            ))
          )}
        </div>
      </div>

      {/* category prop reserved for future server-side sort/refetch (not yet wired) */}
      <span className="hidden">{category}</span>

      {editing && (
        <EditSuggestionModal
          suggestionId={editing.id}
          initialReflection={editing.reflection}
          initialRating={editing.rating}
          itemTitle={editing.item.title}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setList((l) => l.map((s) => s.id === editing.id ? { ...s, reflection: next.reflection, rating: next.rating } : s));
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Διαγραφή πρότασης"
          itemTitle={deleting.item.title}
          message="Η πρότασή σου θα διαγραφεί οριστικά από την πλατφόρμα."
          confirmLabel="Διαγραφή"
          pending={pendingDelete}
          onCancel={() => { setDeleting(null); setError(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {showDeleteSuccess && (
        <DeleteSuccessDialog
          message="Η πρόταση έχει πλέον διαγραφεί από την πλατφόρμα και από το προφίλ σου"
          onClose={() => setShowDeleteSuccess(false)}
        />
      )}
    </div>
  );
}
