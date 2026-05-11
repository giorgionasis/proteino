"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "./ui/AdminPageHeader";
import { AdminPanel } from "./ui/AdminPanel";
import { AdminEmpty } from "./ui/AdminEmpty";
import { AdminRow, AdminActionButton, AdminActionSelect } from "./ui/AdminRow";
import { Skeleton } from "@/components/ui/Skeleton";

interface Region {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
}

interface TreeNode extends Region {
  children: TreeNode[];
  depth: number;
}

function buildTree(rows: Region[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [], depth: 0 });
  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const stamp = (n: TreeNode, d: number) => {
    n.depth = d;
    n.children.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "el"));
    n.children.forEach((c) => stamp(c, d + 1));
  };
  roots.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "el"));
  roots.forEach((r) => stamp(r, 0));
  return roots;
}

function flatten(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => { out.push(n); n.children.forEach(walk); };
  roots.forEach(walk);
  return out;
}

export function RegionsManager() {
  const [rows, setRows] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  // null = adding root, string = adding under id, undefined = closed
  const [addingUnderParent, setAddingUnderParent] = useState<string | null | undefined>(undefined);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/regions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      setRows(data);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tree = useMemo(() => buildTree(rows), [rows]);
  const flat = useMemo(() => flatten(tree), [tree]);

  const childCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.parent_id) m.set(r.parent_id, (m.get(r.parent_id) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const startEdit = (n: TreeNode) => { setEditingId(n.id); setDraftName(n.name); };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (!trimmed) { setEditingId(null); return; }
    setBusyId(editingId);
    try {
      const res = await fetch(`/api/admin/regions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setRows((rs) => rs.map((r) => r.id === editingId ? { ...r, name: data.name } : r));
      setEditingId(null);
    } catch (e: any) {
      alert(e.message ?? "Save failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (n: TreeNode) => {
    if (!confirm(`Διαγραφή "${n.name}";`)) return;
    setBusyId(n.id);
    try {
      const res = await fetch(`/api/admin/regions/${n.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setRows((rs) => rs.filter((r) => r.id !== n.id));
    } catch (e: any) {
      alert(e.message ?? "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const create = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const parentId = addingUnderParent === undefined ? null : addingUnderParent;
    setBusyId("__creating__");
    try {
      const res = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parent_id: parentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setRows((rs) => [...rs, data]);
      setNewName(""); setAddingUnderParent(undefined);
    } catch (e: any) {
      alert(e.message ?? "Create failed");
    } finally {
      setBusyId(null);
    }
  };

  const reparent = async (id: string, newParent: string | null) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/regions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: newParent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Move failed");
      setRows((rs) => rs.map((r) => r.id === id ? { ...r, parent_id: data.parent_id } : r));
    } catch (e: any) {
      alert(e.message ?? "Move failed");
    } finally {
      setBusyId(null);
    }
  };

  // Parent options for re-parenting — exclude self + descendants to avoid cycles.
  const validParentOptions = (nodeId: string): { id: string; label: string }[] => {
    const banned = new Set<string>([nodeId]);
    let added = true;
    while (added) {
      added = false;
      for (const r of rows) {
        if (r.parent_id && banned.has(r.parent_id) && !banned.has(r.id)) {
          banned.add(r.id); added = true;
        }
      }
    }
    return flat
      .filter((n) => !banned.has(n.id))
      .map((n) => ({ id: n.id, label: `${"  ".repeat(n.depth)}${n.name}` }));
  };

  const totalRegions = rows.length;
  const rootCount = useMemo(() => rows.filter((r) => !r.parent_id).length, [rows]);

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Regions"
        subtitle="Δομή τοποθεσιών — υποστηρίζει αυθαίρετο βάθος"
        meta={loading ? undefined : `${totalRegions} σύνολο · ${rootCount} ρίζες`}
        primary={
          <button
            type="button"
            onClick={() => { setAddingUnderParent(null); setNewName(""); }}
            disabled={addingUnderParent !== undefined}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-coral-600 hover:bg-coral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <PlusIcon />
            Νέα περιοχή
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <AdminPanel flush>
        {/* Inline add bar — slides in below the toolbar when active */}
        {addingUnderParent !== undefined && (
          <div className="px-4 py-3 border-b border-zinc-100 bg-coral-50/50 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-coral-700 font-semibold whitespace-nowrap">
              {addingUnderParent === null
                ? "Νέα ρίζα"
                : `Νέο παιδί κάτω από ${rows.find((r) => r.id === addingUnderParent)?.name ?? ""}`}
            </span>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void create();
                if (e.key === "Escape") { setAddingUnderParent(undefined); setNewName(""); }
              }}
              placeholder="π.χ. Χαλάνδρι"
              className="flex-1 px-3 h-8 border border-zinc-200 rounded-md text-sm bg-white focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-600/10"
            />
            <button
              type="button"
              onClick={create}
              disabled={!newName.trim() || busyId === "__creating__"}
              className="h-8 px-3 text-xs font-semibold text-white bg-coral-600 hover:bg-coral-700 disabled:opacity-40 rounded-md transition-colors"
            >
              {busyId === "__creating__" ? "..." : "Αποθήκευση"}
            </button>
            <button
              type="button"
              onClick={() => { setAddingUnderParent(undefined); setNewName(""); }}
              className="h-8 px-2 text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Άκυρο
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 flex-1 max-w-[60%] rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : flat.length === 0 ? (
          <AdminEmpty
            icon={<MapIcon />}
            title="Δεν υπάρχει καμία περιοχή ακόμα"
            description="Πρόσθεσε την πρώτη ρίζα για να ξεκινήσεις τη δομή τοποθεσιών. Ξεκίνα από νομούς ή μεγάλες περιοχές (Αττική, Κρήτη), και πρόσθεσε υπο-περιοχές με το « + Παιδί »."
            action={
              <button
                type="button"
                onClick={() => { setAddingUnderParent(null); setNewName(""); }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium transition-colors"
              >
                <PlusIcon />
                Νέα περιοχή
              </button>
            }
          />
        ) : (
          <div>
            {flat.map((n) => {
              const isEditing = editingId === n.id;
              const isBusy = busyId === n.id;
              const isLeaf = n.children.length === 0;
              const childCount = childCounts.get(n.id);

              return (
                <AdminRow
                  key={n.id}
                  depth={n.depth}
                  active={isEditing}
                  leading={
                    isLeaf
                      ? <span className="block w-1.5 h-1.5 rounded-full bg-zinc-300" />
                      : <ChevronIcon />
                  }
                  editing={
                    isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full max-w-md px-2 h-7 border border-coral-600 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral-600/15"
                      />
                    ) : undefined
                  }
                  title={
                    <button
                      onClick={() => startEdit(n)}
                      className="text-left text-zinc-900 font-medium truncate hover:text-coral-600 transition-colors"
                    >
                      {n.name}
                    </button>
                  }
                  meta={
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{n.slug}</span>
                      {childCount ? (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span>{childCount} {childCount === 1 ? "υπο-περιοχή" : "υπο-περιοχές"}</span>
                        </>
                      ) : null}
                    </span>
                  }
                  actions={
                    !isEditing && (
                      <>
                        <AdminActionSelect
                          label="Άλλαξε γονέα"
                          value={n.parent_id ?? ""}
                          onChange={(e) => void reparent(n.id, e.target.value || null)}
                          disabled={isBusy}
                        >
                          <option value="">— ρίζα —</option>
                          {validParentOptions(n.id).map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </AdminActionSelect>
                        <AdminActionButton
                          tone="primary"
                          label="Πρόσθεσε υπο-περιοχή"
                          disabled={isBusy}
                          onClick={() => { setAddingUnderParent(n.id); setNewName(""); }}
                        >
                          <PlusIcon />
                        </AdminActionButton>
                        <AdminActionButton
                          tone="danger"
                          label={isLeaf ? "Διαγραφή" : "Διέγραψε πρώτα τα παιδιά"}
                          disabled={isBusy || !isLeaf}
                          onClick={() => void remove(n)}
                        >
                          <TrashIcon />
                        </AdminActionButton>
                      </>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </AdminPanel>

      <p className="text-xs text-zinc-400 mt-4 px-1">
        Click σε όνομα → επεξεργασία inline · Hover σε γραμμή → εμφανίζονται οι ενέργειες · Διαγραφή μόνο για περιοχές χωρίς παιδιά ή items.
      </p>
    </div>
  );
}

/* ── Icons (kept inline so we don't drag the global Icon registry) ── */

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.5 7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-7M6 6.5v4M8 6.5v4"
        stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Zm0 0v16M15 5v16"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
