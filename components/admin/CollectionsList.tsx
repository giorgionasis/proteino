"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminTabs } from "./AdminTabs";

const CATEGORY_TABS = [
  { label: "Φίλτρα", value: "filters" },
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

interface CollectionRow {
  id: string;
  logo: string;
  title: string;
  subtitle: string;
  type: "card" | "carousel";
  isPublished: boolean;
}

const MOCK_ROWS: CollectionRow[] = [
  { id: "1", logo: "MARVEL", title: "Από το σύμπαν της MARVEL", subtitle: "", type: "card", isPublished: true },
  { id: "2", logo: "N", title: "Διαθέσιμες από NETFLIX", subtitle: "", type: "carousel", isPublished: true },
  { id: "3", logo: "🏆", title: "Καλύτερης Ταινίας", subtitle: "Βραβείο Όσκαρ", type: "card", isPublished: true },
];

export function CollectionsList() {
  const [activeTab, setActiveTab] = useState("movies");
  const [typeFilter, setTypeFilter] = useState<"card" | "carousel" | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Collections</h1>
        <Link
          href="/admin/content/collections/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Collection
        </Link>
      </div>

      {/* Category tabs */}
      <AdminTabs tabs={CATEGORY_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Type filter */}
      <div className="flex gap-2 mt-4 mb-4">
        <button
          onClick={() => setTypeFilter(typeFilter === "card" ? null : "card")}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            typeFilter === "card" ? "bg-zinc-100 text-zinc-800 border-zinc-300 font-medium" : "text-zinc-500 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          Card
        </button>
        <button
          onClick={() => setTypeFilter(typeFilter === "carousel" ? null : "carousel")}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            typeFilter === "carousel" ? "bg-zinc-100 text-zinc-800 border-zinc-300 font-medium" : "text-zinc-500 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          Carousel
        </button>
      </div>

      <p className="text-xs text-zinc-500 mb-4">Drag & drop to reorder the collections</p>

      {/* Collection rows */}
      <div className="flex gap-8">
        {/* List */}
        <div className="flex-1 space-y-3">
          {MOCK_ROWS.filter((r) => !typeFilter || r.type === typeFilter).map((row) => (
            <div key={row.id} className="flex items-center gap-4 p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors cursor-grab">
              <span className="text-zinc-400 cursor-grab">⋮⋮</span>
              <div className="w-12 h-12 bg-zinc-100 rounded flex items-center justify-center text-sm font-bold">
                {row.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{row.title}</p>
                {row.subtitle && <p className="text-xs text-zinc-500">{row.subtitle}</p>}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Ενεργή
              </span>
              <button className="text-sm text-zinc-500 hover:text-zinc-700">Επεξεργασία</button>
            </div>
          ))}
        </div>

        {/* Phone preview */}
        <div className="w-[260px] shrink-0">
          <div className="border-[8px] border-zinc-800 rounded-[36px] overflow-hidden bg-white shadow-xl">
            <div className="h-[520px] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-zinc-800">Proteino<span className="text-[#FE6F5E]">.</span></span>
                  <span className="text-xs text-zinc-400">Σύνδεση</span>
                </div>
                <div className="bg-zinc-100 rounded-lg p-4 mb-3">
                  <p className="text-2xl font-bold text-zinc-800">766</p>
                  <p className="text-xs text-zinc-500">Προτάσεις για να ανακαλύψεις σε <strong>Ταινίες</strong></p>
                </div>
                {MOCK_ROWS.filter((r) => r.type === "card").map((r) => (
                  <div key={r.id} className="bg-zinc-50 rounded-lg p-3 mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-200 rounded flex items-center justify-center text-xs font-bold">{r.logo}</div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-700">{r.title}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-3">
                  <div className="w-full h-[120px] bg-zinc-200 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
