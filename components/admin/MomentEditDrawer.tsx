"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import { BookmarkSavedModal } from "@/components/detail/BookmarkSavedModal";
import type { MomentRow, PredicateSchema } from "@/lib/moments";

/**
 * Side drawer for creating / editing one moment. Local form state ↔
 * onSave PATCH/POST. Preview pane on the right renders the moment in
 * its target surface with sample data so the admin sees the result
 * before saving.
 *
 * Layout: 720px wide on desktop, full-width on small screens. Sticky
 * action bar at the bottom (Save / Cancel).
 */

const SURFACES = [
  "achievement_modal",
  "bookmark_modal",
  "toast",
  "banner",
  "published_pill",
  "notification",
] as const;

const TRIGGERS = [
  "suggestion_published",
  "bookmark_created",
  "bookmark_status_changed",
  "rating_submitted",
  "follow_created",
  "search_logged",
  "dormant_14d",
  "event_tomorrow",
  "series_new_season",
  "daily_first_open",
] as const;

const PLACEHOLDERS = [
  { key: "{count}",              hint: "Ο τρέχων αριθμός (π.χ. το suggestion_count μετά την δημοσίευση)" },
  { key: "{target}",              hint: "Ο επόμενος στόχος (3 / 10 / 25 / 50)" },
  { key: "{remaining}",          hint: "Πόσα μένουν για τον στόχο" },
  { key: "{ordinal}",            hint: "Ελληνικά ordinals ('πρώτο' / 'δεύτερό' / 'τρίτο' / 'τέταρτο') ανά tier" },
  { key: "{category}",           hint: "Slug κατηγορίας (movies, books, food, ...)" },
  { key: "{category_noun}",      hint: "Singular ('ταινία', 'βιβλίο', 'εστιατόριο', ...)" },
  { key: "{category_list_noun}", hint: "Plural genitive ('ταινίες', 'βιβλία', 'εστιατόρια', ...)" },
  { key: "{handle}",             hint: "Το handle του χρήστη" },
  { key: "{first_name}",         hint: "Το πρώτο όνομα από το display_name" },
];

const CATEGORIES_FOR_PREVIEW = ["movies", "series", "books", "food", "bars", "hotels", "theater", "events", "recipes"];

interface Props {
  target:           MomentRow | "new";
  predicateSchemas: Record<string, PredicateSchema>;
  onSave:           (patch: Partial<MomentRow>, target: MomentRow | "new") => Promise<void>;
  onClose:          () => void;
}

interface FormState {
  key:            string;
  label:          string;
  surface:        string;
  trigger_event:  string;
  predicate_key:  string;
  predicate_args: Record<string, unknown>;
  copy: {
    title:      string;
    subtitle:   string;
    body:       string;
    cta_label:  string;
    cta_href:   string;
  };
  display: {
    delay_ms:        string;  // form values stay as strings for empty-state handling
    auto_dismiss_ms: string;
    dark_theme:      boolean;
    variant:         string;
    badge:           string;
    target:          string;
  };
  priority:      number;
  variant_group: string;
  is_active:     boolean;
  valid_from:    string;
  valid_until:   string;
}

