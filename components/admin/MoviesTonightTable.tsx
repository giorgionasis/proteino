"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHANNELS = ["MEGA", "ΕΡΤ1", "ΕΡΤ2", "ΕΡΤ3", "ANT1", "ALPHA", "STAR", "ΣΚΑΪ", "OPEN", "COSMOTE TV"];

interface MovieItem {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  year: number | null;
}

interface AiringRow {
  id: string;
  item_id: string;
  channel: string;
  air_date: string;       // YYYY-MM-DD
  air_time: string;       // HH:MM:SS
  is_published: boolean;
  items: {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    avg_rating: number;
    metadata: any;
    item_movies: { release_date: string | null }[];
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDateGreek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "2-digit" });
}
function formatTime(t: string): string {
  return t.slice(0, 5);   // HH:MM
}

export function MoviesTonightTable() {
  const [rows, setRows] = useState<AiringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The window we currently fetch: today through today+6
  const today = useMemo(() => todayISO(), []);
  const weekEnd = useMemo(() => plusDays(today, 6), [today]);

  const [editing, setEditing] = useState<AiringRow | null>(null);
  const [newDraft, setNewDraft] = useState<DraftAiring | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/movies-tonight", window.location.origin);
      url.searchParams.set("from", today);
      url.searchParams.set("to", weekEnd);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (Array.isArray(data)) setRows(data);
      else setError(data.error ?? "Αποτυχία");
    } finally {
      setLoading(false);
    }
  }, [today, weekEnd]);

  useEffect(() => { load(); }, [load]);

  // Split into today vs rest-of-week
  const todayRows = rows.filter((r) => r.air_date === today);
  const weekRows = rows.filter((r) => r.air_date > today);

  async function startEdit(row: AiringRow) {
    setEditing({ ...row });
    setNewDraft(null);
  }
  async function saveEdit() {
    if (!editing) return;
    setBusyId(editing.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/movies-tonight/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: editing.item_id,
          channel: editing.channel,
          air_date: editing.air_date,
          air_time: editing.air_time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AiringRow) {
    if (!confirm(`Διαγραφή προβολής "${row.items.title}";`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/movies-tonight/${row.id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(row: AiringRow) {
    setBusyId(row.id);
    try {
      await fetch(`/api/admin/movies-tonight/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !row.is_published }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function createNew(d: DraftAiring) {
    setError(null);
    if (!d.item_id) { setError("Διάλεξε ταινία."); return; }
    if (!d.channel) { setError("Διάλεξε κανάλι."); return; }
    if (!d.air_date || !d.air_time) { setError("Συμπλήρωσε ημερομηνία και ώρα."); return; }

    try {
      const res = await fetch("/api/admin/movies-tonight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setNewDraft(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Movies Tonight</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Προβολές ταινιών στην TV — εμφανίζονται στην αρχική ως "Απόψε στην TV".
          </p>
        </div>
        <button
          onClick={() => setBulkOpen(true)}
          className="px-4 py-2 text-sm font-medium text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
        >
          📋 Bulk import
        </button>
      </div>

      {bulkOpen && (
        <BulkImportModal
          today={today}
          onClose={() => setBulkOpen(false)}
          onCommitted={async () => { setBulkOpen(false); await load(); }}
        />
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Today */}
      <Section
        title="Σήμερα"
        date={today}
        count={todayRows.length}
        rows={todayRows}
        editing={editing}
        busyId={busyId}
        onEdit={startEdit}
        onCancelEdit={() => setEditing(null)}
        onChangeEdit={setEditing}
        onSaveEdit={saveEdit}
        onRemove={remove}
        onTogglePublish={togglePublish}
        loading={loading}
      />

      {/* Rest of week */}
      <Section
        title="Αυτή την εβδομάδα"
        date={`${formatDateGreek(plusDays(today, 1))} – ${formatDateGreek(weekEnd)}`}
        count={weekRows.length}
        rows={weekRows}
        editing={editing}
        busyId={busyId}
        onEdit={startEdit}
        onCancelEdit={() => setEditing(null)}
        onChangeEdit={setEditing}
        onSaveEdit={saveEdit}
        onRemove={remove}
        onTogglePublish={togglePublish}
        loading={loading}
      />

      {/* New */}
      {newDraft ? (
        <NewAiringForm
          draft={newDraft}
          onChange={setNewDraft}
          onSave={() => createNew(newDraft)}
          onCancel={() => setNewDraft(null)}
        />
      ) : (
        <button
          onClick={() => setNewDraft({ item_id: "", item_title: "", item_cover: null, channel: "", air_date: today, air_time: "21:00" })}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Νέα προβολή
        </button>
      )}
    </div>
  );
}

/* ── Bulk import modal ─────────────────────────────────────── */

interface MatchedRow {
  item_id: string;
  item_title: string;
  item_cover: string | null;
  channel: string;
  air_date: string;
  air_time: string;
}
interface UnmatchedRow {
  title: string;
  channel: string;
  air_date: string;
  air_time: string;
}

function BulkImportModal({ today, onClose, onCommitted }: {
  today: string;
  onClose: () => void;
  onCommitted: () => void;
}) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "preview">("input");
  const [matched, setMatched] = useState<MatchedRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseLines(input: string): UnmatchedRow[] {
    const out: UnmatchedRow[] = [];
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 4) continue;
      const [title, channel, date, time] = parts;
      if (!title || !channel || !date || !time) continue;
      const air_time = time.length === 5 ? `${time}:00` : time;
      out.push({ title, channel, air_date: date, air_time });
    }
    return out;
  }

  async function preview() {
    setError(null);
    const drafts = parseLines(text);
    if (drafts.length === 0) {
      setError("Καμία γραμμή δεν αναγνωρίστηκε. Format: Τίτλος | Κανάλι | YYYY-MM-DD | HH:MM");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/movies-tonight/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: drafts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      setMatched(data.matched ?? []);
      setUnmatched(data.unmatched ?? []);
      setPhase("preview");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/movies-tonight/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: matched.map((m) => ({
            item_id: m.item_id, channel: m.channel,
            air_date: m.air_date, air_time: m.air_time,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία");
      onCommitted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-800">Bulk import — Movies Tonight</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {phase === "input" ? (
            <>
              <p className="text-sm text-zinc-600 mb-2">
                Επικόλλησε γραμμές σε format: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">Τίτλος | Κανάλι | YYYY-MM-DD | HH:MM</code>
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder={`Inception | MEGA | ${today} | 21:00\nThe Dark Knight | ANT1 | ${today} | 22:30`}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-zinc-400 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800">Άκυρο</button>
                <button
                  onClick={preview}
                  disabled={busy || !text.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
                >
                  {busy ? "Έλεγχος..." : "Προεπισκόπηση"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm font-bold text-emerald-700 mb-2">
                  ✓ {matched.length} έτοιμες προς εισαγωγή
                </p>
                {matched.length > 0 && (
                  <div className="border border-emerald-200 rounded-lg max-h-64 overflow-y-auto">
                    {matched.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-emerald-100 last:border-b-0 text-sm">
                        {m.item_cover && <img src={m.item_cover} alt="" className="w-8 h-12 rounded object-cover" />}
                        <span className="flex-1 font-medium text-zinc-800">{m.item_title}</span>
                        <span className="text-xs text-zinc-500">{m.channel} · {m.air_date} · {m.air_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {unmatched.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-amber-700 mb-2">
                    ⚠ {unmatched.length} ταινίες δεν βρέθηκαν στη βάση
                  </p>
                  <div className="border border-amber-200 rounded-lg max-h-40 overflow-y-auto">
                    {unmatched.map((u, i) => (
                      <div key={i} className="px-3 py-2 border-b border-amber-100 last:border-b-0 text-sm text-zinc-700">
                        <strong>{u.title}</strong>
                        <span className="text-xs text-zinc-500 ml-2">— {u.channel} · {u.air_date} · {u.air_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    Πρόσθεσε αυτές τις ταινίες ως items πρώτα, μετά ξανατρέξε το import.
                  </p>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <button onClick={() => setPhase("input")} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800">
                  ← Πίσω
                </button>
                <button
                  onClick={commit}
                  disabled={busy || matched.length === 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                >
                  {busy ? "Εισαγωγή..." : `Εισαγωγή ${matched.length} προβολών`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────── */

function Section(props: {
  title: string;
  date: string;
  count: number;
  rows: AiringRow[];
  editing: AiringRow | null;
  busyId: string | null;
  onEdit: (r: AiringRow) => void;
  onCancelEdit: () => void;
  onChangeEdit: (r: AiringRow) => void;
  onSaveEdit: () => void;
  onRemove: (r: AiringRow) => void;
  onTogglePublish: (r: AiringRow) => void;
  loading: boolean;
}) {
  const { title, date, count, rows, editing, busyId, onEdit, onCancelEdit, onChangeEdit, onSaveEdit, onRemove, onTogglePublish, loading } = props;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-zinc-800">{title}</h2>
        <span className="text-xs text-zinc-500">({date})</span>
        <span className="ml-1 w-6 h-6 rounded bg-zinc-200 text-xs font-bold text-zinc-700 flex items-center justify-center">
          {count}
        </span>
      </div>

      {loading ? (
        <div className="border border-zinc-200 rounded-lg p-6 text-sm text-zinc-400 text-center">
          Φορτώνει...
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-zinc-200 border-dashed rounded-lg p-6 text-sm text-zinc-400 text-center">
          Καμία προβολή.
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              {rows.map((row) => {
                const isEditing = editing?.id === row.id;
                if (isEditing && editing) {
                  return (
                    <EditingRow
                      key={row.id}
                      row={editing}
                      onChange={onChangeEdit}
                      onSave={onSaveEdit}
                      onCancel={onCancelEdit}
                      busy={busyId === row.id}
                    />
                  );
                }
                return (
                  <DisplayRow
                    key={row.id}
                    row={row}
                    busy={busyId === row.id}
                    onEdit={() => onEdit(row)}
                    onRemove={() => onRemove(row)}
                    onTogglePublish={() => onTogglePublish(row)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DisplayRow({ row, busy, onEdit, onRemove, onTogglePublish }: {
  row: AiringRow; busy: boolean; onEdit: () => void; onRemove: () => void; onTogglePublish: () => void;
}) {
  const movie = row.items;
  const ext = Array.isArray(movie.item_movies) ? movie.item_movies[0] : movie.item_movies;
  const year = ext?.release_date ? new Date(ext.release_date).getFullYear() : null;
  return (
    <tr className={`border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 ${!row.is_published ? "opacity-50" : ""}`}>
      <td className="px-4 py-3 w-[260px]">
        <div className="flex items-center gap-3">
          {movie.cover_url ? (
            <img src={movie.cover_url} alt="" className="w-10 h-14 rounded object-cover bg-zinc-100" />
          ) : (
            <div className="w-10 h-14 rounded bg-zinc-100 border border-zinc-200" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-800 truncate">{movie.title}</p>
            {year && <p className="text-xs text-zinc-500">{year}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-0.5 bg-zinc-100 rounded text-xs font-bold text-zinc-700">
          {row.channel}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
        {formatDateGreek(row.air_date)}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 font-mono whitespace-nowrap">
        {formatTime(row.air_time)}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onTogglePublish}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
            row.is_published ? "text-emerald-700 hover:bg-emerald-50" : "text-zinc-400 hover:bg-zinc-100"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${row.is_published ? "bg-emerald-500" : "bg-zinc-300"}`} />
          {row.is_published ? "Ενεργή" : "Ανενεργή"}
        </button>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button onClick={onEdit} disabled={busy} className="text-sm text-zinc-500 hover:text-zinc-700 mr-3">
          Επεξεργασία
        </button>
        <button onClick={onRemove} disabled={busy} className="text-sm text-red-500 hover:text-red-700">
          Αφαίρεση
        </button>
      </td>
    </tr>
  );
}

function EditingRow({ row, onChange, onSave, onCancel, busy }: {
  row: AiringRow;
  onChange: (r: AiringRow) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <tr className="border-b border-zinc-100 last:border-b-0 bg-zinc-50">
      <td className="px-4 py-3" colSpan={1}>
        <p className="text-sm font-medium text-zinc-800 truncate">{row.items.title}</p>
        <p className="text-xs text-zinc-500">δεν αλλάζει — διαγραφή & δημιουργία αν θες άλλη ταινία</p>
      </td>
      <td className="px-4 py-3">
        <select
          value={row.channel}
          onChange={(e) => onChange({ ...row, channel: e.target.value })}
          className="px-2 py-1.5 border border-zinc-300 rounded text-sm bg-white"
        >
          {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="date"
          value={row.air_date}
          onChange={(e) => onChange({ ...row, air_date: e.target.value })}
          className="px-2 py-1.5 border border-zinc-300 rounded text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="time"
          value={row.air_time.slice(0, 5)}
          onChange={(e) => onChange({ ...row, air_time: e.target.value + ":00" })}
          className="px-2 py-1.5 border border-zinc-300 rounded text-sm"
        />
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button onClick={onSave} disabled={busy} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mr-3">
          {busy ? "..." : "Αποθήκευση"}
        </button>
        <button onClick={onCancel} disabled={busy} className="text-sm text-zinc-500 hover:text-zinc-700">
          Άκυρο
        </button>
      </td>
    </tr>
  );
}

/* ── New airing form (with movie autocomplete) ─────────────── */

interface DraftAiring {
  item_id: string;
  item_title: string;
  item_cover: string | null;
  channel: string;
  air_date: string;
  air_time: string;
}

function NewAiringForm({ draft, onChange, onSave, onCancel }: {
  draft: DraftAiring;
  onChange: (d: DraftAiring) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-5 mb-4 bg-zinc-50/40">
      <h3 className="text-sm font-bold text-zinc-800 mb-4">Νέα προβολή</h3>

      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Ταινία</label>
          <MoviePicker
            value={draft.item_id}
            label={draft.item_title}
            cover={draft.item_cover}
            onPick={(m) => onChange({ ...draft, item_id: m.id, item_title: m.title, item_cover: m.cover_url })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Κανάλι</label>
          <select
            value={draft.channel}
            onChange={(e) => onChange({ ...draft, channel: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
          >
            <option value="">Επιλογή</option>
            {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Ημ/νία</label>
          <input
            type="date"
            value={draft.air_date}
            onChange={(e) => onChange({ ...draft, air_date: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Ώρα</label>
          <input
            type="time"
            value={draft.air_time}
            onChange={(e) => onChange({ ...draft, air_time: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!draft.item_id || !draft.channel}
          className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
        >
          Αποθήκευση
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800">
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function MoviePicker({ value, label, cover, onPick }: {
  value: string;
  label: string;
  cover: string | null;
  onPick: (m: MovieItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/movies-tonight/items", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        const res = await fetch(url.toString());
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  // Pre-load when opening
  useEffect(() => { if (open && results.length === 0 && !loading) setQuery(""); /* triggers fetch */ },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]);

  // Single-input pattern. Earlier we had a separate `autoFocus`-ed input
  // inside the dropdown which stole focus from the trigger and immediately
  // triggered the trigger's onBlur close timer — bug surfaced when a user
  // tried to type and the dropdown disappeared instantly. The trigger IS
  // the search input now; the dropdown is just the result list.
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to close. Using mousedown so it fires before any link/
  // button onClick inside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      {value ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 border border-zinc-200 rounded-lg text-sm text-left bg-white hover:border-zinc-400"
        >
          {cover && <img src={cover} alt="" className="w-7 h-9 rounded object-cover" />}
          <span className="flex-1 truncate text-zinc-800 font-medium">{label}</span>
          <span className="text-xs text-zinc-400">αλλαγή</span>
        </button>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="🔍 Αναζήτηση ταινίας..."
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
        />
      )}

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-72 overflow-y-auto z-20">
          {loading && <div className="px-3 py-2 text-xs text-zinc-500">Αναζήτηση...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">Καμία ταινία.</div>
          )}
          {results.map((m) => (
            <button
              key={m.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(m); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-left"
            >
              {m.cover_url
                ? <img src={m.cover_url} alt="" className="w-8 h-10 rounded object-cover bg-zinc-100" />
                : <div className="w-8 h-10 rounded bg-zinc-100 border border-zinc-200" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{m.title}</p>
                {m.year && <p className="text-xs text-zinc-500">{m.year}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
