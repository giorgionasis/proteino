"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  books:   { icon: "📚", label: "Βιβλίο" },
  movies:  { icon: "🎬", label: "Ταινίες" },
  series:  { icon: "📺", label: "Σειρές" },
  recipes: { icon: "👨‍🍳", label: "Συνταγές" },
  bars:    { icon: "☕", label: "Καφέ/Μπαρ" },
  food:    { icon: "🍽️", label: "Φαγητό" },
  theater: { icon: "🎭", label: "Θέατρο" },
  events:  { icon: "🎉", label: "Εκδηλώσεις" },
  hotels:  { icon: "🏨", label: "Διαμονή" },
};

const CATEGORY_ORDER = ["books", "movies", "series", "food", "bars", "recipes", "theater", "events", "hotels"];

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  subcategories: number;
  items: number;
  suggestions: number;
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function CategoriesTable() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();

      const [subcatsRes, itemsRes, suggestionsRes] = await Promise.all([
        supabase.from("subcategories").select("category"),
        supabase.from("items").select("category"),
        supabase.from("suggestions").select("id, items!inner(category)"),
      ]);

      const subcatCounts: Record<string, number> = {};
      (subcatsRes.data || []).forEach((r: any) => {
        subcatCounts[r.category] = (subcatCounts[r.category] || 0) + 1;
      });

      const itemCounts: Record<string, number> = {};
      (itemsRes.data || []).forEach((r: any) => {
        itemCounts[r.category] = (itemCounts[r.category] || 0) + 1;
      });

      const suggestionCounts: Record<string, number> = {};
      (suggestionsRes.data || []).forEach((r: any) => {
        const cat = r.items?.category;
        if (cat) suggestionCounts[cat] = (suggestionCounts[cat] || 0) + 1;
      });

      const mapped = CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat] || { icon: "📦", label: cat };
        return {
          id: cat,
          name: meta.label,
          icon: meta.icon,
          subcategories: subcatCounts[cat] || 0,
          items: itemCounts[cat] || 0,
          suggestions: suggestionCounts[cat] || 0,
        };
      });

      setRows(mapped);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Categories</h1>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Subcategories</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Items</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestions</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.items}</td>
                <td className="px-6 py-4 text-center text-sm text-zinc-600">{row.suggestions}</td>
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
