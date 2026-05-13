"use client";

/**
 * Section picker modal.
 *
 * Opens from "+ Πρόσθεσε section" in LayoutManager. Two tabs:
 *
 *   • Widget — list of compatibleWidgets() for current (context, category).
 *              Singletons already placed in this bucket are grayed out
 *              + non-clickable. Static_carousel (non-singleton) is always
 *              available — admin can place multiple.
 *
 *   • Collection — list of existing collections (fetched from
 *                  /api/admin/collections). Admin picks one to place.
 *                  Inline link to /admin/content/collections to create
 *                  a new collection (which then shows up in this list).
 *
 * On select → POST /api/admin/page-sections → parent reloads the
 * section list + preview.
 */

import { useEffect, useMemo, useState } from "react";
import { compatibleWidgets, isWidgetSingleton } from "@/lib/layout/widgets";
import type { LayoutAudience, LayoutContext, WidgetSpec } from "@/lib/layout/types";

interface ExistingCollection {
  id: string;
  type: "card" | "carousel";
  title: string;
  alias: string;
  source_category: string | null;
  is_published: boolean;
}

interface PlacedWidget {
  widget_key: string;
  audience: LayoutAudience;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: LayoutContext;
  category: string | null;
  /** Default audience for newly-created sections. Admin can override
   *  the row's audience afterward via the inline picker. */
  defaultAudience: LayoutAudience;
  /** What's already placed in this bucket — used to disable singleton
   *  widgets that can't be placed twice. */
  placedWidgets: PlacedWidget[];
  /** Fires after a section is successfully created. Parent should
   *  reload sections + bump preview key. */
  onCreated: () => void;
}

