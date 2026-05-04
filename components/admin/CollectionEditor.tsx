"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";
import { ImageUploader } from "./ImageUploader";
import { OpenAsUserButton } from "./OpenAsUserButton";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";

type CollectionType = "card" | "carousel";
type Audience = "all" | "registered" | "guest";

export interface Placement {
  context: "home" | "category" | "suggestions";
  category: string | null;
}

export interface ExtFilter {
  field: string;
  value: string;
}

export interface CollectionFormData {
  id?: string;
  type: CollectionType;
  title: string;
  title_specific: string;
  alias: string;
  image_url: string;
  source_category: string; // "" = all
  tags: string[];
  filters: ExtFilter[];
  item_limit: number;
  is_published: boolean;
  target_audience: Audience;
  valid_from: string; // YYYY-MM-DD
  valid_until: string;
  placements: Placement[];
}

// Common extension-table fields per category. Admin can add custom field names,
// but these are quick picks.
const EXT_FIELD_HINTS: Record<string, { field: string; label: string }[]> = {
  movies:  [{ field: "channel", label: "Πλατφόρμα/Κανάλι" }, { field: "country", label: "Χώρα" }, { field: "language", label: "Γλώσσα" }, { field: "director", label: "Σκηνοθέτης" }],
  series:  [{ field: "channel", label: "Πλατφόρμα/Κανάλι" }, { field: "country", label: "Χώρα" }, { field: "language", label: "Γλώσσα" }, { field: "director", label: "Σκηνοθέτης" }],
  books:   [{ field: "writer", label: "Συγγραφέας" }, { field: "publication", label: "Εκδόσεις" }, { field: "language", label: "Γλώσσα" }],
  food:    [{ field: "cuisine", label: "Κουζίνα" }, { field: "type", label: "Τύπος" }],
  bars:    [{ field: "type", label: "Τύπος" }],
  hotels:  [{ field: "type", label: "Τύπος" }, { field: "price_range", label: "Τιμή" }],
  recipes: [{ field: "level", label: "Επίπεδο" }, { field: "origin", label: "Προέλευση" }, { field: "channel", label: "Πηγή" }],
  theater: [{ field: "type", label: "Τύπος" }, { field: "director", label: "Σκηνοθέτης" }],
  events:  [{ field: "event_type", label: "Τύπος εκδήλωσης" }],
};

const EMPTY: CollectionFormData = {
  type: "carousel",
  title: "",
  title_specific: "",
  alias: "",
  image_url: "",
  source_category: "",
  tags: [],
  filters: [],
  item_limit: 20,
  is_published: true,
  target_audience: "all",
  valid_from: "",
  valid_until: "",
  placements: [{ context: "home", category: null }],
};

