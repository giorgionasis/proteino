"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

export function ExtraFieldForm() {
  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    setAlias(
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/admin/extra-fields" className="text-emerald-600 hover:underline font-medium underline">
          Extra Fields
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Δημιουργία Extra Field</span>
      </div>

      <div className="max-w-[440px]">
        {/* Publish toggle */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Publish</label>
          <div className="flex">
            <button
              onClick={() => setIsActive(true)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-l-lg border transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {isActive && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="6" fill="currentColor" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
              Active
            </button>
            <button
              onClick={() => setIsActive(false)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-r-lg border-y border-r transition-colors ${
                !isActive
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {!isActive && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /></svg>
              )}
              Inactive
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ηθοποιός"
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        {/* Alias */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Alias</label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="ithopoios"
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-500 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
          >
            <option value="">SELECT CATEGORY</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.labelEl}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
          >
            <option value="">Επιλογή τύπου</option>
            <option value="dropdown">Dropdown</option>
            <option value="textarea">Textarea</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
            <option value="url">URL</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-zinc-200">
          <button className="px-8 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            Save
          </button>
          <Link
            href="/admin/extra-fields"
            className="px-6 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
