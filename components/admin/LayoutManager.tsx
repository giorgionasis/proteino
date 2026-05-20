"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CATEGORIES } from "@/constants/categories";
import { getWidget } from "@/lib/layout/widgets";
import type {
  LayoutAudience,
  LayoutContext,
  PageSectionRow,
  ResolvedCollection,
} from "@/lib/layout/types";
import { SectionPickerModal } from "./SectionPickerModal";
import { SectionConfigDrawer } from "./SectionConfigDrawer";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowAuditFooter } from "@/components/admin/ui/RowAuditFooter";
import type { AdminUserMap } from "@/lib/admin/audit";

/* ─── Types ─────────────────────────────────────────────────────────── */

type AdminPreviewAudience = "all" | "registered" | "guest";

interface ApiSectionRow extends PageSectionRow {
  /** Joined collection metadata for collection-type rows. */
  collection?: (ResolvedCollection & { is_published?: boolean }) | null;
}

interface BucketKey {
  context: LayoutContext;
  category: string | null;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const PAGES: { key: string; label: string; context: LayoutContext; category: string | null; icon?: string }[] = [
  { key: "home", label: "Αρχική", context: "home", category: null, icon: "🏠" },
  ...CATEGORIES.map((c) => ({
    key: `cat:${c.slug}`,
    label: c.labelEl,
    context: "category" as const,
    category: c.slug,
    icon: c.icon,
  })),
];

const AUDIENCE_OPTIONS: { value: AdminPreviewAudience; label: string }[] = [
  { value: "all",        label: "Όλοι" },
  { value: "registered", label: "Εγγεγραμμένοι" },
  { value: "guest",      label: "Επισκέπτες" },
];

/* ─── Main manager ──────────────────────────────────────────────────── */

export function LayoutManager() {
  const { show, toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ApiSectionRow | null>(null);
  const [pageKey, setPageKey] = useState<string>("cat:movies");
  const [audience, setAudience] = useState<AdminPreviewAudience>("all");
  const [sections, setSections] = useState<ApiSectionRow[]>([]);
  const [userMap, setUserMap] = useState<AdminUserMap>({});
  const [loading, setLoading] = useState(true);
  const [savingReorder, setSavingReorder] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to reload iframe
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ApiSectionRow | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /* ── Scroll iframe to a specific section via postMessage ── */
  const scrollToSection = (sectionId: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "scroll-to-section", sectionId },
      window.location.origin,
    );
  };

  const bucket: BucketKey = (() => {
    const p = PAGES.find((x) => x.key === pageKey)!;
    return { context: p.context, category: p.category };
  })();

  /* ── Fetch sections ── */

