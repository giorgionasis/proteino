"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminTabs } from "./AdminTabs";

const CATEGORY_TABS = [
  { label: "Αρχική", value: "all" },
  { label: "Βιβλίο", value: "books" },
  { label: "Ταινίες", value: "movies" },
  { label: "Σειρές", value: "series" },
  { label: "Φαγητό", value: "food" },
  { label: "Καφέ/Μπαρ", value: "bars" },
  { label: "Συνταγές", value: "recipes" },
  { label: "Θέατρο", value: "theater" },
  { label: "Εκδηλώσεις", value: "events" },
  { label: "Διαμονή", value: "hotels" },
];

interface ExtraFieldRow {
  id: string;
  title: string;
  type: string;
  values: string;
  hasImage: boolean;
  isPublished: boolean;
}

const MOCK_ROWS: Record<string, ExtraFieldRow[]> = {
  movies: [
    { id: "1", title: "Actor", type: "Dropdown", values: "358", hasImage: true, isPublished: true },
    { id: "2", title: "Director", type: "Dropdown", values: "284", hasImage: true, isPublished: true },
    { id: "3", title: "Duration", type: "Textarea", values: "71' - 218'", hasImage: false, isPublished: true },
    { id: "4", title: "Awards", type: "Dropdown", values: "19", hasImage: true, isPublished: true },
    { id: "5", title: "Streaming", type: "Dropdown", values: "5", hasImage: true, isPublished: true },
    { id: "6", title: "Country", type: "Dropdown", values: "12", hasImage: true, isPublished: true },
    { id: "7", title: "Released", type: "Date", values: "1930 - 2024", hasImage: false, isPublished: true },
  ],
  books: [
    { id: "1", title: "Author", type: "Dropdown", values: "245", hasImage: false, isPublished: true },
    { id: "2", title: "Editor", type: "Dropdown", values: "89", hasImage: false, isPublished: true },
    { id: "3", title: "Language", type: "Dropdown", values: "12", hasImage: false, isPublished: true },
    { id: "4", title: "Pages", type: "Number", values: "50 - 1200", hasImage: false, isPublished: true },
    { id: "5", title: "Released", type: "Date", values: "1950 - 2024", hasImage: false, isPublished: true },
  ],
};

export function ExtraFieldsTable() {
  const [activeTab, setActiveTab] = useState("movies");

  const rows = MOCK_ROWS[activeTab] ?? MOCK_ROWS.movies ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Extra Fields</h1>
        <Link
          href="/admin/extra-fields/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Extra Field
        </Link>
      </div>

      {/* Category tabs */}
      <AdminTabs tabs={CATEGORY_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Table */}
      <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Title</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Values</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Image</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Published</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-zinc-800">{row.title}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{row.type}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{row.values}</td>
                <td className="px-6 py-4 text-center">
                  {row.hasImage && (
                    <span className="inline-block w-6 h-6">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 3h18v18H3V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Ενεργό
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-zinc-500 hover:text-zinc-700">Επεξεργασία</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
