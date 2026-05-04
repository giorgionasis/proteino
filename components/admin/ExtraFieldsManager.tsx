"use client";

import { useMemo, useState } from "react";
import { AdminTabs } from "./AdminTabs";

interface Option {
  id: string;
  category: string;
  field_group: string;
  value: string;
  label: string;
  display_order: number;
  is_published: boolean;
  icon: string | null;
}

const CATEGORY_TABS = [
  { label: "Ταινίες",     value: "movies" },
  { label: "Σειρές",      value: "series" },
  { label: "Βιβλίο",      value: "books" },
  { label: "Συνταγές",    value: "recipes" },
  { label: "Φαγητό",      value: "food" },
  { label: "Καφέ/Μπαρ",   value: "bars" },
  { label: "Διαμονή",     value: "hotels" },
  { label: "Θέατρο",      value: "theater" },
  { label: "Εκδηλώσεις",  value: "events" },
];

const GROUP_LABELS: Record<string, string> = {
  country: "Χώρα παραγωγής",
  award_oscar: "Βραβεία Oscar",
  award_bafta: "Βραβεία BAFTA",
  award_golden_globe: "Βραβεία Golden Globe",
  award_cannes: "Βραβεία Cannes",
  streaming: "Streaming Platforms",
  language: "Γλώσσα",
  publication: "Εκδοτικός Οίκος",
  cuisine: "Κουζίνα",
  delivery_provider: "Delivery Providers",
  source: "Source",
  amenities_facilities: "Παροχές (Facilities)",
  amenities_room: "Δωμάτιο (Room)",
  amenities_extra: "Extra Amenities",
  availability_provider: "Availability Providers",
  type: "Τύπος",
  attributes: "Attributes / Features",
  unit: "Μονάδες Μέτρησης",
  level: "Δυσκολία",
  nutrition: "Διατροφικές Ετικέτες",
  common_ingredient: "Κοινά Υλικά",
  availability: "Διαθεσιμότητα",
};

interface Props {
  initialOptions: Option[];
}

const GREEK_TO_LATIN: Record<string, string> = {
  "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
  "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
  "ΐ":"i","ΰ":"y",
};

