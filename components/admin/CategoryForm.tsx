"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

export function CategoryForm() {
  const [isActive, setIsActive] = useState(true);
  const [parentCategory, setParentCategory] = useState("");
  const [title, setTitle] = useState("");
  const [alias, setAlias] = useState("");
  const [description, setDescription] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
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
        <Link href="/admin/categories" className="text-emerald-600 hover:underline font-medium underline">
          Categories
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Create Category</span>
      </div>

      <div className="max-w-[560px]">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="12" r="10" />
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              Inactive
            </button>
          </div>
        </div>

        {/* Category (parent) */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Category</label>
          <select
            value={parentCategory}
            onChange={(e) => setParentCategory(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
          >
            <option value="">Επιλογή Κατηγορίας</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.labelEl}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Αστυνομικό Μυθιστόρημα"
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
            placeholder="astynomiko-mythistorima"
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-500 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Περιγραφή της κατηγορίας για SEO"
            className="w-full h-36 px-4 py-3 border border-zinc-200 rounded-lg text-sm text-zinc-700 resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200">
          <Link
            href="/admin/categories"
            className="px-6 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </Link>
          <button className="px-8 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
