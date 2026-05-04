"use client";

import { useState } from "react";
import Link from "next/link";

interface SubcategoryRow {
  id: string;
  name: string;
  slug: string;
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
  const [rows, setRows] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

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

  async function saveName(id: string) {
    if (!editName.trim()) return;
    const ok = await patch(id, { name: editName.trim() });
    if (ok) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, name: editName.trim() } : x)));
      setEditingId(null);
    }
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
      alert(`Δεν διαγράφεται: ${row.itemCount} items χρησιμοποιούν αυτή τη subcategory. Ανάθεσέ τα κάπου αλλού πρώτα.`);
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
        slug: "",
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
              const isEditing = editingId === row.id;
              const isBusy = busy === row.id;

              return (
                <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-3 py-3 text-zinc-400 text-sm">{idx + 1}</td>
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName(row.id);
                            else if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="px-3 py-1 border border-emerald-400 rounded text-sm focus:outline-none focus:border-emerald-600 min-w-[280px]"
                        />
                        <button
                          onClick={() => saveName(row.id)}
                          disabled={isBusy}
                          className="text-xs text-emerald-600 font-semibold hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-800">{row.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">{row.slug}</span>
                      </div>
                    )}
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
                        onClick={() => { setEditingId(row.id); setEditName(row.name); }}
                        disabled={isBusy}
                        className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        onClick={() => deleteRow(row)}
                        disabled={isBusy || row.itemCount > 0}
                        title={row.itemCount > 0 ? `${row.itemCount} items χρησιμοποιούν αυτή τη subcategory` : "Διαγραφή"}
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
    </div>
  );
}
