"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { AdminTabs } from "./AdminTabs";
import { AdminPagination } from "./AdminPagination";
import type { Database } from "@/types/database";

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

const SORT_OPTIONS = [
  { label: "Recent Published", column: "published_at", ascending: false },
  { label: "Old Published", column: "published_at", ascending: true },
  { label: "Recent Created", column: "created_at", ascending: false },
  { label: "Old Created", column: "created_at", ascending: true },
  { label: "Higher Rating", column: "rating", ascending: false },
  { label: "Lower Rating", column: "rating", ascending: true },
];

const PAGE_SIZE = 10;

interface SuggestionRow {
  id: string;
  title: string;
  subcategory: string | null;
  author: string;
  coverUrl: string | null;
  rating: number | null;
  ratingCount: number;
  created: string;
  published: string | null;
  isPublished: boolean;
}

interface Props {
  authors: { id: string; display_name: string }[];
  subcategories: { id: string; category: string; name: string }[];
}

type OpenFilter = "sort" | "subcategory" | "author" | "rating" | "published" | "image" | null;

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function SuggestionsTable({ authors, subcategories }: Props) {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);

  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [authorSearch, setAuthorSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [imageFilter, setImageFilter] = useState<"ALL" | "YES" | "NO">("ALL");

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [activeTab, debouncedSearch, sortIdx, selectedSubcategories, authorFilter, publishFilter, imageFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const sort = SORT_OPTIONS[sortIdx];

    let query = supabase
      .from("suggestions")
      .select(`
        id,
        rating,
        is_published,
        created_at,
        published_at,
        items!inner(id, title, category, subcategory_id, cover_url, rating_count),
        users!inner(display_name)
      `, { count: "exact" });

    // Category filter
    if (activeTab !== "all") {
      query = query.eq("items.category", activeTab);
    }

    // Subcategory filter
    if (selectedSubcategories.length > 0) {
      query = query.in("items.subcategory_id", selectedSubcategories);
    }

    // Author filter
    if (authorFilter) {
      query = query.eq("user_id", authorFilter);
    }

    // Published filter
    if (publishFilter === "ACTIVE") {
      query = query.eq("is_published", true);
    } else if (publishFilter === "INACTIVE") {
      query = query.eq("is_published", false);
    }

    // Image filter
    if (imageFilter === "YES") {
      query = query.not("items.cover_url", "is", null);
    } else if (imageFilter === "NO") {
      query = query.is("items.cover_url", null);
    }

    // Search
    if (debouncedSearch) {
      query = query.ilike("items.title", `%${debouncedSearch}%`);
    }

    // Sort
    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Suggestions fetch error:", error);
      setRows([]);
      setTotalItems(0);
    } else {
      const mapped: SuggestionRow[] = (data || []).map((row: any) => {
        const item = row.items;
        const user = row.users;
        const subcat = subcategories.find(s => s.id === item.subcategory_id);
        return {
          id: row.id,
          title: item.title,
          subcategory: subcat?.name ?? null,
          author: user.display_name,
          coverUrl: item.cover_url,
          rating: row.rating,
          ratingCount: item.rating_count ?? 0,
          created: formatDate(row.created_at),
          published: row.published_at ? formatDate(row.published_at) : null,
          isPublished: row.is_published,
        };
      });
      setRows(mapped);
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  }, [activeTab, page, debouncedSearch, sortIdx, selectedSubcategories, authorFilter, publishFilter, imageFilter, subcategories]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredAuthors = authorSearch
    ? authors.filter((a) => a.display_name.toLowerCase().includes(authorSearch.toLowerCase()))
    : authors.slice(0, 10);

  const currentSubcats = activeTab === "all"
    ? subcategories
    : subcategories.filter(s => s.category === activeTab);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  function toggleFilter(filter: OpenFilter) {
    setOpenFilter((prev) => (prev === filter ? null : filter));
  }

  function toggleSubcategory(id: string) {
    setSelectedSubcategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  // Active filter chips
  const chips: { id: string; label: string; clear: () => void }[] = [];
  if (selectedSubcategories.length > 0) {
    const names = selectedSubcategories.map(id => subcategories.find(s => s.id === id)?.name ?? id);
    chips.push({ id: "subcat", label: names.join(", "), clear: () => setSelectedSubcategories([]) });
  }
  if (authorFilter) {
    const name = authors.find(a => a.id === authorFilter)?.display_name ?? "Author";
    chips.push({ id: "author", label: name, clear: () => setAuthorFilter(null) });
  }
  if (publishFilter !== "ALL") {
    chips.push({ id: "publish", label: publishFilter, clear: () => setPublishFilter("ALL") });
  }
  if (imageFilter !== "ALL") {
    chips.push({ id: "image", label: `Image: ${imageFilter}`, clear: () => setImageFilter("ALL") });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-zinc-800">Suggestions</h1>
          <Link
            href="/admin/suggestions/new"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Suggestion
          </Link>
        </div>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
      </div>

      {/* Category tabs */}
      <AdminTabs tabs={CATEGORY_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Filter row */}
      <div className="flex items-center gap-3 py-4 flex-wrap">
        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleFilter("sort")}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            {SORT_OPTIONS[sortIdx].label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
            </svg>
          </button>
          {openFilter === "sort" && (
            <DropdownPanel onClose={() => setOpenFilter(null)}>
              <div className="w-[200px] py-1">
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => { setSortIdx(i); setOpenFilter(null); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                      sortIdx === i ? "text-zinc-900 font-medium" : "text-zinc-600"
                    }`}
                  >
                    {opt.label}
                    {sortIdx === i && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
                  </button>
                ))}
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Active filter chips */}
        {chips.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 bg-zinc-100 rounded-full">
            {c.label}
            <button onClick={c.clear} className="text-zinc-400 hover:text-zinc-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}

        {/* Search */}
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση προτάσεων"
              className="w-[220px] pl-3 pr-9 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Title</th>

              {/* SUBCATEGORY filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("subcategory")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  SUBCATEGORY
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "subcategory" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[220px] py-1 max-h-[300px] overflow-y-auto">
                      <button
                        onClick={() => setSelectedSubcategories([])}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${
                          selectedSubcategories.length === 0 ? "text-zinc-900 font-medium bg-zinc-50" : "text-zinc-600"
                        }`}
                      >
                        ALL
                      </button>
                      {currentSubcats.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => toggleSubcategory(cat.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                            selectedSubcategories.includes(cat.id) ? "text-zinc-900 font-medium bg-zinc-50" : "text-zinc-600"
                          }`}
                        >
                          {cat.name}
                          {selectedSubcategories.includes(cat.id) && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
                        </button>
                      ))}
                    </div>
                  </DropdownPanel>
                )}
              </th>

              {/* AUTHOR filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("author")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  AUTHOR
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "author" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[260px] p-3">
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={authorSearch}
                          onChange={(e) => setAuthorSearch(e.target.value)}
                          placeholder="Search author..."
                          autoFocus
                          className="w-full pl-3 pr-8 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
                        />
                        {authorSearch && (
                          <button onClick={() => setAuthorSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredAuthors.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => { setAuthorFilter(a.id); setAuthorSearch(""); setOpenFilter(null); }}
                            className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded"
                          >
                            {authorSearch ? <HighlightMatch text={a.display_name} query={authorSearch} /> : a.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </DropdownPanel>
                )}
              </th>

              {/* IMAGE filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("image")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  IMAGE
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "image" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[140px] py-1">
                      {(["ALL", "YES", "NO"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setImageFilter(opt); setOpenFilter(null); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                            imageFilter === opt ? "text-zinc-900 font-medium" : "text-zinc-600"
                          }`}
                        >
                          {opt}
                          {imageFilter === opt && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
                        </button>
                      ))}
                    </div>
                  </DropdownPanel>
                )}
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Created</th>

              {/* PUBLISHED filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("published")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  PUBLISHED
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "published" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[160px] py-1">
                      {(["ALL", "ACTIVE", "INACTIVE"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setPublishFilter(opt); setOpenFilter(null); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                            publishFilter === opt ? "text-zinc-900 font-medium" : "text-zinc-600"
                          }`}
                        >
                          {opt}
                          {publishFilter === opt && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
                        </button>
                      ))}
                    </div>
                  </DropdownPanel>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No suggestions found
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/suggestions/${row.id}`} className="text-sm text-zinc-800 hover:underline font-medium">
                    {row.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600">{row.subcategory ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-zinc-700 font-medium">{row.author}</td>
                <td className="px-4 py-3">
                  {row.coverUrl ? (
                    <div className="w-10 h-14 bg-zinc-200 rounded overflow-hidden">
                      <img src={row.coverUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-14 bg-zinc-100 rounded flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.rating !== null ? (
                    <span className="text-sm text-zinc-700">
                      <span className="text-amber-500 mr-1">★</span>
                      {row.rating.toFixed(1)} {row.ratingCount > 0 && `(${row.ratingCount})`}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{row.created}</td>
                <td className="px-4 py-3">
                  {row.isPublished && row.published ? (
                    <span className="text-sm text-emerald-600 font-medium">{row.published}</span>
                  ) : (
                    <span className="text-sm text-red-500 font-medium">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function DropdownPanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
      {children}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-zinc-900">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
}
