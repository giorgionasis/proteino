"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";
import { AdminTabs } from "./AdminTabs";
import { RowAuditFooter } from "@/components/admin/ui/RowAuditFooter";
import type { AdminUserMap } from "@/lib/admin/audit";

type Context = "home" | "category";
type CollectionType = "card" | "carousel";

interface CollectionRow {
  id: string;
  type: CollectionType;
  title: string;
  title_specific: string | null;
  alias: string;
  image_url: string | null;
  source_category: string | null;
  tags: string[];
  item_limit: number;
  is_published: boolean;
  target_audience: "all" | "registered" | "guest";
  /** Audit stamps from migration 040 — optional, may be absent before
   *  migration is applied. */
  modified_at?: string | null;
  modified_by?: string | null;
}

interface PlacementRow {
  id: string;            // placement id (NOT collection id)
  display_order: number;
  context: Context;
  category: string | null;
  collections: CollectionRow;
}

interface PreviewItem {
  id: string;
  title: string;
  cover_url: string | null;
}

const TABS: { label: string; value: string; icon?: string }[] = [
  { label: "Αρχική", value: "home", icon: "🏠" },
  ...CATEGORIES.map((c) => ({ label: c.labelEl, value: `cat:${c.slug}`, icon: c.icon })),
];

export function CollectionsList() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [userMap, setUserMap] = useState<AdminUserMap>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { context, category } = (() => {
    if (activeTab === "home") return { context: "home" as const, category: null as string | null };
    return { context: "category" as const, category: activeTab.replace("cat:", "") };
  })();

  const load = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/collections", window.location.origin);
      url.searchParams.set("context", context);
      if (category) url.searchParams.set("category", category);
      const res = await fetch(url.toString());
      const data = await res.json();
      // Endpoint returns either a raw array (legacy shape) or
      // `{ placements, userMap }` (since session 31). Handle both.
      if (Array.isArray(data)) {
        setRows(data);
        setUserMap({});
      } else {
        setRows(Array.isArray(data?.placements) ? data.placements : []);
        setUserMap((data?.userMap ?? {}) as AdminUserMap);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  async function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= rows.length) return;
    const reordered = [...rows];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setRows(reordered);

    const orderedIds = reordered.map((r) => r.id);
    await fetch("/api/admin/collections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, category, ordered_placement_ids: orderedIds }),
    });
  }

  async function togglePublish(row: PlacementRow) {
    setBusyId(row.id);
    try {
      await fetch(`/api/admin/collections/${row.collections.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !row.collections.is_published }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Collections</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Λίστες από items επιλεγμένα χειροκίνητα. Για να εμφανιστούν στο frontend, πρέπει να τοποθετηθούν σε Home ή Category page μέσω <Link href="/admin/layout" className="text-coral-700 hover:underline font-medium">Layout</Link>.
          </p>
        </div>
        <Link
          href="/admin/content/collections/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Νέα συλλογή
        </Link>
      </div>

      {/* Tabs (placement context) */}
      <AdminTabs
        tabs={TABS.map((t) => ({ label: `${t.icon ?? ""} ${t.label}`.trim(), value: t.value }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      <p className="text-xs text-zinc-500 mt-4 mb-3">
        {context === "home"
          ? "Σειρά εμφάνισης στην αρχική. Πάνω = πρώτο που βλέπει ο χρήστης."
          : `Σειρά εμφάνισης μέσα στη σελίδα ${TABS.find((t) => t.value === activeTab)?.label}.`}
      </p>

      <div className="grid grid-cols-[1fr_320px] gap-8 items-start">
        {/* List */}
        <div className="space-y-2 min-h-[200px]">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <EmptyState onCreate={() => { window.location.href = "/admin/content/collections/new"; }} />
          ) : (
            rows.map((row, idx) => (
              <Row
                key={row.id}
                row={row}
                userMap={userMap}
                idx={idx}
                isFirst={idx === 0}
                isLast={idx === rows.length - 1}
                busy={busyId === row.id}
                onMoveUp={() => move(idx, -1)}
                onMoveDown={() => move(idx, +1)}
                onTogglePublish={() => togglePublish(row)}
              />
            ))
          )}
        </div>

        {/* Live phone preview of THIS placement bucket */}
        <div className="sticky top-6 self-start">
          <PlacementPreview
            tabLabel={TABS.find((t) => t.value === activeTab)?.label ?? ""}
            rows={rows.filter((r) => r.collections.is_published)}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Row ──────────────────────────────────────────────────── */

function Row({ row, userMap, isFirst, isLast, busy, onMoveUp, onMoveDown, onTogglePublish }: {
  row: PlacementRow;
  userMap: AdminUserMap;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTogglePublish: () => void;
}) {
  const c = row.collections;
  const sourceLabel =
    c.source_category
      ? CATEGORIES.find((x) => x.slug === c.source_category)?.labelEl ?? c.source_category
      : "Όλες";
  const tagsLabel = c.tags?.length ? c.tags.slice(0, 3).join(" · ") + (c.tags.length > 3 ? "…" : "") : "—";

  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
      c.is_published ? "border-zinc-200 hover:border-zinc-300 bg-white" : "border-zinc-200 bg-zinc-50 opacity-70"
    }`}>
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Μετακίνηση πάνω"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Μετακίνηση κάτω"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Image / type icon */}
      <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0">
        {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> :
          c.type === "card" ? "🎴" : "🎠"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {c.title}{c.title_specific && <> <span className="text-zinc-900 font-bold">{c.title_specific}</span></>}
          </p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
            c.type === "card" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
          }`}>{c.type}</span>
          {c.target_audience !== "all" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-50 text-amber-700">
              {c.target_audience === "registered" ? "REG" : "GUEST"}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          <span>{sourceLabel}</span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span>tags: {tagsLabel}</span>
        </p>
        {c.modified_at && (
          <p className="mt-0.5">
            <RowAuditFooter
              modifiedAt={c.modified_at}
              modifiedById={c.modified_by}
              userMap={userMap}
            />
          </p>
        )}
      </div>

      {/* Publish toggle */}
      <button
        onClick={onTogglePublish}
        disabled={busy}
        className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1.5 transition-colors ${
          c.is_published
            ? "text-emerald-700 hover:bg-emerald-50"
            : "text-zinc-400 hover:bg-zinc-100"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${c.is_published ? "bg-emerald-500" : "bg-zinc-300"}`} />
        {c.is_published ? "Ενεργή" : "Ανενεργή"}
      </button>

      {/* Edit */}
      <Link
        href={`/admin/content/collections/${c.id}`}
        className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline px-2 py-1"
      >
        Επεξεργασία
      </Link>
    </div>
  );
}

