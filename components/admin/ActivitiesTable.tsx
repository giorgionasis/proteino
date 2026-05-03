"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORY_TABS = [
  { label: "Αθλητικές", value: "sports" },
  { label: "Εκπαιδευτικές", value: "educational" },
  { label: "Ψυχαγωγικές", value: "entertainment" },
  { label: "Αξιοθέατα", value: "attractions" },
];

const TYPE_FILTERS = ["ALL", "ΣΚΙ", "MOUNTAIN BIKE", "RAFTING", "ΟΡΕΙΒΑΣΙΑ", "ΠΕΖΟΠΟΡΙΑ"];

interface ActivityRow {
  id: string;
  type: string;
  name: string;
  location: string;
  info: string;
  isPublished: boolean;
}

const MOCK_ROWS: ActivityRow[] = [
  { id: "1", type: "ΣΚΙ", name: "Καϊμάκτσαλαν", location: "Google maps", info: "Website", isPublished: true },
  { id: "2", type: "RAFTING", name: "Παρνασσός", location: "Google maps", info: "Website", isPublished: true },
  { id: "3", type: "ΟΡΕΙΒΑΣΙΑ", name: "Καλάβρυτα", location: "Google maps", info: "Facebook", isPublished: true },
  { id: "4", type: "ΠΕΖΟΠΟΡΙΑ", name: "Σέλι", location: "Google maps", info: "Instagram", isPublished: true },
  { id: "5", type: "MOUNTAIN BIKE", name: "Όρος Ζαρός", location: "Google maps", info: "Website", isPublished: false },
];

export function ActivitiesTable() {
  const [activeCategory, setActiveCategory] = useState("sports");
  const [activeType, setActiveType] = useState("ALL");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Activities</h1>
        <Link
          href="/admin/content/activities/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Activity
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-4">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeCategory === tab.value
                ? "text-zinc-900 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Type filters + new button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeType === t
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {t !== "ALL" && <span className="mr-1">🏔️</span>}
              {t}
            </button>
          ))}
        </div>
        <Link
          href="/admin/content/activities/new-category-type"
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Category/Type
        </Link>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Info</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Published</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-zinc-800">{row.type}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{row.name}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 text-sm text-emerald-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                    {row.location}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">{row.info}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-sm ${row.isPublished ? "text-emerald-600" : "text-red-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${row.isPublished ? "bg-emerald-500" : "bg-red-500"}`} />
                    {row.isPublished ? "Active" : "Inactive"}
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
