"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminPanel } from "@/components/admin/ui/AdminPanel";
import { AdminRow, AdminActionButton } from "@/components/admin/ui/AdminRow";
import { AdminEmpty } from "@/components/admin/ui/AdminEmpty";
import { MomentEditDrawer } from "@/components/admin/MomentEditDrawer";
import type { MomentRow, PredicateSchema } from "@/lib/moments";

/**
 * /admin/moments — list + inline edit drawer.
 *
 * Rows are grouped by trigger_event because that's the dimension the
 * editor reads "what fires when X happens?" Within a group, sorted by
 * priority DESC then alphabetical key — matches what the resolver sees
 * at fire time so the admin's mental model is the runtime's mental
 * model.
 *
 * Edit happens in a side drawer that slides in from the right. Saving
 * PATCHes the row; the local list optimistically updates so the admin
 * sees their change immediately. Errors revert.
 */

const TRIGGER_LABELS: Record<string, string> = {
  suggestion_published:    "Όταν δημοσιεύεται πρόταση",
  bookmark_created:        "Όταν αποθηκεύεται bookmark",
  bookmark_status_changed: "Όταν αλλάζει status bookmark",
  rating_submitted:        "Όταν γίνεται βαθμολόγηση",
  follow_created:          "Όταν γίνεται follow",
  search_logged:           "Όταν καταγράφεται search",
  dormant_14d:             "Όταν χρήστης λείπει 14 μέρες",
  event_tomorrow:          "Όταν event είναι αύριο",
  series_new_season:       "Όταν βγαίνει νέα σεζόν",
  daily_first_open:        "Όταν ο χρήστης ανοίγει την εφαρμογή",
};

const SURFACE_LABELS: Record<string, string> = {
  achievement_modal: "Achievement modal",
  bookmark_modal:    "Bookmark modal",
  toast:             "Toast",
  banner:            "Banner",
  published_pill:    "Published pill",
  notification:      "Notification",
};

interface Props {
  initialMoments:   MomentRow[];
  initialStats:     Record<string, { fires: number; ctaClicks: number; dismissed: number }>;
  predicateSchemas: Record<string, PredicateSchema>;
}