function rowToForm(row: MomentRow | "new"): FormState {
  if (row === "new") {
    return {
      key:           "",
      label:         "",
      surface:       "achievement_modal",
      trigger_event: "suggestion_published",
      predicate_key: "always",
      predicate_args: {},
      copy:    { title: "", subtitle: "", body: "", cta_label: "", cta_href: "" },
      display: { delay_ms: "", auto_dismiss_ms: "", dark_theme: false, variant: "", badge: "", target: "" },
      priority:      100,
      variant_group: "",
      is_active:     true,
      valid_from:    "",
      valid_until:   "",
    };
  }
  const d = row.display ?? {};
  return {
    key:            row.key,
    label:          row.label ?? "",
    surface:        row.surface,
    trigger_event:  row.trigger_event,
    predicate_key:  row.predicate_key,
    predicate_args: (row.predicate_args ?? {}) as Record<string, unknown>,
    copy: {
      title:      (row.copy?.title    ?? "") as string,
      subtitle:   (row.copy?.subtitle ?? "") as string,
      body:       (row.copy?.body     ?? "") as string,
      cta_label:  (row.copy?.cta_label ?? "") as string,
      cta_href:   (row.copy?.cta_href  ?? "") as string,
    },
    display: {
      delay_ms:        d.delay_ms        != null ? String(d.delay_ms)        : "",
      auto_dismiss_ms: d.auto_dismiss_ms != null ? String(d.auto_dismiss_ms) : "",
      dark_theme:      !!d.dark_theme,
      variant:         (d.variant as string) ?? "",
      badge:           (d.badge   as string) ?? "",
      target:          d.target != null ? String(d.target) : "",
    },
    priority:      row.priority,
    variant_group: row.variant_group ?? "",
    is_active:     row.is_active,
    valid_from:    row.valid_from  ?? "",
    valid_until:   row.valid_until ?? "",
  };
}

function formToPatch(s: FormState): Partial<MomentRow> {
  const display: Record<string, unknown> = {};
  if (s.display.delay_ms.trim())        display.delay_ms        = Number(s.display.delay_ms);
  if (s.display.auto_dismiss_ms.trim()) display.auto_dismiss_ms = Number(s.display.auto_dismiss_ms);
  if (s.display.dark_theme)             display.dark_theme      = true;
  if (s.display.variant.trim())         display.variant         = s.display.variant;
  if (s.display.badge.trim())           display.badge           = s.display.badge;
  if (s.display.target.trim())          display.target          = Number(s.display.target);

  const copy: Record<string, string> = {};
  if (s.copy.title    !== "") copy.title    = s.copy.title;
  if (s.copy.subtitle !== "") copy.subtitle = s.copy.subtitle;
  if (s.copy.body     !== "") copy.body     = s.copy.body;
  if (s.copy.cta_label !== "") copy.cta_label = s.copy.cta_label;
  if (s.copy.cta_href  !== "") copy.cta_href  = s.copy.cta_href;

  return {
    key:            s.key.trim(),
    label:          s.label.trim() || null,
    surface:        s.surface as any,
    trigger_event:  s.trigger_event as any,
    predicate_key:  s.predicate_key,
    predicate_args: s.predicate_args,
    copy:           copy as any,
    display:        display as any,
    priority:       s.priority,
    variant_group:  s.variant_group.trim() || null,
    is_active:      s.is_active,
    valid_from:     s.valid_from || null,
    valid_until:    s.valid_until || null,
  };
}

