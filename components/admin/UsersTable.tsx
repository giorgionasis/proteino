"use client";

import { useState } from "react";
import { AdminPagination } from "./AdminPagination";

interface UserRow {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  loginMethod: string;
  suggestions: string;
  reviews: number;
  lastLogin: string;
  registered: string;
  isActive: boolean;
}

const MOCK_ROWS: UserRow[] = [
  { id: "1", name: "Stavroula Kyriakopoulou", badge: "VERIFIED", badgeColor: "text-emerald-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "2", name: "George Nasis", badge: "PLATINUM", badgeColor: "text-blue-600", loginMethod: "Google", suggestions: "14  (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "3", name: "Lefteris Tsagk", badge: "GOLD", badgeColor: "text-amber-500", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "4", name: "Vita Demetaki", badge: "VERIFIED", badgeColor: "text-emerald-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "5", name: "Νίκος Αβραμίδης", badge: "EXPERT", badgeColor: "text-purple-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "6", name: "Konstantina Foutsitzi", badge: "PLATINUM", badgeColor: "text-blue-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "7", name: "Ανδρέας Πουλά", badge: "EXPERT", badgeColor: "text-purple-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "8", name: "Kostas Pap", badge: "VERIFIED", badgeColor: "text-emerald-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
  { id: "9", name: "Eva Papaioannnou", badge: "PLATINUM", badgeColor: "text-blue-600", loginMethod: "Facebook", suggestions: "2    (25 Dec 2024)", reviews: 0, lastLogin: "25 Δεκ 2024", registered: "10 Oct 2024", isActive: true },
];

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Users</h1>

      {/* Filter row */}
      <div className="flex items-center justify-between mb-4">
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50">
          Recent Published
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Users"
            className="w-[220px] pl-3 pr-9 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Login Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions (Last)</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reviews</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Last Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Registered</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-200 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{row.name}</p>
                      <p className={`text-xs font-medium ${row.badgeColor}`}>● {row.badge}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600">{row.loginMethod}</td>
                <td className="px-4 py-3 text-sm text-zinc-600">{row.suggestions}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                    {row.reviews}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{row.lastLogin}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{row.registered}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={page}
        totalPages={16}
        totalItems={156}
        pageSize={10}
        onPageChange={setPage}
      />
    </div>
  );
}
