"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OpenAsUserButton } from "./OpenAsUserButton";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  suggestionId: string;
  voteUp: number;
  voteDown: number;
  reportCount: number;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
}

interface Author {
  id: string;
  displayName: string;
  handle: string | null;
  email: string;
  avatarUrl: string | null;
  suggestionCount: number;
  isVerified: boolean;
  flaggedCommentsCount: number;
}

interface Suggestion {
  id: string;
  reflection: string | null;
  rating: number | null;
  createdAt: string;
  suggesterName: string;
  suggesterHandle: string | null;
  item: {
    id: string;
    title: string;
    category: string;
    slug: string;
    posterUrl: string | null;
    backdropUrl: string | null;
  };
}

interface Report {
  id: string;
  reason: string;
  description: string | null;
  resolved: boolean;
  resolutionAction: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporterName: string;
  reporterHandle: string | null;
}

interface SiblingComment {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  voteUp: number;
  voteDown: number;
  reportCount: number;
  isHidden: boolean;
  authorName: string;
  authorHandle: string | null;
}

interface AuthorComment {
  id: string;
  body: string;
  createdAt: string;
  suggestionId: string;
  itemTitle: string;
  reportCount: number;
  isHidden: boolean;
}

interface Props {
  comment: Comment;
  author: Author;
  suggestion: Suggestion;
  reports: Report[];
  siblings: SiblingComment[];
  authorOtherComments: AuthorComment[];
  authorTotalComments: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  movies: "🎬 Ταινία", series: "📺 Σειρά", books: "📚 Βιβλίο",
  recipes: "👨‍🍳 Συνταγή", food: "🍽️ Φαγητό", bars: "☕ Μπαρ/Καφέ",
  hotels: "🏨 Διαμονή", theater: "🎭 Θέατρο", events: "🎉 Event",
};

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  offensive:      { label: "Προσβλητικό",       color: "bg-red-100 text-red-800" },
  spam:           { label: "Spam",              color: "bg-amber-100 text-amber-800" },
  misinformation: { label: "Παραπληροφόρηση",   color: "bg-orange-100 text-orange-800" },
  harassment:     { label: "Παρενόχληση",       color: "bg-purple-100 text-purple-800" },
  other:          { label: "Άλλο",              color: "bg-zinc-100 text-zinc-700" },
};