export function MomentEditDrawer({ target, predicateSchemas, onSave, onClose }: Props) {
  const [form,    setForm]    = useState<FormState>(() => rowToForm(target));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState("movies");

  // Lock body scroll while drawer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const schema = predicateSchemas[form.predicate_key];
  const argFields = schema ? Object.entries(schema.args) : [];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.key.trim()) throw new Error("Το πεδίο `key` είναι υποχρεωτικό.");
      await onSave(formToPatch(form), target);
    } catch (e: any) {
      console.error("[moment-edit] save failed", e);
      setError(e?.message ?? "Αποθήκευση απέτυχε.");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="ml-auto relative w-full max-w-[1080px] bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-zinc-200">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {target === "new" ? "ΝΕΟ MOMENT" : "ΕΠΕΞΕΡΓΑΣΙΑ"}
            </p>
            <h2 className="text-[20px] font-semibold text-zinc-950 leading-tight mt-1 truncate">
              {form.label || form.key || "Χωρίς όνομα"}
            </h2>
            {form.label && form.key && (
              <p className="text-[11px] font-mono text-zinc-400 mt-1 truncate">{form.key}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors"
            aria-label="Κλείσιμο"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6"  y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Body — two columns: form + preview */}
        <div className="flex-1 overflow-hidden flex">
          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 border-r border-zinc-200">

            {/* Identity */}
            <Section title="Ταυτότητα">
              <Field label="Key (μοναδικό slug)" required>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="achievement.verified.unlock"
                  className="form-input"
                />
              </Field>
              <Field label="Label (εμφανίζεται στη λίστα admin)">
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Achievement · Verified unlocked (3)"
                  className="form-input"
                />
              </Field>
            </Section>

            {/* Trigger */}
            <Section title="Πότε εμφανίζεται">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Surface">
                  <select
                    value={form.surface}
                    onChange={(e) => setForm({ ...form, surface: e.target.value })}
                    className="form-input"
                  >
                    {SURFACES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Trigger event">
                  <select
                    value={form.trigger_event}
                    onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                    className="form-input"
                  >
                    {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Predicate (συνθήκη ενεργοποίησης)">
                <select
                  value={form.predicate_key}
                  onChange={(e) => setForm({ ...form, predicate_key: e.target.value, predicate_args: {} })}
                  className="form-input"
                >
                  {Object.entries(predicateSchemas).map(([k, s]) => (
                    <option key={k} value={k}>{s.label}</option>
                  ))}
                </select>
                {schema?.description && (
                  <p className="mt-1 text-[11px] text-zinc-500">{schema.description}</p>
                )}
              </Field>

              {argFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-zinc-50 border border-zinc-100">
                  {argFields.map(([argKey, argDef]) => (
                    <Field key={argKey} label={argDef.label}>
                      {argDef.type === "category" ? (
                        <select
                          value={(form.predicate_args[argKey] as string) ?? ""}
                          onChange={(e) => setForm({
                            ...form,
                            predicate_args: { ...form.predicate_args, [argKey]: e.target.value || undefined },
                          })}
                          className="form-input"
                        >
                          <option value="">(όλες οι κατηγορίες)</option>
                          {CATEGORIES_FOR_PREVIEW.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : argDef.type === "boolean" ? (
                        <label className="inline-flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            checked={!!form.predicate_args[argKey]}
                            onChange={(e) => setForm({
                              ...form,
                              predicate_args: { ...form.predicate_args, [argKey]: e.target.checked },
                            })}
                          />
                          <span className="text-sm text-zinc-700">{argDef.label}</span>
                        </label>
                      ) : (
                        <input
                          type={argDef.type === "integer" ? "number" : "text"}
                          value={String(form.predicate_args[argKey] ?? "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const v = argDef.type === "integer"
                              ? (raw === "" ? undefined : Number(raw))
                              : (raw === "" ? undefined : raw);
                            setForm({
                              ...form,
                              predicate_args: { ...form.predicate_args, [argKey]: v },
                            });
                          }}
                          className="form-input"
                        />
                      )}
                      {argDef.hint && <p className="mt-0.5 text-[11px] text-zinc-500">{argDef.hint}</p>}
                    </Field>
                  ))}
                </div>
              )}
            </Section>

            {/* Copy */}
            <Section
              title="Κείμενο μηνύματος"
              aside={
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700">
                    Placeholders
                  </summary>
                  <div className="mt-2 p-3 rounded-md bg-zinc-50 border border-zinc-100 space-y-1.5 min-w-[280px]">
                    {PLACEHOLDERS.map((p) => (
                      <div key={p.key}>
                        <code className="font-mono text-[11px] text-coral-700">{p.key}</code>
                        <span className="ml-2 text-zinc-500">— {p.hint}</span>
                      </div>
                    ))}
                    <p className="mt-2 pt-2 border-t border-zinc-200 text-zinc-500">
                      Για bold χρησιμοποίησε <code className="font-mono text-coral-700">**...**</code>
                    </p>
                  </div>
                </details>
              }
            >
              <Field label="Τίτλος">
                <input
                  type="text"
                  value={form.copy.title}
                  onChange={(e) => setForm({ ...form, copy: { ...form.copy, title: e.target.value } })}
                  placeholder="π.χ. Τα κατάφερες!"
                  className="form-input"
                />
              </Field>
              <Field label="Υπότιτλος">
                <textarea
                  value={form.copy.subtitle}
                  onChange={(e) => setForm({ ...form, copy: { ...form.copy, subtitle: e.target.value } })}
                  rows={2}
                  placeholder="π.χ. Μένει ακόμη **1** πρόταση και αποκτάς το {ordinal} σου επίτευγμα"
                  className="form-input"
                />
              </Field>
              <Field label="Σώμα">
                <textarea
                  value={form.copy.body}
                  onChange={(e) => setForm({ ...form, copy: { ...form.copy, body: e.target.value } })}
                  rows={3}
                  placeholder="π.χ. Ολοκλήρωσες **{count}** προτάσεις και..."
                  className="form-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA label">
                  <input
                    type="text"
                    value={form.copy.cta_label}
                    onChange={(e) => setForm({ ...form, copy: { ...form.copy, cta_label: e.target.value } })}
                    placeholder="(προαιρετικό)"
                    className="form-input"
                  />
                </Field>
                <Field label="CTA href">
                  <input
                    type="text"
                    value={form.copy.cta_href}
                    onChange={(e) => setForm({ ...form, copy: { ...form.copy, cta_href: e.target.value } })}
                    placeholder="(προαιρετικό)"
                    className="form-input"
                  />
                </Field>
              </div>
            </Section>

            {/* Display */}
            <Section title="Εμφάνιση + timing">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Delay (ms)">
                  <input
                    type="number"
                    value={form.display.delay_ms}
                    onChange={(e) => setForm({ ...form, display: { ...form.display, delay_ms: e.target.value } })}
                    placeholder="0"
                    className="form-input"
                  />
                </Field>
                <Field label="Auto-dismiss (ms)">
                  <input
                    type="number"
                    value={form.display.auto_dismiss_ms}
                    onChange={(e) => setForm({ ...form, display: { ...form.display, auto_dismiss_ms: e.target.value } })}
                    placeholder="(stays open)"
                    className="form-input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Variant">
                  <select
                    value={form.display.variant}
                    onChange={(e) => setForm({ ...form, display: { ...form.display, variant: e.target.value } })}
                    className="form-input"
                  >
                    <option value="">(none)</option>
                    <option value="progress">progress</option>
                    <option value="tier_unlock">tier_unlock</option>
                  </select>
                </Field>
                <Field label="Badge tier">
                  <select
                    value={form.display.badge}
                    onChange={(e) => setForm({ ...form, display: { ...form.display, badge: e.target.value } })}
                    className="form-input"
                  >
                    <option value="">(none)</option>
                    <option value="verified">verified</option>
                    <option value="gold">gold</option>
                    <option value="expert">expert</option>
                    <option value="platinum">platinum</option>
                  </select>
                </Field>
                <Field label="Target">
                  <input
                    type="number"
                    value={form.display.target}
                    onChange={(e) => setForm({ ...form, display: { ...form.display, target: e.target.value } })}
                    placeholder="3 / 10 / 25 / 50"
                    className="form-input"
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.display.dark_theme}
                  onChange={(e) => setForm({ ...form, display: { ...form.display, dark_theme: e.target.checked } })}
                />
                Dark theme
              </label>
            </Section>

            {/* Lifecycle */}
            <Section title="Lifecycle">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
                    className="form-input"
                  />
                </Field>
                <Field label="Variant group">
                  <input
                    type="text"
                    value={form.variant_group}
                    onChange={(e) => setForm({ ...form, variant_group: e.target.value })}
                    placeholder="(προαιρετικό — για A/B)"
                    className="form-input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valid from">
                  <input
                    type="datetime-local"
                    value={form.valid_from.slice(0, 16)}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="form-input"
                  />
                </Field>
                <Field label="Valid until">
                  <input
                    type="datetime-local"
                    value={form.valid_until.slice(0, 16)}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="form-input"
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Ενεργό (εμφανίζεται στους χρήστες)
              </label>
            </Section>
          </div>

          {/* Preview pane */}
          <aside className="w-[420px] bg-zinc-50 overflow-y-auto px-5 py-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                Preview
              </h3>
              <select
                value={previewCategory}
                onChange={(e) => setPreviewCategory(e.target.value)}
                className="h-7 px-2 rounded text-[11px] bg-white border border-zinc-200"
              >
                {CATEGORIES_FOR_PREVIEW.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <MomentPreview form={form} category={previewCategory} />
          </aside>
        </div>

        {/* Sticky footer */}
        <footer className="border-t border-zinc-200 px-6 py-3 flex items-center justify-between gap-3 bg-white">
          {error && (
            <p className="text-sm text-red-600 truncate flex-1">{error}</p>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-4 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Αποθηκεύεται..." : (target === "new" ? "Δημιουργία" : "Αποθήκευση")}
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          height: 36px;
          padding: 0 10px;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
          color: #18181b;
          transition: border-color 200ms;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: #FE6F5E;
        }
        :global(textarea.form-input) {
          height: auto;
          min-height: 60px;
          padding: 8px 10px;
          line-height: 1.5;
          font-family: inherit;
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ── Small inline helpers ─────────────────────────────────────────────

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">{title}</h3>
        {aside}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-700 mb-1">
        {label}
        {required && <span className="text-coral-600 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

// ── Preview ──────────────────────────────────────────────────────────
// Renders the moment using the real surface adapter when possible,
// otherwise a generic preview card. Keeps the admin honest: what they
// see here is what users will see.

function MomentPreview({ form, category }: { form: FormState; category: string }) {
  const vars = useMemo(() => buildPreviewVars(form, category), [form, category]);
  const interpolated = useMemo(() => ({
    title:    interpolate(form.copy.title,    vars),
    subtitle: interpolate(form.copy.subtitle, vars),
    body:     interpolate(form.copy.body,     vars),
  }), [form.copy, vars]);

  if (form.surface === "achievement_modal") {
    return <AchievementPreview interpolated={interpolated} display={form.display} />;
  }
  if (form.surface === "bookmark_modal") {
    return <BookmarkPreview interpolated={interpolated} category={category} />;
  }
  return <GenericPreview interpolated={interpolated} />;
}

function AchievementPreview({ interpolated, display }: {
  interpolated: { title: string; subtitle: string; body: string };
  display: FormState["display"];
}) {
  // Inline a stripped-down stand-in (real modal is full-screen portal —
  // not embeddable). Shows badge, color, copy in the same vertical
  // rhythm.
  const tierColor =
    display.badge === "verified" ? "#1D9E75" :
    display.badge === "gold"     ? "#3B82F6" :
    display.badge === "expert"   ? "#7C3AED" :
    display.badge === "platinum" ? "#64748B" : "#9CA3AF";
  const isUnlock = display.variant === "tier_unlock";
  return (
    <div className="bg-white rounded-2xl shadow-lg px-5 py-5 text-center">
      <p className="text-[18px] font-extrabold text-zinc-900 leading-tight">
        <Bold>{interpolated.title}</Bold>
      </p>
      {isUnlock && interpolated.subtitle && (
        <p className="mt-1.5 text-[12px] text-zinc-600">
          <Bold>{interpolated.subtitle}</Bold>
        </p>
      )}
      <div className="my-5 flex items-center justify-center">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-[12px]",
            !isUnlock && "opacity-50 grayscale",
          )}
          style={{ background: tierColor }}
        >
          {display.badge || "?"}
        </div>
      </div>
      {!isUnlock && interpolated.subtitle && (
        <p className="mt-1 text-[12px] text-zinc-600">
          <Bold>{interpolated.subtitle}</Bold>
        </p>
      )}
      {interpolated.body && (
        <p className="mt-3 text-[12px] text-zinc-500 leading-snug">
          <Bold>{interpolated.body}</Bold>
        </p>
      )}
      <p className="mt-4 text-[10px] text-zinc-400">
        {display.delay_ms ? `delay ${display.delay_ms}ms · ` : ""}
        {display.auto_dismiss_ms ? `auto-dismiss ${display.auto_dismiss_ms}ms` : "no auto-dismiss"}
      </p>
    </div>
  );
}

function BookmarkPreview({ interpolated, category }: {
  interpolated: { title: string; subtitle: string; body: string };
  category: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg px-5 py-7 text-center">
      <p className="text-[20px] font-extrabold text-zinc-900 leading-tight whitespace-pre-line">
        <Bold>{interpolated.title || "(τίτλος)"}</Bold>
      </p>
      <p className="mt-2 text-[11px] text-zinc-400">{`(category: ${category})`}</p>
      {interpolated.body && (
        <p className="mt-5 text-[13px] text-zinc-600">
          <Bold>{interpolated.body}</Bold>
        </p>
      )}
    </div>
  );
}

function GenericPreview({ interpolated }: { interpolated: { title: string; subtitle: string; body: string } }) {
  return (
    <div className="bg-white rounded-xl shadow border border-zinc-200 p-4">
      {interpolated.title && (
        <p className="text-[14px] font-semibold text-zinc-900">
          <Bold>{interpolated.title}</Bold>
        </p>
      )}
      {interpolated.subtitle && (
        <p className="text-[12px] text-zinc-600 mt-1">
          <Bold>{interpolated.subtitle}</Bold>
        </p>
      )}
      {interpolated.body && (
        <p className="text-[12px] text-zinc-500 mt-2 leading-snug">
          <Bold>{interpolated.body}</Bold>
        </p>
      )}
      {!interpolated.title && !interpolated.subtitle && !interpolated.body && (
        <p className="text-[11px] text-zinc-400 italic">Δεν έχει γραφτεί κείμενο ακόμα</p>
      )}
    </div>
  );
}

function Bold({ children }: { children: string }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  if (!text.includes("**")) return <>{text}</>;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-zinc-900">{p}</strong>
          : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

// ── Preview interpolation (mirrors lib/moments/render.ts) ────────────

function buildPreviewVars(form: FormState, category: string): Record<string, string | number> {
  const targetNum = Number(form.display.target) || 3;
  const sampleCount =
    targetNum >= 50 ? 47 :
    targetNum >= 25 ? 22 :
    targetNum >= 10 ? 7  : 1;
  const count =
    form.display.variant === "tier_unlock" ? targetNum : sampleCount;
  const remaining = Math.max(0, targetNum - count);

  const TIER_ORDINAL: Record<string, string> = {
    verified: "πρώτο", gold: "δεύτερό", expert: "τρίτο", platinum: "τέταρτο",
  };
  const CATEGORY_LIST_NOUN: Record<string, string> = {
    movies: "ταινίες", series: "σειρές", books: "βιβλία",
    food: "εστιατόρια", bars: "bars", hotels: "ξενοδοχεία",
    theater: "παραστάσεις", events: "εκδηλώσεις", recipes: "συνταγές",
  };
  const CATEGORY_NOUN: Record<string, string> = {
    movies: "ταινία", series: "σειρά", books: "βιβλίο",
    food: "εστιατόριο", bars: "bar", hotels: "ξενοδοχείο",
    theater: "παράσταση", events: "εκδήλωση", recipes: "συνταγή",
  };

  return {
    count,
    target: targetNum,
    remaining,
    ordinal: TIER_ORDINAL[form.display.badge] ?? "πρώτο",
    category,
    category_noun:      CATEGORY_NOUN[category] ?? category,
    category_list_noun: CATEGORY_LIST_NOUN[category] ?? category,
    handle: "george_n",
    first_name: "Γιώργος",
    bookmarkersTotal: 12,
  };
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const v = vars[key];
    return v === undefined || v === null ? match : String(v);
  });
}

// Suppress unused warning for these imports — they're referenced via the surface adapters
// in production but use synthetic data in the preview.
void AchievementUnlockedModal;
void BookmarkSavedModal;
