"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface SubcategoryRow {
  id: string;
  name: string;
  slug: string;
  descriptionSeo: string | null;
  isPublished: boolean;
  displayOrder: number;
  itemCount: number;
}

interface Stats {
  totalSubcategories: number;
  totalItems: number;
  totalSuggestions: number;
  distinctUsers: number;
  nullSubcatItems: number;
}

interface Props {
  categoryId: string;
  categoryName: string;
  subcategories: SubcategoryRow[];
  stats: Stats;
}

export function CategoryDetail({ categoryId, categoryName, subcategories: initial, stats }: Props) {
  const { show, toast } = useToast();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<SubcategoryRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [reassignFor, setReassignFor] = useState<SubcategoryRow | null>(null);

  async function patch(id: string, patch: Record<string, any>) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/subcategories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(null);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || "Σφάλμα");
      return false;
    }
    return true;
  }

  async function saveEdit(
    id: string,
    next: { name: string; slug: string; descriptionSeo: string | null },
  ): Promise<boolean> {
    const ok = await patch(id, {
      name: next.name,
      slug: next.slug,
      description_seo: next.descriptionSeo,
    });
    if (ok) {
      setRows((r) =>
        r.map((x) =>
          x.id === id
            ? { ...x, name: next.name, slug: next.slug, descriptionSeo: next.descriptionSeo }
            : x,
        ),
      );
      setEditing(null);
      show("Αποθηκεύτηκε", { tone: "success" });
    }
    return ok;
  }

  async function togglePublished(row: SubcategoryRow) {
    const ok = await patch(row.id, { is_published: !row.isPublished });
    if (ok) {
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, isPublished: !row.isPublished } : x)));
    }
  }

  async function move(id: string, direction: "up" | "down") {
    const idx = rows.findIndex((r) => r.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= rows.length) return;

    const a = rows[idx];
    const b = rows[swapWith];
    setBusy(id);

    // Swap display_order in DB
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/subcategories/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: b.displayOrder }),
      }),
      fetch(`/api/admin/subcategories/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: a.displayOrder }),
      }),
    ]);
    setBusy(null);
    if (!r1.ok || !r2.ok) {
      setError("Failed to reorder");
      return;
    }

    // Swap locally
    const next = [...rows];
    next[idx] = { ...b, displayOrder: a.displayOrder };
    next[swapWith] = { ...a, displayOrder: b.displayOrder };
    setRows(next);
  }

  async function deleteRow(row: SubcategoryRow) {
    if (row.itemCount > 0) {
      setReassignFor(row);
      return;
    }
    if (!confirm(`Διαγραφή "${row.name}";`)) return;
    setBusy(row.id);
    const res = await fetch(`/api/admin/subcategories/${row.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || "Σφάλμα διαγραφής");
      return;
    }
    setRows((r) => r.filter((x) => x.id !== row.id));
  }

  async function reassignAndDelete(source: SubcategoryRow, targetId: string) {
    setBusy(source.id);
    setError(null);
    try {
      const rRes = await fetch(`/api/admin/subcategories/${source.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (!rRes.ok) {
        const e = await rRes.json();
        setError(e.error || "Reassign failed");
        return;
      }
      const { reassigned } = await rRes.json();

      const dRes = await fetch(`/api/admin/subcategories/${source.id}`, { method: "DELETE" });
      if (!dRes.ok) {
        const e = await dRes.json();
        setError(e.error || "Delete failed");
        return;
      }

      // Local state: drop source, bump target's count by what we just moved.
      setRows((r) =>
        r
          .filter((x) => x.id !== source.id)
          .map((x) =>
            x.id === targetId ? { ...x, itemCount: x.itemCount + (reassigned ?? 0) } : x,
          ),
      );
      setReassignFor(null);
      show(
        `Μεταφέρθηκαν ${reassigned ?? 0} items στο "${rows.find((r) => r.id === targetId)?.name ?? "target"}" και διαγράφηκε το "${source.name}".`,
        { tone: "success" },
      );
    } finally {
      setBusy(null);
    }
  }

  async function createNew() {
    if (!newName.trim()) return;
    setBusy("__new__");
    setError(null);
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: categoryId, name: newName.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || "Σφάλμα");
      return;
    }
    const created = await res.json();
    // Re-fetch with full data shape (we need slug, display_order, isPublished)
    setRows((r) => [
      ...r,
      {
        id: created.id,
        name: created.name,
        slug: created.slug ?? "",
        descriptionSeo: null,
        isPublished: true,
        displayOrder: r.length > 0 ? Math.max(...r.map((x) => x.displayOrder)) + 1 : 0,
        itemCount: 0,
      },
    ]);
    setNewName("");
    setCreating(false);
  }

  const statsCards = [
    { value: stats.totalSubcategories, label: "SUBCATEGORIES" },
    { value: stats.totalItems, label: "ITEMS" },
    { value: stats.totalSuggestions, label: "SUGGESTIONS" },
    { value: stats.distinctUsers, label: "USERS" },
    { value: stats.nullSubcatItems, label: "UNASSIGNED" },
  ];

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/categories" className="text-emerald-600 hover:underline font-medium">
            Categories
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-800 font-bold text-2xl">{categoryName}</span>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Subcategory
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        {statsCards.map((s) => (
          <div key={s.label} className="flex-1 border border-zinc-200 rounded-lg px-5 py-4">
            <p className="text-2xl font-bold text-zinc-800">{s.value}</p>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.nullSubcatItems > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <p className="text-sm text-amber-900">
            <strong>{stats.nullSubcatItems}</strong> items σε αυτή την κατηγορία δεν έχουν subcategory.
          </p>
          <Link href="/admin/data-quality" className="text-sm font-semibold text-amber-900 hover:underline">
            Διαχείριση →
          </Link>
        </div>
      )}

      {/* Subcategories table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase w-10">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Subcategory</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Items</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Published</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="border-b border-emerald-200 bg-emerald-50/50">
                <td className="px-3 py-3 text-zinc-400">+</td>
                <td className="px-6 py-3" colSpan={4}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createNew();
                        else if (e.key === "Escape") { setCreating(false); setNewName(""); }
                      }}
                      autoFocus
                      placeholder="Όνομα νέας subcategory"
                      className="px-3 py-1.5 border border-emerald-400 rounded text-sm focus:outline-none focus:border-emerald-600 min-w-[280px]"
                    />
                    <button
                      onClick={createNew}
                      disabled={!newName.trim() || busy === "__new__"}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Δημιουργία
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewName(""); }}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      Άκυρο
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {rows.length === 0 && !creating && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-400">
                  Καμία subcategory ακόμα. Πάτα "New Subcategory" για να ξεκινήσεις.
                </td>
              </tr>
            )}

            {rows.map((row, idx) => {
              const isBusy = busy === row.id;

              return (
                <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-3 py-3 text-zinc-400 text-sm">{idx + 1}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-800">{row.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">{row.slug}</span>
                      {row.descriptionSeo && (
                        <span className="text-[10px] uppercase text-emerald-600 font-semibold tracking-wide">
                          · SEO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-zinc-600">{row.itemCount}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => togglePublished(row)}
                      disabled={isBusy}
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        row.isPublished ? "text-emerald-600" : "text-zinc-400"
                      } hover:opacity-75 disabled:opacity-50`}
                    >
                      <span className={`w-2 h-2 rounded-full ${row.isPublished ? "bg-emerald-500" : "bg-zinc-300"}`} />
                      {row.isPublished ? "Ενεργή" : "Ανενεργή"}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => move(row.id, "up")}
                        disabled={idx === 0 || isBusy}
                        title="Move up"
                        className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 rounded disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(row.id, "down")}
                        disabled={idx === rows.length - 1 || isBusy}
                        title="Move down"
                        className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 rounded disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => setEditing(row)}
                        disabled={isBusy}
                        className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        onClick={() => deleteRow(row)}
                        disabled={isBusy}
                        title={row.itemCount > 0 ? `${row.itemCount} items — θα ζητηθεί reassign` : "Διαγραφή"}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-30"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reassignFor && (
        <ReassignDialog
          source={reassignFor}
          candidates={rows.filter((r) => r.id !== reassignFor.id)}
          busy={busy === reassignFor.id}
          onClose={() => setReassignFor(null)}
          onConfirm={(targetId) => reassignAndDelete(reassignFor, targetId)}
        />
      )}

      {editing && (
        <SubcategoryEditor
          row={editing}
          busy={busy === editing.id}
          onClose={() => setEditing(null)}
          onSave={(next) => saveEdit(editing.id, next)}
        />
      )}

      {toast}
    </div>
  );
}

