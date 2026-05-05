"use client";

/**
 * CommentComposer — minimal user-facing comment input.
 *
 * Phase 1 scope: a single textarea + Submit button per detail page,
 * attached to the featured suggestion (the original suggester's
 * reflection). Posting creates a row in `comments` linked to that
 * suggestion via /api/comments.
 *
 * The Figma rebuild can replace this with a richer thread UI; for now this
 * is the persistence proof.
 */

import { useState, FormEvent } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** The suggestion this comment attaches to. Required by the schema. */
  suggestionId: string;
  /** Optional override for the empty-state placeholder. */
  placeholder?: string;
  /** Called with the inserted comment row on success. Lets parents append to a thread. */
  onPosted?: (comment: { id: string; body: string }) => void;
}

export function CommentComposer({
  suggestionId,
  placeholder = "Σχόλιασε αυτή την πρόταση...",
  onPosted,
}: Props) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion_id: suggestionId, body: trimmed }),
      });

      if (res.status === 401) {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return;
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Αποτυχία (${res.status})`);
        return;
      }

      const j = await res.json();
      setBody("");
      setPosted(true);
      onPosted?.({ id: j.comment?.id, body: trimmed });

      // Auto-clear "posted" message after a few seconds
      setTimeout(() => setPosted(false), 3000);
    } catch {
      setError("Σφάλμα δικτύου. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-[12px] bg-white p-4 flex flex-col gap-3" style={{ boxShadow: "2px 4px 11px -2px rgba(0,0,0,0.1)" }}>
      <p className="text-[12px] font-bold text-zinc-500 tracking-widest uppercase">Σχολίασε</p>
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); setError(null); }}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-[8px] bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
      />
      {error && <p className="text-[12px] text-[#E24B4A]">{error}</p>}
      {posted && <p className="text-[12px] text-[#1D9E75]">✓ Δημοσιεύτηκε</p>}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 tabular-nums">{body.length}/2000</span>
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className={cn(
            "h-10 px-5 rounded-[8px] text-[14px] font-semibold transition-opacity",
            "bg-zinc-800 text-white active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {busy ? "Αποστολή..." : "Σχολίασε"}
        </button>
      </div>
    </form>
  );
}
