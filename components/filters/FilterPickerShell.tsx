"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  onBack?: () => void;
  onClearAll: () => void;
  resultCount: number;
  resultUnit?: string;
  children: ReactNode;
}

// Common chrome for all filter pickers: header (back + title), scrollable
// body, sticky bottom bar (clear-all link + result-count pill).
// Designed for full-screen mobile usage; wrap in a fixed-size container in
// showcase to simulate a phone screen.
export function FilterPickerShell({
  title,
  onBack,
  onClearAll,
  resultCount,
  resultUnit = "προτάσεις",
  children,
}: Props) {
  return (
    <div className="relative h-full w-full flex flex-col bg-zinc-100">
      <div className="flex items-center h-14 px-3 bg-zinc-100 border-b border-transparent shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Πίσω"
            className="w-9 h-9 flex items-center justify-center -ml-1 active:opacity-60"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
        <div className="flex-1 text-center text-[16px] font-semibold text-zinc-900 tracking-tight">
          {title}
        </div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {children}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-3 flex items-center justify-between gap-3 bg-gradient-to-t from-zinc-100 via-zinc-100 to-transparent">
        <button
          onClick={onClearAll}
          className="text-[14px] underline underline-offset-4 text-zinc-700 active:opacity-60"
        >
          Καθαρισμός όλων
        </button>
        <button
          className="bg-zinc-900 text-white px-7 h-12 rounded-full text-[15px] font-semibold active:opacity-90 shadow-sm"
        >
          {resultCount.toLocaleString("el-GR")} {resultUnit}
        </button>
      </div>
    </div>
  );
}
