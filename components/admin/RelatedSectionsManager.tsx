"use client";

/**
 * Admin UI for related_sections_config.
 *
 * Lists rules grouped by category. Each rule has inline editing for
 * title_template / min_items / item_limit, plus toggle active + delete.
 * "Add rule" opens an inline form (no modal) per category.
 *
 * The `field` value isn't user-editable post-create — it's a code-level
 * concept (`writer`, `actors[0].name`, etc.) that must match the
 * extension table column. Admin picks from a per-category preset list
 * when adding a new rule.
 */

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES } from "@/constants/categories";

interface Rule {
  id: string;
  category: string;
  field: string;
  title_template: string;
  min_items: number;
  item_limit: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  modified_at: string;
  /** Set only for nearby-radius rules (field === "_nearby_radius_").
   *  Numeric km; null/undefined for value-match rules. */
  radius_km?: number | null;
}

/** Special field token recognised by the resolver as "find venues
 *  within radius_km km of the current item's lat/lng". Added to the
 *  venue category presets so admins can pick it from the same UI. */
const NEARBY_FIELD = "_nearby_radius_";

/** Per-category presets the admin can pick from. Each entry maps to an
 *  extension-table path the fetcher understands (lib/related-sections.ts). */
const FIELD_PRESETS: Record<string, { value: string; label: string; suggestedTitle: string }[]> = {
  books: [
    { value: "writer",          label: "Συγγραφέας",       suggestedTitle: "Περισσότερα από {value}" },
    { value: "publication",     label: "Εκδότης",          suggestedTitle: "Άλλα από τις εκδόσεις {value}" },
  ],
  movies: [
    { value: "director",        label: "Σκηνοθέτης",       suggestedTitle: "Άλλες ταινίες από {value}" },
    { value: "actors[0].name",  label: "Πρώτος ηθοποιός",  suggestedTitle: "Παίζει επίσης ο {value}" },
    { value: "actors[1].name",  label: "Δεύτερος ηθοποιός", suggestedTitle: "Με {value}" },
  ],
  series: [
    { value: "director",        label: "Σκηνοθέτης",       suggestedTitle: "Άλλες σειρές από {value}" },
    { value: "actors[0].name",  label: "Πρώτος ηθοποιός",  suggestedTitle: "Παίζει επίσης ο {value}" },
    { value: "channel",         label: "Κανάλι / Πλατφόρμα", suggestedTitle: "Από {value}" },
  ],
  theater: [
    { value: "director",        label: "Σκηνοθέτης",       suggestedTitle: "Άλλες παραστάσεις από {value}" },
    { value: "writer",          label: "Συγγραφέας",       suggestedTitle: "Άλλα έργα του {value}" },
    { value: "actors[0].name",  label: "Πρώτος ηθοποιός",  suggestedTitle: "Με τον/την {value}" },
  ],
  events: [
    { value: "performers[0]",   label: "Καλλιτέχνης",      suggestedTitle: "Άλλες εμφανίσεις του {value}" },
    { value: "event_type",      label: "Τύπος εκδήλωσης",  suggestedTitle: "Άλλες εκδηλώσεις: {value}" },
  ],
  food: [
    { value: "cuisine",         label: "Κουζίνα",          suggestedTitle: "Άλλα {value}" },
    { value: "type",            label: "Τύπος μαγαζιού",   suggestedTitle: "Άλλα {value}" },
    { value: NEARBY_FIELD,      label: "Κοντινά (km)",     suggestedTitle: "Άλλα μέρη εδώ κοντά" },
  ],
  bars: [
    { value: "type",            label: "Τύπος",            suggestedTitle: "Άλλα {value}" },
    { value: NEARBY_FIELD,      label: "Κοντινά (km)",     suggestedTitle: "Άλλα μέρη εδώ κοντά" },
  ],
  hotels: [
    { value: "type",            label: "Τύπος ξενοδοχείου", suggestedTitle: "Άλλα {value}" },
    { value: NEARBY_FIELD,      label: "Κοντινά (km)",     suggestedTitle: "Άλλα καταλύματα εδώ κοντά" },
  ],
  recipes: [
    { value: "level",           label: "Επίπεδο",          suggestedTitle: "Άλλες {value} συνταγές" },
    { value: "origin",          label: "Προέλευση",        suggestedTitle: "Άλλες {value} συνταγές" },
  ],
};

