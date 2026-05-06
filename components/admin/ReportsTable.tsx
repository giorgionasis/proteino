"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface ReportRow {
  id: string;
  target_type: "comment" | "suggestion";
  target_id: string;
  reason: "inaccurate" | "fraud" | "offensive" | "other";
  description: string;
  created_at: string;
  reporter_name: string;
  reporter_handle: string;
  target_excerpt: string;
  target_item_title?: string;
  target_author_name?: string;
}

const REASON_LABEL: Record<ReportRow["reason"], string> = {
  inaccurate: "Ανακριβής/Λάθος",
  fraud:      "Απάτη",
  offensive:  "Προσβλητική",
  other:      "Άλλο",
};

const REASON_COLOR: Record<ReportRow["reason"], string> = {
  inaccurate: "bg-amber-50 text-amber-800 border-amber-200",
  fraud:      "bg-red-50 text-red-800 border-red-200",
  offensive:  "bg-orange-50 text-orange-800 border-orange-200",
  other:      "bg-zinc-50 text-zinc-700 border-zinc-200",
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short" });
}

interface Props {
  rows: ReportRow[];
}

/**
 * Admin moderation queue for content_reports.
 *
 * Each row shows: report metadata + reported content excerpt + reporter +
 * Dismiss / Hide actions (both require an admin note ≥5 chars).
 *
 * Both actions PATCH /api/admin/reports/[id]:
 *   kept   → just resolves this single report
 *   hidden → soft-hides target + auto-resolves all sibling pending reports
 *
 * After a row resolves, we optimistically remove it from the visible list.
 */
export function ReportsTable({ rows }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"kept" | "hidden" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeMenu = () => {
    setOpenFor(null);
    setPendingAction(null);
    setNote("");
    setError(null);
  };

  async function submit(reportId: string, action: "kept" | "hidden") {
    if (note.trim().length < 5) {
      setError("Η αιτιολογία πρέπει να έχει τουλάχιστον 5 χαρακτήρες.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Αποτυχία (${res.status})`);
        setSubmitting(false);
        return;
      }
      // Optimistic remove. If `hidden`, also drop sibling reports for the
      // same target (server resolved them in the same call).
      const justResolved = items.find((it) => it.id === reportId);
      if (justResolved && action === "hidden") {
        setItems((curr) =>
          curr.filter(
            (it) =>
              !(it.target_type === justResolved.target_type && it.target_id === justResolved.target_id),
          ),
        );
      } else {
        setItems((curr) => curr.filter((it) => it.id !== reportId));
      }
      closeMenu();
      router.refresh();
    } catch {
      setError("Σφάλμα δικτύου.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-semibold text-zinc-700">Καμία εκκρεμής αναφορά</p>
        <p className="text-xs text-zinc-500 mt-1">Όλες οι αναφορές έχουν διαχειριστεί.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Αναφορές</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {items.length} εκκρεμείς αναφορ{items.length === 1 ? "ά" : "ές"}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((r) => {
          const open = openFor === r.id;
          return (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-zinc-200 p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold",
                    REASON_COLOR[r.reason]
                  )}>
                    {REASON_LABEL[r.reason]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700 uppercase tracking-wider">
                    {r.target_type === "comment" ? "Σχόλιο" : "Αξιολόγηση"}
                  </span>
                  {r.target_item_title && (
                    <span className="text-[12px] text-zinc-500 truncate">
                      σε <span className="font-semibold text-zinc-700">{r.target_item_title}</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">{relativeDate(r.created_at)}</span>
              </div>

              {/* Reported content excerpt */}
              <div className="mb-3 px-4 py-3 rounded-lg bg-zinc-50 border-l-4 border-zinc-300">
                {r.target_author_name && (
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    {r.target_author_name}
                  </p>
                )}
                <p className="text-[14px] text-zinc-800 leading-relaxed line-clamp-4">
                  {r.target_excerpt}
                </p>
              </div>

              {/* Reporter context */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Αναφέρθηκε από {r.reporter_name}
                </p>
                <p className="text-[14px] text-zinc-700 leading-relaxed">{r.description}</p>
              </div>

              {/* Actions */}
              {!open && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOpenFor(r.id); setPendingAction("kept"); }}
                    className="px-4 h-9 rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 active:bg-zinc-50 transition-colors"
                  >
                    Διατήρηση
                  </button>
                  <button
                    onClick={() => { setOpenFor(r.id); setPendingAction("hidden"); }}
                    className="px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-semibold active:bg-zinc-800 transition-colors"
                  >
                    Απόκρυψη
                  </button>
                </div>
              )}

              {/* Resolution form */}
              {open && pendingAction && (
                <div className="border-t border-zinc-200 pt-4">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Αιτιολογία ({pendingAction === "kept" ? "γιατί διατηρείται" : "γιατί αποκρύπτεται"})
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={pendingAction === "kept"
                      ? "Η αναφορά εξετάστηκε αλλά η αξιολόγηση παραμένει επειδή…"
                      : "Η αξιολόγηση αποκρύπτεται επειδή…"}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 resize-none"
                    autoFocus
                  />
                  {error && <p className="mt-2 text-[12px] text-coral-700">{error}</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={closeMenu}
                      disabled={submitting}
                      className="px-4 h-9 rounded-lg text-sm font-semibold text-zinc-600 active:bg-zinc-100 disabled:opacity-50"
                    >
                      Ακύρωση
                    </button>
                    <button
                      onClick={() => submit(r.id, pendingAction)}
                      disabled={submitting}
                      className={cn(
                        "px-4 h-9 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
                        pendingAction === "kept"
                          ? "border border-zinc-300 bg-white text-zinc-700 active:bg-zinc-50"
                          : "bg-zinc-900 text-white active:bg-zinc-800",
                      )}
                    >
                      {submitting
                        ? "Αποθήκευση…"
                        : pendingAction === "kept"
                          ? "Επιβεβαίωση διατήρησης"
                          : "Επιβεβαίωση απόκρυψης"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
