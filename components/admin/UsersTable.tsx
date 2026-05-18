"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { AdminPagination } from "./AdminPagination";
import type { Database } from "@/types/database";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { label: "Recent Registered", column: "created_at", ascending: false },
  { label: "Old Registered", column: "created_at", ascending: true },
  { label: "Most Suggestions", column: "suggestion_count", ascending: false },
  { label: "Recent Login", column: "last_login_at", ascending: false },
];

type WarningKind = "review_hidden" | "abusive_reporter" | "manual";

interface AdminWarning {
  created_at: string;
  by_admin_id: string;
  kind: WarningKind;
  note: string;
  source_review_id?: string;
  source_report_id?: string;
}

interface UserRow {
  id: string;
  handle: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  level: number;
  suggestions: number;
  ratingCount: number;
  lastLogin: string | null;
  registered: string;
  isVerified: boolean;
  warnings: AdminWarning[];
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const KIND_LABEL: Record<WarningKind, string> = {
  review_hidden:    "Review hidden",
  abusive_reporter: "Abusive reporter",
  manual:           "Manual",
};

const KIND_TONE: Record<WarningKind, string> = {
  review_hidden:    "bg-red-50 text-red-700 border-red-200",
  abusive_reporter: "bg-amber-50 text-amber-700 border-amber-200",
  manual:           "bg-zinc-100 text-zinc-700 border-zinc-200",
};

// Tier thresholds match the platform-wide canonical mapping in
// lib/icons.badgeLabelForSuggestions. `users.level` is unreliable
// (stuck at 1 across the migrated corpus) so we key off
// suggestion_count directly. Admin keeps an extra "NEW" tier for
// users below the public Verified threshold — every row needs a
// label in a moderation table, hiding it would just leave a gap.
function getBadge(suggestionCount: number): { label: string; color: string } {
  if (suggestionCount >= 50) return { label: "PLATINUM", color: "text-blue-600" };
  if (suggestionCount >= 25) return { label: "EXPERT",   color: "text-purple-600" };
  if (suggestionCount >= 10) return { label: "GOLD",     color: "text-amber-500" };
  if (suggestionCount >= 3)  return { label: "VERIFIED", color: "text-emerald-600" };
  return { label: "NEW", color: "text-zinc-400" };
}

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [warningsFor, setWarningsFor] = useState<UserRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, sortIdx]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const sort = SORT_OPTIONS[sortIdx];

    let query = supabase
      .from("users")
      .select(
        "id, handle, display_name, email, avatar_url, level, suggestion_count, rating_count, last_login_at, created_at, is_verified, admin_warnings",
        { count: "exact" }
      );

    if (debouncedSearch) {
      query = query.or(`display_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,handle.ilike.%${debouncedSearch}%`);
    }

    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Users fetch error:", error);
      setRows([]);
      setTotalItems(0);
    } else {
      setRows((data || []).map((u: any) => ({
        id: u.id,
        handle: u.handle,
        name: u.display_name,
        email: u.email,
        avatarUrl: u.avatar_url,
        level: u.level,
        suggestions: u.suggestion_count,
        ratingCount: u.rating_count,
        lastLogin: u.last_login_at,
        registered: u.created_at,
        isVerified: u.is_verified,
        warnings: Array.isArray(u.admin_warnings) ? u.admin_warnings : [],
      })));
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  }, [page, debouncedSearch, sortIdx]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /** Replace the warnings array on a single row locally (after a new
   * manual warning lands). Keeps the table in sync without a full
   * refetch. */
  function updateRowWarnings(userId: string, next: AdminWarning[]) {
    setRows((rs) => rs.map((r) => (r.id === userId ? { ...r, warnings: next } : r)));
    if (warningsFor?.id === userId) {
      setWarningsFor((cur) => (cur ? { ...cur, warnings: next } : cur));
    }
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Users</h1>

      {/* Filter row */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            {SORT_OPTIONS[sortIdx].label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 w-[200px] py-1">
              {SORT_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => { setSortIdx(i); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${sortIdx === i ? "text-zinc-900 font-medium" : "text-zinc-600"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-[220px] pl-3 pr-9 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ratings</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Warnings</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Last Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Registered</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No users found
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const badge = getBadge(row.suggestions);
              const warnCount = row.warnings.length;
              return (
                <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-200 shrink-0 overflow-hidden">
                        {row.avatarUrl && <img src={row.avatarUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{row.name}</p>
                        <p className={`text-xs font-medium ${badge.color}`}>● {badge.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{row.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 px-2">
                      {row.suggestions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 px-2">
                      {row.ratingCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <WarningsBadge count={warnCount} onClick={() => setWarningsFor(row)} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {row.lastLogin ? formatDate(row.lastLogin) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(row.registered)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1.5 text-sm ${row.isVerified ? "text-emerald-600" : "text-zinc-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${row.isVerified ? "bg-emerald-500" : "bg-zinc-300"}`} />
                      {row.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {warningsFor && (
        <WarningsDrawer
          user={warningsFor}
          onClose={() => setWarningsFor(null)}
          onWarningsUpdated={(next) => updateRowWarnings(warningsFor.id, next)}
        />
      )}
    </div>
  );
}

/* ── Warnings badge (matches the REPORTS badge visual language) ───────── */

function WarningsBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) {
    return <span className="text-zinc-400 text-sm tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>0</span>;
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold tabular-nums shadow-sm hover:bg-red-700 transition-colors"
      style={{ fontFeatureSettings: '"tnum"' }}
      aria-label={`${count} προειδοποιήσεις`}
    >
      {count}
    </button>
  );
}

/* ── Warnings drawer (audit log + add-manual action) ──────────────────── */

interface WarningsDrawerProps {
  user: UserRow;
  onClose: () => void;
  onWarningsUpdated: (next: AdminWarning[]) => void;
}

function WarningsDrawer({ user, onClose, onWarningsUpdated }: WarningsDrawerProps) {
  const [adminNames, setAdminNames] = useState<Map<string, string>>(new Map());
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Resolve admin display names for the by_admin_id field. Browser RLS
  // allows authenticated users to read public.users.display_name; this
  // keeps the drawer self-contained without a dedicated endpoint.
  useEffect(() => {
    if (user.warnings.length === 0) return;
    const ids = Array.from(new Set(user.warnings.map((w) => w.by_admin_id))).filter(Boolean);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const { data } = await sb
        .from("users")
        .select("id, display_name")
        .in("id", ids);
      if (cancelled) return;
      const m = new Map<string, string>();
      for (const r of ((data ?? []) as Array<{ id: string; display_name: string | null }>)) {
        m.set(r.id, r.display_name ?? r.id.slice(0, 8));
      }
      setAdminNames(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.warnings]);

  async function submitManualWarning() {
    if (note.trim().length < 5) {
      setErr("Σημείωση ≥5 χαρακτήρες.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/users/${user.id}/warn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "manual", note: note.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Σφάλμα" }));
      setErr(e.error || "Σφάλμα");
      return;
    }
    // Reflect the new entry locally — we don't have the server's exact
    // timestamp/id, but the table just refetches on close so this is a
    // best-effort optimistic update for the drawer state.
    const next: AdminWarning[] = [
      ...user.warnings,
      {
        created_at: new Date().toISOString(),
        by_admin_id: "self",
        kind: "manual",
        note: note.trim(),
      },
    ];
    onWarningsUpdated(next);
    setAdding(false);
    setNote("");
  }

  // Newest first for the audit log render — fresh actions surface
  // immediately, the deep history scrolls.
  const sortedWarnings = [...user.warnings].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-zinc-900/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-zinc-950">
              {user.warnings.length} προειδοποίηση{user.warnings.length === 1 ? "" : "ές"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">
              {user.name}
              {user.handle && <span className="text-zinc-400 ml-1.5">@{user.handle}</span>}
              {user.handle && (
                <Link
                  href={`/profile/${user.handle}`}
                  target="_blank"
                  className="ml-2 text-coral-700 hover:underline"
                >
                  Profile ↗
                </Link>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Log */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {sortedWarnings.length === 0 ? (
            <p className="text-sm italic text-zinc-400 text-center py-6">
              Χωρίς προειδοποιήσεις
            </p>
          ) : (
            sortedWarnings.map((w, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${KIND_TONE[w.kind] ?? KIND_TONE.manual}`}
                  >
                    {KIND_LABEL[w.kind] ?? w.kind}
                  </span>
                  <span className="text-[11px] text-zinc-500" title={new Date(w.created_at).toLocaleString("el-GR")}>
                    {relativeTime(w.created_at)}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    by{" "}
                    {w.by_admin_id === "self"
                      ? "εσένα"
                      : adminNames.get(w.by_admin_id) ?? w.by_admin_id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-sm text-zinc-800 leading-snug whitespace-pre-wrap">{w.note}</p>
                {(w.source_review_id || w.source_report_id) && (
                  <div className="mt-2 flex gap-3 text-[11px] text-zinc-400">
                    {w.source_review_id && (
                      <span>
                        source review:{" "}
                        <code className="text-zinc-500">{w.source_review_id.slice(0, 8)}</code>
                      </span>
                    )}
                    {w.source_report_id && (
                      <span>
                        source report:{" "}
                        <code className="text-zinc-500">{w.source_report_id.slice(0, 8)}</code>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add manual warning */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/40">
          {err && (
            <p className="text-xs text-red-700 mb-2">{err}</p>
          )}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full px-4 h-9 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
            >
              + Πρόσθεσε manual προειδοποίηση
            </button>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Σημείωση (≥5 χαρακτήρες)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="π.χ. επανειλημμένο spam, φέρεται επιθετικά σε σχόλια"
                className="w-full min-h-[70px] p-3 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100 resize-y bg-white"
              />
              <div className="flex gap-2 justify-end mt-3">
                <button
                  onClick={() => {
                    setAdding(false);
                    setNote("");
                    setErr(null);
                  }}
                  className="px-4 h-9 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Άκυρο
                </button>
                <button
                  onClick={submitManualWarning}
                  disabled={busy || note.trim().length < 5}
                  className="px-4 h-9 rounded-lg text-sm font-medium bg-zinc-800 text-white hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "..." : "Καταγραφή"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "τώρα";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