export function ReviewEditor({ comment, author, suggestion, reports, siblings, authorOtherComments, authorTotalComments }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(comment.isHidden);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [reportsState, setReportsState] = useState(reports);

  const unresolvedReports = reportsState.filter((r) => !r.resolved);

  async function deleteComment() {
    if (!confirm("Διαγραφή σχολίου; Δεν αναιρείται.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/admin/comments?id=${comment.id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || "Σφάλμα");
      setBusy(null);
      return;
    }
    router.push("/admin/reviews");
  }

  async function applyHide(reason: string) {
    setBusy("hide");
    setError(null);
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, is_hidden: true, hidden_reason: reason }),
    });
    setBusy(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setIsHidden(true);
    setShowHideDialog(false);
  }

  async function unhide() {
    setBusy("unhide");
    setError(null);
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, is_hidden: false }),
    });
    setBusy(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setIsHidden(false);
  }

  async function resolveReport(reportId: string, action: "kept" | "hidden" | "deleted") {
    setBusy(reportId);
    setError(null);
    const res = await fetch(`/api/admin/comment-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true, resolution_action: action }),
    });
    setBusy(null);
    if (!res.ok) { const e = await res.json(); setError(e.error || "Σφάλμα"); return; }
    setReportsState((rs) => rs.map((r) => r.id === reportId ? { ...r, resolved: true, resolutionAction: action, resolvedAt: new Date().toISOString() } : r));
  }

  async function resolveAllReports(action: "kept" | "hidden" | "deleted") {
    if (!confirm(`Mark όλα τα ${unresolvedReports.length} reports ως resolved (${action});`)) return;
    setBusy("resolve_all");
    setError(null);
    const results = await Promise.allSettled(
      unresolvedReports.map((r) => fetch(`/api/admin/comment-reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true, resolution_action: action }),
      }))
    );
    setBusy(null);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) { setError(`${failed.length} reports απέτυχαν`); return; }
    setReportsState((rs) => rs.map((r) => r.resolved ? r : { ...r, resolved: true, resolutionAction: action, resolvedAt: new Date().toISOString() }));
  }

  const heroImage = suggestion.item.backdropUrl || suggestion.item.posterUrl;
  const netScore = comment.voteUp - comment.voteDown;

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/reviews" className="text-emerald-600 hover:underline font-medium">Reviews</Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-600">Comment Detail</span>
          {isHidden && <span className="ml-3 px-2 py-1 bg-zinc-200 text-zinc-700 text-xs font-bold rounded">HIDDEN</span>}
          {unresolvedReports.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
              {unresolvedReports.length} UNRESOLVED REPORTS
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Open the suggestion as a user — see the comment in real context */}
          {suggestion.item.slug && (() => {
            const cleanSlug = suggestion.item.slug.includes("/")
              ? suggestion.item.slug.split("/").slice(1).join("/")
              : suggestion.item.slug;
            return <OpenAsUserButton href={`/${suggestion.item.category}/${cleanSlug}`} label="See in context" />;
          })()}
          {isHidden ? (
            <button
              onClick={unhide}
              disabled={busy === "unhide"}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {busy === "unhide" ? "..." : "Show again"}
            </button>
          ) : (
            <button
              onClick={() => setShowHideDialog(true)}
              disabled={busy === "hide"}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              Hide
            </button>
          )}
          <button
            onClick={deleteComment}
            disabled={busy === "delete"}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {busy === "delete" ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Hide reason dialog */}
      {showHideDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowHideDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-800 mb-2">Λόγος απόκρυψης</h3>
            <p className="text-sm text-zinc-500 mb-4">Επίλεξε λόγο ή πληκτρολόγησε δικό σου.</p>
            <div className="space-y-2 mb-4">
              {Object.entries(REASON_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => applyHide(key)}
                  disabled={busy === "hide"}
                  className="w-full text-left px-4 py-2.5 border border-zinc-200 rounded-lg text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${val.color}`}>
                    {val.label}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="Custom λόγος..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowHideDialog(false)} className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900">
                Άκυρο
              </button>
              <button
                onClick={() => applyHide(hideReason || "admin_review")}
                disabled={busy === "hide"}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Hide με custom λόγο
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* Main comment */}
          <div className={`bg-white border rounded-xl p-6 ${unresolvedReports.length > 0 ? "border-red-300 ring-1 ring-red-200" : "border-zinc-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">The Comment</h2>
              <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
            </div>
            <div className={`rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap ${
              isHidden ? "bg-zinc-100 text-zinc-400 italic line-through" : "bg-zinc-50 text-zinc-800"
            }`}>
              {comment.body}
            </div>
            {comment.parentId && (
              <p className="text-xs text-zinc-500 italic mt-2">↳ Αυτό είναι απάντηση σε άλλο σχόλιο</p>
            )}
            {isHidden && comment.hiddenReason && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Hidden reason:</strong> {REASON_LABELS[comment.hiddenReason]?.label || comment.hiddenReason}
                {comment.hiddenAt && <span className="ml-2 text-amber-700">· {formatDate(comment.hiddenAt)}</span>}
              </div>
            )}

            {/* Votes visualization */}
            <div className="mt-5 pt-5 border-t border-zinc-100">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">▲</div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-800 leading-tight">{comment.voteUp}</p>
                    <p className="text-xs text-zinc-500 uppercase">Upvotes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">▼</div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-800 leading-tight">{comment.voteDown}</p>
                    <p className="text-xs text-zinc-500 uppercase">Downvotes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div>
                    <p className={`text-2xl font-bold leading-tight ${netScore > 0 ? "text-emerald-600" : netScore < 0 ? "text-red-500" : "text-zinc-400"}`}>
                      {netScore > 0 ? `+${netScore}` : netScore}
                    </p>
                    <p className="text-xs text-zinc-500 uppercase text-right">Net Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reports section */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">
                Reports
                {reportsState.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-full">
                    {reportsState.length}
                  </span>
                )}
              </h2>
              {unresolvedReports.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resolveAllReports("kept")}
                    disabled={busy === "resolve_all"}
                    className="text-xs text-emerald-600 hover:underline font-medium disabled:opacity-50"
                  >
                    Mark all as kept
                  </button>
                </div>
              )}
            </div>

            {reportsState.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-zinc-400">
                Κανένα report 🎉
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {reportsState.map((r) => {
                  const reasonMeta = REASON_LABELS[r.reason] || { label: r.reason, color: "bg-zinc-100 text-zinc-700" };
                  return (
                    <li key={r.id} className={`px-6 py-4 ${r.resolved ? "bg-zinc-50/60" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${reasonMeta.color}`}>
                              {reasonMeta.label}
                            </span>
                            <span className="text-xs text-zinc-500">από</span>
                            <span className="text-sm font-semibold text-zinc-800">{r.reporterName}</span>
                            {r.reporterHandle && <span className="text-xs text-zinc-400">@{r.reporterHandle}</span>}
                            <span className="text-xs text-zinc-400">·</span>
                            <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
                            {r.resolved && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded">
                                ✓ {r.resolutionAction || "resolved"}
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <p className="text-sm text-zinc-700 mt-1">{r.description}</p>
                          )}
                        </div>
                        {!r.resolved && (
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => resolveReport(r.id, "kept")}
                              disabled={busy === r.id}
                              className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                            >
                              ✓ Keep
                            </button>
                            <button
                              onClick={() => resolveReport(r.id, "hidden")}
                              disabled={busy === r.id}
                              className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                            >
                              Hide
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Suggestion context */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200">
              <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Σχολιάζει την πρόταση</h2>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                {heroImage && (
                  <img src={heroImage} alt="" className="w-24 h-32 rounded-lg object-cover bg-zinc-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-1">{CATEGORY_LABELS[suggestion.item.category] ?? suggestion.item.category}</p>
                  <Link href={`/admin/suggestions/${suggestion.id}`} className="text-lg font-bold text-zinc-800 hover:text-emerald-600 line-clamp-2">
                    {suggestion.item.title}
                  </Link>
                  <p className="text-sm text-zinc-500 mt-1">προτάθηκε από <strong>{suggestion.suggesterName}</strong> · {formatDate(suggestion.createdAt)}</p>
                  {suggestion.rating !== null && (
                    <p className="text-sm text-amber-500 mt-2">★ {suggestion.rating.toFixed(1)}</p>
                  )}
                </div>
              </div>
              {suggestion.reflection && (
                <div className="bg-zinc-50 rounded-lg p-4 text-sm text-zinc-700 italic">
                  "{suggestion.reflection}"
                </div>
              )}
            </div>
          </div>

          {/* Sibling comments */}
          {siblings.length > 1 && (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200">
                <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">
                  Όλα τα σχόλια σ' αυτή την πρόταση ({siblings.length})
                </h2>
              </div>
              <ul className="divide-y divide-zinc-100">
                {siblings.map((s) => {
                  const isThis = s.id === comment.id;
                  return (
                    <li key={s.id} className={`px-6 py-3 ${isThis ? "bg-amber-50" : s.isHidden ? "bg-zinc-50/60" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-zinc-800">{s.authorName}</p>
                            {s.authorHandle && <span className="text-xs text-zinc-400">@{s.authorHandle}</span>}
                            <span className="text-xs text-zinc-400">·</span>
                            <span className="text-xs text-zinc-500">{formatDate(s.createdAt)}</span>
                            {isThis && <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-semibold rounded">αυτό</span>}
                            {s.isHidden && <span className="px-2 py-0.5 bg-zinc-200 text-zinc-700 text-xs font-semibold rounded">hidden</span>}
                            {s.parentId && <span className="text-xs text-zinc-400 italic">↳ απάντηση</span>}
                            {s.reportCount > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                {s.reportCount} reports
                              </span>
                            )}
                          </div>
                          <p className={`text-sm line-clamp-3 ${s.isHidden ? "text-zinc-400 italic" : "text-zinc-700"}`}>{s.body}</p>
                          {(s.voteUp > 0 || s.voteDown > 0) && (
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                              <span className="text-emerald-600">▲ {s.voteUp}</span>
                              <span className="text-red-500">▼ {s.voteDown}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT: 1 col */}
        <div className="space-y-6">
          {/* Author */}
          <div className={`bg-white border rounded-xl p-6 ${author.flaggedCommentsCount > 2 ? "border-red-300 ring-1 ring-red-200" : "border-zinc-200"}`}>
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">Author</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-zinc-200 shrink-0 overflow-hidden">
                {author.avatarUrl && <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-zinc-800 truncate">{author.displayName}</p>
                {author.handle && <p className="text-sm text-zinc-500">@{author.handle}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {author.isVerified && (
                    <span className="text-xs text-emerald-600 font-medium">● Verified</span>
                  )}
                  {author.flaggedCommentsCount > 2 && (
                    <span className="text-xs text-red-600 font-bold">⚠ Repeat offender</span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-t border-zinc-100 pt-2">
                <span className="text-zinc-500">Email</span>
                <span className="text-zinc-700 truncate ml-2">{author.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Suggestions</span>
                <span className="text-zinc-700 font-semibold">{author.suggestionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Comments</span>
                <span className="text-zinc-700 font-semibold">{authorTotalComments + 1}</span>
              </div>
              {author.flaggedCommentsCount > 0 && (
                <div className="flex justify-between pt-2 border-t border-zinc-100">
                  <span className="text-red-700 font-semibold">Flagged Comments</span>
                  <span className="text-red-700 font-bold">{author.flaggedCommentsCount}</span>
                </div>
              )}
            </div>
            <Link
              href={`/admin/users?search=${encodeURIComponent(author.email)}`}
              className="mt-4 block text-center px-3 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50"
            >
              Δες προφίλ χρήστη →
            </Link>
          </div>

          {/* Other comments by author */}
          {authorOtherComments.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">
                  Άλλα σχόλια του χρήστη
                </h2>
              </div>
              <ul className="divide-y divide-zinc-100">
                {authorOtherComments.map((c) => (
                  <li key={c.id} className={`px-5 py-3 ${c.isHidden ? "bg-zinc-50/60" : ""}`}>
                    <Link href={`/admin/reviews/${c.id}`} className="block hover:bg-zinc-50/50 -mx-5 px-5 -my-3 py-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-xs text-zinc-500">σε "{c.itemTitle}"</p>
                        <span className="text-xs text-zinc-400">·</span>
                        <p className="text-xs text-zinc-500">{formatDate(c.createdAt)}</p>
                        {c.isHidden && <span className="px-1.5 py-0 bg-zinc-200 text-zinc-700 text-xs rounded">hidden</span>}
                        {c.reportCount > 0 && (
                          <span className="px-1.5 py-0 bg-red-100 text-red-700 text-xs font-bold rounded">{c.reportCount}</span>
                        )}
                      </div>
                      <p className={`text-sm line-clamp-2 ${c.isHidden ? "text-zinc-400 italic" : "text-zinc-700"}`}>{c.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {authorTotalComments > authorOtherComments.length && (
                <div className="px-5 py-3 text-center border-t border-zinc-100">
                  <span className="text-xs text-zinc-500">+ {authorTotalComments - authorOtherComments.length} ακόμα</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "λίγο πριν";
  if (hours < 24) return `${hours}h πριν`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d πριν`;
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
}