export function SectionPickerModal({
  open, onClose, context, category, defaultAudience, placedWidgets, onCreated,
}: Props) {
  const [tab, setTab] = useState<"widget" | "collection">("widget");
  const [collections, setCollections] = useState<ExistingCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [creating, setCreating] = useState<string | null>(null); // widget_key or collection_id being created
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Body scroll lock + ESC close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Lazy-fetch collections only when the tab is opened.
  useEffect(() => {
    if (!open || tab !== "collection" || collections.length > 0 || loadingCollections) return;
    setLoadingCollections(true);
    fetch("/api/admin/collections", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        // The /api/admin/collections endpoint returns either a flat array
        // OR an array of placements (depending on params). Without query
        // params it returns ALL collection placements — we want the raw
        // collections list. Fall back to deriving from placements if so.
        if (Array.isArray(data)) {
          // Looks like placements — pull the nested collection objects.
          const seen = new Set<string>();
          const out: ExistingCollection[] = [];
          for (const row of data) {
            const c = row?.collections ?? row;
            if (c?.id && !seen.has(c.id)) {
              seen.add(c.id);
              out.push({
                id: c.id,
                type: c.type,
                title: c.title,
                alias: c.alias,
                source_category: c.source_category,
                is_published: c.is_published ?? true,
              });
            }
          }
          setCollections(out);
        } else if (Array.isArray(data?.collections)) {
          setCollections(data.collections);
        } else {
          setCollections([]);
        }
      })
      .catch(() => setCollections([]))
      .finally(() => setLoadingCollections(false));
  }, [open, tab, collections.length, loadingCollections]);

  // Compute widget availability — singletons already in this bucket
  // are disabled.
  const widgets = useMemo(() => {
    const all = compatibleWidgets(context, category, defaultAudience);
    return all.map((w) => {
      const isSingleton = isWidgetSingleton(w.key);
      const placed = placedWidgets.some((p) => p.widget_key === w.key && p.audience === defaultAudience);
      return { spec: w, disabled: isSingleton && placed, placedReason: isSingleton && placed ? "Ήδη τοποθετημένο" : null };
    });
  }, [context, category, defaultAudience, placedWidgets]);

  async function addWidget(spec: WidgetSpec) {
    setCreating(spec.key);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/page-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          category,
          section_type: "widget",
          widget_key: spec.key,
          audience: defaultAudience,
          config: defaultConfigFor(spec),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Αποτυχία δημιουργίας section");
        return;
      }
      onCreated();
      onClose();
    } finally {
      setCreating(null);
    }
  }

  async function addCollection(c: ExistingCollection) {
    setCreating(c.id);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/page-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          category,
          section_type: "collection",
          collection_id: c.id,
          audience: defaultAudience,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Αποτυχία δημιουργίας section");
        return;
      }
      onCreated();
      onClose();
    } finally {
      setCreating(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Πρόσθεσε section</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Audience: <span className="font-semibold">{audienceLabel(defaultAudience)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
            aria-label="Κλείσιμο"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-1 border-b border-zinc-200">
          {(["widget", "collection"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-coral-500 text-coral-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t === "widget" ? "Widget" : "Collection"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {errorMsg && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {tab === "widget" ? (
            <div className="grid grid-cols-2 gap-2">
              {widgets.map(({ spec, disabled, placedReason }) => (
                <button
                  key={spec.key}
                  onClick={() => !disabled && addWidget(spec)}
                  disabled={disabled || creating === spec.key}
                  className={`text-left px-3 py-3 rounded-md border transition-colors ${
                    disabled
                      ? "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
                      : "border-zinc-200 hover:border-coral-300 hover:bg-coral-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0" aria-hidden>{spec.icon ?? "▫"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900">{spec.label}</div>
                      {spec.description && (
                        <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{spec.description}</div>
                      )}
                      {placedReason && (
                        <div className="text-[11px] text-zinc-400 mt-1">{placedReason}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {widgets.length === 0 && (
                <div className="col-span-2 text-center py-8 text-sm text-zinc-500">
                  Δεν υπάρχουν διαθέσιμα widgets για αυτή την σελίδα.
                </div>
              )}
            </div>
          ) : (
            <CollectionsList
              collections={collections}
              loading={loadingCollections}
              category={category}
              creating={creating}
              onPick={addCollection}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Collections sub-list ──────────────────────────────────────────── */

function CollectionsList({
  collections, loading, category, creating, onPick,
}: {
  collections: ExistingCollection[];
  loading: boolean;
  category: string | null;
  creating: string | null;
  onPick: (c: ExistingCollection) => void;
}) {
  // Show collections whose source_category matches the current page
  // first; cross-category collections (source_category=null) next.
  const relevant = collections.filter((c) => !c.source_category || c.source_category === category);
  const rest = collections.filter((c) => c.source_category && c.source_category !== category);

  if (loading) return <div className="text-sm text-zinc-500 py-4">Φόρτωση…</div>;
  if (collections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-600 mb-3">Δεν υπάρχουν collections ακόμη.</p>
        <a
          href="/admin/content/collections"
          target="_blank"
          rel="noopener"
          className="inline-block text-sm text-coral-700 font-semibold hover:underline"
        >
          Δημιουργία νέου collection →
        </a>
      </div>
    );
  }

  return (
    <>
      {relevant.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Συμβατά με αυτή τη σελίδα
          </div>
          <div className="space-y-1.5 mb-4">
            {relevant.map((c) => (
              <CollectionRow key={c.id} c={c} creating={creating === c.id} onPick={() => onPick(c)} />
            ))}
          </div>
        </>
      )}
      {rest.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Άλλες κατηγορίες
          </div>
          <div className="space-y-1.5">
            {rest.map((c) => (
              <CollectionRow key={c.id} c={c} creating={creating === c.id} onPick={() => onPick(c)} />
            ))}
          </div>
        </>
      )}
      <div className="mt-5 pt-4 border-t border-zinc-100">
        <a
          href="/admin/content/collections"
          target="_blank"
          rel="noopener"
          className="text-sm text-coral-700 font-semibold hover:underline"
        >
          + Δημιουργία νέου collection
        </a>
      </div>
    </>
  );
}

function CollectionRow({ c, creating, onPick }: { c: ExistingCollection; creating: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      disabled={creating || !c.is_published}
      className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
        !c.is_published
          ? "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
          : "border-zinc-200 hover:border-coral-300 hover:bg-coral-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg shrink-0" aria-hidden>📦</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-900 truncate">{c.title}</div>
          <div className="text-[11px] text-zinc-500">
            {c.type} · {c.source_category ?? "cross-category"}
            {!c.is_published && <span className="ml-2 text-zinc-400">· Unpublished</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function audienceLabel(a: LayoutAudience): string {
  return a === "all" ? "Όλοι" : a === "registered" ? "Εγγεγραμμένοι" : "Επισκέπτες";
}

function defaultConfigFor(spec: WidgetSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!spec.configSchema) return out;
  for (const f of spec.configSchema) {
    if ("defaultValue" in f && f.defaultValue !== undefined) {
      out[f.key] = f.defaultValue;
    }
  }
  return out;
}
