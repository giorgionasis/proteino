"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Setting {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export function SettingsManager() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (Array.isArray(data)) {
          setRows(data);
          const d: Record<string, any> = {};
          for (const r of data) d[r.key] = r.value;
          setDraft(d);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setKey(key: string, value: any) {
    setDraft((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  // Original (committed) maintenance_mode value, to detect a flip from
  // off → on. Any toggle that turns maintenance ON triggers the confirm
  // dialog before save proceeds.
  const originalMaintenance = rows.find((r) => r.key === "maintenance_mode")?.value;
  const willEnableMaintenance =
    !originalMaintenance && !!draft.maintenance_mode;

  function attemptSave() {
    if (willEnableMaintenance) {
      setConfirmOpen(true);
      return;
    }
    void runSave();
  }

  async function runSave() {
    setError(null);
    setSaving(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const dirty = rows.some((r) => JSON.stringify(r.value) !== JSON.stringify(draft[r.key]));

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Λειτουργικές ρυθμίσεις του site. Αλλαγές εφαρμόζονται άμεσα μετά την αποθήκευση.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Αποθηκεύτηκε</span>}
          <button
            onClick={attemptSave}
            disabled={saving || !dirty}
            className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? "Αποθήκευση..." : "Αποθήκευση"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Ενεργοποίηση maintenance mode;"
        subtitle="Όλοι οι χρήστες θα δουν το banner"
        message={
          <>
            <p>
              Με την ενεργοποίηση maintenance mode εμφανίζεται κόκκινο banner
              σε όλους τους χρήστες με το μήνυμα:
            </p>
            <p className="mt-2 px-3 py-2 rounded bg-zinc-50 border border-zinc-200 font-medium text-zinc-800">
              {typeof draft.maintenance_message === "string" && draft.maintenance_message.trim()
                ? draft.maintenance_message
                : "(δεν έχει οριστεί μήνυμα)"}
            </p>
            <p className="mt-3 text-zinc-500">
              Μπορείς να το απενεργοποιήσεις ανά πάσα στιγμή.
            </p>
          </>
        }
        confirmLabel="Ενεργοποίηση"
        tone="danger"
        pending={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={runSave}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-50 border border-zinc-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Maintenance mode */}
          <Section
            title="Maintenance mode"
            hint="Όταν ενεργό, εμφανίζεται banner σε όλους τους χρήστες με προσαρμόσιμο μήνυμα."
          >
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft.maintenance_mode}
                onChange={(e) => setKey("maintenance_mode", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-zinc-800">
                {draft.maintenance_mode ? "🔴 Ενεργό" : "Ανενεργό"}
              </span>
            </label>

            <Field label="Μήνυμα" hint="Εμφανίζεται στο banner.">
              <input
                type="text"
                value={typeof draft.maintenance_message === "string" ? draft.maintenance_message : ""}
                onChange={(e) => setKey("maintenance_message", e.target.value)}
                placeholder="Συντήρηση συστήματος..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </Section>

          {/* Site identity */}
          <Section title="Ταυτότητα Site">
            <Field label="Όνομα" hint="Header, metadata, social sharing.">
              <input
                type="text"
                value={typeof draft.site_name === "string" ? draft.site_name : ""}
                onChange={(e) => setKey("site_name", e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
            <Field label="Tagline">
              <input
                type="text"
                value={typeof draft.site_tagline === "string" ? draft.site_tagline : ""}
                onChange={(e) => setKey("site_tagline", e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>
          </Section>

          {/* Other / debug */}
          {rows.filter((r) => !["maintenance_mode", "maintenance_message", "site_name", "site_tagline"].includes(r.key)).length > 0 && (
            <Section title="Άλλες ρυθμίσεις" hint="Custom keys (advanced).">
              {rows
                .filter((r) => !["maintenance_mode", "maintenance_message", "site_name", "site_tagline"].includes(r.key))
                .map((r) => (
                  <Field key={r.key} label={r.key} hint={r.description ?? undefined}>
                    <input
                      type="text"
                      value={typeof draft[r.key] === "string" ? draft[r.key] : JSON.stringify(draft[r.key])}
                      onChange={(e) => {
                        try {
                          // Try to parse as JSON; fall back to string
                          const v = JSON.parse(e.target.value);
                          setKey(r.key, v);
                        } catch {
                          setKey(r.key, e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400"
                    />
                  </Field>
                ))}
            </Section>
          )}
        </div>
      )}
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
      <div className="space-y-3">{children}</div>
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
