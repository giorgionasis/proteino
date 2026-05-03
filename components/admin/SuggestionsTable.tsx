"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AdminTabs } from "./AdminTabs";
import { AdminPagination } from "./AdminPagination";

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
  "Recent Published",
  "Old Published",
  "Recent Created",
  "Old Created",
  "Higher Rating",
  "Lower Rating",
];

const SUBCATEGORY_OPTIONS = [
  "ALL",
  "Αισθηματικές",
  "Επιστημονικής Φαντασίας",
  "Κοινωνικές",
  "Κωμωδίες",
  "Δράμα",
  "Θρίλερ",
  "Δράση",
  "Animation",
  "Ντοκιμαντέρ",
  "Horror",
];

const AUTHOR_OPTIONS = [
  "Stavroula Kyriakopoulou",
  "Stavros Christou",
  "Stavroula Papachristou",
  "Stavr. Athanas.",
  "Stavropoulos Apostolos",
  "George Nasis",
  "Lefteris Tsagk",
  "Socrates Chartsis",
  "Nikos Αβραμίδης",
  "Konstantina Foutsi",
  "Kostas Pap",
];

interface SuggestionRow {
  id: string;
  title: string;
  category: string;
  author: string;
  image: string | null;
  rating: number | null;
  ratingCount: number | null;
  created: string;
  published: string | null;
  isPublished: boolean;
}

