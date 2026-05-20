"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/constants/categories";
import { RowAuditFooter } from "@/components/admin/ui/RowAuditFooter";
import type { AdminUserMap } from "@/lib/admin/audit";

const WIDGET_LABELS: Record<string, string> = {
  "dropdown":         "Dropdown (single-select)",
  "multi-dropdown":   "Multi-Dropdown (checkbox list)",
  "search-dropdown":  "Search Dropdown (autocomplete)",
  "segmented":        "Segmented",
  "platform-cards":   "Platform Cards",
  "icon-cards":       "Icon Cards",
  "checkboxes":       "Checkboxes",
  "price-range":      "Price Range",
  "origin-cards":     "Origin Cards",
  "region-picker":    "Region Picker (two-step)",
  "awards-picker":    "Awards Picker (grouped)",
};

const WIDGET_VALUES = Object.keys(WIDGET_LABELS);

// Widgets where options array makes sense (can edit via UI)
const WIDGETS_WITH_OPTIONS = new Set(["segmented", "platform-cards", "icon-cards", "checkboxes"]);

interface FilterRow {
  id: string;
  category: string;
  filter_id: string;
  label: string;
  widget: string;
  placeholder: string | null;
  options: { id: string; label: string }[];
  is_quick: boolean;
  display_order: number;
  is_published: boolean;
  /** Audit stamps from migration 040. Optional — silently absent before
   *  migration is applied or for rows never edited. */
  modified_at?: string | null;
  modified_by?: string | null;
}

interface SettingsRow {
  category: string;
  has_nearby: boolean;
  sort_options: string[];
}

const DEFAULT_TAB = CATEGORIES[0].slug;

export function FiltersManager() {
  const [activeCategory, setActiveCategory] = useState<string>(DEFAULT_TAB);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [userMap, setUserMap] = useState<AdminUserMap>({});
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingOptionsFor, setEditingOptionsFor] = useState<FilterRow | null>(null);
  // View toggle: "config" = the user-facing filter config; "explorer" =
  // admin-only data inspector (per-attribute item counts) restored from
  // the original FiltersManager that was lost during the v2 CMS refactor.
  const [view, setView] = useState<"config" | "explorer">("config");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, sRes] = await Promise.all([
        fetch(`/api/admin/category-filters?category=${activeCategory}`),
        fetch(`/api/admin/category-filters/settings?category=${activeCategory}`),
      ]);
      const fData = await fRes.json();
      const sData = await sRes.json();
      const filterRows: FilterRow[] = Array.isArray(fData)
        ? (fData as FilterRow[])
        : Array.isArray(fData?.filters)
          ? (fData.filters as FilterRow[])
          : [];
      setFilters(filterRows);
      setUserMap((fData?.userMap ?? {}) as AdminUserMap);
      setSettings(sData ?? null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  async function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= filters.length) return;
    const reordered = [...filters];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setFilters(reordered);

    await fetch("/api/admin/category-filters/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeCategory, ordered_ids: reordered.map((f) => f.id) }),
    });
  }

  async function patch(row: FilterRow, body: Partial<FilterRow>) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/category-filters/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Αποτυχία");
      } else {
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: FilterRow) {
    if (!confirm(`Διαγραφή φίλτρου "${row.label}";`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/category-filters/${row.id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleHasNearby() {
    const next = !(settings?.has_nearby);
    setSettings(settings ? { ...settings, has_nearby: next } : { category: activeCategory, has_nearby: next, sort_options: [] });
    await fetch("/api/admin/category-filters/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeCategory, has_nearby: next }),
    });
  }

  const quickCount = filters.filter((f) => f.is_quick && f.is_published).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Filters</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Φίλτρα που εμφανίζονται στις σελίδες κατηγοριών — chips στο πάνω μέρος ή μέσα στο bottom-sheet panel.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* View toggle — frontend config vs admin explorer */}
      <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 mb-6">
        <button
          onClick={() => setView("config")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            view === "config" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Frontend Config
        </button>
        <button
          onClick={() => setView("explorer")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            view === "explorer" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Explorer
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveCategory(c.slug)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeCategory === c.slug
                ? "text-zinc-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {c.icon} {c.labelEl}
          </button>
        ))}
      </div>

      {view === "explorer" ? (
        <FiltersExplorer category={activeCategory} />
      ) : (
      <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
        {/* List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-700">{filters.length}</strong> φίλτρα ·{" "}
              <strong className="text-zinc-700">{quickCount}</strong> ως chip
            </p>
            <button
              onClick={() => setAdding(true)}
              className="text-xs px-2.5 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800"
            >
              + Νέο φίλτρο
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[60px] border border-zinc-200 rounded-lg bg-zinc-50 animate-pulse" />
              ))}
            </div>
          ) : filters.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {filters.map((row, idx) => (
                <FilterRowItem
                  key={row.id}
                  row={row}
                  userMap={userMap}
                  isFirst={idx === 0}
                  isLast={idx === filters.length - 1}
                  busy={busyId === row.id}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, +1)}
                  onToggleQuick={() => patch(row, { is_quick: !row.is_quick })}
                  onTogglePublish={() => patch(row, { is_published: !row.is_published })}
                  onLabelChange={(label) => label !== row.label && patch(row, { label })}
                  onRemove={() => remove(row)}
                  onEditOptions={() => setEditingOptionsFor(row)}
                />
              ))}
            </div>
          )}
        </div>

        {adding && (
          <NewFilterDialog
            category={activeCategory}
            existingIds={new Set(filters.map((f) => f.filter_id))}
            onClose={() => setAdding(false)}
            onCreated={async () => { setAdding(false); await load(); }}
          />
        )}

        {editingOptionsFor && (
          <OptionsEditor
            row={editingOptionsFor}
            onClose={() => setEditingOptionsFor(null)}
            onSaved={async () => { setEditingOptionsFor(null); await load(); }}
          />
        )}

        {/* Right rail — settings + preview */}
        <div className="sticky top-6 self-start space-y-4">
          <div className="border border-zinc-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-zinc-800 mb-3">Ρυθμίσεις</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings?.has_nearby}
                onChange={toggleHasNearby}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-zinc-700">📍 Κουμπί "Κοντά μου"</span>
            </label>
            <p className="text-xs text-zinc-500 mt-1.5 pl-6">
              Δείχνει το κουμπί proximity δίπλα στα chips.
            </p>
          </div>

          {/* Phone preview */}
          <PhonePreview filters={filters} hasNearby={!!settings?.has_nearby} />
        </div>
      </div>
      )}
    </div>
  );
}

