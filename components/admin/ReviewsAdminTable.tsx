"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AdminPagination } from "./AdminPagination";
import { useListKeyboard } from "@/hooks/useListKeyboard";
import { AvatarImage } from "@/components/ui/AvatarImage";
import type { Database } from "@/types/database";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { label: "Πιο πρόσφατα",       column: "created_at",   ascending: false },
  { label: "Παλαιότερα",         column: "created_at",   ascending: true },
  { label: "Περισσότερα reports", column: "report_count", ascending: false },
  { label: "Πιο upvoted",        column: "vote_up",      ascending: false },
  { label: "Πιο downvoted",      column: "vote_down",    ascending: false },
  { label: "Ψηλότερη βαθμολογία", column: "rating",      ascending: false },
  { label: "Χαμηλότερη βαθμολογία", column: "rating",    ascending: true },
];

type FilterMode = "all" | "with-text" | "rating-only" | "reported" | "hidden";

interface ReviewRow {
  id: string;
  rating: number;
  reflection: string | null;
  created_at: string;
  user_id: string;
  item_id: string;
  vote_up: number;
  vote_down: number;
  report_count: number;
  is_hidden: boolean;
  hidden_reason: string | null;
  authorName: string;
  authorHandle: string | null;
  authorAvatar: string | null;
  itemTitle: string;
  itemCategory: string;
  itemSlug: string | null;
  itemCover: string | null;
}

interface Stats {
  total: number;
  last24h: number;
  reported: number;
  hidden: number;
}

