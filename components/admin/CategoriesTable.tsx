"use client";

import Link from "next/link";

interface CategoryRow {
  id: string;
  icon: string;
  name: string;
  subcategories: number;
  suggestions: number;
  reviews: number;
  isPublished: boolean;
}

const MOCK_ROWS: CategoryRow[] = [
  { id: "books", icon: "📚", name: "Βιβλίο", subcategories: 45, suggestions: 367, reviews: 2853, isPublished: true },
  { id: "movies", icon: "🎬", name: "Ταινίες", subcategories: 23, suggestions: 456, reviews: 2853, isPublished: true },
  { id: "series", icon: "📺", name: "Σειρές", subcategories: 15, suggestions: 234, reviews: 2853, isPublished: true },
  { id: "recipes", icon: "👨‍🍳", name: "Συνταγές", subcategories: 16, suggestions: 185, reviews: 2853, isPublished: true },
  { id: "bars", icon: "☕", name: "Καφέ/Μπαρ", subcategories: 8, suggestions: 397, reviews: 2853, isPublished: true },
  { id: "food", icon: "🍽️", name: "Φαγητό", subcategories: 24, suggestions: 471, reviews: 2853, isPublished: true },
  { id: "theater", icon: "🎭", name: "Θέατρο", subcategories: 8, suggestions: 56, reviews: 2853, isPublished: true },
  { id: "events", icon: "🎉", name: "Εκδηλώσεις", subcategories: 7, suggestions: 45, reviews: 75, isPublished: true },
  { id: "hotels", icon: "🏨", name: "Διαμονή", subcategories: 5, suggestions: 45, reviews: 2853, isPublished: true },
];

export function CategoriesTable() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Categories</h1>
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

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Subcategories</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reviews</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Publish</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/admin/categories/${row.id}`} className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-lg">
                      {row.icon}
                    </span>
                    <span className="text-sm font-semibold text-zinc-800">{row.name}</span>
                  </Link>
                </td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.subcategories}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.suggestions}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.reviews}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Ενεργή
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/categories/${row.id}`} className="text-sm text-zinc-500 hover:text-zinc-700">
                    Επεξεργασία
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
