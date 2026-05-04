"use client";

import { useState } from "react";
import Link from "next/link";

interface Item {
  id: string;
  title: string;
  category: string;
  signal: string;
  address: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
}

interface Subcategory {
  id: string;
  category: string;
  name: string;
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  movies:  { icon: "🎬", label: "Ταινίες" },
  series:  { icon: "📺", label: "Σειρές" },
  books:   { icon: "📚", label: "Βιβλία" },
  recipes: { icon: "👨‍🍳", label: "Συνταγές" },
  food:    { icon: "🍽️", label: "Φαγητό" },
  bars:    { icon: "☕", label: "Bars/Cafes" },
  hotels:  { icon: "🏨", label: "Διαμονή" },
  theater: { icon: "🎭", label: "Θέατρο" },
  events:  { icon: "🎉", label: "Events" },
};

const CATEGORY_HINT: Record<string, string> = {
  bars: "Πολλά απ' αυτά δεν είναι bars (παγωτατζίδικα, escape rooms, παιδότοποι). Σκέψου να αλλάξεις category ή να διαγράψεις.",
  books: "Single-of-a-kind tags. Πιθανόν να ταιριάζουν σε υπάρχουσα subcategory ή χρειάζονται νέα.",
  food: "Items με placeholder data ('33') ή κουζίνες χωρίς subcategory.",
};

function capitalize(s: string): string {
  // Capitalize first letter of first word only (e.g. "μηχανική - μηχανολογία" → "Μηχανική - μηχανολογία")
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  grouped: Record<string, Item[]>;
  subcategories: Subcategory[];
}

export function DataQualityList({ grouped, subcategories: initialSubcategories }: Props) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubcategories);
  const [updates, setUpdates] = useState<Record<string, string | null>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [creatingFor, setCreatingFor] = useState<string | null>(null); // itemId for which we're creating a new subcategory
  const [newName, setNewName] = useState("");

  const subsByCategory: Record<string, Subcategory[]> = {};
  for (const s of subcategories) {
    if (!subsByCategory[s.category]) subsByCategory[s.category] = [];
    subsByCategory[s.category].push(s);
  }

  async function createSubcategory(category: string, name: string, itemId: string) {
    setSavingId(itemId);
    setErrorIds((s) => { const n = new Set(s); n.delete(itemId); return n; });

    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name }),
    });

    if (!res.ok) {
      setSavingId(null);
      setErrorIds((s) => new Set(s).add(itemId));
      return;
    }

    const newSub = await res.json();
    setSubcategories((prev) => [...prev, newSub]);
    setCreatingFor(null);
    setNewName("");

    // Now assign the item to this new subcategory
    await assignSubcategory(itemId, newSub.id, true);
  }

  async function assignSubcategory(itemId: string, subcategoryId: string, alreadySaving = false) {
    if (!alreadySaving) {
      setSavingId(itemId);
      setErrorIds((s) => { const n = new Set(s); n.delete(itemId); return n; });
    }

    const res = await fetch("/api/admin/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, subcategory_id: subcategoryId }),
    });

    setSavingId(null);
    if (res.ok) {
      setSavedIds((s) => new Set(s).add(itemId));
      // Hide after a moment so the list shrinks
      setTimeout(() => setHidden((s) => new Set(s).add(itemId)), 800);
    } else {
      setErrorIds((s) => new Set(s).add(itemId));
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Διαγραφή item; Δεν αναιρείται.")) return;
    setSavingId(itemId);

    const res = await fetch(`/api/admin/items?id=${itemId}`, { method: "DELETE" });

    setSavingId(null);
    if (res.ok) {
      setHidden((s) => new Set(s).add(itemId));
    } else {
      setErrorIds((s) => new Set(s).add(itemId));
    }
  }

  const totalRemaining = Object.values(grouped).flat().filter((i) => !hidden.has(i.id)).length;

  return (
    <>
      <p className="text-sm text-zinc-500 mb-6">{totalRemaining} items remaining</p>

      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, items]) => {
          const visibleItems = items.filter((i) => !hidden.has(i.id));
          if (visibleItems.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const hint = CATEGORY_HINT[cat];

          return (
            <section key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{meta.icon}</span>
                <h2 className="text-lg font-bold text-zinc-800">{meta.label}</h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                  {visibleItems.length}
                </span>
              </div>
              {hint && <p className="text-xs text-zinc-500 mb-3 italic">{hint}</p>}

              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Original Tag</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Assign Subcategory</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const isSaving = savingId === item.id;
                      const isSaved = savedIds.has(item.id);
                      const isError = errorIds.has(item.id);
                      const subs = subsByCategory[cat] || [];
                      const selected = updates[item.id] ?? "";

                      return (
                        <tr key={item.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {(item.posterUrl || item.backdropUrl) && (
                                <img
                                  src={item.posterUrl || item.backdropUrl || ""}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover bg-zinc-100"
                                />
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/categories/${cat}/${item.id}`}
                                  className="text-sm font-semibold text-zinc-800 hover:text-emerald-600 line-clamp-1"
                                >
                                  {item.title}
                                </Link>
                                {item.address && (
                                  <p className="text-xs text-zinc-500 line-clamp-1">{item.address}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {item.signal ? (
                              <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded font-mono">
                                {item.signal}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">— χωρίς tag —</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {creatingFor === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && newName.trim()) {
                                      createSubcategory(cat, newName.trim(), item.id);
                                    } else if (e.key === "Escape") {
                                      setCreatingFor(null);
                                      setNewName("");
                                    }
                                  }}
                                  autoFocus
                                  placeholder="Όνομα νέας subcategory"
                                  className="px-3 py-1.5 border border-emerald-400 rounded text-sm focus:outline-none focus:border-emerald-600 min-w-[180px]"
                                />
                                <button
                                  onClick={() => createSubcategory(cat, newName.trim(), item.id)}
                                  disabled={!newName.trim() || isSaving}
                                  className="px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Δημιουργία
                                </button>
                                <button
                                  onClick={() => { setCreatingFor(null); setNewName(""); }}
                                  className="text-xs text-zinc-500 hover:text-zinc-700"
                                >
                                  Άκυρο
                                </button>
                              </div>
                            ) : (
                              <select
                                value={selected}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  if (id === "__new__") {
                                    setCreatingFor(item.id);
                                    setNewName(item.signal && /^[a-zA-Zα-ωΑ-Ω]/.test(item.signal) ? capitalize(item.signal) : "");
                                    return;
                                  }
                                  setUpdates((u) => ({ ...u, [item.id]: id || null }));
                                  if (id) assignSubcategory(item.id, id);
                                }}
                                disabled={isSaving}
                                className="px-3 py-1.5 border border-zinc-200 rounded text-sm bg-white focus:outline-none focus:border-zinc-400 disabled:opacity-50 min-w-[180px]"
                              >
                                <option value="">— Επίλεξε —</option>
                                {subs.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                                <option value="" disabled>──────────</option>
                                <option value="__new__">+ Νέα subcategory...</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isSaving && <span className="text-xs text-zinc-400">Saving...</span>}
                              {isSaved && <span className="text-xs text-emerald-600 font-semibold">✓ Saved</span>}
                              {isError && <span className="text-xs text-red-500 font-semibold">Error</span>}
                              <button
                                onClick={() => deleteItem(item.id)}
                                disabled={isSaving}
                                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                                title="Διαγραφή item"
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
            </section>
          );
        })}

        {totalRemaining === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
            <p className="text-emerald-800 font-semibold">🎉 Όλα τα items έχουν subcategory!</p>
          </div>
        )}
      </div>
    </>
  );
}
