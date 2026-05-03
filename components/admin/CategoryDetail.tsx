"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminPagination } from "./AdminPagination";

interface SubcategoryRow {
  id: string;
  name: string;
  suggestions: number;
  reviews: number;
  extraFields: number;
  isPublished: boolean;
}

const MOCK_SUBCATEGORIES: SubcategoryRow[] = [
  { id: "1", name: "Αστυνομική Λογοτεχνία", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "2", name: "Αυτοβιογραφία", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "3", name: "Βιογραφία", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "4", name: "Για παιδιά", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "5", name: "Γονείς και Παιδιά", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "6", name: "Γουέστερν", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "7", name: "Διήγημα", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "8", name: "Δοκίμιο", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "9", name: "Θέατρο", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
  { id: "10", name: "Ελληνική Λογοτεχνία", suggestions: 367, reviews: 1256, extraFields: 9, isPublished: true },
];

interface Props {
  categoryId: string;
  categoryName: string;
}

export function CategoryDetail({ categoryId, categoryName }: Props) {
  const [page, setPage] = useState(1);

  const stats = [
    { value: 45, label: "SUBCATEGORIES" },
    { value: 367, label: "SUGGESTIONS" },
    { value: 852, label: "REVIEWS" },
    { value: 163, label: "USERS" },
    { value: 24, label: "REPORTS" },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/categories" className="text-emerald-600 hover:underline font-medium underline">
            Categories
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-800 font-bold text-2xl">{categoryName}</span>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Category
        </Link>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="flex-1 border border-zinc-200 rounded-lg px-5 py-4">
            <p className="text-2xl font-bold text-zinc-800">{s.value}</p>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Subcategories table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reviews</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Extra Fields</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Published</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {MOCK_SUBCATEGORIES.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-zinc-800">{row.name}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.suggestions}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.reviews}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.extraFields}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Ενεργή
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-zinc-500 hover:text-zinc-700">
                    Επεξεργασία
                  </button>
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
