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
  { label: "Πιο πρόσφατα",         column: "created_at", ascending: false },
  { label: "Παλαιότερα",           column: "created_at", ascending: true  },
  { label: "Πιο upvoted",          column: "vote_up",    ascending: false },
  { label: "Πιο downvoted",        column: "vote_down",  ascending: false },
  { label: "Ψηλότερη βαθμολογία",  column: "rating",     ascending: false },
  { label: "Χαμηλότερη βαθμολογία",column: "rating",     ascending: true  },
];

type FilterMode = "all" | "with-text" | "rating-only" | "hidden";

export interface ReportEntry {
  id: string;
  reason: "inaccurate" | "fraud" | "offensive" | "other" | string;
  description: string;
  created_at: string;
  reporter_id: string;
  reporter_name: string;
  reporter_handle: string | null;
}

interface ReporterStats {
  total: number;
  dismissed: number;   // resolution_action='kept' — reports the admin found invalid
  hidden: number;      // resolution_action='hidden' — reports that triggered moderation
  pending: number;     // resolved=false
}

export interface UnresolvedReviewRow {
  id: string;
  rating: number;
  reflection: string | null;
  created_at: string;
  user_id: string;
  item_id: string;
  vote_up: number;
  vote_down: number;
  is_hidden: boolean;
  hidden_reason: string | null;
  authorName: string;
  authorHandle: string | null;
  authorAvatar: string | null;
  itemTitle: string;
  itemCategory: string;
  itemSlug: string | null;
  itemCover: string | null;
  reports: ReportEntry[];
}

interface ReviewRow {
  id: string;
  rating: number;
  reflection: string | null;
  created_at: string;
  user_id: string;
  item_id: string;
  vote_up: number;
  vote_down: number;
  is_hidden: boolean;
  hidden_reason: string | null;
  authorName: string;
  authorHandle: string | null;
  authorAvatar: string | null;
  itemTitle: string;
  itemCategory: string;
  itemSlug: string | null;
  itemCover: string | null;
  /** Reports with resolution_action != null. Drives the green "history" badge. */
  resolvedReportCount: number;
}

interface Stats {
  total: number;
  last24h: number;
  unresolved: number;
  hidden: number;
}