function makeKey(text: string): string {
  return text.toLowerCase().split("").map(c => GREEK_TO_LATIN[c] || c).join("")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function ExtraFieldsManager({ initialOptions }: Props) {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [activeCat, setActiveCat] = useState("movies");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [creatingInGroup, setCreatingInGroup] = useState<string | null>(null);
  const [newOptLabel, setNewOptLabel] = useState("");

  // New group wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizName, setWizName] = useState("");
  const [wizKey, setWizKey] = useState("");
  const [wizKeyManual, setWizKeyManual] = useState(false);
  const [wizOptions, setWizOptions] = useState("");

  // Group options by field_group for the active category
  const grouped = useMemo(() => {
    const map: Record<string, Option[]> = {};
    for (const o of options) {
      if (o.category !== activeCat) continue;
      if (!map[o.field_group]) map[o.field_group] = [];
      map[o.field_group].push(o);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.display_order - b.display_order);
    }
    return map;
  }, [options, activeCat]);

  const groupKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  async function patchOption(id: string, patch: Record<string, any>): Promise<boolean> {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/extra-fields/${id}`, {
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

  async function saveLabel(id: string) {
    if (!editLabel.trim()) return;
    const ok = await patchOption(id, { label: editLabel.trim() });
    if (ok) {
      setOptions((opts) => opts.map((o) => (o.id === id ? { ...o, label: editLabel.trim() } : o)));
      setEditingId(null);
    }
  }

  async function togglePublished(opt: Option) {
    const ok = await patchOption(opt.id, { is_published: !opt.is_published });
    if (ok) {
      setOptions((opts) => opts.map((o) => (o.id === opt.id ? { ...o, is_published: !opt.is_published } : o)));
    }
  }

  async function move(id: string, direction: "up" | "down") {
    const opt = options.find((o) => o.id === id);
    if (!opt) return;
    const groupOpts = grouped[opt.field_group];
    const idx = groupOpts.findIndex((o) => o.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= groupOpts.length) return;

    const a = groupOpts[idx];
    const b = groupOpts[swapWith];
    setBusy(id);

    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/extra-fields/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
      fetch(`/api/admin/extra-fields/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ]);
    setBusy(null);
    if (!r1.ok || !r2.ok) { setError("Reorder failed"); return; }
    setOptions((opts) =>
      opts.map((o) => {
        if (o.id === a.id) return { ...o, display_order: b.display_order };
        if (o.id === b.id) return { ...o, display_order: a.display_order };
        return o;
      })
    );
  }

  async function deleteOption(opt: Option) {
    if (!confirm(`Διαγραφή "${opt.label}";`)) return;
    setBusy(opt.id);
    const res = await fetch(`/api/admin/extra-fields/${opt.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setOptions((opts) => opts.filter((o) => o.id !== opt.id));
  }

  async function deleteGroup(groupKey: string) {
    const opts = grouped[groupKey] || [];
    if (!confirm(`Διαγραφή ολόκληρου του group "${GROUP_LABELS[groupKey] || groupKey}" με ${opts.length} options;`)) return;
    setBusy(groupKey);
    setError(null);
    const results = await Promise.allSettled(
      opts.map((o) => fetch(`/api/admin/extra-fields/${o.id}`, { method: "DELETE" }))
    );
    setBusy(null);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) { setError(`${failed.length} options απέτυχαν να διαγραφούν`); return; }
    setOptions((all) => all.filter((o) => o.field_group !== groupKey || o.category !== activeCat));
    if (expandedGroup === groupKey) setExpandedGroup(null);
  }

  async function addOption(fieldGroup: string) {
    if (!newOptLabel.trim()) return;
    setBusy("__new__");
    setError(null);
    const res = await fetch("/api/admin/extra-fields", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeCat, field_group: fieldGroup, label: newOptLabel.trim() }),
    });
    setBusy(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    const created = await res.json();
    setOptions((opts) => [...opts, created]);
    setNewOptLabel("");
  }

  // Wizard: name auto-generates key
  function onWizNameChange(v: string) {
    setWizName(v);
    if (!wizKeyManual) setWizKey(makeKey(v));
  }

  async function createWizardGroup() {
    if (!wizName.trim() || !wizKey.trim()) return;
    const labels = wizOptions.split("\n").map((l) => l.trim()).filter(Boolean);
    if (labels.length === 0) {
      setError("Πρόσθεσε τουλάχιστον ένα option");
      return;
    }

    setBusy("__wizard__");
    setError(null);

    // Create one option at a time (could be batched later)
    const created: Option[] = [];
    for (const label of labels) {
      const res = await fetch("/api/admin/extra-fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: activeCat, field_group: wizKey, label }),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(`Σφάλμα στο "${label}": ${e.error || ""}`);
        break;
      }
      created.push(await res.json());
    }
    setBusy(null);

    if (created.length > 0) {
      setOptions((opts) => [...opts, ...created]);
      // Save the friendly name in GROUP_LABELS for this session (won't persist across reload until we add metadata)
      GROUP_LABELS[wizKey] = wizName.trim();
      setWizName(""); setWizKey(""); setWizOptions(""); setWizKeyManual(false);
      setShowWizard(false);
      setExpandedGroup(wizKey);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Extra Fields</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Διαχείριση επιλογών (dropdown options, attributes, amenities) ανά κατηγορία
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
        >
          <span className="text-lg leading-none">+</span> New Group
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <AdminTabs tabs={CATEGORY_TABS} active={activeCat} onChange={setActiveCat} />

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWizard(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-800 mb-1">Νέο group για: {CATEGORY_TABS.find(t => t.value === activeCat)?.label}</h3>
            <p className="text-sm text-zinc-500 mb-5">Δημιούργησε μια ομάδα επιλογών και πρόσθεσε όλα τα options μαζί.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1.5">Όνομα ομάδας *</label>
                <input
                  type="text"
                  value={wizName}
                  onChange={(e) => onWizNameChange(e.target.value)}
                  autoFocus
                  placeholder="π.χ. Πλατφόρμες Streaming, Παροχές Δωματίου"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                />
                <p className="text-xs text-zinc-400 mt-1">Έτσι θα φαίνεται στον admin και στο SuggestionEditor.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-600 uppercase">Tech key (database)</label>
                  <button
                    onClick={() => setWizKeyManual(!wizKeyManual)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    {wizKeyManual ? "Auto" : "Manual edit"}
                  </button>
                </div>
                <input
                  type="text"
                  value={wizKey}
                  onChange={(e) => { setWizKey(e.target.value); setWizKeyManual(true); }}
                  disabled={!wizKeyManual}
                  placeholder="auto-generated from name"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono disabled:bg-zinc-50 disabled:text-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1.5">
                  Options (μία ανά γραμμή) *
                </label>
                <textarea
                  value={wizOptions}
                  onChange={(e) => setWizOptions(e.target.value)}
                  placeholder={"Pool\nBar\nRestaurant\nParking\nBreakfast"}
                  rows={6}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 font-mono resize-none"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  {wizOptions.split("\n").filter((l) => l.trim()).length} options
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowWizard(false); setWizName(""); setWizKey(""); setWizOptions(""); setWizKeyManual(false); }}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
              >
                Άκυρο
              </button>
              <button
                onClick={createWizardGroup}
                disabled={!wizName.trim() || !wizKey.trim() || !wizOptions.trim() || busy === "__wizard__"}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "__wizard__" ? "Δημιουργία..." : "Δημιουργία Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {groupKeys.length === 0 && (
          <div className="border-2 border-dashed border-zinc-200 rounded-lg p-12 text-center">
            <p className="text-sm text-zinc-500 mb-4">Καμία ομάδα options για αυτή την κατηγορία.</p>
            <button onClick={() => setShowWizard(true)} className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg">
              Δημιουργία πρώτης ομάδας
            </button>
          </div>
        )}

        {groupKeys.map((groupKey) => {
          const groupOpts = grouped[groupKey];
          const friendly = GROUP_LABELS[groupKey] || groupKey;
          const isExpanded = expandedGroup === groupKey;
          const activeCount = groupOpts.filter((o) => o.is_published).length;
          const hiddenCount = groupOpts.length - activeCount;
          const previewLabels = groupOpts.slice(0, 5).map((o) => o.label);
          const remainingCount = Math.max(0, groupOpts.length - 5);

          return (
            <section key={groupKey} className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <header
                onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50/50 select-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-zinc-800">{friendly}</h2>
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full">
                      {groupOpts.length}
                    </span>
                    {hiddenCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {hiddenCount} hidden
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">
                      {previewLabels.join(" · ")}
                      {remainingCount > 0 && ` · +${remainingCount} more`}
                    </p>
                  )}
                  {isExpanded && (
                    <p className="text-xs text-zinc-400 font-mono mt-1">{groupKey}</p>
                  )}
                </div>

                {isExpanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(groupKey); }}
                    disabled={busy === groupKey}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete Group
                  </button>
                )}
              </header>

              {isExpanded && (
                <div className="border-t border-zinc-100">
                  <ul className="divide-y divide-zinc-100">
                    {groupOpts.map((opt, idx) => {
                      const isEditing = editingId === opt.id;
                      const isBusy = busy === opt.id;

                      return (
                        <li key={opt.id} className="px-5 py-2 flex items-center gap-3 hover:bg-zinc-50/50">
                          <span className="text-xs text-zinc-400 font-mono w-6 text-right">{idx + 1}</span>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveLabel(opt.id);
                                    else if (e.key === "Escape") setEditingId(null);
                                  }}
                                  autoFocus
                                  className="px-2 py-1 border border-emerald-400 rounded text-sm focus:outline-none focus:border-emerald-600 min-w-[240px]"
                                />
                                <button onClick={() => saveLabel(opt.id)} disabled={isBusy} className="text-xs text-emerald-600 font-semibold">Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${opt.is_published ? "text-zinc-800" : "text-zinc-400 line-through"}`}>
                                  {opt.label}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => togglePublished(opt)} disabled={isBusy}
                            className={`text-xs font-medium ${opt.is_published ? "text-emerald-600" : "text-zinc-400"}`}
                          >
                            {opt.is_published ? "● Active" : "○ Hidden"}
                          </button>

                          <div className="flex items-center gap-0.5">
                            <button onClick={() => move(opt.id, "up")} disabled={idx === 0 || isBusy}
                              className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 rounded text-xs disabled:opacity-30">▲</button>
                            <button onClick={() => move(opt.id, "down")} disabled={idx === groupOpts.length - 1 || isBusy}
                              className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 rounded text-xs disabled:opacity-30">▼</button>
                            <button onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }} disabled={isBusy}
                              className="px-2 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50">Edit</button>
                            <button onClick={() => deleteOption(opt)} disabled={isBusy}
                              className="px-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-50">Del</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Add new option inline */}
                  <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-6 text-right">+</span>
                    <input
                      type="text" value={creatingInGroup === groupKey ? newOptLabel : ""}
                      onChange={(e) => { setCreatingInGroup(groupKey); setNewOptLabel(e.target.value); }}
                      onFocus={() => setCreatingInGroup(groupKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addOption(groupKey);
                        else if (e.key === "Escape") { setCreatingInGroup(null); setNewOptLabel(""); }
                      }}
                      placeholder="Νέο option…"
                      className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white"
                    />
                    {creatingInGroup === groupKey && newOptLabel.trim() && (
                      <>
                        <button onClick={() => addOption(groupKey)} disabled={busy === "__new__"}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50">
                          Add
                        </button>
                        <button onClick={() => { setCreatingInGroup(null); setNewOptLabel(""); }}
                          className="text-xs text-zinc-500 hover:text-zinc-700">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