const MOCK_ROWS: SuggestionRow[] = [
  { id: "1", title: "Inception", category: "Επιστημονικής Φα...", author: "Stavroula Kyriakop...", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "2", title: "Contagion", category: "Επιστημονικής Φα...", author: "George Nasis", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "3", title: "Εκεί που τραγουδούν ο...", category: "Επιστημονικής Φα...", author: "Stavroula Kyriakop...", image: "/placeholder.jpg", rating: 4.6, ratingCount: 23, created: "05/11/2024 00:28", published: null, isPublished: false },
  { id: "4", title: "Interstellar", category: "Επιστημονικής Φα...", author: "Lefteris Tsagk", image: "/placeholder.jpg", rating: 4.5, ratingCount: 123, created: "05/11/2024 00:28", published: null, isPublished: false },
  { id: "5", title: "Breaking Bad", category: "Επιστημονικής Φα...", author: "Socrates Chartsis", image: "/placeholder.jpg", rating: 4.3, ratingCount: 56, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "6", title: "Η Βοσκοπούλα", category: "Επιστημονικής Φα...", author: "Nikos Αβραμίδης", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "7", title: "Etouto Athens", category: "Επιστημονικής Φα...", author: "Mihalis Nasis", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "8", title: "Ο Θάνατος ενός τυρά...", category: "Επιστημονικής Φα...", author: "Ανδρέας Πουλά", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "9", title: "Lucifer", category: "Επιστημονικής Φα...", author: "Konstantina Foutsi", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
  { id: "10", title: "Το δάρι", category: "Επιστημονικής Φα...", author: "Kostas Pap", image: "/placeholder.jpg", rating: null, ratingCount: null, created: "05/11/2024 00:28", published: "06/11/2024 07:28", isPublished: true },
];

interface FilterChip {
  id: string;
  label: string;
}

type OpenFilter = "sort" | "category" | "author" | "rating" | "published" | "image" | null;

export function SuggestionsTable() {
  const [activeTab, setActiveTab] = useState("movies");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("Recent Published");
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const [filters, setFilters] = useState<FilterChip[]>([
    { id: "1", label: "Επιστημονικής Φαντασίας" },
    { id: "2", label: "Inactive" },
    { id: "3", label: "Image: YES" },
  ]);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Επιστημονικής Φαντασίας"]);
  const [authorSearch, setAuthorSearch] = useState("");
  const [ratingMode, setRatingMode] = useState("ALL");
  const [ratingMin, setRatingMin] = useState("3.0");
  const [ratingMax, setRatingMax] = useState("5");
  const [publishFilter, setPublishFilter] = useState("ALL");
  const [imageFilter, setImageFilter] = useState("ALL");

  function removeFilter(id: string) {
    setFilters((f) => f.filter((c) => c.id !== id));
  }

  function toggleFilter(filter: OpenFilter) {
    setOpenFilter((prev) => (prev === filter ? null : filter));
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const filteredAuthors = authorSearch
    ? AUTHOR_OPTIONS.filter((a) => a.toLowerCase().includes(authorSearch.toLowerCase()))
    : [];

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
      </div>

      {/* Category tabs */}
      <AdminTabs tabs={CATEGORY_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Filter row */}
      <div className="flex items-center gap-3 py-4">
        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleFilter("sort")}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            {sortOption}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
            </svg>
          </button>
          {openFilter === "sort" && (
            <DropdownPanel onClose={() => setOpenFilter(null)}>
              <div className="w-[200px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortOption(opt); setOpenFilter(null); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                      sortOption === opt ? "text-zinc-900 font-medium" : "text-zinc-600"
                    }`}
                  >
                    {opt}
                    {sortOption === opt && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
                  </button>
                ))}
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Active filter chips */}
        {filters.map((f) => (
          <span key={f.id} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 bg-zinc-100 rounded-full">
            {f.label}
            <button onClick={() => removeFilter(f.id)} className="text-zinc-400 hover:text-zinc-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}

        {/* Spacer + search */}
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
          <button className="p-2 text-zinc-400 hover:text-zinc-600 border border-zinc-200 rounded-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Title</th>

              {/* CATEGORY filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("category")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  CATEGORY
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "category" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[220px] py-1">
                      {SUBCATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => cat === "ALL" ? setSelectedCategories([]) : toggleCategory(cat)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between ${
                            (cat === "ALL" && selectedCategories.length === 0) || selectedCategories.includes(cat)
                              ? "text-zinc-900 font-medium bg-zinc-50"
                              : "text-zinc-600"
                          }`}
                        >
                          {cat}
                          {((cat === "ALL" && selectedCategories.length === 0) || selectedCategories.includes(cat)) && (
                            <span className="w-2 h-2 rounded-full bg-zinc-900" />
                          )}
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
                          placeholder=""
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
                      {authorSearch && filteredAuthors.length > 0 && (
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredAuthors.map((a) => (
                            <button
                              key={a}
                              onClick={() => { setAuthorSearch(a); setOpenFilter(null); }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded"
                            >
                              <HighlightMatch text={a} query={authorSearch} />
                            </button>
                          ))}
                        </div>
                      )}
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
                      {["ALL", "YES", "NO"].map((opt) => (
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

              {/* RATING filter header */}
              <th className="px-4 py-3 text-left relative">
                <button
                  onClick={() => toggleFilter("rating")}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
                >
                  RATING
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openFilter === "rating" && (
                  <DropdownPanel onClose={() => setOpenFilter(null)}>
                    <div className="w-[240px] p-4">
                      <div className="space-y-2 mb-4">
                        {[
                          { label: "ALL", value: "ALL" },
                          { label: "3 ★ - 4 ★", value: "3-4" },
                          { label: "4 ★ - 5 ★", value: "4-5" },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="radio"
                              name="ratingFilter"
                              checked={ratingMode === opt.value}
                              onChange={() => setRatingMode(opt.value)}
                              className="w-4 h-4 text-zinc-900 border-zinc-300"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      <div className="border-t border-zinc-200 pt-3">
                        <p className="text-xs font-medium text-zinc-500 mb-2">Range</p>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          className="w-full mb-3 accent-zinc-900"
                        />
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-[10px] text-zinc-400 mb-1">Min</p>
                            <div className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-700">
                              <span className="text-amber-500">★</span>
                              <input
                                type="text"
                                value={ratingMin}
                                onChange={(e) => setRatingMin(e.target.value)}
                                className="w-8 text-sm focus:outline-none"
                              />
                            </div>
                          </div>
                          <span className="text-zinc-400 mt-4">—</span>
                          <div>
                            <p className="text-[10px] text-zinc-400 mb-1">Max</p>
                            <div className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-700">
                              <span className="text-amber-500">★</span>
                              <input
                                type="text"
                                value={ratingMax}
                                onChange={(e) => setRatingMax(e.target.value)}
                                className="w-8 text-sm focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DropdownPanel>
                )}
              </th>

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
                      {["ALL", "ACTIVE", "INACTIVE"].map((opt) => (
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
            {MOCK_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/suggestions/${row.id}`} className="text-sm text-zinc-800 hover:underline font-medium">
                    {row.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600">{row.category}</td>
                <td className="px-4 py-3 text-sm text-zinc-700 font-medium">{row.author}</td>
                <td className="px-4 py-3">
                  {row.image && (
                    <div className="w-10 h-14 bg-zinc-200 rounded overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-zinc-300 to-zinc-200" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.rating !== null ? (
                    <span className="text-sm text-zinc-700">
                      <span className="text-amber-500 mr-1">★</span>
                      {row.rating} ({row.ratingCount})
                    </span>
                  ) : null}
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
