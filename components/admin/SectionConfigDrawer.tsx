"use client";

/**
 * Section config drawer.
 *
 * Opens when the admin clicks the pencil icon on a section row. The
 * form auto-renders from the widget's `configSchema` (registered in
 * lib/layout/widgets.ts). Collection rows show a link to the existing
 * CollectionEditor instead — config for collections lives there.
 *
 * Save → PATCH /api/admin/page-sections/[id] with the updated config
 * + audience + lifecycle.
 */

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/constants/categories";
import { getWidget } from "@/lib/layout/widgets";
import type {
  ConfigField,
  LayoutAudience,
  PageSectionRow,
  ResolvedCollection,
} from "@/lib/layout/types";

interface SectionRow extends PageSectionRow {
  collection?: (ResolvedCollection & { is_published?: boolean }) | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  row: SectionRow | null;
  onSaved: () => void;
}

export function SectionConfigDrawer({ open, onClose, row, onSaved }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [audience, setAudience] = useState<LayoutAudience>("all");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Seed form state when the drawer opens for a new row.
  useEffect(() => {
    if (!row) return;
    setConfig({ ...(row.config ?? {}) });
    setAudience(row.audience);
    setValidFrom(row.valid_from ? row.valid_from.slice(0, 16) : "");
    setValidUntil(row.valid_until ? row.valid_until.slice(0, 16) : "");
    setErrorMsg(null);
  }, [row]);

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

  if (!open || !row) return null;

  const spec = row.section_type === "widget" && row.widget_key ? getWidget(row.widget_key) : null;
  const schema: ConfigField[] = spec?.configSchema ?? [];

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const body: Record<string, unknown> = {
        audience,
        valid_from: validFrom ? new Date(validFrom).toISOString() : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      };
      if (row.section_type === "widget" && schema.length > 0) {
        body.config = config;
      }
      const res = await fetch(`/api/admin/page-sections/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Αποτυχία αποθήκευσης");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white shadow-2xl w-full max-w-md h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 truncate">
              {spec ? spec.label : row.collection?.title ?? "Section"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {row.section_type === "widget" ? `widget · ${row.widget_key}` : `collection · ${row.collection?.alias ?? ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors shrink-0"
            aria-label="Κλείσιμο"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Collection link (collections don't have inline config) */}
          {row.section_type === "collection" && row.collection && (
            <div className="rounded-md border border-zinc-200 p-3 bg-zinc-50">
              <p className="text-xs text-zinc-600 mb-2">
                Το περιεχόμενο αυτής της collection (τίτλος, source category, tags, filters) επεξεργάζεται στη σελίδα Collections.
              </p>
              <a
                href={`/admin/content/collections/${row.collection.id}`}
                target="_blank"
                rel="noopener"
                className="text-sm text-coral-700 font-semibold hover:underline"
              >
                Άνοιξε στο Collections editor →
              </a>
            </div>
          )}

          {/* Widget config schema fields */}
          {row.section_type === "widget" && schema.length > 0 && (
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Ρυθμίσεις
              </legend>
              {schema.map((field) => (
                <ConfigFieldInput
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onChange={(v) => setConfig({ ...config, [field.key]: v })}
                />
              ))}
            </fieldset>
          )}

          {row.section_type === "widget" && schema.length === 0 && (
            <p className="text-sm text-zinc-500">
              Αυτό το widget δεν έχει διαμορφώσιμες παραμέτρους.
            </p>
          )}

          {/* Audience */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Audience
            </legend>
            <div className="flex gap-1 p-1 bg-zinc-100 rounded-md">
              {(["all", "registered", "guest"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`flex-1 text-xs py-2 rounded transition-colors ${
                    audience === a ? "bg-white text-zinc-900 font-semibold shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {a === "all" ? "Όλοι" : a === "registered" ? "Εγγεγραμμένοι" : "Επισκέπτες"}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Lifecycle */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Διάρκεια εμφάνισης (προαιρετικό)
            </legend>
            <label className="block">
              <span className="text-xs text-zinc-600">Έναρξη</span>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-600">Λήξη</span>
              <input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none"
              />
            </label>
            <p className="text-[11px] text-zinc-400">
              Άφησε άδειο για μόνιμη εμφάνιση.
            </p>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Ακύρωση
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-coral-600 hover:bg-coral-700 rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? "Αποθήκευση…" : "Αποθήκευση"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Field input ───────────────────────────────────────────────────── */

function ConfigFieldInput({
  field, value, onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <span className="text-xs font-medium text-zinc-700 block mb-1">{field.label}</span>
  );

  switch (field.kind) {
    case "text":
      return (
        <label className="block">
          {label}
          <input
            type="text"
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none"
          />
        </label>
      );

    case "textarea":
      return (
        <label className="block">
          {label}
          <textarea
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            rows={field.rows ?? 3}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none resize-y"
          />
        </label>
      );

    case "number":
      return (
        <label className="block">
          {label}
          <input
            type="number"
            value={(value as number | string) ?? ""}
            min={field.min}
            max={field.max}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : Number(e.target.value);
              onChange(n);
            }}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none"
          />
        </label>
      );

    case "toggle":
      return (
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-700">{field.label}</span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 accent-coral-500"
          />
        </label>
      );

    case "select":
      return (
        <label className="block">
          {label}
          <select
            value={(value as string) ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none bg-white"
          >
            {!field.defaultValue && <option value="">—</option>}
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );

    case "category":
      return (
        <label className="block">
          {label}
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus:border-coral-400 focus:outline-none bg-white"
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.labelEl}</option>
            ))}
          </select>
        </label>
      );

    case "item-source":
      return (
        <label className="block">
          {label}
          <p className="text-xs text-zinc-400">Item source picker — coming soon</p>
        </label>
      );
  }
}