/* ── Reassign-and-delete dialog ───────────────────────────────── */

function ReassignDialog({
  source,
  candidates,
  busy,
  onClose,
  onConfirm,
}: {
  source: SubcategoryRow;
  candidates: SubcategoryRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (targetId: string) => void;
}) {
  const [targetId, setTargetId] = useState<string>(candidates[0]?.id ?? "");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-800">Reassign + Διαγραφή</h3>
          <button
            onClick={busy ? undefined : onClose}
            disabled={busy}
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-700">
            <strong>{source.itemCount}</strong> items χρησιμοποιούν τη subcategory{" "}
            <strong>"{source.name}"</strong>. Διάλεξε πού θα μεταφερθούν πριν τη
            διαγραφή.
          </p>

          {candidates.length === 0 ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              Δεν υπάρχει άλλη subcategory σε αυτή την κατηγορία. Δημιούργησε μια
              νέα πρώτα ή ανάθεσε τα items χειροκίνητα.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Target subcategory
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400 disabled:opacity-50"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.itemCount > 0 ? `· ${c.itemCount} items` : "· κενή"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1.5">
                Όλα τα {source.itemCount} items θα μεταφερθούν εκεί και η{" "}
                <span className="font-mono">{source.slug || source.name}</span> θα
                διαγραφεί.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 disabled:opacity-50"
            >
              Άκυρο
            </button>
            <button
              onClick={() => targetId && onConfirm(targetId)}
              disabled={busy || !targetId || candidates.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40"
            >
              {busy ? "Μεταφορά…" : "Reassign + Διαγραφή"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Full subcategory editor ──────────────────────────────────── */

const GREEK_TO_LATIN: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
  ά: "a", έ: "e", ή: "i", ί: "i", ό: "o", ύ: "y", ώ: "o", ϊ: "i", ϋ: "y",
  ΐ: "i", ΰ: "y",
};

function slugifyClient(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => GREEK_TO_LATIN[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SubcategoryEditor({
  row,
  busy,
  onClose,
  onSave,
}: {
  row: SubcategoryRow;
  busy: boolean;
  onClose: () => void;
  onSave: (next: { name: string; slug: string; descriptionSeo: string | null }) => Promise<boolean>;
}) {
  const [name, setName] = useState(row.name);
  const [slug, setSlug] = useState(row.slug);
  const [descriptionSeo, setDescriptionSeo] = useState(row.descriptionSeo ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const trimmedSeo = descriptionSeo.trim();
  const dirty =
    trimmedName !== row.name ||
    trimmedSlug !== row.slug ||
    trimmedSeo !== (row.descriptionSeo ?? "");
  const canSave = !busy && dirty && trimmedName.length > 0 && trimmedSlug.length > 0;

  async function handleSave() {
    setLocalError(null);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setLocalError("Το slug πρέπει να είναι πεζά + αριθμοί + παύλες (π.χ. mystery-thriller).");
      return;
    }
    await onSave({
      name: trimmedName,
      slug: trimmedSlug,
      descriptionSeo: trimmedSeo === "" ? null : trimmedSeo,
    });
  }

  function regenerateSlug() {
    const next = slugifyClient(trimmedName || row.name);
    setSlug(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-800">Επεξεργασία subcategory</h3>
            <p className="text-xs text-zinc-500">{row.itemCount} items σε αυτή τη subcategory</p>
          </div>
          <button
            onClick={busy ? undefined : onClose}
            disabled={busy}
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {localError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {localError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Όνομα</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoFocus
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Πώς εμφανίζεται στις σελίδες κατηγοριών (ελληνικά).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-700">Slug</label>
              <button
                type="button"
                onClick={regenerateSlug}
                disabled={busy}
                className="text-[11px] text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
              >
                ↻ Δημιουργία από όνομα
              </button>
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Χρησιμοποιείται στα URL της κατηγορίας. Πεζά + αριθμοί + παύλες. Πρέπει να
              είναι μοναδικό μέσα σε αυτή την κατηγορία.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Περιγραφή SEO <span className="text-zinc-400 font-normal">(προαιρετικό)</span>
            </label>
            <textarea
              value={descriptionSeo}
              onChange={(e) => setDescriptionSeo(e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="Σύντομη περιγραφή για search engines + κορυφή σελίδας."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-zinc-500 mt-1">
              ~150-160 χαρακτήρες προτεινόμενα. Κενό = καμία.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 disabled:opacity-50"
            >
              Άκυρο
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy ? "Αποθήκευση…" : "Αποθήκευση"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
