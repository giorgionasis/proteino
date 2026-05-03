"use client";

import { useState } from "react";
import Link from "next/link";

const ACTIVITY_CATEGORIES = [
  { label: "Αθλητικές", value: "sports" },
  { label: "Εκπαιδευτικές", value: "educational" },
  { label: "Ψυχαγωγικές", value: "entertainment" },
  { label: "Αξιοθέατα", value: "attractions" },
];

type CreateMode = "category" | "type" | null;

export function ActivityCategoryTypeForm() {
  const [mode, setMode] = useState<CreateMode>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const canSave = mode === "category" ? title.trim() !== "" : title.trim() !== "" && category !== "";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/admin/content/activities" className="text-emerald-600 hover:underline font-medium underline">
          Activities
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">New Category/Type</span>
      </div>

      <div className="max-w-[700px]">
        {/* Select what to create */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Select what to create
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("category")}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                mode === "category"
                  ? "border-zinc-900 bg-white text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              Category
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                mode === "category" ? "border-zinc-900" : "border-zinc-300"
              }`}>
                {mode === "category" && <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
              </span>
            </button>
            <button
              onClick={() => setMode("type")}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                mode === "type"
                  ? "border-zinc-900 bg-white text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              Type
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                mode === "type" ? "border-zinc-900" : "border-zinc-300"
              }`}>
                {mode === "type" && <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
              </span>
            </button>
          </div>
        </div>

        {/* Category dropdown — only when Type is selected */}
        {mode === "type" && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-[300px] px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
            >
              <option value="">Επιλογή Κατηγορίας</option>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        {mode !== null && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Type the title"
              className="w-[300px] px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>
        )}

        {/* Add Image — only when Type is selected */}
        {mode === "type" && (
          <div className="mb-8">
            <div className="w-[400px] h-[180px] border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center gap-2 bg-zinc-50/50 cursor-pointer hover:border-zinc-400 transition-colors">
              <span className="text-sm text-zinc-500">Add Image</span>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#22c55e" strokeWidth="1.5" />
                <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="#f59e0b" />
                <circle cx="19" cy="19" r="4" fill="#22c55e" />
                <path d="M19 17v4M17 19h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-zinc-200 pt-6">
          <div className="flex justify-end gap-3">
            <Link
              href="/admin/content/activities"
              className="px-8 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </Link>
            {mode !== null && (
              <button
                disabled={!canSave}
                className={`px-8 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
                  canSave
                    ? "bg-zinc-900 hover:bg-zinc-800"
                    : "bg-zinc-300 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