/* ─── Filters Explorer ──────────────────────────────────────── */

interface ExplorerCounts {
  total: number;
  subcategories: { id: string; slug: string; name: string; count: number }[];
  regions: { id: string; name: string; count: number }[];
}

function FiltersExplorer({ category }: { category: string }) {
  const [data, setData] = useState<ExplorerCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/filters/counts?category=${encodeURIComponent(category)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) setErr(d.error ?? "Σφάλμα");
        else setData(d as ExplorerCounts);
      })
      .catch((e) => { if (!cancelled) setErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  function recommend(count: number): { card: boolean; carousel: boolean; tip: string } {
    if (count > 10) return { card: true, carousel: false, tip: "Άρκετα για Card" };
    if (count >= 4) return { card: false, carousel: true, tip: "Carousel μέγεθος" };
    return { card: false, carousel: false, tip: "Πολύ λίγα — όχι ορατό" };
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Φόρτωση...</div>;
  }
  if (err) {
    return <div className="text-sm text-red-600">{err}</div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Total */}
      <div className="flex items-center gap-3 px-5 py-4 bg-zinc-50 rounded-xl border border-zinc-200">
        <span className="text-3xl font-bold text-zinc-800 leading-none">{data.total}</span>
        <span className="text-sm text-zinc-600">δημοσιευμένες προτάσεις σε αυτή την κατηγορία</span>
      </div>

      {/* Subcategories */}
      <div>
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-3">
          Subcategories <span className="text-zinc-400 font-normal normal-case">— ποιες έχουν αρκετά για να βγουν σε Card/Carousel</span>
        </h2>
        {data.subcategories.length === 0 ? (
          <p className="text-xs text-zinc-500">Καμία subcategory με δημοσιευμένα items.</p>
        ) : (
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase">Subcategory</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 uppercase">Items</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {data.subcategories.map((s) => {
                  const rec = recommend(s.count);
                  return (
                    <tr key={s.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-4 py-2.5 text-sm text-zinc-800">{s.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold text-zinc-700">{s.count}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            rec.card ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                          }`}>{rec.card ? "✓ Card" : "Card"}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            rec.carousel ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                          }`}>{rec.carousel ? "✓ Carousel" : "Carousel"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regions (venues only — empty array for non-venues) */}
      {data.regions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-3">
            Regions <span className="text-zinc-400 font-normal normal-case">— πού συγκεντρώνονται</span>
          </h2>
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase">Region</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 uppercase">Items</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {data.regions.slice(0, 12).map((r) => {
                  const rec = recommend(r.count);
                  return (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-4 py-2.5 text-sm text-zinc-800">{r.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold text-zinc-700">{r.count}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-[11px] text-zinc-500">{rec.tip}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.regions.length > 12 && (
              <div className="px-4 py-2 bg-zinc-50 text-[11px] text-zinc-500 text-center">
                +{data.regions.length - 12} ακόμα regions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Row ──────────────────────────────────────────────────── */

function FilterRowItem({ row, userMap, isFirst, isLast, busy, onMoveUp, onMoveDown, onToggleQuick, onTogglePublish, onLabelChange, onRemove, onEditOptions }: {
  row: FilterRow;
  userMap: AdminUserMap;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleQuick: () => void;
  onTogglePublish: () => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
  onEditOptions: () => void;
}) {
  const canEditOptions = WIDGETS_WITH_OPTIONS.has(row.widget);
  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
      row.is_published ? "border-zinc-200 hover:border-zinc-300 bg-white" : "border-zinc-200 bg-zinc-50 opacity-70"
    }`}>
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={isFirst} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed" aria-label="Πάνω">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed" aria-label="Κάτω">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </div>

      {/* ID + label edit */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-100">
            {row.filter_id}
          </span>
          <span className="text-[10px] font-bold uppercase text-zinc-400">
            {WIDGET_LABELS[row.widget] ?? row.widget}
          </span>
          {canEditOptions && (
            <button
              onClick={onEditOptions}
              className="text-[10px] text-coral-600 hover:underline"
            >
              {row.options?.length ?? 0} options · edit
            </button>
          )}
          {!canEditOptions && row.options?.length > 0 && (
            <span className="text-[10px] text-zinc-400">{row.options.length} options</span>
          )}
        </div>
        <input
          type="text"
          defaultValue={row.label}
          onBlur={(e) => onLabelChange(e.target.value.trim())}
          className="w-full px-2 py-1 text-sm font-medium text-zinc-800 bg-transparent border border-transparent rounded hover:bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-300"
        />
        {row.modified_at && (
          <div className="px-2 mt-0.5">
            <RowAuditFooter
              modifiedAt={row.modified_at}
              modifiedById={row.modified_by}
              userMap={userMap}
            />
          </div>
        )}
      </div>

      {/* Quick toggle */}
      <button
        onClick={onToggleQuick}
        disabled={busy}
        className={`text-xs px-2.5 py-1 rounded inline-flex items-center gap-1 transition-colors ${
          row.is_quick
            ? "bg-coral-50 text-coral-700 border border-coral-200"
            : "text-zinc-500 hover:bg-zinc-100 border border-transparent"
        }`}
      >
        {row.is_quick ? "✓ chip" : "panel only"}
      </button>

      {/* Publish toggle */}
      <button
        onClick={onTogglePublish}
        disabled={busy}
        className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1.5 ${
          row.is_published ? "text-emerald-700 hover:bg-emerald-50" : "text-zinc-400 hover:bg-zinc-100"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${row.is_published ? "bg-emerald-500" : "bg-zinc-300"}`} />
        {row.is_published ? "Ενεργό" : "Κρυφό"}
      </button>

      {/* Delete */}
      <button onClick={onRemove} disabled={busy} className="text-xs text-red-500 hover:text-red-700 px-1.5">
        ✕
      </button>
    </div>
  );
}

/* ─── Phone preview ────────────────────────────────────────── */

function PhonePreview({ filters, hasNearby }: { filters: FilterRow[]; hasNearby: boolean }) {
  const quickFilters = filters.filter((f) => f.is_quick && f.is_published);
  const panelFilters = filters.filter((f) => f.is_published);

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2 px-1">Προεπισκόπηση</p>
      <div className="border-[8px] border-zinc-800 rounded-[36px] overflow-hidden bg-white shadow-xl">
        <div className="h-[400px] overflow-y-auto bg-white">
          <div className="px-3 pt-3 pb-2 border-b border-zinc-100">
            <span className="text-xs font-black text-zinc-800">
              Proteino<span className="text-[#FE6F5E]">.</span>
            </span>
          </div>

          <div className="p-3">
            {/* Quick filter chips */}
            <div className="flex gap-1.5 overflow-hidden mb-3">
              <span className="px-2 py-1 rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-700 whitespace-nowrap">
                ⊞ Filters · {panelFilters.length}
              </span>
              {quickFilters.map((f) => (
                <span key={f.id} className="px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-[10px] font-medium text-zinc-700 whitespace-nowrap">
                  {f.label} ▾
                </span>
              ))}
              {hasNearby && (
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-[10px] font-medium text-emerald-700 whitespace-nowrap">
                  📍 Κοντά
                </span>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 italic mb-2">Bottom-sheet panel:</p>
            <div className="space-y-1.5">
              {panelFilters.length === 0 && (
                <p className="text-[11px] text-zinc-400 italic">Καμία ρύθμιση φίλτρου.</p>
              )}
              {panelFilters.map((f) => (
                <div key={f.id} className="px-2.5 py-1.5 border border-zinc-200 rounded text-[11px]">
                  <span className="text-zinc-700 font-medium">{f.label}</span>
                  {f.is_quick && <span className="text-[9px] text-coral-600 ml-1">●chip</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-zinc-300 rounded-xl py-10 px-6 text-center">
      <div className="text-3xl mb-2">🔍</div>
      <h3 className="text-sm font-semibold text-zinc-800 mb-1">Κανένα φίλτρο σε αυτή την κατηγορία</h3>
      <p className="text-xs text-zinc-500">
        Τα default φίλτρα φορτώνονται όταν τρέξει το <code className="px-1 bg-zinc-100 rounded">008-category-filters.sql</code>.
      </p>
    </div>
  );
}

/* ── New filter dialog ──────────────────────────────────────── */

function NewFilterDialog({ category, existingIds, onClose, onCreated }: {
  category: string;
  existingIds: Set<string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [filterId, setFilterId] = useState("");
  const [label, setLabel] = useState("");
  const [widget, setWidget] = useState("dropdown");
  const [placeholder, setPlaceholder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const id = filterId.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!id) { setError("filter_id required"); return; }
    if (existingIds.has(id)) { setError("Υπάρχει ήδη φίλτρο με αυτό το id."); return; }
    if (!label.trim()) { setError("Label required"); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/category-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          filter_id: id,
          label: label.trim(),
          widget,
          placeholder: placeholder.trim() || null,
          options: [],
          is_quick: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-800">Νέο φίλτρο</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Filter ID (slug)</label>
            <input
              type="text"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              placeholder="genre, platform, region..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400"
            />
            <p className="text-xs text-zinc-500 mt-1">Μοναδικό ανά κατηγορία. Πεζά + underscore.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Κατηγορία"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Widget</label>
            <select
              value={widget}
              onChange={(e) => setWidget(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
            >
              {WIDGET_VALUES.map((w) => (
                <option key={w} value={w}>{WIDGET_LABELS[w]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Placeholder (προαιρετικό)</label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="π.χ. Διάλεξε σκηνοθέτη"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800">Άκυρο</button>
            <button
              onClick={save}
              disabled={busy}
              className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy ? "..." : "Δημιουργία"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Options editor (for segmented / cards / checkboxes) ──── */

function OptionsEditor({ row, onClose, onSaved }: {
  row: FilterRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>(
    Array.isArray(row.options) ? row.options : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOption() {
    setOptions([...options, { id: "", label: "" }]);
  }
  function setOption(i: number, key: "id" | "label", value: string) {
    const next = [...options];
    next[i] = { ...next[i], [key]: value };
    setOptions(next);
  }
  function removeOption(i: number) {
    setOptions(options.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const next = i + dir;
    if (next < 0 || next >= options.length) return;
    const arr = [...options];
    [arr[i], arr[next]] = [arr[next], arr[i]];
    setOptions(arr);
  }

  async function save() {
    setError(null);
    const cleaned = options
      .map((o) => ({ id: o.id.trim(), label: o.label.trim() }))
      .filter((o) => o.id && o.label);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/category-filters/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: cleaned }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Αποτυχία");
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-800">Options — {row.label}</h3>
            <p className="text-xs text-zinc-500">{WIDGET_LABELS[row.widget]}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2 mb-4">
            {options.length === 0 && (
              <p className="text-sm text-zinc-500 italic">Καμία επιλογή ακόμη.</p>
            )}
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="w-5 h-5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30">▲</button>
                  <button onClick={() => move(i, +1)} disabled={i === options.length - 1} className="w-5 h-5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30">▼</button>
                </div>
                <input
                  type="text"
                  value={opt.id}
                  onChange={(e) => setOption(i, "id", e.target.value)}
                  placeholder="id"
                  className="w-28 px-2 py-1.5 border border-zinc-200 rounded text-sm font-mono focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => setOption(i, "label", e.target.value)}
                  placeholder="Label"
                  className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400"
                />
                <button onClick={() => removeOption(i)} className="text-red-500 hover:text-red-700 text-sm px-1">✕</button>
              </div>
            ))}
          </div>

          <button
            onClick={addOption}
            className="text-xs text-zinc-700 border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50"
          >
            + Προσθήκη επιλογής
          </button>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-zinc-200">
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800">Άκυρο</button>
            <button
              onClick={save}
              disabled={busy}
              className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy ? "..." : "Αποθήκευση"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
