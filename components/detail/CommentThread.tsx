"use client";

/**
 * CommentThread — list comments on a suggestion + report each one.
 *
 * Phase 1 minimum-viable surface:
 *  - Fetches via GET /api/comments?suggestion_id=...
 *  - Renders oldest → newest (matches API ordering)
 *  - Each comment has a [⋮] menu that opens 5 reason chips → POST /api/reports
 *  - After report, the menu closes and a "✓ Έχει αναφερθεί" pill replaces it
 *
 * The Figma rebuild can replace this with a richer thread (replies,
 * voting, time-grouping). For now this just makes user-side comments and
 * reports visible end-to-end.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  vote_up?: number;
  vote_down?: number;
  users: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    level: number;
  } | null;
}

const REASONS: Array<{ id: "offensive" | "spam" | "misinformation" | "harassment" | "other"; label: string }> = [
  { id: "offensive",      label: "Προσβλητικό" },
  { id: "spam",           label: "Spam" },
  { id: "misinformation", label: "Παραπληροφόρηση" },
  { id: "harassment",     label: "Παρενόχληση" },
  { id: "other",          label: "Άλλο" },
];

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "τώρα";
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ώρες πριν`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "χθες";
  if (days < 30) return `${days} μέρες πριν`;
  return d.toLocaleDateString("el-GR", { month: "short", year: "2-digit" });
}

interface Props {
  suggestionId: string;
  /** Optional: pre-prepended local comment from CommentComposer. */
  appendLocal?: { id: string; body: string } | null;
}

export function CommentThread({ suggestionId, appendLocal }: Props) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/comments?suggestion_id=${encodeURIComponent(suggestionId)}`);
        if (!res.ok) {
          setError(`Αποτυχία (${res.status})`);
          return;
        }
        const j = await res.json();
        if (!cancelled) setComments(j.comments ?? []);
      } catch {
        if (!cancelled) setError("Σφάλμα δικτύου.");
      }
    })();
    return () => { cancelled = true; };
  }, [suggestionId]);

  const submitReport = async (commentId: string, reason: string) => {
    setOpenMenuFor(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, reason }),
      });
      if (res.status === 401) {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return;
      }
      if (res.ok) {
        setReportedIds((s) => new Set(s).add(commentId));
      }
    } catch {
      /* swallow — silent failure is fine for moderation actions */
    }
  };

  if (error) {
    return <p className="text-[13px] text-zinc-500 px-1">{error}</p>;
  }

  if (comments === null) {
    return <p className="text-[13px] text-zinc-400 px-1">Φόρτωση σχολίων...</p>;
  }

  // If a parent just posted a new comment via CommentComposer, show it
  // immediately (without re-fetching) by appending to the rendered list.
  const renderList: Comment[] =
    appendLocal && !comments.find((c) => c.id === appendLocal.id)
      ? [
          ...comments,
          {
            id: appendLocal.id,
            body: appendLocal.body,
            created_at: new Date().toISOString(),
            parent_id: null,
            users: null, // skeleton — server will return the joined user on next fetch
          },
        ]
      : comments;

  if (renderList.length === 0) {
    return (
      <p className="text-[13px] text-zinc-400 px-1">
        Κανένα σχόλιο ακόμα. Γίνε ο πρώτος.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {renderList.map((c) => {
        const reported = reportedIds.has(c.id);
        return (
          <li
            key={c.id}
            className="rounded-[10px] bg-white px-4 py-3 flex flex-col gap-2"
            style={{ boxShadow: "1px 2px 6px -2px rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-zinc-800 truncate">
                    {c.users?.display_name ?? "Χρήστης"}
                  </span>
                  {c.users?.handle && (
                    <span className="text-[11px] text-zinc-400 truncate">@{c.users.handle}</span>
                  )}
                  <span className="text-[11px] text-zinc-400 shrink-0">·</span>
                  <span className="text-[11px] text-zinc-400 shrink-0">{relativeTime(c.created_at)}</span>
                </div>
                <p className="text-[14px] text-zinc-800 leading-[150%] break-words">{c.body}</p>
              </div>

              {/* Report kebab + reason chips */}
              <div className="relative shrink-0">
                {reported ? (
                  <span className="text-[11px] font-medium text-[#1D9E75] whitespace-nowrap">✓ Αναφέρθηκε</span>
                ) : (
                  <button
                    onClick={() => setOpenMenuFor(openMenuFor === c.id ? null : c.id)}
                    aria-label="Επιλογές"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>
                  </button>
                )}
                {openMenuFor === c.id && (
                  <div className="absolute right-0 top-9 z-10 rounded-[8px] bg-white border border-zinc-200 shadow-lg py-1 min-w-[170px]">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Αναφορά</p>
                    {REASONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => submitReport(c.id, r.id)}
                        className={cn(
                          "block w-full text-left px-3 py-2 text-[13px] text-zinc-700",
                          "active:bg-zinc-100"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