interface Props {
  stats: Stats;
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const CATEGORY_ICON: Record<string, string> = {
  movies: "🎬", series: "📺", books: "📚", recipes: "👨‍🍳",
  food: "🍽️", bars: "☕", hotels: "🏨", theater: "🎭", events: "🎉",
};

const CATEGORY_OPTIONS = ["all", "movies", "series", "books", "recipes", "food", "bars", "hotels", "theater", "events"];

export function ReviewsAdminTable({ stats }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortIdx, setSortIdx] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, filterMode, ratingFilter, sortIdx]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sb = getSupabase();
    const sort = SORT_OPTIONS[sortIdx];

    let query = sb
      .from("reviews")
      .select(`
        id, rating, reflection, created_at, user_id, item_id,
        vote_up, vote_down, report_count, is_hidden, hidden_reason,
        users!reviews_user_id_fkey(display_name, handle, avatar_url),
        items!inner(id, title, category, slug, cover_url)
      `, { count: "exact" });

    if (debouncedSearch) {
      query = query.ilike("reflection", `%${debouncedSearch}%`);
    }

    if (filterMode === "reported") query = query.gt("report_count", 0);
    else if (filterMode === "hidden") query = query.eq("is_hidden", true);
    else if (filterMode === "with-text") query = query.not("reflection", "is", null);
    else if (filterMode === "rating-only") query = query.is("reflection", null);

    if (ratingFilter !== null) query = query.eq("rating", ratingFilter);

    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error: qErr } = await query;

    if (qErr) {
      setError(qErr.message);
      setRows([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    let mapped: ReviewRow[] = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      reflection: r.reflection,
      created_at: r.created_at,
      user_id: r.user_id,
      item_id: r.item_id,
      vote_up: r.vote_up ?? 0,
      vote_down: r.vote_down ?? 0,
      report_count: r.report_count ?? 0,
      is_hidden: r.is_hidden ?? false,
      hidden_reason: r.hidden_reason ?? null,
      authorName: r.users?.display_name ?? "—",
      authorHandle: r.users?.handle ?? null,
      authorAvatar: r.users?.avatar_url ?? null,
      itemTitle: r.items?.title ?? "—",
      itemCategory: r.items?.category ?? "",
      itemSlug: r.items?.slug ?? null,
      itemCover: r.items?.cover_url ?? null,
    }));

    if (categoryFilter !== "all") {
      mapped = mapped.filter((row) => row.itemCategory === categoryFilter);
    }

    setRows(mapped);
    setTotalItems(count ?? 0);
    setLoading(false);
  }, [page, debouncedSearch, sortIdx, categoryFilter, filterMode, ratingFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { activeIndex, setActiveIndex } = useListKeyboard({
    count: rows.length,
    onOpen: (i) => {
      const row = rows[i];
      if (row?.itemSlug) {
        const slug = stripCategoryPrefix(row.itemSlug, row.itemCategory);
        router.push(`/${row.itemCategory}/${slug}`);
      }
    },
    onHide: async (i) => {
      const row = rows[i];
      if (row) await toggleHidden(row);
    },
    searchRef: searchInputRef,
    disabled: sortOpen,
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearch, categoryFilter, filterMode, ratingFilter, sortIdx, page, setActiveIndex]);

  async function toggleHidden(row: ReviewRow) {
    setBusyId(row.id);
    setError(null);
    const willHide = !row.is_hidden;
    let reason: string | null = null;
    if (willHide) {
      const input = prompt(
        "Λόγος απόκρυψης (≥5 χαρακτήρες, ορατός μόνο στους admins):",
        "admin moderation"
      );
      if (input === null) {
        setBusyId(null);
        return;
      }
      reason = input.trim();
      if (reason.length < 5) {
        setError("Ο λόγος πρέπει να έχει ≥5 χαρακτήρες.");
        setBusyId(null);
        return;
      }
    }
    const res = await fetch(`/api/admin/reviews/${row.id}/hide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hide: willHide, reason }),
    });
    setBusyId(null);
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Σφάλμα" }));
      setError(e.error || "Σφάλμα");
      return;
    }
    setRows((rs) =>
      rs.map((x) =>
        x.id === row.id ? { ...x, is_hidden: willHide, hidden_reason: willHide ? reason : null } : x
      )
    );
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-zinc-950 tracking-tight">Reviews</h1>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-2xl">
          Όλες οι αξιολογήσεις χρηστών — rating (1-5★) + προαιρετικό κείμενο.
          Φίλτραρε, ταξινόμησε και μετριάστε χωρίς να περιμένεις να γίνει
          αναφορά. Για παλαιά K2 comments δες{" "}
          <Link href="/admin/legacy-comments" className="text-coral-700 hover:underline font-medium">
            Legacy Comments
          </Link>
          .
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Σύνολο"
          value={stats.total}
          tone="zinc"
          active={filterMode === "all"}
          onClick={() => {
            setFilterMode("all");
            setRatingFilter(null);
          }}
        />
        <StatCard
          label="Τελευταίες 24 ώρες"
          value={stats.last24h}
          tone="emerald"
        />
        <StatCard
          label="Με αναφορές"
          value={stats.reported}
          tone="red"
          active={filterMode === "reported"}
          urgent={stats.reported > 0}
          onClick={() => {
            setFilterMode(filterMode === "reported" ? "all" : "reported");
          }}
        />
        <StatCard
          label="Κρυμμένες"
          value={stats.hidden}
          tone="zinc"
          active={filterMode === "hidden"}
          onClick={() => {
            setFilterMode(filterMode === "hidden" ? "all" : "hidden");
          }}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση σε reflection text…"
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100"
          />
        </div>

        {/* Mode chips */}
        <FilterChip active={filterMode === "all"} onClick={() => setFilterMode("all")}>
          Όλες
        </FilterChip>
        <FilterChip
          active={filterMode === "with-text"}
          onClick={() => setFilterMode(filterMode === "with-text" ? "all" : "with-text")}
        >
          Με κείμενο
        </FilterChip>
        <FilterChip
          active={filterMode === "rating-only"}
          onClick={() => setFilterMode(filterMode === "rating-only" ? "all" : "rating-only")}
        >
          Μόνο rating
        </FilterChip>

        {/* Rating filter */}
        <select
          value={ratingFilter ?? ""}
          onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : null)}
          className="h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-coral-600"
        >
          <option value="">Κάθε ★</option>
          <option value="5">5 ★</option>
          <option value="4">4 ★</option>
          <option value="3">3 ★</option>
          <option value="2">2 ★</option>
          <option value="1">1 ★</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-coral-600"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "Κάθε κατηγορία" : `${CATEGORY_ICON[c]} ${c}`}
            </option>
          ))}
        </select>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5"
          >
            <span className="text-zinc-400">↕</span>
            {SORT_OPTIONS[sortIdx].label}
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 py-1">
              {SORT_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSortIdx(i);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 ${
                    i === sortIdx ? "text-coral-700 font-semibold" : "text-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-sm text-zinc-400 text-center">Φόρτωση…</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-3xl mb-2" aria-hidden>📝</div>
            <p className="text-sm font-medium text-zinc-700">Καμία αξιολόγηση</p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.total === 0
                ? "Δεν έχει γραφτεί καμία αξιολόγηση στη νέα βάση ακόμα."
                : "Καμία αξιολόγηση δεν ταιριάζει με αυτά τα φίλτρα."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50/60 border-b border-zinc-200">
              <tr className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-500">
                <th className="text-left px-4 py-3 w-[60px]">★</th>
                <th className="text-left px-4 py-3">Reflection / Item</th>
                <th className="text-left px-4 py-3 w-[180px]">Author</th>
                <th className="text-left px-4 py-3 w-[110px]">Engagement</th>
                <th className="text-left px-4 py-3 w-[100px]">When</th>
                <th className="text-right px-4 py-3 w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    i === activeIndex
                      ? "bg-coral-50/60"
                      : row.is_hidden
                        ? "bg-zinc-50/60"
                        : row.report_count > 0
                          ? "bg-red-50/30 hover:bg-red-50/50"
                          : "hover:bg-zinc-50/50"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {/* Rating */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-0.5 tabular-nums text-amber-500 text-sm font-semibold">
                      {row.rating}<span className="text-amber-400">★</span>
                    </div>
                  </td>

                  {/* Reflection + Item */}
                  <td className="px-4 py-3 align-top">
                    {row.reflection ? (
                      <p
                        className={`text-sm leading-snug line-clamp-2 mb-1.5 ${
                          row.is_hidden ? "text-zinc-400 line-through italic" : "text-zinc-800"
                        }`}
                      >
                        “{row.reflection}”
                      </p>
                    ) : (
                      <p className="text-xs italic text-zinc-400 mb-1.5">Μόνο βαθμολογία (χωρίς κείμενο)</p>
                    )}
                    {row.itemSlug && (
                      <Link
                        href={`/${row.itemCategory}/${stripCategoryPrefix(row.itemSlug, row.itemCategory)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-coral-700"
                      >
                        <span aria-hidden>{CATEGORY_ICON[row.itemCategory] ?? "·"}</span>
                        <span className="truncate max-w-[260px]">{row.itemTitle}</span>
                      </Link>
                    )}
                    {row.is_hidden && row.hidden_reason && (
                      <p className="text-[11px] text-amber-700 mt-1.5">
                        ⓘ Κρυμμένη: {row.hidden_reason}
                      </p>
                    )}
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={row.authorHandle ? `/profile/${row.authorHandle}` : "#"}
                      target="_blank"
                      className="flex items-center gap-2 group/auth"
                    >
                      <AvatarImage
                        url={row.authorAvatar}
                        name={row.authorName}
                        size={28}
                        className="rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-800 truncate group-hover/auth:text-coral-700">
                          {row.authorName}
                        </p>
                        {row.authorHandle && (
                          <p className="text-[11px] text-zinc-400 truncate">@{row.authorHandle}</p>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Engagement */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2.5 text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <span aria-hidden>▲</span>
                        {row.vote_up}
                      </span>
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <span aria-hidden>▼</span>
                        {row.vote_down}
                      </span>
                      {row.report_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <span aria-hidden>⚑</span>
                          {row.report_count}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* When */}
                  <td className="px-4 py-3 align-top text-xs text-zinc-500">{relativeTime(row.created_at)}</td>

                  {/* Actions */}
                  <td className="px-4 py-3 align-top text-right">
                    <button
                      onClick={() => toggleHidden(row)}
                      disabled={busyId === row.id}
                      className={`text-xs px-2.5 h-7 rounded-md font-medium transition-colors disabled:opacity-50 ${
                        row.is_hidden
                          ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                      }`}
                      title={row.is_hidden ? "Επαναφορά" : "Απόκρυψη"}
                    >
                      {busyId === row.id ? "…" : row.is_hidden ? "Show" : "Hide"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

/* ── small primitives ───────────────────────────────────── */

function StatCard({
  label,
  value,
  tone,
  active,
  urgent,
  onClick,
}: {
  label: string;
  value: number;
  tone: "zinc" | "emerald" | "red";
  active?: boolean;
  urgent?: boolean;
  onClick?: () => void;
}) {
  const dot =
    tone === "red" ? "bg-red-500" : tone === "emerald" ? "bg-emerald-500" : "bg-zinc-400";
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all ${
        active
          ? "border-coral-300 bg-coral-50/40 shadow-sm"
          : urgent
            ? "border-red-200 bg-red-50/40 hover:border-red-300"
            : "border-zinc-200 bg-white hover:border-zinc-300"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-zinc-900 leading-none tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
        {value.toLocaleString("en-US")}
      </p>
    </Wrapper>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 text-sm rounded-lg border transition-colors ${
        active
          ? "bg-coral-50 border-coral-300 text-coral-700 font-semibold"
          : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ── helpers ────────────────────────────────────────────── */

function stripCategoryPrefix(slug: string, category: string): string {
  if (slug.startsWith(`${category}/`)) return slug.slice(category.length + 1);
  return slug;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "τώρα";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
