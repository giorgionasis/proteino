"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUploader } from "./ImageUploader";
import { MapPicker } from "./MapPicker";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";

interface Category { id: string; name: string; icon: string | null; }
interface Type { id: string; category_id: string; name: string; icon: string | null; }

export interface ActivityFormData {
  id?: string;
  type_id: string;
  category_id: string;       // derived from type_id; held for the cascading select
  name: string;
  description: string;
  address: string;
  lat: string;               // strings for inputs; converted on save
  lng: string;
  website_url: string;
  facebook_url: string;
  instagram_url: string;
  phone: string;
  image_url: string;
  is_published: boolean;
}

const EMPTY: ActivityFormData = {
  type_id: "",
  category_id: "",
  name: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
  website_url: "",
  facebook_url: "",
  instagram_url: "",
  phone: "",
  image_url: "",
  is_published: true,
};

interface Props {
  initial?: Partial<ActivityFormData> & { id?: string };
}

export function ActivityEditor({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ActivityFormData>(() => ({ ...EMPTY, ...initial } as ActivityFormData));
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dirty tracking for the unsaved-changes guard.
  const initialFormJSON = useRef(JSON.stringify({ ...EMPTY, ...initial }));
  const dirty = JSON.stringify(form) !== initialFormJSON.current;
  useUnsavedGuard(dirty);

  // Load taxonomy
  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/admin/activity-categories"),
          fetch("/api/admin/activity-types"),
        ]);
        const [cats, tps] = await Promise.all([cRes.json(), tRes.json()]);
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(tps)) {
          setTypes(tps.map((t: any) => ({
            id: t.id, category_id: t.category_id, name: t.name, icon: t.icon,
          })));
        }
      } finally {
        setLoadingTaxonomy(false);
      }
    })();
  }, []);

  // When categories load and we have a type_id but no category_id, derive it
  useEffect(() => {
    if (form.category_id || !form.type_id || types.length === 0) return;
    const t = types.find((x) => x.id === form.type_id);
    if (t) setForm((f) => ({ ...f, category_id: t.category_id }));
  }, [types, form.type_id, form.category_id]);

  const filteredTypes = types.filter((t) => !form.category_id || t.category_id === form.category_id);

  function patch<K extends keyof ActivityFormData>(key: K, value: ActivityFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setCategoryId(id: string) {
    // Reset type when category changes
    setForm((f) => ({ ...f, category_id: id, type_id: "" }));
  }

  async function save() {
    setError(null);
    if (!form.name.trim()) { setError("Συμπλήρωσε όνομα."); return; }
    if (!form.type_id) { setError("Διάλεξε κατηγορία και τύπο."); return; }

    const lat = form.lat ? Number(form.lat) : null;
    const lng = form.lng ? Number(form.lng) : null;
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError("Latitude εκτός εύρους (-90..90).");
      return;
    }
    if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
      setError("Longitude εκτός εύρους (-180..180).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type_id: form.type_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        lat, lng,
        website_url: form.website_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        phone: form.phone.trim() || null,
        image_url: form.image_url.trim() || null,
        is_published: form.is_published,
      };
      const url = initial?.id ? `/api/admin/activities/${initial.id}` : `/api/admin/activities`;
      const res = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία αποθήκευσης");
      router.push("/admin/content/activities");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm("Διαγραφή του activity;")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/activities/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Αποτυχία διαγραφής");
      router.push("/admin/content/activities");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? String(e));
      setSaving(false);
    }
  }

  const noTaxonomy = !loadingTaxonomy && categories.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/content/activities" className="text-zinc-500 hover:text-zinc-800">Activities</Link>
          <span className="text-zinc-400">/</span>
          <span className="font-medium text-zinc-800">
            {initial?.id ? form.name || "Επεξεργασία" : "Νέο activity"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {initial?.id && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >Διαγραφή</button>
          )}
          <Link
            href="/admin/content/activities"
            className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >Άκυρο</Link>
          <button
            onClick={save}
            disabled={saving || noTaxonomy}
            className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? "Αποθήκευση..." : initial?.id ? "Αποθήκευση" : "Δημιουργία"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {noTaxonomy && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Δεν υπάρχουν κατηγορίες/τύποι ακόμα. <Link href="/admin/content/activities/taxonomy" className="font-semibold underline">Διαχείριση ταξινομίας →</Link>
        </div>
      )}

      <div className="max-w-[760px] space-y-6">

        {/* Status */}
        <Section title="Κατάσταση">
          <Field label="Δημοσίευση">
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-200">
              <button
                onClick={() => patch("is_published", true)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  form.is_published ? "bg-emerald-600 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
                }`}
              >Active</button>
              <button
                onClick={() => patch("is_published", false)}
                className={`px-5 py-2 text-sm font-medium border-l border-zinc-200 transition-colors ${
                  !form.is_published ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
                }`}
              >Inactive</button>
            </div>
          </Field>
        </Section>

        {/* Basics */}
        <Section title="Στοιχεία">
          <Field label="Όνομα">
            <input
              type="text"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Καϊμάκτσαλαν"
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Κατηγορία">
              <select
                value={form.category_id}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingTaxonomy || noTaxonomy}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              >
                <option value="">Επιλογή κατηγορίας</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Τύπος">
              <select
                value={form.type_id}
                onChange={(e) => patch("type_id", e.target.value)}
                disabled={!form.category_id || filteredTypes.length === 0}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              >
                <option value="">
                  {!form.category_id ? "Επίλεξε κατηγορία πρώτα" : filteredTypes.length === 0 ? "Δεν υπάρχουν τύποι" : "Επιλογή τύπου"}
                </option>
                {filteredTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ""}{t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.category_id && filteredTypes.length === 0 && !loadingTaxonomy && (
            <p className="text-xs text-amber-600">
              Δεν υπάρχουν τύποι σε αυτή την κατηγορία.{" "}
              <Link href="/admin/content/activities/taxonomy" className="underline">Πρόσθεσε →</Link>
            </p>
          )}

          <Field label="Περιγραφή" hint="Σύντομη περιγραφή που θα δουν οι χρήστες (προαιρετικό).">
            <textarea
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 resize-none"
            />
          </Field>
        </Section>

        {/* Location */}
        <Section title="Τοποθεσία" hint="Lat/lng είναι κρίσιμα — η εμφάνιση σε ξενοδοχεία γίνεται με βάση την απόσταση.">
          <Field label="Διεύθυνση">
            <input
              type="text"
              value={form.address}
              onChange={(e) => patch("address", e.target.value)}
              placeholder="π.χ. Καϊμάκτσαλαν, Πέλλα"
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                type="number" step="0.0000001"
                value={form.lat}
                onChange={(e) => patch("lat", e.target.value)}
                placeholder="40.95"
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number" step="0.0000001"
                value={form.lng}
                onChange={(e) => patch("lng", e.target.value)}
                placeholder="22.05"
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </div>

          <MapPicker
            lat={form.lat ? Number(form.lat) : null}
            lng={form.lng ? Number(form.lng) : null}
            onChange={(lat, lng) => {
              patch("lat", lat.toFixed(6));
              patch("lng", lng.toFixed(6));
            }}
          />

          {form.lat && form.lng && (
            <a
              href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-coral-600 hover:underline"
            >
              📍 Άνοιγμα στο Google Maps
            </a>
          )}
        </Section>

        {/* Links */}
        <Section title="Σύνδεσμοι (προαιρετικά)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => patch("website_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
            <Field label="Τηλέφωνο">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
                placeholder="+30..."
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
            <Field label="Facebook">
              <input
                type="url"
                value={form.facebook_url}
                onChange={(e) => patch("facebook_url", e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
            <Field label="Instagram">
              <input
                type="url"
                value={form.instagram_url}
                onChange={(e) => patch("instagram_url", e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </div>
        </Section>

        {/* Image */}
        <Section title="Φωτογραφία" hint="Σύρε εικόνα ή πάτησε για επιλογή. Εμφανίζεται στις κάρτες των ξενοδοχείων.">
          <ImageUploader
            prefix="activities"
            value={form.image_url}
            onChange={(url) => patch("image_url", url)}
            aspectRatio="16/9"
            allowUrlPaste
            className="max-w-md"
          />
        </Section>
      </div>
    </div>
  );
}

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
