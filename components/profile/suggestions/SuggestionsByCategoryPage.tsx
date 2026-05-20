"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CategorySlug } from "@/types";
import { RowMenu } from "@/components/profile/RowMenu";
import { EditSuggestionModal } from "@/components/profile/EditSuggestionModal";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";
import { ProfilePoster } from "@/components/profile/shared/ProfilePoster";
import { isPortraitCategory } from "@/components/category/CategoryCard";

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
  category,
  isOwner,
  onEdit,
  onDelete,
}: {
  suggestion: ProfileSuggestion;
  category: CategorySlug;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { item, rating, reflection, createdAt } = suggestion;
  const detailHref = `/${item.fullSlug}`;
  const portrait = isPortraitCategory(category);

  const menu = isOwner && (
    <RowMenu
      items={[
        { label: "Δες την πρόταση", onClick: () => { window.location.href = detailHref; } },
        { label: "Επεξεργασία", onClick: onEdit },
        { label: "Διαγραφή", onClick: onDelete, danger: true },
      ]}
    />
  );

  const meta = (
    <div className="flex items-center gap-2 text-[12px] text-zinc-500">
      {rating > 0 && (
        <span className="flex items-center gap-1">
          <StarIcon />
          <span className="font-semibold text-zinc-800 tabular-nums">{rating.toFixed(1)}</span>
          <span className="text-zinc-300">/</span>
          <span className="tabular-nums">5</span>
        </span>
      )}
      {rating > 0 && <span className="w-1 h-1 rounded-full bg-zinc-300" />}
      <span>{relativeDate(createdAt)}</span>
    </div>
  );

  // Portrait variant — poster left, info right (movies/series/books).
  if (portrait) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex gap-4 p-4">
          <ProfilePoster
            category={category}
            src={item.poster}
            alt={item.title}
            href={detailHref}
            mode="thumb"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <Link href={detailHref} className="block flex-1 min-w-0 active:opacity-80 transition-opacity">
                <p className="text-[15px] font-bold text-zinc-900 leading-snug line-clamp-2">{item.title}</p>
              </Link>
              {menu && <div className="shrink-0 -mr-2 -mt-1">{menu}</div>}
            </div>
            {meta}
            {reflection && (
              <p className="text-[13px] text-zinc-600 leading-relaxed line-clamp-3 mt-0.5">
                {reflection}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Landscape variant — hero on top, info below (venues / recipes / events / theater).
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <ProfilePoster
        category={category}
        src={item.poster}
        alt={item.title}
        href={detailHref}
        mode="hero"
        className="rounded-none"
      />
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={detailHref} className="block flex-1 min-w-0 active:opacity-80 transition-opacity">
            <p className="text-[17px] font-bold text-zinc-900 leading-snug line-clamp-2">{item.title}</p>
          </Link>
          {menu && <div className="shrink-0 -mr-2 -mt-1">{menu}</div>}
        </div>
        {meta}
        {reflection && (
          <p className="text-[13px] text-zinc-600 leading-relaxed line-clamp-3 mt-0.5">
            {reflection}
          </p>
        )}
      </div>
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

  const sorted = (() => {
    const arr = [...list];
    switch (sort) {
      case "high": return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "low":  return arr.sort((a, b) => (a.rating || 6) - (b.rating || 6));
      case "recent":
      default:     return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  })();

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

      <div className="flex flex-col gap-5 pb-10">
        {/* Count strip — compact, no oversized number */}
        <div className="px-6 pt-6 pb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">
              {list.length}
            </span>
            <span className="text-sm text-zinc-500">
              {list.length === 1 ? "πρόταση" : "προτάσεις"} σε <span className="font-semibold text-zinc-700">{categoryLabel}</span>
            </span>
          </div>
        </div>

        {list.length > 1 && (
          <div className="overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 w-max">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    sort === key
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
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
                category={category}
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
