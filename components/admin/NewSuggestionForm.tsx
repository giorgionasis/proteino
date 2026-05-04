"use client";

/**
 * /admin/suggestions/new — minimal create form.
 *
 * Designed as a fast scaffold: admin enters title + category (required),
 * optionally subcategory + cover URL + first reflection, hits Create →
 * redirects to the full editor for extension-field details.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/constants/categories";
import { ImageUploader } from "./ImageUploader";

interface Subcategory { id: string; category: string; name: string; }

export function NewSuggestionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("movies");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [reflection, setReflection] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subcategories for the chosen category
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/subcategories")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSubcategories(Array.isArray(d) ? d : []);
      })
      .catch(() => { /* offline — subcategory selector stays empty */ });
    return () => { cancelled = true; };
  }, []);

  const filteredSubcats = subcategories.filter((s) => s.category === category);

  // Reset subcategory when category changes
  useEffect(() => { setSubcategoryId(""); }, [category]);

  async function submit() {
    setError(null);
    if (!title.trim()) { setError("Συμπλήρωσε τίτλο."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/suggestions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subcategory_id: subcategoryId || null,
          cover_url: coverUrl.trim() || null,
          reflection: reflection.trim() || null,
          is_published: isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      // Hop to the full editor for extension fields, gallery, etc.
      router.push(`/admin/suggestions/${data.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[640px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/suggestions" className="text-emerald-600 hover:underline font-medium">Suggestions</Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Νέα Suggestion</span>
      </div>

      <h1 className="text-2xl font-bold text-zinc-800 mb-2">Νέα Suggestion</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Συμπλήρωσε τα βασικά. Στην επόμενη οθόνη μπορείς να προσθέσεις extension fields, εικόνες, plot κλπ.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-5">
        <Field label="Τίτλος" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="π.χ. Inception"
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Κατηγορία" required>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.icon} {c.labelEl}</option>
              ))}
            </select>
          </Field>

          <Field label="Subcategory" hint="Προαιρετικό">
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={filteredSubcats.length === 0}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400 disabled:bg-zinc-50"
            >
              <option value="">— καμία —</option>
              {filteredSubcats.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Cover" hint="URL ή upload — μπορείς και αργότερα">
          <ImageUploader
            prefix="items-cover"
            value={coverUrl}
            onChange={setCoverUrl}
            aspectRatio="auto"
            allowUrlPaste
            className="max-w-[260px]"
          />
        </Field>

        <Field label="Reflection (πρώτη πρόταση)" hint="Προαιρετικό. Εμφανίζεται στη σελίδα του item.">
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            placeholder="π.χ. Από τα πιο επιδραστικά sci-fi της δεκαετίας — η μη-γραμμική αφήγηση χαρακτηριστική του Nolan..."
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 resize-none"
          />
        </Field>

        <Field label="Ορατότητα">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Δημοσιευμένη με τη δημιουργία
          </label>
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <Link
            href="/admin/suggestions"
            className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            Άκυρο
          </Link>
          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
          >
            {submitting ? "Δημιουργία..." : "Δημιουργία & άνοιγμα editor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-zinc-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
