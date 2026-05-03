"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { QuickFilterDef } from "@/constants/filters";

interface FilterRowProps {
  quickFilters:    QuickFilterDef[];
  hasNearby?:      boolean;
  activeCount?:    number;
  onOpenFilters:   () => void;
  className?:      string;
}

export function FilterRow({
  quickFilters,
  hasNearby = false,
  activeCount = 0,
  onOpenFilters,
  className,
}: FilterRowProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar px-4 py-3", className)}>
      {/* ⊞ Filters button */}
      <button
        onClick={onOpenFilters}
        className={cn(
          "shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full",
          "text-xs font-semibold border transition-colors active:opacity-80",
          activeCount > 0
            ? "bg-zinc-800 text-white border-zinc-800"
            : "bg-white text-zinc-700 border-zinc-200",
        )}
      >
        <FilterSliderIcon light={activeCount > 0} />
        <span>Φίλτρα</span>
        {activeCount > 0 && (
          <span
            className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold leading-none"
            style={{ backgroundColor: "#FFF2F1", color: "#000" }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Κοντά μου — location categories */}
      {hasNearby && (
        <button
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full",
            "text-xs font-medium border border-zinc-200 bg-white text-zinc-700",
            "whitespace-nowrap transition-colors active:bg-zinc-50",
          )}
        >
          <MapPin size={11} className="text-zinc-500" />
          Κοντά μου
        </button>
      )}

      {/* Quick filter chips */}
      {quickFilters.map((filter) => (
        <button
          key={filter.id}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full",
            "text-xs font-medium border border-zinc-200 bg-white text-zinc-700",
            "whitespace-nowrap transition-colors active:bg-zinc-50",
          )}
        >
          {filter.label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function FilterSliderIcon({ light }: { light: boolean }) {
  const color = light ? "#FAFAFA" : "#3F3F46";
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0.68" y="0.59" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.2" />
      <rect x="0.68" y="6.33" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.2" />
      <rect x="0.68" y="12.07" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}
