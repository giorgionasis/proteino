"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface EditSuggestionModalProps {
  suggestionId: string;
  initialReflection: string;
  initialRating: number;
  itemTitle: string;
  onClose: () => void;
  onSaved: (next: { reflection: string; rating: number }) => void;
}

/**
 * Lightweight modal for editing an existing suggestion's reflection +
 * rating. Posts PATCH /api/suggestions/[id] on save. Used from profile
 * row menus.
 */
export function EditSuggestionModal({
  suggestionId,
  initialReflection,
  initialRating,
  itemTitle,
  onClose,
  onSaved,
}: EditSuggestionModalProps) {
  const [reflection, setReflection] = useState(initialReflection);
  const [rating, setRating] = useState(initialRating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = reflection !== initialReflection || rating !== initialRating;

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflection: reflection.trim() || null,
          rating: rating > 0 ? rating : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        return;
      }
      onSaved({ reflection: reflection.trim(), rating });
      onClose();
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div
        onClick={onClose}
        className="absolute inset-0"
        aria-hidden
      />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between h-14 px-5 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">Επεξεργασία πρότασης</h2>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors"
          >
            <X size={16} strokeWidth={2.5} className="text-zinc-700" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-1">Πρόταση για</p>
            <p className="text-sm font-bold text-zinc-900">{itemTitle}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-2">
              Η βαθμολογία σου
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => {
                const filled = s <= rating;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? 0 : s)}
                    aria-label={`${s} αστέρια`}
                    className="active:scale-95 transition-transform"
                  >
                    <Star
                      size={28}
                      strokeWidth={1.5}
                      fill={filled ? "#FE6F5E" : "transparent"}
                      stroke={filled ? "#FE6F5E" : "#a1a1aa"}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-xs text-zinc-500 tabular-nums">{rating}/5</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-2">
              Η σκέψη σου
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={5}
              placeholder="Γιατί το προτείνεις;"
              className={cn(
                "w-full resize-none",
                "bg-zinc-50 border border-zinc-200 rounded-card",
                "px-4 py-3 text-base font-medium text-zinc-800 placeholder:text-zinc-400",
                "focus:outline-none focus:border-zinc-400 transition-colors",
                "leading-relaxed"
              )}
            />
          </div>

          {error && <p className="text-[12px] text-coral-700">{error}</p>}
        </div>

        <div className="px-5 pb-5 pt-4 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-card bg-zinc-100 text-zinc-700 text-sm font-bold tracking-widest uppercase active:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            Ακύρωση
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={cn(
              "flex-1 h-11 rounded-card text-white text-sm font-bold tracking-widest uppercase transition-colors disabled:opacity-50",
              !dirty && "bg-zinc-300 cursor-not-allowed",
            )}
            style={dirty ? { background: "linear-gradient(to right, #FE6F5E, #FF9980)" } : {}}
          >
            {saving ? "Αποθήκευση..." : "Αποθήκευση"}
          </button>
        </div>
      </div>
    </div>
  );
}
