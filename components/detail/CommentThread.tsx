"use client";

/**
 * CommentThread — list comments on a suggestion + report each one.
 *
 *  - Fetches via GET /api/comments?suggestion_id=...
 *  - Renders oldest → newest (matches API ordering)
 *  - Each comment has an "αναφορά" link that opens the 3-step ReportFlowModal
 *    (reason → description → confirmation) — same flow as review reports
 *  - After report, an "✓ Αναφέρθηκε" pill replaces the link
 */

import { useEffect, useState } from "react";
import { ReportLink } from "@/components/report/ReportLink";

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

              {/* Report link — opens the 3-step ReportFlowModal */}
              <div className="shrink-0">
                {reported ? (
                  <span className="text-[11px] font-medium text-[#1D9E75] whitespace-nowrap">✓ Αναφέρθηκε</span>
                ) : (
                  <ReportLink
                    targetType="comment"
                    targetId={c.id}
                    onReported={() => setReportedIds((s) => new Set(s).add(c.id))}
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
