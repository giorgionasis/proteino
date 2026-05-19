"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RowMenu } from "@/components/profile/RowMenu";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";
import { useToast } from "@/components/ui/Toast";
import { statusChipLabel } from "@/lib/bookmarks/labels";
import type { BookmarkStatus } from "@/hooks/useBookmark";
import { ProfilePoster } from "@/components/profile/shared/ProfilePoster";
import { isPortraitCategory } from "@/components/category/CategoryCard";
import type { CategorySlug } from "@/types";

export interface BookmarkedItem {
  id: string;
  itemId: string;
  category: string;
  status: BookmarkStatus;
  title: string;
  cover_url: string | null;
  avg_rating: number;
  rating_count: number;
  href: string;
}

interface Props {
  handle: string;
  isOwnProfile: boolean;
  groups: { category: string; label: string; icon: string; items: BookmarkedItem[] }[];
  total: number;
}

type ActiveTab = Record<string, BookmarkStatus>;

export function BookmarksCategoryPage({ handle, isOwnProfile, groups: initialGroups, total: initialTotal }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [total, setTotal] = useState(initialTotal);
  const [deleting, setDeleting] = useState<BookmarkedItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show: showToast, toast } = useToast();

  // Per-category active tab. Defaults to whichever sub-list has more
  // items so the user lands on something non-empty. Empty categories
  // collapse to the wishlist tab by default.
  const initialTabs: ActiveTab = useMemo(() => {
    const t: ActiveTab = {};
    for (const g of initialGroups) {
      const wish = g.items.filter((i) => i.status === "wishlist").length;
      const done = g.items.filter((i) => i.status === "done").length;
      t[g.category] = done > wish ? "done" : "wishlist";
    }
    return t;
  }, [initialGroups]);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTabs);

  async function confirmDelete() {
    if (!deleting || pendingDelete) return;
    setPendingDelete(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookmarks?item_id=${encodeURIComponent(deleting.itemId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        return;
      }
      setGroups((g) =>
        g.map((grp) => ({ ...grp, items: grp.items.filter((i) => i.id !== deleting.id) }))
         .filter((grp) => grp.items.length > 0)
      );
      setTotal((t) => Math.max(0, t - 1));
      setDeleting(null);
      setShowDeleteSuccess(true);
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
    } finally {
      setPendingDelete(false);
    }
  }

  async function moveToStatus(b: BookmarkedItem, next: BookmarkStatus) {
    if (b.status === next) return;
    try {
      const res = await fetch("/api/bookmarks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: b.itemId, category: b.category, status: next }),
      });
      if (!res.ok) {
        setError("Δεν έγινε η μετακίνηση. Δοκίμασε ξανά.");
        return;
      }
      setGroups((gs) =>
        gs.map((grp) => ({
          ...grp,
          items: grp.items.map((i) => (i.id === b.id ? { ...i, status: next } : i)),
        }))
      );
      setActiveTab((t) => ({ ...t, [b.category]: next }));
      showToast(`Μετακινήθηκε στα ${statusChipLabel(b.category, next)} ✓`);
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
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
          {isOwnProfile ? "Τα αγαπημένα μου" : `Αγαπημένα του @${handle}`}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState isOwnProfile={isOwnProfile} />
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          <div className="px-6 pt-6 pb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">
                {total}
              </span>
              <span className="text-sm text-zinc-500">
                {total === 1 ? "αποθηκευμένη πρόταση" : "αποθηκευμένες προτάσεις"}
              </span>
            </div>
          </div>

          {error && <p className="px-6 text-[12px] text-coral-700">{error}</p>}

          {groups.map((g) => {
            const wishlistItems = g.items.filter((i) => i.status === "wishlist");
            const doneItems     = g.items.filter((i) => i.status === "done");
            const tab           = activeTab[g.category] ?? "wishlist";
            const visibleItems  = tab === "wishlist" ? wishlistItems : doneItems;

            return (
              <section key={g.category} className="space-y-3">
                <div className="flex items-center justify-between px-6">
                  <h2 className="text-[15px] font-bold text-zinc-700 uppercase tracking-[0.1px]">
                    {g.icon} {g.label}
                  </h2>
                  <span className="text-xs text-zinc-500">{g.items.length}</span>
                </div>

                {/* Sub-tabs — Wishlist | Done. Always show both even if
                    one side is empty, so the user knows the affordance
                    exists. The count after each label communicates the
                    split at a glance. */}
                <div className="px-6">
                  <div className="inline-flex rounded-[10px] bg-zinc-100 p-1 gap-1">
                    <SubTab
                      active={tab === "wishlist"}
                      label={statusChipLabel(g.category, "wishlist")}
                      count={wishlistItems.length}
                      onClick={() => setActiveTab((t) => ({ ...t, [g.category]: "wishlist" }))}
                    />
                    <SubTab
                      active={tab === "done"}
                      label={statusChipLabel(g.category, "done")}
                      count={doneItems.length}
                      onClick={() => setActiveTab((t) => ({ ...t, [g.category]: "done" }))}
                    />
                  </div>
                </div>

                {visibleItems.length === 0 ? (
                  <p className="px-6 text-[13px] text-zinc-400 italic">
                    Δεν έχεις τίποτα εδώ ακόμα.
                  </p>
                ) : (
                  <BookmarksGrid
                    items={visibleItems}
                    category={g.category as CategorySlug}
                    icon={g.icon}
                    isOwnProfile={isOwnProfile}
                    onMove={(b) =>
                      moveToStatus(b, b.status === "wishlist" ? "done" : "wishlist")
                    }
                    onDelete={(b) => setDeleting(b)}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Αφαίρεση από αγαπημένα"
          itemTitle={deleting.title}
          message="Δε θα εμφανίζεται πια στα αγαπημένα σου. Μπορείς να το ξανα-αποθηκεύσεις πάντα."
          confirmLabel="Αφαίρεση"
          pending={pendingDelete}
          onCancel={() => { setDeleting(null); setError(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {showDeleteSuccess && (
        <DeleteSuccessDialog
          title="Επιτυχής αφαίρεση"
          message="Αφαιρέθηκε από τα αγαπημένα σου. Μπορείς να το ξανα-αποθηκεύσεις πάντα."
          onClose={() => setShowDeleteSuccess(false)}
        />
      )}

      {toast}
    </div>
  );
}

/**
 * Orientation-aware grid for a single category section.
 *   - portrait categories (movies/series/books): 2-column grid, 2:3 tiles
 *   - landscape (food/bars/hotels/recipes/...): single column on mobile,
 *     2 columns on sm+ screens, 3:2 tiles. Landscape cells are wider so
 *     fitting two side-by-side on phones produces cramped 140px-wide thumbs.
 */
function BookmarksGrid({
  items,
  category,
  icon,
  isOwnProfile,
  onMove,
  onDelete,
}: {
  items: BookmarkedItem[];
  category: CategorySlug;
  icon: string;
  isOwnProfile: boolean;
  onMove: (b: BookmarkedItem) => void;
  onDelete: (b: BookmarkedItem) => void;
}) {
  const portrait = isPortraitCategory(category);
  const gridCls = portrait
    ? "grid grid-cols-2 gap-4 px-6"
    : "grid grid-cols-1 sm:grid-cols-2 gap-4 px-6";

  return (
    <div className={gridCls}>
      {items.map((b) => (
        <div key={b.id} className="relative group">
          <ProfilePoster
            category={category}
            src={b.cover_url}
            alt={b.title}
            href={b.href}
            mode="tile"
            fallbackIcon={icon}
          />
          <div className="mt-2 px-0.5">
            <Link
              href={b.href}
              className="block active:opacity-80 transition-opacity"
            >
              <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">
                {b.title}
              </p>
            </Link>
            {b.avg_rating > 0 && (
              <p className="text-[11px] mt-1 flex items-center gap-1">
                <span className="text-coral-600">★</span>
                <span className="font-semibold text-zinc-700 tabular-nums">
                  {b.avg_rating.toFixed(1)}
                </span>
                {b.rating_count > 0 && (
                  <span className="text-zinc-400 tabular-nums">({b.rating_count})</span>
                )}
              </p>
            )}
          </div>
          {isOwnProfile && (
            <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <RowMenu
                items={[
                  { label: "Δες το αντικείμενο", onClick: () => { window.location.href = b.href; } },
                  b.status === "wishlist"
                    ? { label: `Μετακίνηση στα ${statusChipLabel(b.category, "done")}`, onClick: () => onMove(b) }
                    : { label: `Μετακίνηση στα ${statusChipLabel(b.category, "wishlist")}`, onClick: () => onMove(b) },
                  { label: "Αφαίρεση από αγαπημένα", onClick: () => onDelete(b), danger: true },
                ]}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-9 px-3.5 rounded-[8px] text-[13px] font-semibold transition-all active:scale-[0.97] " +
        (active
          ? "bg-white text-zinc-900 shadow-sm"
          : "bg-transparent text-zinc-500")
      }
    >
      {label}
      <span className={"ml-1.5 text-[12px] " + (active ? "text-coral-600" : "text-zinc-400")}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-3" aria-hidden>
        {isOwnProfile ? "🔖" : "🔒"}
      </div>
      <h2 className="text-lg font-bold text-zinc-800 mb-1">
        {isOwnProfile ? "Δεν έχεις αποθηκεύσεις ακόμη" : "Ιδιωτικά αγαπημένα"}
      </h2>
      <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-5">
        {isOwnProfile
          ? "Πάτησε το 🔖 σε όποια πρόταση σε ενδιαφέρει για να την βρεις εδώ."
          : "Οι αποθηκεύσεις κάθε χρήστη είναι ορατές μόνο σε αυτόν."}
      </p>
      {isOwnProfile && (
        <Link
          href="/"
          className="inline-block px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
        >
          Εξερεύνηση
        </Link>
      )}
    </div>
  );
}