const GREEK_TO_LATIN: Record<string, string> = {
  "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
  "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
  "ΐ":"i","ΰ":"y",
};
function slugify(text: string): string {
  return text.toLowerCase().split("").map((c) => GREEK_TO_LATIN[c] || c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface Props {
  initial?: Partial<CollectionFormData> & { id?: string };
}

export function CollectionEditor({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CollectionFormData>(() => ({ ...EMPTY, ...initial } as CollectionFormData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aliasTouched, setAliasTouched] = useState(!!initial?.alias);

  // Snapshot for dirty-tracking. Stringified form is the cheapest reliable
  // comparison given how much nested data the form holds.
  const initialFormJSON = useRef(JSON.stringify({ ...EMPTY, ...initial }));
  const dirty = JSON.stringify(form) !== initialFormJSON.current;
  useUnsavedGuard(dirty);

  // Auto-derive alias from title until user touches it
  useEffect(() => {
    if (aliasTouched) return;
    const combined = `${form.title} ${form.title_specific}`.trim();
    setForm((f) => ({ ...f, alias: slugify(combined) }));
  }, [form.title, form.title_specific, aliasTouched]);

  function patch<K extends keyof CollectionFormData>(key: K, value: CollectionFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function togglePlacement(context: "home", category: null): void;
  function togglePlacement(context: "category", category: string): void;
  function togglePlacement(context: "home" | "category", category: string | null) {
    const exists = form.placements.some((p) => p.context === context && p.category === category);
    if (exists) {
      patch("placements", form.placements.filter((p) => !(p.context === context && p.category === category)));
    } else {
      patch("placements", [...form.placements, { context, category }]);
    }
  }

  async function save() {
    setError(null);
    if (!form.title.trim()) { setError("Συμπλήρωσε τίτλο."); return; }
    if (form.placements.length === 0) { setError("Επίλεξε τουλάχιστον μία τοποθεσία."); return; }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        title_specific: form.title_specific.trim() || null,
        alias: form.alias.trim() || null,
        image_url: form.image_url.trim() || null,
        source_category: form.source_category || null,
        tags: form.tags,
        filters: form.filters,
        item_limit: form.item_limit,
        is_published: form.is_published,
        target_audience: form.target_audience,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        placements: form.placements,
      };

      const url = initial?.id
        ? `/api/admin/collections/${initial.id}`
        : `/api/admin/collections`;
      const res = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία αποθήκευσης");
      router.push("/admin/content/collections");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm("Διαγραφή της συλλογής; Δεν αναιρείται.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Αποτυχία διαγραφής");
      router.push("/admin/content/collections");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? String(e));
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/content/collections" className="text-zinc-500 hover:text-zinc-800">
            Collections
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="font-medium text-zinc-800">
            {initial?.id ? form.title || "Επεξεργασία" : "Νέα συλλογή"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Open as user — only Card-type collections have a public landing page;
              Carousel collections render inside the home/category pages they're placed on. */}
          {initial?.id && form.type === "card" && form.alias && (
            <OpenAsUserButton href={`/collections/${form.alias}`} />
          )}
          {initial?.id && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >
              Διαγραφή
            </button>
          )}
          <Link
            href="/admin/content/collections"
            className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            Άκυρο
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? "Αποθήκευση..." : initial?.id ? "Αποθήκευση" : "Δημιουργία"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-8">
        {/* ── Left: form ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Type */}
          <Section title="Είδος" hint="Card = compact pill (συνήθως brand/βραβείο). Carousel = horizontal scroll με items.">
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                selected={form.type === "carousel"}
                onSelect={() => patch("type", "carousel")}
                title="Carousel"
                desc="Οριζόντιο scroll με 4–10 items. Καλό για 'Top Ταινίες', 'Νέες Συνταγές'."
              />
              <TypeCard
                selected={form.type === "card"}
                onSelect={() => patch("type", "card")}
                title="Card"
                desc="Compact pill με logo & τίτλο. Οδηγεί σε φιλτραρισμένη λίστα."
              />
            </div>
          </Section>

          {/* Content */}
          <Section title="Περιεχόμενο" hint="Τι items θα περιλαμβάνει η συλλογή.">
            <Field label="Πηγή">
              <select
                value={form.source_category}
                onChange={(e) => patch("source_category", e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
              >
                <option value="">Όλες οι κατηγορίες</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.icon} {c.labelEl}</option>
                ))}
              </select>
            </Field>

            <Field label="Tags (όλα πρέπει να ταιριάζουν)" hint="Αν είναι κενό, ταιριάζουν όλα τα items της πηγής.">
              <TagPicker
                category={form.source_category || null}
                value={form.tags}
                onChange={(t) => patch("tags", t)}
              />
            </Field>

            <Field label="Φίλτρα πεδίων (advanced)" hint="Φίλτρα σε στήλες extension table — π.χ. Movies × channel = 'Netflix'. Όλα πρέπει να ταιριάζουν.">
              <ExtFilterEditor
                sourceCategory={form.source_category || null}
                value={form.filters}
                onChange={(filters) => patch("filters", filters)}
              />
            </Field>

            <Field label="Όριο items">
              <input
                type="number"
                min={1}
                max={100}
                value={form.item_limit}
                onChange={(e) => patch("item_limit", Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                className="w-32 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </Section>

          {/* Display */}
          <Section title="Εμφάνιση" hint="Πώς θα φαίνεται η συλλογή στους χρήστες.">
            {form.type === "card" ? (
              <>
                <Field label="Τίτλος (γενικό)">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => patch("title", e.target.value)}
                    placeholder="Από το σύμπαν"
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                  />
                </Field>
                <Field label="Τίτλος (ειδικό)" hint="Bold μέρος του τίτλου, π.χ. 'της MARVEL'.">
                  <input
                    type="text"
                    value={form.title_specific}
                    onChange={(e) => patch("title_specific", e.target.value)}
                    placeholder="της MARVEL"
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                  />
                </Field>
                <Field label="Εικόνα" hint="Logo/brand image (προαιρετικό).">
                  <ImageUploader
                    prefix="collections"
                    value={form.image_url}
                    onChange={(url) => patch("image_url", url)}
                    aspectRatio="square"
                    allowUrlPaste
                    className="max-w-[180px]"
                  />
                </Field>
              </>
            ) : (
              <Field label="Τίτλος">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => patch("title", e.target.value)}
                  placeholder="Δημοφιλή Μαγαζιά"
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                />
              </Field>
            )}

            <Field label="Alias (slug)" hint="Μοναδικό. Default από τον τίτλο.">
              <input
                type="text"
                value={form.alias}
                onFocus={() => setAliasTouched(true)}
                onChange={(e) => { setAliasTouched(true); patch("alias", slugify(e.target.value)); }}
                placeholder="apo-to-sympan-tis-marvel"
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </Section>

          {/* Placement */}
          <Section title="Τοποθέτηση" hint="Πού θα εμφανίζεται. Μπορεί σε πολλά μέρη ταυτόχρονα.">
            <div className="space-y-2">
              <PlacementToggle
                label="🏠 Αρχική"
                checked={form.placements.some((p) => p.context === "home")}
                onChange={() => togglePlacement("home", null)}
              />
              {CATEGORIES.map((c) => (
                <PlacementToggle
                  key={c.slug}
                  label={`${c.icon} ${c.labelEl}`}
                  checked={form.placements.some((p) => p.context === "category" && p.category === c.slug)}
                  onChange={() => togglePlacement("category", c.slug)}
                />
              ))}
            </div>
          </Section>

          {/* Status */}
          <Section title="Κατάσταση">
            <Field label="Ορατότητα">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => patch("is_published", e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Δημοσιευμένη
              </label>
            </Field>

            <Field label="Κοινό">
              <select
                value={form.target_audience}
                onChange={(e) => patch("target_audience", e.target.value as Audience)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
              >
                <option value="all">Όλοι (registered + guest)</option>
                <option value="registered">Μόνο εγγεγραμμένοι</option>
                <option value="guest">Μόνο επισκέπτες</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ενεργή από">
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => patch("valid_from", e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                />
              </Field>
              <Field label="Έως">
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => patch("valid_until", e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Right: live preview ────────────────────────── */}
        <div className="sticky top-6 self-start space-y-4">
          <LivePreview form={form} />
        </div>
      </div>
    </div>
  );
}

/* ── Small UI bits ─────────────────────────────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-zinc-800">{title}</h3>
        {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-zinc-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function TypeCard({ selected, onSelect, title, desc }: {
  selected: boolean; onSelect: () => void; title: string; desc: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 border-2 rounded-lg transition-colors ${
        selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-zinc-800">{title}</span>
        <div className={`w-4 h-4 rounded-full border-2 ${selected ? "border-zinc-900" : "border-zinc-300"}`}>
          {selected && <div className="w-full h-full rounded-full bg-zinc-900 scale-50" />}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{desc}</p>
    </button>
  );
}

function PlacementToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
      checked ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50 border border-zinc-200"
    }`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
        checked ? "bg-white border-white" : "border-zinc-300"
      }`}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

/* ── Tag autocomplete ──────────────────────────────────────── */

function TagPicker({ category, value, onChange }: {
  category: string | null;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/collections/tags", window.location.origin);
        if (category) url.searchParams.set("category", category);
        if (query) url.searchParams.set("q", query);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, category, open]);

  function addTag(t: string) {
    if (!value.includes(t)) onChange([...value, t]);
    setQuery("");
  }
  function removeTag(t: string) { onChange(value.filter((x) => x !== t)); }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 min-h-[44px] border border-zinc-200 rounded-lg focus-within:border-zinc-400">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-full">
            {t}
            <button
              onClick={() => removeTag(t)}
              className="text-emerald-600 hover:text-emerald-900"
              aria-label={`Αφαίρεση ${t}`}
            >×</button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              addTag(query.trim());
            } else if (e.key === "Backspace" && !query && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? "π.χ. marvel, netflix, oscar..." : ""}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
          {loading && <div className="px-3 py-2 text-xs text-zinc-500">Αναζήτηση...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">
              {query
                ? <>Κανένα αποτέλεσμα. <button onMouseDown={(e) => { e.preventDefault(); addTag(query.trim()); }} className="text-coral-600 underline">Προσθήκη "{query}"</button></>
                : "Πληκτρολόγησε για αναζήτηση tag..."}
            </div>
          )}
          {results.filter((r) => !value.includes(r.tag)).map((r) => (
            <button
              key={r.tag}
              onMouseDown={(e) => { e.preventDefault(); addTag(r.tag); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 text-left"
            >
              <span>{r.tag}</span>
              <span className="text-xs text-zinc-400">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Live preview ──────────────────────────────────────────── */

function LivePreview({ form }: { form: CollectionFormData }) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Stable key for fetch deps
  const key = useMemo(
    () => JSON.stringify({ src: form.source_category, tags: form.tags, filters: form.filters, lim: form.item_limit }),
    [form.source_category, form.tags, form.filters, form.item_limit]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/collections/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_category: form.source_category || undefined,
            tags: form.tags,
            filters: form.filters,
            item_limit: form.item_limit,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <>
      {/* Phone preview */}
      <div className="border-[8px] border-zinc-800 rounded-[36px] overflow-hidden bg-white shadow-xl">
        <div className="h-[480px] overflow-y-auto bg-white">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-zinc-100">
            <span className="text-sm font-black text-zinc-800">
              Proteino<span className="text-[#FE6F5E]">.</span>
            </span>
            <span className="text-xs text-zinc-400">Preview</span>
          </div>

          <div className="p-4">
            {form.type === "card" ? (
              <CardPreview form={form} loading={loading} matchCount={total} />
            ) : (
              <CarouselPreview form={form} items={items} loading={loading} />
            )}
          </div>
        </div>
      </div>

      {/* Match count */}
      <div className="text-xs text-zinc-600 px-1">
        {loading ? "Φορτώνει..." :
          total === 0
            ? <span className="text-amber-600">⚠ 0 items ταιριάζουν — η συλλογή θα είναι κενή.</span>
            : <>✓ <strong className="text-zinc-800">{total}</strong> items ταιριάζουν{total > form.item_limit ? ` (εμφανίζονται τα ${form.item_limit})` : ""}.</>}
      </div>
    </>
  );
}

function CardPreview({ form, loading, matchCount }: { form: CollectionFormData; loading: boolean; matchCount: number }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2">Card preview:</p>
      <div className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl bg-zinc-50">
        <div className="w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-400 overflow-hidden">
          {form.image_url ? <img src={form.image_url} alt="" className="w-full h-full object-cover" /> : "IMG"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-700 leading-tight">
            {form.title || <span className="text-zinc-400">Τίτλος γενικός</span>}
            {form.title_specific && <> <strong className="text-zinc-900">{form.title_specific}</strong></>}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {loading ? "..." : `${matchCount} προτάσεις`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Ext-field filter editor ──────────────────────────────── */

function ExtFilterEditor({ sourceCategory, value, onChange }: {
  sourceCategory: string | null;
  value: ExtFilter[];
  onChange: (filters: ExtFilter[]) => void;
}) {
  const hints = sourceCategory ? EXT_FIELD_HINTS[sourceCategory] ?? [] : [];

  function add() { onChange([...value, { field: "", value: "" }]); }
  function update(i: number, key: "field" | "value", v: string) {
    const next = [...value];
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  }
  function remove(i: number) { onChange(value.filter((_, j) => j !== i)); }

  if (!sourceCategory) {
    return (
      <p className="text-xs text-zinc-400 italic">
        Διάλεξε πηγή κατηγορίας πρώτα για να φιλτράρεις σε extension fields.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={hints.find((h) => h.field === f.field) ? f.field : "__custom"}
            onChange={(e) => {
              if (e.target.value === "__custom") update(i, "field", "");
              else update(i, "field", e.target.value);
            }}
            className="px-2 py-1.5 border border-zinc-200 rounded text-sm bg-white focus:outline-none focus:border-zinc-400 min-w-[140px]"
          >
            {hints.map((h) => (
              <option key={h.field} value={h.field}>{h.label} ({h.field})</option>
            ))}
            <option value="__custom">— custom field —</option>
          </select>
          {!hints.find((h) => h.field === f.field) && (
            <input
              type="text"
              value={f.field}
              onChange={(e) => update(i, "field", e.target.value)}
              placeholder="field"
              className="w-28 px-2 py-1.5 border border-zinc-200 rounded text-sm font-mono focus:outline-none focus:border-zinc-400"
            />
          )}
          <span className="text-zinc-400 text-sm">=</span>
          <input
            type="text"
            value={f.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder="value (case-sensitive)"
            className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400"
          />
          <button onClick={() => remove(i)} className="text-red-500 hover:text-red-700 text-sm px-1">✕</button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs text-zinc-700 border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50"
      >
        + Προσθήκη φίλτρου
      </button>
    </div>
  );
}

function CarouselPreview({ form, items, loading }: { form: CollectionFormData; items: any[]; loading: boolean }) {
  return (
    <div>
      <p className="text-sm font-bold text-zinc-800 mb-2">
        {form.title || <span className="text-zinc-400 font-normal">Τίτλος carousel</span>}
      </p>
      {loading ? (
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[80px] h-[120px] bg-zinc-100 rounded animate-pulse shrink-0" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs text-zinc-400 py-4 text-center bg-zinc-50 rounded">Καμία πρόταση δεν ταιριάζει.</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {items.slice(0, 8).map((it) => (
            <div key={it.id} className="w-[80px] shrink-0">
              <div className="w-full h-[120px] bg-zinc-200 rounded mb-1 overflow-hidden">
                {it.cover_url && <img src={it.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-[10px] text-zinc-700 font-medium truncate">{it.title}</p>
              {it.avg_rating > 0 && (
                <p className="text-[9px] text-zinc-400">★ {Number(it.avg_rating).toFixed(1)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
