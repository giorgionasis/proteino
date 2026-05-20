"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import type { ResolvedCategory } from "@/lib/categories-meta";
import { useToast } from "@/components/ui/Toast";

interface CategoryRow extends ResolvedCategory {
  subcategories: number;
  items: number;
  suggestions: number;
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function CategoriesTable() {
  const { show } = useToast();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const supabase = getSupabase();

    const [catsRes, subcatsRes, itemsRes, suggestionsRes] = await Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      supabase.from("subcategories").select("category"),
      supabase.from("items").select("category"),
      supabase.from("suggestions").select("id, items!inner(category)"),
    ]);

    const subcatCounts: Record<string, number> = {};
    (subcatsRes.data || []).forEach((r: any) => {
      subcatCounts[r.category] = (subcatCounts[r.category] || 0) + 1;
    });

    const itemCounts: Record<string, number> = {};
    (itemsRes.data || []).forEach((r: any) => {
      itemCounts[r.category] = (itemCounts[r.category] || 0) + 1;
    });

    const suggestionCounts: Record<string, number> = {};
    (suggestionsRes.data || []).forEach((r: any) => {
      const cat = r.items?.category;
      if (cat) suggestionCounts[cat] = (suggestionCounts[cat] || 0) + 1;
    });

    const cats: ResolvedCategory[] = Array.isArray(catsRes?.categories) ? catsRes.categories : [];
    setRows(cats.map((c) => ({
      ...c,
      subcategories: subcatCounts[c.slug] || 0,
      items: itemCounts[c.slug] || 0,
      suggestions: suggestionCounts[c.slug] || 0,
    })));
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, []);

  async function moveRow(slug: string, direction: -1 | 1) {
    const idx = rows.findIndex((r) => r.slug === slug);
    if (idx === -1) return;
    const swap = idx + direction;
    if (swap < 0 || swap >= rows.length) return;
    const a = rows[idx];
    const b = rows[swap];
    const newRows = [...rows];
    newRows[idx] = b;
    newRows[swap] = a;
    setRows(newRows);
    // Renumber as i*10 — leaves gaps for future inserts without rewrite churn.
    const orders = newRows.map((r, i) => ({ slug: r.slug, display_order: (i + 1) * 10 }));
    const res = await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) {
      show("Αποτυχία reorder", { tone: "error" });
      await loadAll();
    }
  }

  async function toggleVisible(slug: string, next: boolean) {
    setBusy(slug);
    const res = await fetch(`/api/admin/categories/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_nav_published: next }),
    });
    setBusy(null);
    if (!res.ok) {
      const e = await res.json();
      show(e.error ?? "Σφάλμα", { tone: "error" });
      return;
    }
    setRows((r) => r.map((x) => x.slug === slug ? { ...x, isNavPublished: next } : x));
  }

  async function saveEdit(slug: string, next: { labelEl: string; icon: string }): Promise<boolean> {
    setBusy(slug);
    const res = await fetch(`/api/admin/categories/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_label_el: next.labelEl.trim(),
        icon: next.icon.trim(),
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const e = await res.json();
      show(e.error ?? "Σφάλμα", { tone: "error" });
      return false;
    }
    setRows((r) => r.map((x) => x.slug === slug ? { ...x, labelEl: next.labelEl, icon: next.icon } : x));
    setEditing(null);
    show("Αποθηκεύτηκε", { tone: "success" });
    return true;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Categories</h1>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Slugs + capability flags (map/trailer/delivery/…) είναι hardcoded στο{" "}
        <code className="px-1 py-0.5 bg-zinc-100 rounded text-[11px]">constants/categories.ts</code>{" "}
        γιατί συνδέονται με routes και component composition. Από εδώ αλλάζεις
        ετικέτα · icon · σειρά · ορατότητα στα home tiles.
      </p>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-3 py-3 w-12" />
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Subs</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Items</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nav</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.slug} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors group">
                <td className="px-3 py-4 text-center">
                  <div className="inline-flex flex-col">
                    <button
                      onClick={() => moveRow(row.slug, -1)}
                      disabled={idx === 0 || busy !== null}
                      className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 text-xs leading-none"
                      aria-label="Πάνω"
                    >▲</button>
                    <button
                      onClick={() => moveRow(row.slug, 1)}
                      disabled={idx === rows.length - 1 || busy !== null}
                      className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 text-xs leading-none"
                      aria-label="Κάτω"
                    >▼</button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-lg">
                      {row.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-800">{row.labelEl}</span>
                      <span className="text-[11px] text-zinc-400 font-mono">{row.slug}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.subcategories}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.items}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.suggestions}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleVisible(row.slug, !row.isNavPublished)}
                    disabled={busy === row.slug}
                    className={`w-9 h-5 rounded-full relative transition-colors ${row.isNavPublished ? "bg-emerald-500" : "bg-zinc-300"}`}
                    aria-label={row.isNavPublished ? "Hide from nav" : "Show in nav"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${row.isNavPublished ? "left-[18px]" : "left-0.5"}`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button
                    onClick={() => setEditing(row)}
                    className="text-sm text-zinc-500 hover:text-zinc-800"
                  >
                    Edit
                  </button>
                  <Link href={`/admin/categories/${row.slug}`} className="text-sm text-zinc-500 hover:text-zinc-700">
                    Υποκατηγορίες →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryEditor
          row={editing}
          onCancel={() => setEditing(null)}
          onSave={(next) => saveEdit(editing.slug, next)}
        />
      )}
    </div>
  );
}

/** Small modal-style drawer for editing label + icon. Slug + capability
 *  flags stay locked — see header copy on the table for the rationale. */
function CategoryEditor({
  row,
  onCancel,
  onSave,
}: {
  row: ResolvedCategory;
  onCancel: () => void;
  onSave: (next: { labelEl: string; icon: string }) => Promise<boolean>;
}) {
  const [labelEl, setLabelEl] = useState(row.labelEl);
  const [icon, setIcon]       = useState(row.icon);
  const [saving, setSaving]   = useState(false);

  async function submit() {
    if (!labelEl.trim()) return;
    if (!icon.trim()) return;
    setSaving(true);
    const ok = await onSave({ labelEl, icon });
    setSaving(false);
    if (!ok) return;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-zinc-900">Επεξεργασία κατηγορίας</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">
              Slug <span className="font-normal normal-case text-[10px] text-zinc-400">(locked — route-coupled)</span>
            </label>
            <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded text-sm text-zinc-700 font-mono">
              {row.slug}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">
              Ετικέτα (ελληνικά)
            </label>
            <input
              type="text"
              value={labelEl}
              onChange={(e) => setLabelEl(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded text-sm focus:outline-none focus:border-coral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">
              Icon (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="w-full px-3 py-2 border border-zinc-200 rounded text-2xl focus:outline-none focus:border-coral-400 text-center"
            />
          </div>

          <div className="text-[11px] text-zinc-500 bg-amber-50 border border-amber-200 rounded p-2.5 leading-relaxed">
            <strong>Σημείωση:</strong> Το slug ({row.slug}), και οι capability flags
            (hasMap/hasTrailer/hasDelivery/…) μένουν στο{" "}
            <code className="px-1 bg-white rounded">constants/categories.ts</code>.
            Άλλαξέ τα μόνο μέσω code change — εμπλέκουν routes και component composition.
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded"
          >Άκυρο</button>
          <button
            onClick={submit}
            disabled={saving || !labelEl.trim() || !icon.trim()}
            className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-800 disabled:opacity-40"
          >{saving ? "Αποθήκευση..." : "Αποθήκευση"}</button>
        </div>
      </div>
    </div>
  );
}
