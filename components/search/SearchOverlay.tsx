"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { OverlayHeader } from "@/components/layout/Header";
import { useSearch } from "@/hooks/useSearch";
import type { Item } from "@/types";
import { cn } from "@/lib/utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_JUMPS = [
  "Jazz bar in Chalandri",
  "Series with one season",
  "Top 10 Books 2023",
  "Italian restaurant in Athens",
  "Cozy café for working",
];

const AI_MESSAGES = [
  "Analyzing semantic intent...",
  "Scanning nightlife graph for matches...",
  "Cross-referencing community suggestions...",
  "Ranking by match quality...",
  "Searching through recommendations...",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchPill({ pill }: { pill: { type: "VIBE" | "TYPE" | "LOC"; value: string } }) {
  const labelClass = {
    VIBE: "text-coral-400",
    TYPE: "text-warning",
    LOC:  "text-success",
  }[pill.type];

  return (
    <span className="inline-flex items-center gap-1.5 bg-zinc-800 rounded-full px-3 py-[5px] animate-pop-in">
      <span className={cn("text-xs font-bold tracking-widest", labelClass)}>
        {pill.type}:
      </span>
      <span className="text-xs font-bold tracking-wider text-white">
        {pill.value}
      </span>
    </span>
  );
}

function IntelligencePanel({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="bg-zinc-900 rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-coral-600 tracking-[0.2em] uppercase">
          Proteino Intelligence
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">{progress}%</span>
      </div>
      <p className="text-sm font-medium text-white leading-snug">{message}</p>
      <div className="h-[3px] bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
        />
      </div>
    </div>
  );
}

function QuickJumps({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
        Quick Jumps
      </p>
      <div className="space-y-2">
        {QUICK_JUMPS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="w-full text-left px-4 py-3.5 bg-zinc-50 rounded-card text-sm font-medium text-zinc-700 active:bg-zinc-100 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ item }: { item: Item }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-card border border-zinc-200 shadow-card active:bg-zinc-50 transition-colors cursor-pointer">
      <div className="w-16 h-16 rounded-sm bg-zinc-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-zinc-800 truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
            {item.category}
          </span>
          {item.avg_rating > 0 && (
            <>
              <span className="text-zinc-300 leading-none">·</span>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                ★ {item.avg_rating.toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-zinc-300 shrink-0"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void;
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { state, query, pills, results, setQuery: hookSetQuery } = useSearch();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tickerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  useEffect(() => () => stopTicker(), [stopTicker]);

  // Drive animation ticker from hook state transitions
  useEffect(() => {
    if (state === "empty") {
      stopTicker();
      setProgress(0);
      setMsgIndex(0);
      return;
    }
    if (state === "typing") {
      stopTicker();
      let p = 0;
      let m = 0;
      tickerRef.current = setInterval(() => {
        p += Math.random() * 14 + 4;
        m  = (m + 1) % AI_MESSAGES.length;
        if (p >= 85) { p = 85; stopTicker(); }
        setProgress(Math.round(p));
        setMsgIndex(m);
      }, 350);
      return;
    }
    if (state === "analyzing") {
      return; // ticker already running from "typing"
    }
    if (state === "results" || state === "no_match") {
      stopTicker();
      setProgress(100);
    }
  }, [state, stopTicker]);

  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    hookSetQuery(e.target.value);
    setTimeout(resizeTextarea, 0);
  };

  const handleQuickJump = (q: string) => {
    hookSetQuery(q);
    setTimeout(resizeTextarea, 0);
  };

  const showPanel   = state !== "empty";
  const showResults = state === "results" || state === "no_match";
  const isNoMatch   = state === "no_match";

  const panelMessage = (() => {
    if (isNoMatch) {
      const vibe = pills.find((p) => p.type === "VIBE")?.value;
      const loc  = pills.find((p) => p.type === "LOC")?.value;
      return vibe && loc ? `No direct matches for '${vibe}' in ${loc}.` : "No direct matches found.";
    }
    return AI_MESSAGES[msgIndex];
  })();

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <OverlayHeader
        label="Smart Search"
        icon={<Search size={16} strokeWidth={2.5} />}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
        {/* Query textarea */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleChange}
          placeholder="Describe a vibe..."
          rows={1}
          className={cn(
            "w-full resize-none overflow-hidden",
            "bg-zinc-50 border border-zinc-200 rounded-card",
            "px-4 py-3.5 text-base font-medium text-zinc-800 placeholder:text-zinc-400",
            "focus:outline-none focus:border-zinc-400 transition-colors",
            "leading-relaxed",
          )}
        />

        {/* Extracted pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <SearchPill key={p.type} pill={p} />
            ))}
          </div>
        )}

        {/* Intelligence panel */}
        {showPanel && <IntelligencePanel progress={progress} message={panelMessage} />}

        {/* Results */}
        {showResults && (
          <div className="space-y-2.5">
            {isNoMatch && (
              <p className="text-xs font-medium text-zinc-400 px-1">Showing best alternatives</p>
            )}
            {results.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
            {isNoMatch && (
              <button className="w-full py-4 rounded-card border border-dashed border-zinc-300 text-sm font-semibold text-coral-600 active:bg-coral-50 transition-colors mt-1">
                Be the first to suggest it
              </button>
            )}
          </div>
        )}

        {/* Quick jumps (empty state) */}
        {state === "empty" && <QuickJumps onSelect={handleQuickJump} />}
      </div>
    </div>
  );
}
