"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EditSuggestionModal } from "@/components/profile/EditSuggestionModal";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";

interface Props {
  suggestion: {
    id: string;
    reflection: string | null;
    rating: number | null;
  };
  itemTitle: string;
  /** Replaces the inline community rate-card when current user is the suggester. */
  question?: string;
}

/**
 * Replaces the "rate this item" card on detail pages when the viewing user
 * is the suggester. They shouldn't be able to add a separate rating —
 * their suggestion already carries one. They get edit + delete instead.
 *
 * Reuses EditSuggestionModal (PATCH /api/suggestions/[id]) and
 * ConfirmDeleteDialog (DELETE /api/suggestions/[id]) from the profile
 * surface — same components, same APIs, same UX language.
 */
export function OwnSuggestionActions({ suggestion, itemTitle, question }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        setDeleting(false);
        return;
      }
      // Suggestion removed — bounce out of detail page since it may no
      // longer be visible (depends on whether this was the only suggestion).
      // Going back is the safest UX: the item still exists, but their
      // attachment to it is gone.
      router.back();
      router.refresh();
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="rounded-[12px] bg-white flex flex-col items-center gap-5 py-10 px-6"
        style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.18em] uppercase text-coral-600">
            <span className="w-1.5 h-1.5 rounded-full bg-coral-600" />
            Η πρότασή σου
          </span>
          <p className="text-[16px] font-semibold text-zinc-700 text-center leading-[140%] max-w-[280px]">
            {question ?? "Αυτή είναι η πρότασή σου. Μπορείς να την επεξεργαστείς ή να τη διαγράψεις."}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 h-12 rounded-[12px] flex items-center justify-center gap-2 text-white text-[15px] font-bold active:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
          >
            <Pencil size={16} strokeWidth={2.5} />
            Επεξεργασία
          </button>
          <button
            onClick={() => setConfirming(true)}
            className={cn(
              "h-12 px-5 rounded-[12px] flex items-center justify-center gap-2 text-[15px] font-bold transition-colors",
              "border-[1.5px] border-zinc-300 text-zinc-700 active:bg-zinc-50",
            )}
            aria-label="Διαγραφή πρότασης"
          >
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>

        {error && <p className="text-[12px] text-coral-700">{error}</p>}
      </div>

      {editing && (
        <EditSuggestionModal
          suggestionId={suggestion.id}
          initialReflection={suggestion.reflection ?? ""}
          initialRating={suggestion.rating ?? 0}
          itemTitle={itemTitle}
          onClose={() => setEditing(false)}
          onSaved={() => {
            // Rerun the server fetch so reflection/rating in the page reflect the edit.
            router.refresh();
          }}
        />
      )}

      {confirming && (
        <ConfirmDeleteDialog
          title="Διαγραφή πρότασης"
          itemTitle={itemTitle}
          message="Η πρόταση και η βαθμολογία σου θα διαγραφούν οριστικά. Αυτή η ενέργεια δεν αναιρείται."
          confirmLabel="Διαγραφή"
          pending={deleting}
          onCancel={() => {
            if (!deleting) setConfirming(false);
          }}
          onConfirm={performDelete}
        />
      )}
    </>
  );
}
