"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_published: boolean;
}

interface Type {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_published: boolean;
}

export function ActivityTaxonomyManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const [newTypeName, setNewTypeName] = useState<Record<string, string>>({});
  const [newTypeIcon, setNewTypeIcon] = useState<Record<string, string>>({});
  const [creatingTypeFor, setCreatingTypeFor] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/admin/activity-categories"),
        fetch("/api/admin/activity-types"),
      ]);
      const [cats, tps] = await Promise.all([cRes.json(), tRes.json()]);
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(tps)) setTypes(tps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCat(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/activity-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim(), icon: newCategoryIcon.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setNewCategoryName("");
      setNewCategoryIcon("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingCat(false);
    }
  }

  async function patchCategory(id: string, patch: Partial<Category>) {
    await fetch(`/api/admin/activity-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`Διαγραφή κατηγορίας "${c.name}";`)) return;
    setError(null);
    const res = await fetch(`/api/admin/activity-categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Αποτυχία");
    } else {
      await load();
    }
  }

  async function createType(categoryId: string) {
    const name = newTypeName[categoryId]?.trim();
    if (!name) return;
    setCreatingTypeFor(categoryId);
    setError(null);
    try {
      const res = await fetch("/api/admin/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          name,
          icon: newTypeIcon[categoryId]?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setNewTypeName((p) => ({ ...p, [categoryId]: "" }));
      setNewTypeIcon((p) => ({ ...p, [categoryId]: "" }));
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingTypeFor(null);
    }
  }

  async function patchType(id: string, patch: Partial<Type>) {
    await fetch(`/api/admin/activity-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteType(t: Type) {
    if (!confirm(`Διαγραφή τύπου "${t.name}";`)) return;
    setError(null);
    const res = await fetch(`/api/admin/activity-types/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Αποτυχία");
    } else {
      await load();
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/content/activities" className="text-zinc-500 hover:text-zinc-800">Activities</Link>
        <span className="text-zinc-400">/</span>
        <span className="font-medium text-zinc-800">Ταξινομία</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Διαχείριση Ταξινομίας</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Κατηγορίες και τύποι που οργανώνουν τα activities. Άλλαξε ή πρόσθεσε χωρίς deploy.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* New category form */}
      <div className="mb-8 p-4 border border-zinc-200 rounded-xl bg-zinc-50">
        <h3 className="text-sm font-bold text-zinc-800 mb-3">+ Νέα κατηγορία</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryIcon}
            onChange={(e) => setNewCategoryIcon(e.target.value)}
            placeholder="🏔️"
            maxLength={4}
            className="w-16 px-3 py-2 border border-zinc-200 rounded-lg text-sm text-center bg-white"
          />
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCategory()}
            placeholder="π.χ. Φύση"
            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
          />
          <button
            onClick={createCategory}
            disabled={creatingCat || !newCategoryName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
          >
            Προσθήκη
          </button>
        </div>
      </div>

      {/* Categories + their types */}
      {loading ? (
        <div className="text-sm text-zinc-500">Φορτώνει...</div>
      ) : categories.length === 0 ? (
        <div className="text-sm text-zinc-500 italic text-center py-8">
          Καμία κατηγορία ακόμη.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catTypes = types.filter((t) => t.category_id === cat.id);
            return (
              <div
                key={cat.id}
                className={`border rounded-xl overflow-hidden ${
                  cat.is_published ? "border-zinc-200" : "border-zinc-200 bg-zinc-50/50 opacity-70"
                }`}
              >
                {/* Category header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-200">
                  <input
                    type="text"
                    defaultValue={cat.icon ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (cat.icon ?? "")) patchCategory(cat.id, { icon: v || null });
                    }}
                    placeholder="🏔️"
                    maxLength={4}
                    className="w-12 px-2 py-1.5 text-sm bg-white border border-zinc-200 rounded text-center"
                  />
                  <input
                    type="text"
                    defaultValue={cat.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== cat.name) patchCategory(cat.id, { name: v });
                    }}
                    className="flex-1 px-3 py-1.5 text-sm font-bold bg-white border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                  />
                  <button
                    onClick={() => patchCategory(cat.id, { is_published: !cat.is_published })}
                    className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                      cat.is_published ? "text-emerald-700 hover:bg-emerald-50" : "text-zinc-500 hover:bg-zinc-100"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cat.is_published ? "bg-emerald-500" : "bg-zinc-300"}`} />
                    {cat.is_published ? "Ενεργή" : "Ανενεργή"}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-xs text-red-500 hover:text-red-700 px-2"
                  >
                    Διαγραφή
                  </button>
                </div>

                {/* Types */}
                <div className="p-4">
                  {catTypes.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic mb-3">
                      Κανένας τύπος ακόμη σε αυτή την κατηγορία.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {catTypes.map((t) => (
                        <div key={t.id} className={`flex items-center gap-2 ${!t.is_published ? "opacity-60" : ""}`}>
                          <input
                            type="text"
                            defaultValue={t.icon ?? ""}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (t.icon ?? "")) patchType(t.id, { icon: v || null });
                            }}
                            placeholder=""
                            maxLength={4}
                            className="w-10 px-2 py-1 text-xs bg-white border border-zinc-200 rounded text-center"
                          />
                          <input
                            type="text"
                            defaultValue={t.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== t.name) patchType(t.id, { name: v });
                            }}
                            className="flex-1 px-3 py-1 text-sm bg-white border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                          />
                          <button
                            onClick={() => patchType(t.id, { is_published: !t.is_published })}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              t.is_published ? "text-emerald-700 hover:bg-emerald-50" : "text-zinc-400 hover:bg-zinc-100"
                            }`}
                          >
                            {t.is_published ? "active" : "inactive"}
                          </button>
                          <button
                            onClick={() => deleteType(t)}
                            className="text-xs text-red-500 hover:text-red-700 px-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New type input */}
                  <div className="flex gap-2 pt-2 border-t border-zinc-100">
                    <input
                      type="text"
                      value={newTypeIcon[cat.id] ?? ""}
                      onChange={(e) => setNewTypeIcon((p) => ({ ...p, [cat.id]: e.target.value }))}
                      placeholder=""
                      maxLength={4}
                      className="w-10 px-2 py-1.5 text-xs border border-zinc-200 rounded text-center bg-white"
                    />
                    <input
                      type="text"
                      value={newTypeName[cat.id] ?? ""}
                      onChange={(e) => setNewTypeName((p) => ({ ...p, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && createType(cat.id)}
                      placeholder="+ Νέος τύπος (π.χ. ΣΚΙ)"
                      className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
                    />
                    <button
                      onClick={() => createType(cat.id)}
                      disabled={creatingTypeFor === cat.id || !(newTypeName[cat.id]?.trim())}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Προσθήκη
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