export function RelatedSectionsManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/related-sections", { cache: "no-store" });
      const data = await res.json();
      setRules(Array.isArray(data?.rules) ? data.rules : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patchRule(id: string, patch: Partial<Rule>) {
    setBusyId(id);
    // Optimistic
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const res = await fetch(`/api/admin/related-sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error ?? "Αποτυχία ενημέρωσης");
        load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRule(rule: Rule) {
    if (!window.confirm(`Διαγραφή του rule "${rule.field}" για ${rule.category};`)) return;
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/admin/related-sections/${rule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error ?? "Αποτυχία διαγραφής");
        return;
      }
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } finally {
      setBusyId(null);
    }
  }

  async function createRule(category: string, field: string, title_template: string) {
    const res = await fetch("/api/admin/related-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, field, title_template }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error ?? "Αποτυχία δημιουργίας");
      return;
    }
    setRules((prev) => [...prev, data.rule as Rule]);
    setAddingFor(null);
  }

  const rulesByCategory = new Map<string, Rule[]>();
  for (const r of rules) {
    const list = rulesByCategory.get(r.category) ?? [];
    list.push(r);
    rulesByCategory.set(r.category, list);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Related Sections</h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-xl">
          Κανόνες για τα carousels &quot;Περισσότερα από&quot; στις σελίδες λεπτομερειών. Κάθε rule
          ορίζει ένα carousel ανά κατηγορία (π.χ. <em>για κάθε ταινία, δείξε άλλες ταινίες του σκηνοθέτη</em>).
          Κρύβεται αυτόματα όταν δεν υπάρχουν αρκετά siblings ή όταν λείπει η τιμή.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Φόρτωση…</div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const list = rulesByCategory.get(cat.slug) ?? [];
            const presets = FIELD_PRESETS[cat.slug] ?? [];
            const usedFields = new Set(list.map((r) => r.field));
            const availablePresets = presets.filter((p) => !usedFields.has(p.value));

            return (
              <section key={cat.slug} className="border border-zinc-200 rounded-md bg-white overflow-hidden">
                <header className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden>{cat.icon}</span>
                    <h2 className="text-base font-semibold text-zinc-900">{cat.labelEl}</h2>
                    <span className="text-xs text-zinc-400">({list.length})</span>
                  </div>
                  {availablePresets.length > 0 && addingFor !== cat.slug && (
                    <button
                      onClick={() => setAddingFor(cat.slug)}
                      className="text-xs font-semibold text-coral-700 hover:underline"
                    >
                      + Πρόσθεσε rule
                    </button>
                  )}
                </header>

                <div className="divide-y divide-zinc-100">
                  {list.length === 0 && addingFor !== cat.slug && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-zinc-500">Καμία rule σε αυτή την κατηγορία.</p>
                      {presets.length > 0 && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Συνηθισμένα: {presets.slice(0, 3).map((p) => p.label).join(", ")}.
                        </p>
                      )}
                    </div>
                  )}

                  {list.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      busy={busyId === rule.id}
                      onPatch={(patch) => patchRule(rule.id, patch)}
                      onDelete={() => deleteRule(rule)}
                      fieldLabel={presets.find((p) => p.value === rule.field)?.label ?? rule.field}
                    />
                  ))}

                  {addingFor === cat.slug && (
                    <AddRuleForm
                      category={cat.slug}
                      presets={availablePresets}
                      onCancel={() => setAddingFor(null)}
                      onCreate={createRule}
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Rule row ──────────────────────────────────────────────────────── */

function RuleRow({
  rule, busy, onPatch, onDelete, fieldLabel,
}: {
  rule: Rule;
  busy: boolean;
  onPatch: (patch: Partial<Rule>) => void;
  onDelete: () => void;
  fieldLabel: string;
}) {
  const [titleDraft, setTitleDraft] = useState(rule.title_template);
  const [minDraft, setMinDraft] = useState<number>(rule.min_items);
  const [limitDraft, setLimitDraft] = useState<number>(rule.item_limit);
  const [radiusDraft, setRadiusDraft] = useState<number>(rule.radius_km ?? 1);
  const isNearby = rule.field === NEARBY_FIELD;

  useEffect(() => { setTitleDraft(rule.title_template); }, [rule.title_template]);
  useEffect(() => { setMinDraft(rule.min_items); }, [rule.min_items]);
  useEffect(() => { setLimitDraft(rule.item_limit); }, [rule.item_limit]);
  useEffect(() => { setRadiusDraft(rule.radius_km ?? 1); }, [rule.radius_km]);

  function commitTitle() {
    const v = titleDraft.trim();
    if (v && v !== rule.title_template) onPatch({ title_template: v });
  }
  function commitMin() {
    if (minDraft >= 1 && minDraft !== rule.min_items) onPatch({ min_items: minDraft });
  }
  function commitLimit() {
    if (limitDraft >= 1 && limitDraft <= 20 && limitDraft !== rule.item_limit) {
      onPatch({ item_limit: limitDraft });
    }
  }
  function commitRadius() {
    if (radiusDraft > 0 && radiusDraft !== rule.radius_km) {
      onPatch({ radius_km: radiusDraft });
    }
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
      {/* Active toggle */}
      <button
        onClick={() => onPatch({ is_active: !rule.is_active })}
        disabled={busy}
        className={`shrink-0 w-9 h-5 rounded-full inline-flex items-center px-0.5 transition-colors ${
          rule.is_active ? "bg-emerald-500" : "bg-zinc-200"
        }`}
        aria-label={rule.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
            rule.is_active ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>

      {/* Field label */}
      <div className="shrink-0 w-32 min-w-0">
        <div className="text-xs font-semibold text-zinc-700 truncate">{fieldLabel}</div>
        <div className="text-[10px] text-zinc-400 font-mono truncate">{rule.field}</div>
      </div>

      {/* Title template — inline editable */}
      <input
        type="text"
        value={titleDraft}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="Π.χ. Περισσότερα από {value}"
        className="flex-1 min-w-0 px-2 py-1 text-sm border border-zinc-200 rounded focus:border-coral-400 focus:outline-none"
      />

      {/* Min items */}
      <label className="shrink-0 flex items-center gap-1 text-xs text-zinc-500">
        <span>min</span>
        <input
          type="number"
          value={minDraft}
          onChange={(e) => setMinDraft(Number(e.target.value))}
          onBlur={commitMin}
          min={1}
          className="w-12 px-1.5 py-1 border border-zinc-200 rounded text-center"
        />
      </label>

      {/* Limit */}
      <label className="shrink-0 flex items-center gap-1 text-xs text-zinc-500">
        <span>max</span>
        <input
          type="number"
          value={limitDraft}
          onChange={(e) => setLimitDraft(Number(e.target.value))}
          onBlur={commitLimit}
          min={1}
          max={20}
          className="w-12 px-1.5 py-1 border border-zinc-200 rounded text-center"
        />
      </label>

      {/* Radius (only for nearby rules) */}
      {isNearby && (
        <label className="shrink-0 flex items-center gap-1 text-xs text-zinc-500">
          <span>km</span>
          <input
            type="number"
            value={radiusDraft}
            onChange={(e) => setRadiusDraft(Number(e.target.value))}
            onBlur={commitRadius}
            min={0.1}
            step={0.1}
            className="w-14 px-1.5 py-1 border border-zinc-200 rounded text-center"
          />
        </label>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={busy}
        className="shrink-0 p-1.5 rounded text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Διαγραφή"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Add rule form (inline) ────────────────────────────────────────── */

function AddRuleForm({
  category, presets, onCancel, onCreate,
}: {
  category: string;
  presets: { value: string; label: string; suggestedTitle: string }[];
  onCancel: () => void;
  onCreate: (category: string, field: string, title: string) => void;
}) {
  const [field, setField] = useState(presets[0]?.value ?? "");
  const [title, setTitle] = useState(presets[0]?.suggestedTitle ?? "");

  function handleFieldChange(v: string) {
    setField(v);
    const p = presets.find((x) => x.value === v);
    if (p) setTitle(p.suggestedTitle);
  }

  function handleSubmit() {
    if (!field || !title.trim()) return;
    onCreate(category, field, title.trim());
  }

  return (
    <div className="px-4 py-3 bg-coral-50/40 border-t border-coral-100 flex items-center gap-3">
      <select
        value={field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="shrink-0 w-44 px-2 py-1 text-sm border border-zinc-200 rounded bg-white focus:border-coral-400 focus:outline-none"
      >
        {presets.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Τίτλος (χρησιμοποίησε {value})"
        className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded focus:border-coral-400 focus:outline-none"
      />

      <button
        onClick={handleSubmit}
        className="shrink-0 px-3 py-1 text-xs font-semibold text-white bg-coral-600 hover:bg-coral-700 rounded"
      >
        Προσθήκη
      </button>
      <button
        onClick={onCancel}
        className="shrink-0 px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
      >
        Ακύρωση
      </button>
    </div>
  );
}
