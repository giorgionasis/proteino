"use client";

import { useState, useEffect, useCallback } from "react";
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

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  level: number;
  suggestions: number;
  ratingCount: number;
  lastLogin: string | null;
  registered: string;
  isVerified: boolean;
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
      .select("id, display_name, email, avatar_url, level, suggestion_count, rating_count, last_login_at, created_at, is_verified", { count: "exact" });

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
        name: u.display_name,
        email: u.email,
        avatarUrl: u.avatar_url,
        level: u.level,
        suggestions: u.suggestion_count,
        ratingCount: u.rating_count,
        lastLogin: u.last_login_at,
        registered: u.created_at,
        isVerified: u.is_verified,
      })));
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  }, [page, debouncedSearch, sortIdx]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Last Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Registered</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No users found
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const badge = getBadge(row.suggestions);
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
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
}