export function MomentsManager({ initialMoments, initialStats, predicateSchemas }: Props) {
  const router  = useRouter();
  const [rows,    setRows]    = useState<MomentRow[]>(initialMoments);
  const [stats]               = useState(initialStats);
  const [editing, setEditing] = useState<MomentRow | "new" | null>(null);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  // Group by trigger_event. Order of groups follows TRIGGER_LABELS
  // declaration so the most common triggers are at the top.
  const grouped = useMemo(() => {
    const map = new Map<string, MomentRow[]>();
    for (const r of rows) {
      const arr = map.get(r.trigger_event);
      if (arr) arr.push(r);
      else map.set(r.trigger_event, [r]);
    }
    const orderedKeys = Object.keys(TRIGGER_LABELS).filter((k) => map.has(k));
    for (const k of Array.from(map.keys())) if (!orderedKeys.includes(k)) orderedKeys.push(k);
    return orderedKeys.map((trigger) => ({
      trigger,
      label: TRIGGER_LABELS[trigger] ?? trigger,
      moments: map.get(trigger) ?? [],
    }));
  }, [rows]);

  async function toggleActive(row: MomentRow) {
    setBusyId(row.id);
    const prev = row.is_active;
    setRows((curr) => curr.map((r) => r.id === row.id ? { ...r, is_active: !prev } : r));
    try {
      const res = await fetch(`/api/admin/moments/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !prev }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("[moments] toggle failed", e);
      setRows((curr) => curr.map((r) => r.id === row.id ? { ...r, is_active: prev } : r));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(row: MomentRow) {
    if (!window.confirm(`Διαγραφή του moment "${row.key}"; Η ενέργεια δεν αναιρείται.`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/moments/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setRows((curr) => curr.filter((r) => r.id !== row.id));
    } catch (e) {
      console.error("[moments] delete failed", e);
      window.alert("Διαγραφή απέτυχε. Δες την κονσόλα.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateRow(row: MomentRow) {
    setBusyId(row.id);
    try {
      const body = {
        key:            `${row.key}.copy`,
        label:          row.label ? `${row.label} (αντίγραφο)` : null,
        surface:        row.surface,
        trigger_event:  row.trigger_event,
        predicate_key:  row.predicate_key,
        predicate_args: row.predicate_args,
        copy:           row.copy,
        display:        row.display,
        priority:       row.priority,
        variant_group:  row.variant_group,
        is_active:      false,
      };
      const res = await fetch("/api/admin/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setRows((curr) => [...curr, created]);
      setEditing(created);
    } catch (e) {
      console.error("[moments] duplicate failed", e);
      window.alert("Αντιγραφή απέτυχε.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(patch: Partial<MomentRow>, target: MomentRow | "new") {
    if (target === "new") {
      // POST new
      const res = await fetch("/api/admin/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setRows((curr) => [...curr, created]);
      setEditing(null);
      return;
    }
    // PATCH existing
    const res = await fetch(`/api/admin/moments/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = await res.json();
    setRows((curr) => curr.map((r) => r.id === target.id ? updated : r));
    setEditing(null);
  }

  return (
    <>
      <AdminPageHeader
        title="Moments"
        subtitle="In-app celebrations + nudges (bookmark celebration, achievement modal, …). Επεξεργάσου copy και timing χωρίς deploy. Οι συνθήκες ενεργοποίησης (predicates) προέρχονται από registry στον κώδικα — διαλέγεις από λίστα."
        meta={`${rows.length} moments · ${rows.filter((r) => r.is_active).length} ενεργά`}
        primary={
          <button
            onClick={() => setEditing("new")}
            className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            + Νέο moment
          </button>
        }
      />

      {grouped.length === 0 ? (
        <AdminPanel>
          <AdminEmpty
            title="Δεν υπάρχουν moments ακόμα"
            description="Δημιούργησε το πρώτο για να εμφανίσεις μηνύματα γιορτής + ειδοποίησης μέσα στο app."
            action={
              <button
                onClick={() => setEditing("new")}
                className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium"
              >
                + Νέο moment
              </button>
            }
          />
        </AdminPanel>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.trigger}>
              <div className="mb-2 px-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {group.label}
                </span>
                <span className="text-[11px] text-zinc-300">·</span>
                <span className="text-[11px] text-zinc-400">{group.moments.length}</span>
              </div>
              <AdminPanel flush>
                {group.moments.map((m) => {
                  const stat = stats[m.id];
                  const meta = [
                    SURFACE_LABELS[m.surface] ?? m.surface,
                    m.predicate_key !== "always" ? formatPredicate(m.predicate_key, m.predicate_args, predicateSchemas) : null,
                    m.variant_group ? `group: ${m.variant_group}` : null,
                    typeof m.display?.delay_ms === "number" ? `delay ${m.display.delay_ms}ms` : null,
                  ].filter(Boolean).join(" · ");
                  return (
                    <AdminRow
                      key={m.id}
                      onClick={() => setEditing(m)}
                      title={
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full ${m.is_active ? "bg-emerald-500" : "bg-zinc-300"}`} aria-hidden />
                          <span className="font-medium truncate">{m.label || m.key}</span>
                          {!m.label && <span className="text-zinc-400 font-mono text-[11px] truncate">{m.key}</span>}
                          {stat && stat.fires > 0 && (
                            <span className="ml-2 text-[10px] text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5 shrink-0">
                              {stat.fires}× / 7d
                            </span>
                          )}
                        </span>
                      }
                      meta={meta || undefined}
                      actions={
                        <>
                          <AdminActionButton
                            label={m.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                            disabled={busyId === m.id}
                            onClick={() => toggleActive(m)}
                          >
                            {m.is_active ? "Ενεργό" : "Ανενεργό"}
                          </AdminActionButton>
                          <AdminActionButton label="Αντιγραφή" disabled={busyId === m.id} onClick={() => duplicateRow(m)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                          </AdminActionButton>
                          <AdminActionButton tone="danger" label="Διαγραφή" disabled={busyId === m.id} onClick={() => deleteRow(m)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </AdminActionButton>
                        </>
                      }
                    />
                  );
                })}
              </AdminPanel>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MomentEditDrawer
          target={editing}
          predicateSchemas={predicateSchemas}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ── Predicate summariser (rendered inline in row meta) ─────────────

function formatPredicate(
  key: string,
  args: Record<string, unknown> | undefined,
  schemas: Record<string, PredicateSchema>,
): string {
  const schema = schemas[key];
  if (!schema) return key;
  const argKeys = Object.keys(schema.args);
  if (argKeys.length === 0) return schema.label;
  const argParts = argKeys
    .map((k) => {
      const v = (args ?? {})[k];
      if (v === undefined || v === null || v === "") return null;
      return `${k}=${v}`;
    })
    .filter(Boolean);
  return `${key}(${argParts.join(", ")})`;
}