interface Props {
  stats: Stats;
  unresolved: UnresolvedReviewRow[];
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

const REASON_LABEL: Record<string, string> = {
  inaccurate: "Ανακριβής",
  fraud:      "Απάτη",
  offensive:  "Προσβλητική",
  other:      "Άλλο",
};

export function ReviewsAdminTable({ stats, unresolved }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortIdx, setSortIdx] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unresolvedRows, setUnresolvedRows] = useState<UnresolvedReviewRow[]>(unresolved);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeReports, setActiveReports] = useState<{ row: UnresolvedReviewRow; reports: ReportEntry[] } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync the unresolved section from the server prop when it changes (e.g.
  // after navigation back to the page). Client-side mutations (hide, resolve
  // a report) update `unresolvedRows` directly so we don't lose them on prop
  // identity churn.
  useEffect(() => {
    setUnresolvedRows(unresolved);
  }, [unresolved]);

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
    const excludeIds = unresolvedRows.map((r) => r.id);

    let query = sb
      .from("reviews")
      .select(`
        id, rating, reflection, created_at, user_id, item_id,
        vote_up, vote_down, is_hidden, hidden_reason,
        users!reviews_user_id_fkey(display_name, handle, avatar_url),
        items!inner(id, title, category, slug, cover_url)
      `, { count: "exact" });

    // The Unresolved section above already shows every flagged review, so
    // exclude those ids from the main list to prevent duplicates.
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    if (debouncedSearch) {
      query = query.ilike("reflection", `%${debouncedSearch}%`);
    }

    if (filterMode === "hidden") query = query.eq("is_hidden", true);
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

    let mapped: Omit<ReviewRow, "resolvedReportCount">[] = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      reflection: r.reflection,
      created_at: r.created_at,
      user_id: r.user_id,
      item_id: r.item_id,
      vote_up: r.vote_up ?? 0,
      vote_down: r.vote_down ?? 0,
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

    // Hydrate resolved-report counts in one batch query for the page slice.
    // This drives the green "history" badge on rows whose reports were all
    // dismissed/hidden in the past.
    const pageIds = mapped.map((r) => r.id);
    const resolvedCountByReview = new Map<string, number>();
    if (pageIds.length > 0) {
      const { data: reps } = await sb
        .from("content_reports")
        .select("target_id, resolved")
        .eq("target_type", "review")
        .eq("resolved", true)
        .in("target_id", pageIds);
      for (const row of ((reps ?? []) as any[])) {
        resolvedCountByReview.set(row.target_id, (resolvedCountByReview.get(row.target_id) ?? 0) + 1);
      }
    }

    const finalRows: ReviewRow[] = mapped.map((r) => ({
      ...r,
      resolvedReportCount: resolvedCountByReview.get(r.id) ?? 0,
    }));

    setRows(finalRows);
    setTotalItems(count ?? 0);
    setLoading(false);
  }, [page, debouncedSearch, sortIdx, categoryFilter, filterMode, ratingFilter, unresolvedRows]);

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
    disabled: sortOpen || activeReports !== null,
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearch, categoryFilter, filterMode, ratingFilter, sortIdx, page, setActiveIndex]);

  /**
   * Hide / unhide a review. When hiding, the endpoint auto-resolves all
   * pending content_reports for the review (see API route comments) — so
   * we also drop the row from the Unresolved section locally.
   */
  async function toggleHidden(row: ReviewRow | UnresolvedReviewRow) {
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

    if (willHide) {
      // Hiding auto-resolves pending reports for this review server-side,
      // so it moves out of Unresolved and into the main list (with a green
      // history badge — its resolved count just jumped).
      const wasUnresolved = unresolvedRows.find((u) => u.id === row.id);
      if (wasUnresolved) {
        setUnresolvedRows((rs) => rs.filter((x) => x.id !== row.id));
        // Refetch the main list so the hidden row + its new green badge
        // surface there.
        fetchData();
        if (activeReports?.row.id === row.id) setActiveReports(null);
        return;
      }
    }

    // Plain row update for the main list (hide-without-reports case +
    // unhide).
    setRows((rs) =>
      rs.map((x) =>
        x.id === row.id ? { ...x, is_hidden: willHide, hidden_reason: willHide ? reason : null } : x
      )
    );
    setUnresolvedRows((rs) =>
      rs.map((x) =>
        x.id === row.id ? { ...x, is_hidden: willHide, hidden_reason: willHide ? reason : null } : x
      )
    );
  }

  /**
   * Resolve a single report via /api/admin/reports/[id]. `kept` clears
   * just this row; `hidden` also soft-hides the underlying review.
   * `alsoWarnAuthor` (only used when action='hidden') fires a parallel
   * write to users.admin_warnings for the review's author.
   *
   * Locally: drop the report from the active modal; when its parent
   * review has zero pending reports left, move the row out of Unresolved.
   */
  async function resolveReport(reportId: string, action: "kept" | "hidden", note: string, alsoWarnAuthor: boolean) {
    if (!activeReports) return;
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Σφάλμα" }));
      setError(e.error || "Σφάλμα");
      return;
    }

    const reviewId = activeReports.row.id;
    const reviewAuthorId = activeReports.row.user_id;

    if (action === "hidden") {
      // Optionally warn the review's author. Best-effort — if it fails
      // we surface the error but the hide itself has already landed.
      if (alsoWarnAuthor && reviewAuthorId) {
        const warnRes = await fetch(`/api/admin/users/${reviewAuthorId}/warn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "review_hidden",
            note,
            source_review_id: reviewId,
            source_report_id: reportId,
          }),
        });
        if (!warnRes.ok) {
          const e = await warnRes.json().catch(() => ({ error: "Warn failed" }));
          setError(`Hide ok, warn failed: ${e.error || "unknown"}`);
        }
      }

      // Server auto-resolved all pending reports + hid the review. Drop
      // the whole row out of Unresolved and refresh the main list (where
      // it now lives with a green badge).
      setUnresolvedRows((rs) => rs.filter((x) => x.id !== reviewId));
      setActiveReports(null);
      fetchData();
      return;
    }

    // Kept: this single report is resolved. If others remain, keep the
    // modal open. If none left, the row moves to the main list as a
    // green-history badge.
    const remaining = activeReports.reports.filter((r) => r.id !== reportId);
    setActiveReports({ row: activeReports.row, reports: remaining });
    if (remaining.length === 0) {
      setUnresolvedRows((rs) => rs.filter((x) => x.id !== reviewId));
      setActiveReports(null);
      fetchData();
    } else {
      // Reflect the new pending count on the row so its badge stays accurate
      // if the user closes the modal mid-flow.
      setUnresolvedRows((rs) =>
        rs.map((x) => (x.id === reviewId ? { ...x, reports: remaining } : x))
      );
    }
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-zinc-950 tracking-tight">Reviews</h1>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-2xl">
          Όλες οι αξιολογήσεις χρηστών — rating (1-5★) + προαιρετικό κείμενο.
          Αναφορές χρηστών εμφανίζονται στη <strong>Unresolved</strong> ενότητα
          πάνω από τη λίστα. Για παλαιά K2 comments δες{" "}
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
          label="Unresolved"
          value={stats.unresolved}
          tone="red"
          urgent={stats.unresolved > 0}
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

      {/* Unresolved section — only renders when there are pending reports */}
      {unresolvedRows.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-[15px] font-semibold text-zinc-900">Unresolved</h2>
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
              {unresolvedRows.length}
            </span>
          </div>
          <ReviewTable
            rows={unresolvedRows.map((r) => ({ ...r, resolvedReportCount: 0 }))}
            unresolvedById={new Map(unresolvedRows.map((u) => [u.id, u]))}
            activeIndex={-1}
            onMouseEnter={() => {}}
            busyId={busyId}
            onToggleHidden={toggleHidden}
            onOpenReports={(row) => {
              const u = unresolvedRows.find((x) => x.id === row.id);
              if (u) setActiveReports({ row: u, reports: u.reports });
            }}
          />
        </section>
      )}

      {/* Filter row (main list only) */}
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

      {/* Main list */}
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
          <ReviewTable
            rows={rows}
            unresolvedById={new Map()}
            activeIndex={activeIndex}
            onMouseEnter={setActiveIndex}
            busyId={busyId}
            onToggleHidden={toggleHidden}
            onOpenReports={() => {}}
          />
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

      {/* Reports drawer */}
      {activeReports && (
        <ReportsDrawer
          row={activeReports.row}
          reports={activeReports.reports}
          onClose={() => setActiveReports(null)}
          onResolve={resolveReport}
        />
      )}
    </div>
  );
}

/* ── Table renderer (shared by Unresolved section + main list) ───────────── */

interface ReviewTableProps {
  rows: ReviewRow[];
  /** Pass the unresolved-report payload here so the row badge can be wired. */
  unresolvedById: Map<string, UnresolvedReviewRow>;
  activeIndex: number;
  onMouseEnter: (i: number) => void;
  busyId: string | null;
  onToggleHidden: (row: ReviewRow | UnresolvedReviewRow) => void;
  onOpenReports: (row: ReviewRow) => void;
}

function ReviewTable({ rows, unresolvedById, activeIndex, onMouseEnter, busyId, onToggleHidden, onOpenReports }: ReviewTableProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-50/60 border-b border-zinc-200">
          <tr className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-500">
            <th className="text-left px-4 py-3">Review</th>
            <th className="text-left px-4 py-3 w-[160px]">Author</th>
            <th className="text-left px-4 py-3 w-[180px]">Suggestion</th>
            <th className="text-left px-4 py-3 w-[140px]">Rating</th>
            <th className="text-left px-4 py-3 w-[110px]">Published</th>
            <th className="text-center px-4 py-3 w-[90px]">Reports</th>
            <th className="text-right px-4 py-3 w-[120px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, i) => {
            const unresolvedCount = unresolvedById.get(row.id)?.reports.length ?? 0;
            return (
              <tr
                key={row.id}
                className={`transition-colors ${
                  i === activeIndex
                    ? "bg-coral-50/60"
                    : row.is_hidden
                      ? "bg-zinc-50/60"
                      : unresolvedCount > 0
                        ? "hover:bg-red-50/40"
                        : "hover:bg-zinc-50/50"
                }`}
                onMouseEnter={() => onMouseEnter(i)}
              >
                {/* Review (reflection or rating-only marker) */}
                <td className="px-4 py-3 align-top">
                  {row.reflection ? (
                    <p
                      className={`text-sm leading-snug line-clamp-2 ${
                        row.is_hidden ? "text-zinc-400 line-through italic" : "text-zinc-800"
                      }`}
                    >
                      “{row.reflection}”
                    </p>
                  ) : (
                    <p className="text-xs italic text-zinc-400">Μόνο βαθμολογία (χωρίς κείμενο)</p>
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
                      size={24}
                      className="rounded-full shrink-0"
                    />
                    <span className="text-xs font-medium text-zinc-800 truncate group-hover/auth:text-coral-700 underline-offset-2 group-hover/auth:underline">
                      {row.authorName}
                    </span>
                  </Link>
                </td>

                {/* Suggestion (item title) */}
                <td className="px-4 py-3 align-top">
                  {row.itemSlug ? (
                    <Link
                      href={`/${row.itemCategory}/${stripCategoryPrefix(row.itemSlug, row.itemCategory)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-coral-700 underline-offset-2 hover:underline"
                    >
                      <span aria-hidden className="text-[11px]">{CATEGORY_ICON[row.itemCategory] ?? "·"}</span>
                      <span className="truncate max-w-[160px]">{row.itemTitle}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>

                {/* Rating + votes */}
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2.5 text-xs tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
                    <span className="inline-flex items-center text-amber-500 font-semibold">
                      {row.rating}<span className="text-amber-400 ml-0.5">★</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span aria-hidden>👍</span>{row.vote_up}
                    </span>
                    <span className="inline-flex items-center gap-1 text-zinc-500">
                      <span aria-hidden>👎</span>{row.vote_down}
                    </span>
                  </div>
                </td>

                {/* Published */}
                <td className="px-4 py-3 align-top text-xs text-zinc-500">
                  {relativeTime(row.created_at)}
                </td>

                {/* Reports badge — 3 states */}
                <td className="px-4 py-3 align-top text-center">
                  <ReportsBadge
                    unresolved={unresolvedCount}
                    resolved={row.resolvedReportCount}
                    onClick={unresolvedCount > 0 ? () => onOpenReports(row) : undefined}
                  />
                </td>

                {/* Status pill + hide action */}
                <td className="px-4 py-3 align-top text-right">
                  <div className="inline-flex items-center gap-2">
                    <StatusPill hidden={row.is_hidden} />
                    <button
                      onClick={() => onToggleHidden(row)}
                      disabled={busyId === row.id}
                      className="opacity-0 group-hover:opacity-100 text-[11px] text-zinc-500 hover:text-zinc-900 disabled:opacity-50 transition-opacity"
                      title={row.is_hidden ? "Επαναφορά" : "Απόκρυψη"}
                      aria-label={row.is_hidden ? "Επαναφορά" : "Απόκρυψη"}
                    >
                      {busyId === row.id ? "…" : row.is_hidden ? "↺" : "✕"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Reports drawer (per-row, opens on badge click) ───────────────────────── */

interface ReportsDrawerProps {
  row: UnresolvedReviewRow;
  reports: ReportEntry[];
  onClose: () => void;
  /**
   * Resolves a single report. `alsoWarnAuthor` (only meaningful when
   * action='hidden') triggers a parallel write to users.admin_warnings
   * for the review's author.
   */
  onResolve: (reportId: string, action: "kept" | "hidden", note: string, alsoWarnAuthor: boolean) => void;
}

function ReportsDrawer({ row, reports, onClose, onResolve }: ReportsDrawerProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(reports[0]?.id ?? null);
  const [pendingAction, setPendingAction] = useState<"kept" | "hidden" | null>(null);
  const [note, setNote] = useState("");
  const [warnAuthor, setWarnAuthor] = useState(false);
  const [reporterStats, setReporterStats] = useState<ReporterStats | null>(null);
  const [reporterFlagBusy, setReporterFlagBusy] = useState(false);
  const [reporterFlagged, setReporterFlagged] = useState(false);
  const active = reports.find((r) => r.id === activeReportId) ?? reports[0];

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Reset reporter-flagged state when switching tabs (each report has its
  // own reporter; the flag belongs to whoever filed the active one).
  useEffect(() => {
    setReporterFlagged(false);
  }, [activeReportId]);

  // Pull reporter abuse signal. RLS allows admins to SELECT all
  // content_reports rows, so a thin browser-client query is enough.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const { data } = await sb
        .from("content_reports")
        .select("resolved, resolution_action")
        .eq("reporter_id", active.reporter_id);
      if (cancelled) return;
      const rows = (data ?? []) as Array<{ resolved: boolean; resolution_action: string | null }>;
      const total = rows.length;
      let dismissed = 0;
      let hidden = 0;
      let pending = 0;
      for (const r of rows) {
        if (!r.resolved) pending++;
        else if (r.resolution_action === "kept") dismissed++;
        else if (r.resolution_action === "hidden") hidden++;
      }
      setReporterStats({ total, dismissed, hidden, pending });
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  async function flagReporterAsAbusive() {
    if (!active) return;
    const reason = prompt(
      `Σημείωση για το flag του reporter (≥5 χαρακτήρες). Θα προστεθεί στο audit log του χρήστη @${active.reporter_handle ?? active.reporter_name}:`,
      `${reporterStats?.dismissed ?? 0} αναφορές απορριφθείσες — σήμανση ως καταχραστής`
    );
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      alert("Η σημείωση πρέπει να έχει ≥5 χαρακτήρες.");
      return;
    }
    setReporterFlagBusy(true);
    const res = await fetch(`/api/admin/users/${active.reporter_id}/warn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "abusive_reporter",
        note: trimmed,
        source_report_id: active.id,
      }),
    });
    setReporterFlagBusy(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Σφάλμα" }));
      alert(e.error || "Σφάλμα");
      return;
    }
    setReporterFlagged(true);
  }

  if (!active) return null;

  const reporterIsSuspicious =
    !!reporterStats && reporterStats.dismissed >= 2 && reporterStats.total >= 3 &&
    reporterStats.dismissed / Math.max(reporterStats.total, 1) >= 0.5;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-zinc-900/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-950">
              {reports.length} αναφορά{reports.length === 1 ? "" : "ές"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">
              Review από {row.authorName} · {row.itemTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Review preview */}
        <div className="px-6 py-4 bg-zinc-50/60 border-b border-zinc-200">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-amber-500 font-semibold tabular-nums text-sm">
              {row.rating}★
            </span>
            <span className="text-xs text-zinc-500">@{row.authorHandle ?? row.authorName}</span>
          </div>
          {row.reflection ? (
            <p className="text-sm text-zinc-800 leading-relaxed">“{row.reflection}”</p>
          ) : (
            <p className="text-xs italic text-zinc-400">Μόνο βαθμολογία (χωρίς κείμενο)</p>
          )}
        </div>

        {/* Report tabs (only when >1) */}
        {reports.length > 1 && (
          <div className="px-6 pt-3 flex gap-1 border-b border-zinc-100">
            {reports.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => {
                  setActiveReportId(r.id);
                  setPendingAction(null);
                  setNote("");
                  setWarnAuthor(false);
                }}
                className={`px-3 py-2 text-xs font-medium rounded-t-md ${
                  r.id === active.id
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                #{idx + 1} · {REASON_LABEL[r.reason] ?? r.reason}
              </button>
            ))}
          </div>
        )}

        {/* Active report */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-3">
            <DrawerField label="Λόγος">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                {REASON_LABEL[active.reason] ?? active.reason}
              </span>
            </DrawerField>
            <DrawerField label="Περιγραφή χρήστη">
              <p className="text-sm text-zinc-800 leading-snug whitespace-pre-wrap">{active.description}</p>
            </DrawerField>
            <DrawerField label="Από">
              <div>
                <p className="text-sm text-zinc-700">
                  {active.reporter_name}
                  {active.reporter_handle && (
                    <span className="text-zinc-400 ml-1.5">@{active.reporter_handle}</span>
                  )}
                  <span className="text-zinc-400 ml-2 text-xs">· {relativeTime(active.created_at)}</span>
                </p>
                {reporterStats && reporterStats.total > 1 && (
                  <ReporterStatsLine
                    stats={reporterStats}
                    suspicious={reporterIsSuspicious}
                    flagged={reporterFlagged}
                    onFlag={flagReporterAsAbusive}
                    flagBusy={reporterFlagBusy}
                  />
                )}
              </div>
            </DrawerField>
          </div>

          {/* Decision panel */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            {!pendingAction ? (
              <>
                <p className="text-[13px] font-semibold text-zinc-900 mb-3">
                  Είναι έγκυρη η αναφορά;
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setPendingAction("kept")}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 text-left"
                  >
                    <span className="block">Όχι — άσε το review</span>
                    <span className="block text-[11px] font-normal text-zinc-500 mt-0.5">
                      Η αναφορά απορρίπτεται, το review παραμένει.
                    </span>
                  </button>
                  <button
                    onClick={() => setPendingAction("hidden")}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 text-left"
                  >
                    <span className="block">Ναι — απόκρυψη review</span>
                    <span className="block text-[11px] font-normal text-red-100/90 mt-0.5">
                      Το review αποκρύπτεται από τη σελίδα.
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Σημείωση admin (≥5 χαρακτήρες)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    pendingAction === "kept"
                      ? "π.χ. δεν τεκμηριώνεται καμία παραβίαση"
                      : "π.χ. προσβλητικό περιεχόμενο, κατά τους όρους χρήσης"
                  }
                  className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100 resize-y"
                />
                {pendingAction === "hidden" && (
                  <label className="flex items-start gap-2 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={warnAuthor}
                      onChange={(e) => setWarnAuthor(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-coral-600 focus:ring-coral-500"
                    />
                    <span className="text-xs text-zinc-700 leading-snug">
                      Προειδοποίηση και στον συγγραφέα του review (
                      <span className="font-medium">{row.authorName}</span>)
                      <span className="block text-[11px] text-zinc-400 mt-0.5">
                        Προστίθεται entry στο profile audit log του χρήστη.
                      </span>
                    </span>
                  </label>
                )}
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => {
                      setPendingAction(null);
                      setNote("");
                      setWarnAuthor(false);
                    }}
                    className="px-4 h-9 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Άκυρο
                  </button>
                  <button
                    onClick={() =>
                      onResolve(active.id, pendingAction, note.trim(), pendingAction === "hidden" && warnAuthor)
                    }
                    disabled={note.trim().length < 5}
                    className={`px-4 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      pendingAction === "hidden"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-zinc-800 hover:bg-zinc-900"
                    }`}
                  >
                    {pendingAction === "hidden" ? "Απόκρυψη review" : "Απόρριψη αναφοράς"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReporterStatsLine({
  stats,
  suspicious,
  flagged,
  onFlag,
  flagBusy,
}: {
  stats: ReporterStats;
  suspicious: boolean;
  flagged: boolean;
  onFlag: () => void;
  flagBusy: boolean;
}) {
  const dismissedPct = Math.round((stats.dismissed / Math.max(stats.total, 1)) * 100);
  return (
    <div
      className={`mt-2 inline-flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${
        suspicious ? "bg-red-50 border border-red-200 text-red-800" : "bg-zinc-50 border border-zinc-200 text-zinc-600"
      }`}
    >
      <span aria-hidden>{suspicious ? "⚠" : "ⓘ"}</span>
      <span>
        Reporter:{" "}
        <span className="font-medium">{stats.total}</span> αναφορ{stats.total === 1 ? "ά" : "ές"}
        {stats.dismissed > 0 && (
          <>
            {" "}
            ·{" "}
            <span className={suspicious ? "font-semibold text-red-700" : "font-medium"}>
              {stats.dismissed} απορριφθείσες ({dismissedPct}%)
            </span>
          </>
        )}
        {stats.hidden > 0 && <> · {stats.hidden} κρίθηκαν έγκυρες</>}
      </span>
      {suspicious && (
        flagged ? (
          <span className="ml-1 inline-flex items-center gap-1 font-medium text-red-700">
            <span aria-hidden>✓</span> Σημάνθηκε
          </span>
        ) : (
          <button
            onClick={onFlag}
            disabled={flagBusy}
            className="ml-1 underline underline-offset-2 hover:text-red-900 disabled:opacity-60"
          >
            {flagBusy ? "..." : "Σήμανε ως καταχραστή"}
          </button>
        )
      )}
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

/* ── small primitives ───────────────────────────────────── */

function ReportsBadge({
  unresolved,
  resolved,
  onClick,
}: {
  unresolved: number;
  resolved: number;
  onClick?: () => void;
}) {
  if (unresolved > 0) {
    // Black filled — urgent
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold tabular-nums shadow-sm hover:bg-zinc-700 transition-colors"
        style={{ fontFeatureSettings: '"tnum"' }}
        aria-label={`${unresolved} αναφορές προς επίλυση`}
      >
        {unresolved}
      </button>
    );
  }
  if (resolved > 0) {
    // Green filled — historical, no action needed
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold tabular-nums"
        style={{ fontFeatureSettings: '"tnum"' }}
        aria-label={`${resolved} αναφορές, επιλυμένες`}
      >
        {resolved}
      </span>
    );
  }
  // Pristine
  return <span className="text-zinc-400 text-sm tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>0</span>;
}

function StatusPill({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" aria-hidden />
        Hidden
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
      Active
    </span>
  );
}

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