  const load = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/page-sections", window.location.origin);
      url.searchParams.set("context", bucket.context);
      if (bucket.category) url.searchParams.set("category", bucket.category);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      setSections((data?.sections ?? []) as ApiSectionRow[]);
      setUserMap((data?.userMap ?? {}) as AdminUserMap);
    } catch (e) {
      console.error("[LayoutManager] load failed", e);
      setSections([]);
      setUserMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  /* ── Reorder ── */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const next = arrayMove(sections, oldIdx, newIdx);
    setSections(next);
    setSavingReorder(true);
    try {
      await fetch("/api/admin/page-sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: bucket.context,
          category: bucket.category,
          ordered_ids: next.map((s) => s.id),
        }),
      });
      setPreviewKey((k) => k + 1);
    } catch (err) {
      console.error("[LayoutManager] reorder failed", err);
      // Revert
      setSections(sections);
    } finally {
      setSavingReorder(false);
    }
  }

  /* ── Toggle active ── */

  async function toggleActive(row: ApiSectionRow) {
    setBusyId(row.id);
    const next = sections.map((s) => (s.id === row.id ? { ...s, is_active: !s.is_active } : s));
    setSections(next);
    try {
      await fetch(`/api/admin/page-sections/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      setPreviewKey((k) => k + 1);
    } catch (err) {
      console.error("[LayoutManager] toggle failed", err);
      // Revert
      setSections(sections);
    } finally {
      setBusyId(null);
    }
  }

  /* ── Change audience of a single row ── */

  async function changeRowAudience(row: ApiSectionRow, newAudience: LayoutAudience) {
    setBusyId(row.id);
    const next = sections.map((s) => (s.id === row.id ? { ...s, audience: newAudience } : s));
    setSections(next);
    try {
      await fetch(`/api/admin/page-sections/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: newAudience }),
      });
      setPreviewKey((k) => k + 1);
    } catch (err) {
      console.error("[LayoutManager] audience change failed", err);
      setSections(sections);
    } finally {
      setBusyId(null);
    }
  }

  /* ── Delete ── */

  function handleDelete(row: ApiSectionRow) {
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    const row = deleteTarget;
    if (!row) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/page-sections/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        show(data?.error ?? "Αποτυχία διαγραφής", { tone: "error" });
        return;
      }
      setSections(sections.filter((s) => s.id !== row.id));
      setPreviewKey((k) => k + 1);
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  /* ── Render ── */

  const currentPage = PAGES.find((p) => p.key === pageKey)!;
  const previewSrc = buildPreviewSrc(bucket.context, bucket.category, audience, previewKey);

  // Default audience for newly-created sections — match what the admin
  // is currently previewing. Falls back to 'all' when admin selected
  // the "All" preview filter.
  const newSectionDefaultAudience: LayoutAudience =
    audience === "all" ? "all" : audience;

  return (
    <>
    <div className="flex h-[calc(100vh-0px)]">
      {/* Page picker (left rail) */}
      <PagePicker selected={pageKey} onSelect={setPageKey} />

      {/* Section stack (middle column) */}
      <div className="flex-1 min-w-0 border-r border-zinc-200 overflow-y-auto bg-zinc-50">
        <div className="px-6 py-5 border-b border-zinc-200 bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold text-zinc-900">
            Layout — {currentPage.label}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Συνθέτει την Αρχική και κάθε σελίδα κατηγορίας. Σύρε για αναδιάταξη, πάτα ένα section για επεξεργασία. Live preview στα δεξιά.
          </p>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="text-sm text-zinc-500">Φόρτωση…</div>
          ) : sections.length === 0 ? (
            <EmptyBucket bucket={bucket} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sections.map((s) => (
                    <SortableSection
                      key={s.id}
                      row={s}
                      busy={busyId === s.id}
                      userMap={userMap}
                      onToggleActive={() => toggleActive(s)}
                      onChangeAudience={(a) => changeRowAudience(s, a)}
                      onDelete={() => handleDelete(s)}
                      onEdit={() => setEditingRow(s)}
                      onScrollTo={() => scrollToSection(s.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button
            onClick={() => setPickerOpen(true)}
            className="mt-4 w-full py-3 rounded-md border-2 border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:border-coral-500 hover:text-coral-600 transition-colors"
          >
            + Πρόσθεσε section
          </button>

          {savingReorder && (
            <div className="mt-3 text-xs text-zinc-500 flex items-center gap-2">
              <Spinner /> Αποθήκευση σειράς…
            </div>
          )}
        </div>
      </div>

      {/* Preview pane (right rail) */}
      <PreviewPane
        audience={audience}
        onAudienceChange={setAudience}
        src={previewSrc}
        previewKey={previewKey}
        onReload={() => setPreviewKey((k) => k + 1)}
        iframeRef={iframeRef}
      />
    </div>

    <SectionPickerModal
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      context={bucket.context}
      category={bucket.category}
      defaultAudience={newSectionDefaultAudience}
      placedWidgets={sections
        .filter((s) => s.section_type === "widget" && s.widget_key)
        .map((s) => ({ widget_key: s.widget_key!, audience: s.audience }))}
      onCreated={() => {
        load();
        setPreviewKey((k) => k + 1);
      }}
    />

    <SectionConfigDrawer
      open={editingRow !== null}
      onClose={() => setEditingRow(null)}
      row={editingRow}
      onSaved={() => {
        load();
        setPreviewKey((k) => k + 1);
      }}
    />
    <ConfirmDialog
      open={deleteTarget !== null}
      title="Διαγραφή ενότητας;"
      subtitle={deleteTarget ? sectionLabel(deleteTarget) : ""}
      message="Η ενότητα θα αφαιρεθεί από το layout. Μπορείς να την προσθέσεις ξανά αργότερα."
      confirmLabel="Διαγραφή"
      tone="danger"
      pending={busyId === deleteTarget?.id}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />
    {toast}
    </>
  );
}

/* ─── Page picker ───────────────────────────────────────────────────── */

function PagePicker({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-zinc-200 overflow-y-auto bg-white">
      <div className="px-4 py-5 border-b border-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Σελίδες</h2>
      </div>
      <div className="p-2 space-y-1">
        {PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
              selected === p.key
                ? "bg-coral-50 text-coral-700 font-semibold"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <span className="text-base" aria-hidden>{p.icon ?? "📄"}</span>
            <span className="flex-1">{p.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ─── Section row (draggable) ───────────────────────────────────────── */

function SortableSection({
  row,
  busy,
  userMap,
  onToggleActive,
  onChangeAudience,
  onDelete,
  onEdit,
  onScrollTo,
}: {
  row: ApiSectionRow;
  busy: boolean;
  userMap: AdminUserMap;
  onToggleActive: () => void;
  onChangeAudience: (a: LayoutAudience) => void;
  onDelete: () => void;
  onEdit: () => void;
  onScrollTo: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const spec = row.section_type === "widget" && row.widget_key ? getWidget(row.widget_key) : undefined;
  const isFixed = spec?.fixed === true;
  const label = sectionLabel(row);
  const icon = sectionIcon(row);
  const typeChip = sectionTypeChip(row);
  const inactive = !row.is_active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onScrollTo}
      className={`group flex items-center gap-3 bg-white border rounded-md py-2 pr-2 cursor-pointer ${
        inactive ? "border-zinc-200 opacity-60" : "border-zinc-200 hover:border-coral-200"
      }`}
      title="Κλικ για να το βρεις στο preview"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="px-2 py-2 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Σύρε για να αλλάξεις θέση"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Icon */}
      <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-zinc-50 text-lg" aria-hidden>
        {icon}
      </span>

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 truncate">{label}</span>
          {isFixed && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
              🔒 fixed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
          <span>{typeChip}</span>
          <span className="text-zinc-300">·</span>
          <AudiencePicker value={row.audience} onChange={onChangeAudience} />
          {row.config && Object.keys(row.config).length > 0 && row.section_type === "widget" && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-500 truncate" title={JSON.stringify(row.config)}>
                {summarizeConfig(row.config)}
              </span>
            </>
          )}
          {row.modified_at && (
            <>
              <span className="text-zinc-300">·</span>
              <RowAuditFooter
                modifiedAt={row.modified_at}
                modifiedById={row.modified_by}
                userMap={userMap}
              />
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
          disabled={busy}
          className={`w-9 h-7 rounded-full inline-flex items-center px-0.5 transition-colors ${
            row.is_active ? "bg-emerald-500" : "bg-zinc-200"
          }`}
          aria-label={row.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
        >
          <span
            className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
              row.is_active ? "translate-x-2" : "translate-x-0"
            }`}
          />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Επεξεργασία"
          title="Επεξεργασία"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isFixed || busy}
          className={`p-1.5 rounded transition-opacity ${
            isFixed
              ? "text-zinc-300 cursor-not-allowed"
              : "text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
          }`}
          aria-label="Διαγραφή"
          title={isFixed ? "Δεν διαγράφεται (structural)" : "Διαγραφή"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Audience inline picker ────────────────────────────────────────── */

function AudiencePicker({ value, onChange }: { value: LayoutAudience; onChange: (v: LayoutAudience) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LayoutAudience)}
      onClick={(e) => e.stopPropagation()}
      className="text-[11px] bg-transparent border-none focus:outline-none cursor-pointer text-zinc-500 hover:text-zinc-700"
    >
      <option value="all">Όλοι</option>
      <option value="registered">Εγγεγραμμένοι</option>
      <option value="guest">Επισκέπτες</option>
    </select>
  );
}

/* ─── Preview pane ──────────────────────────────────────────────────── */

function PreviewPane({
  audience,
  onAudienceChange,
  src,
  previewKey,
  onReload,
  iframeRef,
}: {
  audience: AdminPreviewAudience;
  onAudienceChange: (a: AdminPreviewAudience) => void;
  src: string;
  previewKey: number;
  onReload: () => void;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
}) {
  return (
    <aside className="w-[420px] shrink-0 bg-zinc-100 overflow-y-auto flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Preview</h2>
          <button
            onClick={onReload}
            className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded"
            title="Reload preview"
          >
            ↻
          </button>
        </div>
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-md">
          {AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onAudienceChange(opt.value)}
              className={`flex-1 text-xs py-1.5 rounded ${
                audience === opt.value
                  ? "bg-white text-zinc-900 font-semibold shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5 overflow-y-auto">
        <PhoneFrame>
          <iframe
            ref={iframeRef}
            key={previewKey}
            src={src}
            className="w-full h-full border-0"
            title="Layout preview"
          />
        </PhoneFrame>
      </div>
    </aside>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-zinc-950 rounded-[40px] p-2 shadow-xl"
      style={{ width: 360, height: 740 }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-3 bg-zinc-950 rounded-b-2xl z-10"
        style={{ width: 100, height: 22 }}
      />
      <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */

function EmptyBucket({ bucket }: { bucket: BucketKey }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3" aria-hidden>📐</div>
      <p className="text-sm font-semibold text-zinc-800 mb-1">
        Δεν υπάρχουν sections ακόμα
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Η σελίδα ({bucket.context}{bucket.category ? ` / ${bucket.category}` : ""}) δεν έχει σχηματίσει layout.
        Είτε δεν εφαρμόστηκε το seed migration 032, είτε δεν υπάρχουν widgets για αυτή την σελίδα.
      </p>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function sectionLabel(row: ApiSectionRow): string {
  if (row.section_type === "widget" && row.widget_key) {
    const spec = getWidget(row.widget_key);
    if (spec) {
      // For static_carousel, surface the configured title.
      const title = (row.config as { title?: string })?.title;
      if (row.widget_key === "static_carousel" && title) return `${spec.label} — “${title}”`;
      return spec.label;
    }
    return row.widget_key;
  }
  if (row.section_type === "collection" && row.collection) {
    return row.collection.title || "Collection χωρίς τίτλο";
  }
  if (row.section_type === "divider") return "Divider";
  return row.section_type;
}

function sectionIcon(row: ApiSectionRow): string {
  if (row.section_type === "widget" && row.widget_key) {
    return getWidget(row.widget_key)?.icon ?? "▫";
  }
  if (row.section_type === "collection") return "📦";
  if (row.section_type === "divider") return "—";
  return "▫";
}

function sectionTypeChip(row: ApiSectionRow): string {
  if (row.section_type === "collection") return "Collection";
  if (row.section_type === "widget")     return "Widget";
  return "Divider";
}

function summarizeConfig(config: Record<string, unknown>): string {
  // Compact one-line summary for the section row. Skip the title since it's
  // already in the label.
  const skip = new Set(["title"]);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(config)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  return parts.slice(0, 3).join(" · ");
}

function buildPreviewSrc(
  context: LayoutContext,
  category: string | null,
  audience: AdminPreviewAudience,
  bust: number,
): string {
  // /preview/ routes live outside (main) so the iframe gets a clean
  // mobile-frame render — no global header, no bottom nav, no FAB.
  // /preview/category/[slug] honours `?audience=…` server-side so the
  // admin can flip viewer types without logging out.
  const base =
    context === "home"           ? "/preview/home" :
    category                     ? `/preview/category/${category}` :
    "/preview/home";
  const params = new URLSearchParams({
    audience,
    _: String(bust),
  });
  return `${base}?${params.toString()}`;
}

/* ─── Tiny inline spinner ───────────────────────────────────────────── */

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="40" strokeDashoffset="20" strokeLinecap="round" />
    </svg>
  );
}

