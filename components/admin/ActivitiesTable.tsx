"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Category { id: string; name: string; icon: string | null; }
interface Type { id: string; category_id: string; name: string; icon: string | null; }

interface ActivityRow {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  is_published: boolean;
  modified_at: string;
  activity_types: {
    id: string; name: string; icon: string | null;
    category_id: string;
    activity_categories: { id: string; name: string; icon: string | null };
  };
}

const ALL = "ALL";

export function ActivitiesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [activeType, setActiveType] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Load taxonomy once
  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/admin/activity-categories"),
          fetch("/api/admin/activity-types"),
        ]);
        const [cats, tps] = await Promise.all([cRes.json(), tRes.json()]);
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(tps)) setTypes(tps.map((t: any) => ({
          id: t.id, category_id: t.category_id, name: t.name, icon: t.icon,
        })));
      } catch { /* no-op */ }
    })();
  }, []);

  const filteredTypes = useMemo(
    () => activeCategory === ALL ? [] : types.filter((t) => t.category_id === activeCategory),
    [types, activeCategory]
  );

  // Load activities
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/activities", window.location.origin);
      if (activeCategory !== ALL) url.searchParams.set("category_id", activeCategory);
      if (activeType !== ALL) url.searchParams.set("type_id", activeType);
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString());
      const data = await res.json();
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeType, search]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function setCategory(id: string) {
    setActiveCategory(id);
    setActiveType(ALL);
  }

  async function togglePublish(row: ActivityRow) {
    setBusyId(row.id);
    try {
      await fetch(`/api/admin/activities/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !row.is_published }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ActivityRow) {
    if (!confirm(`Διαγραφή "${row.name}";`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/activities/${row.id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Activities</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Δραστηριότητες που εμφανίζονται κοντά σε ξενοδοχεία βάσει γεωγραφικής απόστασης.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/activities/taxonomy"
            className="px-4 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            Διαχείριση Ταξινομίας
          </Link>
          <Link
            href="/admin/content/activities/new"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Νέο activity
          </Link>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 mb-4">
        <TabButton active={activeCategory === ALL} onClick={() => setCategory(ALL)}>
          Όλες
        </TabButton>
        {categories.map((c) => (
          <TabButton
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </TabButton>
        ))}
      </div>

      {/* Type filter chips + search */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button
          onClick={() => setActiveType(ALL)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeType === ALL ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >ALL</button>

        {filteredTypes.length === 0 && activeCategory !== ALL && (
          <span className="text-xs text-zinc-400 italic">
            (δεν υπάρχουν τύποι)
          </span>
        )}

        {filteredTypes.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeType === t.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.icon ? <span className="mr-1">{t.icon}</span> : null}{t.name}
          </button>
        ))}

        <div className="ml-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Αναζήτηση..."
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 w-56"
          />
        </div>
      </div>

      {/* Stats */}
      <p className="text-xs text-zinc-500 mb-3">
        {loading ? "Φορτώνει..." : `${total} ${total === 1 ? "activity" : "activities"}`}
      </p>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Όνομα</th>
              <th className="px-4 py-3 text-left">Τύπος / Κατηγορία</th>
              <th className="px-4 py-3 text-left">Τοποθεσία</th>
              <th className="px-4 py-3 text-left">Σύνδεσμοι</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-6 bg-zinc-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <EmptyState
                    hasFilters={activeCategory !== ALL || activeType !== ALL || !!search.trim()}
                    onReset={() => { setActiveCategory(ALL); setActiveType(ALL); setSearch(""); }}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const tp = row.activity_types;
                const cat = tp?.activity_categories;
                const hasCoords = row.lat != null && row.lng != null;
                return (
                  <tr key={row.id} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${
                    !row.is_published ? "opacity-60" : ""
                  }`}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/content/activities/${row.id}`} className="text-sm font-medium text-zinc-800 hover:text-zinc-900 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        {tp?.icon && <span>{tp.icon}</span>}
                        <span className="font-medium text-zinc-700">{tp?.name ?? "—"}</span>
                        {cat?.name && (
                          <span className="text-zinc-400 ml-1">/ {cat.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {hasCoords ? (
                        <a
                          href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                          {row.address || `${row.lat?.toFixed(3)}, ${row.lng?.toFixed(3)}`}
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600">⚠ χωρίς coords</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {row.website_url && <LinkChip label="Web" url={row.website_url} />}
                        {row.facebook_url && <LinkChip label="FB" url={row.facebook_url} />}
                        {row.instagram_url && <LinkChip label="IG" url={row.instagram_url} />}
                        {!row.website_url && !row.facebook_url && !row.instagram_url && (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePublish(row)}
                        disabled={busyId === row.id}
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                          row.is_published ? "text-emerald-700 hover:bg-emerald-50" : "text-zinc-400 hover:bg-zinc-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${row.is_published ? "bg-emerald-500" : "bg-zinc-300"}`} />
                        {row.is_published ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/content/activities/${row.id}`}
                        className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline mr-3"
                      >
                        Επεξεργασία
                      </Link>
                      <button
                        onClick={() => remove(row)}
                        disabled={busyId === row.id}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Διαγραφή
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
        active
          ? "text-zinc-900 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900"
          : "text-zinc-500 hover:text-zinc-700"
      }`}
    >{children}</button>
  );
}

function LinkChip({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    >{label}</a>
  );
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  if (hasFilters) {
    return (
      <div>
        <p className="text-sm text-zinc-600 mb-3">Κανένα activity δεν ταιριάζει στα φίλτρα.</p>
        <button onClick={onReset} className="text-sm text-coral-600 hover:underline">
          Καθάρισμα φίλτρων
        </button>
      </div>
    );
  }
  return (
    <div className="py-6">
      <div className="text-4xl mb-3">🏔️</div>
      <h3 className="text-base font-semibold text-zinc-800 mb-1">Καμία δραστηριότητα ακόμη</h3>
      <p className="text-sm text-zinc-500 mb-4 max-w-md mx-auto">
        Πρόσθεσε δραστηριότητες (σκι, rafting, μουσεία...) για να εμφανίζονται στις σελίδες ξενοδοχείων κοντά τους.
      </p>
      <Link
        href="/admin/content/activities/new"
        className="inline-block px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
      >
        + Πρώτο activity
      </Link>
    </div>
  );
}
