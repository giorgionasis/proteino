"use client";

import { useState } from "react";

interface MovieTonightRow {
  id: string;
  title: string;
  channelLogo: string;
  channel: string;
  date: string;
  time: string;
}

const CHANNELS = ["MEGA", "ΕΡΤ1", "ΕΡΤ2", "ΕΡΤ3", "ANT1", "ALPHA", "STAR", "ΣΚΑΪ", "OPEN"];

const INITIAL_TODAY: MovieTonightRow[] = [
  { id: "1", title: "Inception", channelLogo: "MEGA", channel: "MEGA", date: "11 Νοε 2024", time: "21:10" },
  { id: "2", title: "Τα κανόνια του Ναβαρόνε", channelLogo: "", channel: "ΕΡΤ1", date: "11 Νοε 2024", time: "22:00" },
];

const INITIAL_WEEK: MovieTonightRow[] = [
  { id: "3", title: "Inception", channelLogo: "MEGA", channel: "MEGA", date: "11 Νοε 2024", time: "22:10" },
  { id: "4", title: "Το χαμόγελο της Μόνα Λ...", channelLogo: "", channel: "ΕΡΤ1", date: "12 Νοε 2024", time: "22:10" },
  { id: "5", title: "Ο Κώδικας Da Vinci", channelLogo: "MEGA", channel: "MEGA", date: "13 Νοε 2024", time: "22:10" },
  { id: "6", title: "Θέε μου τι σου κάναμε", channelLogo: "", channel: "ΕΡΤ1", date: "13 Νοε 2024", time: "21:00" },
];

function emptyMovie(): MovieTonightRow {
  return { id: crypto.randomUUID(), title: "", channelLogo: "", channel: "", date: "", time: "" };
}

export function MoviesTonightTable() {
  const [todayRows, setTodayRows] = useState(INITIAL_TODAY);
  const [weekRows, setWeekRows] = useState(INITIAL_WEEK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MovieTonightRow | null>(null);
  const [newMovie, setNewMovie] = useState<MovieTonightRow | null>(null);

  const startEdit = (row: MovieTonightRow) => {
    setEditingId(row.id);
    setEditDraft({ ...row });
    setNewMovie(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    const update = (rows: MovieTonightRow[]) =>
      rows.map((r) => (r.id === editDraft.id ? { ...editDraft, channelLogo: editDraft.channel } : r));
    setTodayRows(update);
    setWeekRows(update);
    cancelEdit();
  };

  const removeRow = (id: string) => {
    setTodayRows((r) => r.filter((x) => x.id !== id));
    setWeekRows((r) => r.filter((x) => x.id !== id));
  };

  const startNewMovie = () => {
    setNewMovie(emptyMovie());
    setEditingId(null);
    setEditDraft(null);
  };

  const saveNewMovie = () => {
    if (!newMovie || !newMovie.title.trim()) return;
    const withLogo = { ...newMovie, channelLogo: newMovie.channel };
    setWeekRows((r) => [...r, withLogo]);
    setNewMovie(null);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className="text-zinc-500">Content</span>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-800 font-bold text-2xl">Movies Tonight</span>
      </div>

      {/* Today */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-800">Today</h2>
            <span className="w-6 h-6 rounded bg-zinc-200 text-xs font-bold text-zinc-700 flex items-center justify-center">
              {todayRows.length}
            </span>
          </div>
          <button className="text-sm text-zinc-500 hover:text-zinc-700">Edit Channels</button>
        </div>
        <MovieTable
          rows={todayRows}
          editingId={editingId}
          editDraft={editDraft}
          onEdit={startEdit}
          onRemove={removeRow}
          onCancel={cancelEdit}
          onSave={saveEdit}
          onDraftChange={setEditDraft}
        />
      </div>

      {/* This week */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-zinc-800">This week (11-17 Nov)</h2>
          <span className="w-6 h-6 rounded bg-zinc-200 text-xs font-bold text-zinc-700 flex items-center justify-center">
            {weekRows.length}
          </span>
        </div>
        <MovieTable
          rows={weekRows}
          editingId={editingId}
          editDraft={editDraft}
          onEdit={startEdit}
          onRemove={removeRow}
          onCancel={cancelEdit}
          onSave={saveEdit}
          onDraftChange={setEditDraft}
        />
      </div>

      {/* New movie form */}
      {newMovie ? (
        <div className="border border-zinc-200 rounded-lg p-5 mb-4 bg-zinc-50/50">
          <h3 className="text-sm font-bold text-zinc-800 mb-4">New Movie</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Title</label>
              <input
                type="text"
                value={newMovie.title}
                onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                placeholder="Movie title"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Channel</label>
              <select
                value={newMovie.channel}
                onChange={(e) => setNewMovie({ ...newMovie, channel: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-zinc-400"
              >
                <option value="">Select channel</option>
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Date</label>
              <input
                type="date"
                value={newMovie.date}
                onChange={(e) => setNewMovie({ ...newMovie, date: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Time</label>
              <input
                type="time"
                value={newMovie.time}
                onChange={(e) => setNewMovie({ ...newMovie, time: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveNewMovie}
              disabled={!newMovie.title.trim()}
              className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                newMovie.title.trim() ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-300 cursor-not-allowed"
              }`}
            >
              Save
            </button>
            <button
              onClick={() => setNewMovie(null)}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startNewMovie}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Movie
        </button>
      )}
    </div>
  );
}

function MovieTable({
  rows,
  editingId,
  editDraft,
  onEdit,
  onRemove,
  onCancel,
  onSave,
  onDraftChange,
}: {
  rows: MovieTonightRow[];
  editingId: string | null;
  editDraft: MovieTonightRow | null;
  onEdit: (row: MovieTonightRow) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onDraftChange: (draft: MovieTonightRow | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-400">
        No movies scheduled
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <tbody>
          {rows.map((row) => {
            const isEditing = editingId === row.id && editDraft;

            if (isEditing && editDraft) {
              return (
                <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 bg-zinc-50">
                  <td className="px-5 py-3 w-[240px]">
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={(e) => onDraftChange({ ...editDraft, title: e.target.value })}
                      className="w-full px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </td>
                  <td className="px-5 py-3" colSpan={2}>
                    <select
                      value={editDraft.channel}
                      onChange={(e) => onDraftChange({ ...editDraft, channel: e.target.value })}
                      className="px-2 py-1.5 border border-zinc-300 rounded text-sm bg-white focus:outline-none focus:border-zinc-400"
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="date"
                      value={editDraft.date}
                      onChange={(e) => onDraftChange({ ...editDraft, date: e.target.value })}
                      className="px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="time"
                      value={editDraft.time}
                      onChange={(e) => onDraftChange({ ...editDraft, time: e.target.value })}
                      className="px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={onSave} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mr-3">
                      Save
                    </button>
                    <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-700">
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-zinc-800 w-[240px]">{row.title}</td>
                <td className="px-5 py-3">
                  {row.channelLogo && (
                    <span className="inline-block px-2 py-0.5 bg-zinc-100 rounded text-xs font-bold text-zinc-600">{row.channelLogo}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-zinc-600">{row.channel}</td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1 text-sm text-zinc-600">
                    {row.date}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1 text-sm text-zinc-600">
                    {row.time}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                  </span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(row)} className="text-sm text-zinc-500 hover:text-zinc-700 mr-4">Επεξεργασία</button>
                  <button onClick={() => onRemove(row.id)} className="text-sm text-red-500 hover:text-red-700">Αφαίρεση</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
