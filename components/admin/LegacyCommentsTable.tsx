"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AdminPagination } from "./AdminPagination";
import { useListKeyboard } from "@/hooks/useListKeyboard";
import type { Database } from "@/types/database";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { label: "Πιο πρόσφατα",         column: "created_at",   ascending: false },
  { label: "Παλαιότερα",           column: "created_at",   ascending: true },
  { label: "Περισσότερα reports",  column: "report_count", ascending: false },
  { label: "Πιο controversial",    column: "vote_down",    ascending: false },
  { label: "Πιο popular",          column: "vote_up",      ascending: false },
];

type FilterMode = "all" | "reported" | "hidden";

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  vote_up: number;
  vote_down: number;
  report_count: number;
  is_hidden: boolean;
  hidden_reason: string | null;
  authorName: string;
  authorHandle: string | null;
  suggestionId: string;
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  suggesterName: string;
}

interface Stats {
  total: number;
  last24h: number;
  reported: number;
  hidden: number;
}

interface Props { stats: Stats; }

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  movies: "🎬", series: "📺", books: "📚", recipes: "👨‍🍳",
  food: "🍽️", bars: "☕", hotels: "🏨", theater: "🎭", events: "🎉",
};

export function LegacyCommentsTable({ stats }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortIdx, setSortIdx] = useState(0);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, filterMode, sortIdx]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const sort = SORT_OPTIONS[sortIdx];

    let query = supabase
      .from("comments")
      .select(`
        id, body, created_at, user_id, parent_id,
        vote_up, vote_down, report_count, is_hidden, hidden_reason,
        suggestion_id,
        users!comments_user_id_fkey(display_name, handle),
        suggestions!inner(
          id, user_id,
          users!suggestions_user_id_fkey(display_name),
          items!inner(id, title, category)
        )
      `, { count: "exact" });

    if (debouncedSearch) {
      query = query.ilike("body", `%${debouncedSearch}%`);
    }

    if (filterMode === "reported") {
      query = query.gt("report_count", 0);
    } else if (filterMode === "hidden") {
      query = query.eq("is_hidden", true);
    }

    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      setError(error.message);
      setRows([]);
      setTotalItems(0);
    } else {
      let mapped: CommentRow[] = ((data || []) as any[]).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        user_id: c.user_id,
        parent_id: c.parent_id,
        vote_up: c.vote_up ?? 0,
        vote_down: c.vote_down ?? 0,
        report_count: c.report_count ?? 0,
        is_hidden: c.is_hidden ?? false,
        hidden_reason: c.hidden_reason ?? null,
        authorName: c.users?.display_name ?? "—",
        authorHandle: c.users?.handle ?? null,
        suggestionId: c.suggestion_id,
        itemId: c.suggestions?.items?.id ?? "",
        itemTitle: c.suggestions?.items?.title ?? "—",
        itemCategory: c.suggestions?.items?.category ?? "",
        suggesterName: c.suggestions?.users?.display_name ?? "—",
      }));

      if (categoryFilter !== "all") {
        mapped = mapped.filter((r) => r.itemCategory === categoryFilter);
      }

      setRows(mapped);
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { activeIndex, setActiveIndex } = useListKeyboard({
    count: rows.length,
    onOpen: (i) => {
      const row = rows[i];
      if (row) router.push(`/admin/legacy-comments/${row.id}`);
    },
    onHide: async (i) => {
      const row = rows[i];
      if (row) await toggleHidden(row);
    },
    onDelete: async (i) => {
      const row = rows[i];
      if (row) await deleteComment(row.id);
    },
    searchRef: searchInputRef,
    disabled: sortOpen,
  });

  // Reset cursor on filter/page change
  useEffect(() => { setActiveIndex(0); }, [debouncedSearch, categoryFilter, filterMode, sortIdx, page, setActiveIndex]);

  async function deleteComment(id: string) {
    if (!confirm("Διαγραφή σχολίου;")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/comments?id=${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setRows((r) => r.filter((x) => x.id !== id));
    setTotalItems((n) => Math.max(0, n - 1));
  }

  async function toggleHidden(row: CommentRow) {
    setBusyId(row.id);
    setError(null);
    const willHide = !row.is_hidden;
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        is_hidden: willHide,
        hidden_reason: willHide ? "admin_review" : null,
      }),
    });
    setBusyId(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setRows((r) => r.map((x) => x.id === row.id ? { ...x, is_hidden: willHide } : x));
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const statsCards = [
    { label: "Total Reviews", value: stats.total,    color: "bg-zinc-700",    mode: "all" as FilterMode },
    { label: "Last 24h",      value: stats.last24h,  color: "bg-emerald-600", mode: "all" as FilterMode },
    { label: "Reported",      value: stats.reported, color: "bg-red-500",     mode: "reported" as FilterMode, urgent: stats.reported > 0 },
    { label: "Hidden",        value: stats.hidden,   color: "bg-zinc-500",    mode: "hidden" as FilterMode },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Comments (Legacy)</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Frozen archive από το K2 — δεν δημιουργούνται νέα σχόλια. Νέες αξιολογήσεις
          μετριάζονται από το{" "}
          <Link href="/admin/reviews" className="text-coral-700 underline hover:text-coral-800">
            /admin/reviews
          </Link>
          .
        </p>
      </div>

      {/* Stats cards — clickable for filter */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {statsCards.map((s) => {
          const isActive = filterMode === s.mode && (s.mode !== "all" || filterMode === "all");
          const isClickable = s.mode !== "all" || (s.mode === "all" && filterMode !== "all");
          return (
            <button
              key={s.label}
              onClick={() => isClickable && setFilterMode(s.mode)}
              disabled={!isClickable && !s.urgent}
              className={`flex-1 min-w-[180px] max-w-[240px] border rounded-xl p-5 text-left transition-all ${
                isActive && s.mode !== "all" ? "border-zinc-900 ring-2 ring-zinc-900" :
                s.urgent ? "border-red-300 bg-red-50/50 hover:border-red-400" :
                "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`min-w-[32px] h-8 px-2 rounded-lg ${s.color} text-white text-sm font-bold flex items-center justify-center`}>
                  {s.value}
                </span>
                {s.urgent && <span className="text-xs font-bold text-red-600 animate-pulse">! ACTION</span>}
              </div>
              <p className={`text-sm font-medium ${s.urgent ? "text-red-900" : "text-zinc-700"}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Filter mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "reported", "hidden"] as FilterMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setFilterMode(m)}
            className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
              filterMode === m
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {m === "all" ? "Όλα" : m === "reported" ? `Reported (${stats.reported})` : `Hidden (${stats.hidden})`}
          </button>
        ))}
      </div>

      {/* Filter row: sort + categories + search */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
              <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 w-[210px] py-1">
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

          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${categoryFilter === "all" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"}`}
          >
            Όλες
          </button>
          {Object.entries(CATEGORY_LABELS).map(([cat, icon]) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-2 text-base rounded-lg border transition-colors ${categoryFilter === cat ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"}`}
              title={cat}
            >
              {icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search σε κείμενο...  (/)"
              className="w-[260px] pl-3 pr-9 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* Keyboard hint chips removed for visual decluttering — shortcuts
          still active via useListKeyboard for power users. */}

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Comment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Author</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">On</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Votes</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Reports</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Posted</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                  {filterMode === "reported" ? "Κανένα reported comment 🎉" :
                   filterMode === "hidden" ? "Κανένα hidden comment" :
                   "Κανένα σχόλιο"}
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const isBusy = busyId === row.id;
              const netScore = row.vote_up - row.vote_down;
              const isActive = activeIndex === idx;

              return (
                <tr
                  key={row.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`border-b border-zinc-100 transition-colors ${
                    isActive
                      ? "bg-zinc-100 ring-1 ring-zinc-300"
                      : row.is_hidden ? "bg-zinc-50/80 hover:bg-zinc-50" : row.report_count > 0 ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-zinc-50/50"
                  }`}
                >
                  <td className="px-4 py-3 max-w-[380px]">
                    <Link
                      href={`/admin/legacy-comments/${row.id}`}
                      className={`text-sm hover:text-emerald-600 line-clamp-2 ${row.is_hidden ? "text-zinc-400 line-through italic" : "text-zinc-700"}`}
                    >
                      {row.body}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      {row.parent_id && <span className="text-xs text-zinc-400 italic">↳ απάντηση</span>}
                      {row.is_hidden && (
                        <span className="text-xs px-1.5 py-0.5 bg-zinc-200 text-zinc-700 rounded font-semibold">HIDDEN</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold text-zinc-800">{row.authorName}</p>
                    {row.authorHandle && <p className="text-xs text-zinc-400">@{row.authorHandle}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/suggestions/${row.suggestionId}`}
                      className="text-sm text-zinc-700 hover:text-emerald-600 flex items-center gap-1.5"
                    >
                      <span>{CATEGORY_LABELS[row.itemCategory] ?? "📦"}</span>
                      <span className="line-clamp-1 max-w-[180px]">{row.itemTitle}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`flex items-center gap-0.5 ${row.vote_up > 0 ? "text-emerald-600 font-semibold" : "text-zinc-400"}`}>
                        ▲ {row.vote_up}
                      </span>
                      <span className={`flex items-center gap-0.5 ${row.vote_down > 0 ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
                        ▼ {row.vote_down}
                      </span>
                    </div>
                    {(row.vote_up > 0 || row.vote_down > 0) && (
                      <p className={`text-xs mt-0.5 font-bold ${netScore > 0 ? "text-emerald-600" : netScore < 0 ? "text-red-500" : "text-zinc-400"}`}>
                        {netScore > 0 ? `+${netScore}` : netScore}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.report_count > 0 ? (
                      <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold text-white ${
                        row.report_count >= 3 ? "bg-red-600" : row.report_count >= 2 ? "bg-red-500" : "bg-amber-500"
                      }`}>
                        {row.report_count}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleHidden(row)}
                        disabled={isBusy}
                        className={`px-2 py-1 text-xs rounded font-medium disabled:opacity-50 ${
                          row.is_hidden
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-amber-600 hover:bg-amber-50"
                        }`}
                        title={row.is_hidden ? "Επαναφορά" : "Απόκρυψη"}
                      >
                        {row.is_hidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => deleteComment(row.id)}
                        disabled={isBusy}
                        className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
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
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "λίγο πριν";
  if (hours < 24) return `${hours}h πριν`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d πριν`;
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-mono text-[10px] border border-zinc-200 rounded px-1 py-0.5 bg-zinc-50 text-zinc-600">
      {children}
    </kbd>
  );
}