/* ─── Empty / loading ──────────────────────────────────────── */

function Skeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[68px] border border-zinc-200 rounded-lg bg-zinc-50 animate-pulse" />
      ))}
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-dashed border-zinc-300 rounded-xl py-12 px-6 text-center">
      <div className="text-4xl mb-3">📦</div>
      <h3 className="text-base font-semibold text-zinc-800 mb-1">Καμία συλλογή ακόμη</h3>
      <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
        Οι συλλογές καθορίζουν τι εμφανίζεται στην αρχική και τις κατηγορίες — Marvel ταινίες,
        Netflix σειρές, εποχιακές προτάσεις. Εσύ τα ορίζεις, εσύ τα αλλάζεις χωρίς deploy.
      </p>
      <button
        onClick={onCreate}
        className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
      >
        + Δημιούργησε την πρώτη
      </button>
    </div>
  );
}

/* ─── Phone preview (placement-level) ──────────────────────── */

function PlacementPreview({ tabLabel, rows }: { tabLabel: string; rows: PlacementRow[] }) {
  const cards = rows.filter((r) => r.collections.type === "card");
  const carousels = rows.filter((r) => r.collections.type === "carousel");

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2 px-1">
        Προεπισκόπηση — {tabLabel}
      </p>
      <div className="border-[8px] border-zinc-800 rounded-[36px] overflow-hidden bg-white shadow-xl">
        <div className="h-[520px] overflow-y-auto bg-white">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-zinc-100">
            <span className="text-sm font-black text-zinc-800">
              Proteino<span className="text-[#FE6F5E]">.</span>
            </span>
            <span className="text-xs text-zinc-400">📱</span>
          </div>
          <div className="p-4 space-y-4">
            {rows.length === 0 && (
              <div className="text-xs text-zinc-400 text-center py-8">
                Καμία ενεργή συλλογή σε αυτό το placement.
              </div>
            )}

            {/* Cards section (compact pills, when present) */}
            {cards.length > 0 && (
              <div className="space-y-2">
                {cards.map((p) => <CardThumb key={p.id} row={p} />)}
              </div>
            )}

            {/* Carousels stacked */}
            {carousels.map((p) => <CarouselThumb key={p.id} row={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardThumb({ row }: { row: PlacementRow }) {
  const c = row.collections;
  return (
    <div className="flex items-center gap-2 p-2 border border-zinc-200 rounded-lg bg-zinc-50">
      <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center overflow-hidden text-[10px] text-zinc-500 shrink-0">
        {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : "•"}
      </div>
      <p className="text-[11px] text-zinc-700 truncate">
        {c.title}{c.title_specific && <> <strong className="text-zinc-900">{c.title_specific}</strong></>}
      </p>
    </div>
  );
}

function CarouselThumb({ row }: { row: PlacementRow }) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/collections/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_category: row.collections.source_category || undefined,
        tags: row.collections.tags ?? [],
        item_limit: 6,
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items ?? []); })
      .catch(() => { /* no-op */ });
    return () => { cancelled = true; };
  }, [row.id, row.collections.source_category, row.collections.tags]);

  return (
    <div>
      <p className="text-[11px] font-bold text-zinc-800 mb-1.5">{row.collections.title}</p>
      <div className="flex gap-1.5 overflow-hidden">
        {items.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[54px] h-[80px] bg-zinc-100 rounded shrink-0" />
            ))
          : items.slice(0, 4).map((it) => (
              <div key={it.id} className="w-[54px] h-[80px] rounded bg-zinc-200 overflow-hidden shrink-0">
                {it.cover_url && <img src={it.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
            ))}
      </div>
    </div>
  );
}
