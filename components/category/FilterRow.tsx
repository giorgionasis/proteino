"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FilterRowProps {
  hasNearby?:      boolean;
  activeCount?:    number;
  onOpenFilters:   () => void;
  className?:      string;
}

// Streamlined per design: Φίλτρα button + (optional) "Κοντά μου" only.
// Quick-filter chips (Περιοχή/Είδος/etc.) removed because they duplicated
// what the bottom sheet already exposes a tap away. The bottom sheet is
// fast and easy enough — extra chips just clutter. "Κοντά μου" stays as
// a one-tap geolocation action with no equivalent in the sheet.
//
// Φίλτρα button mirrors the map view's pattern: text+icon when no filters,
// compact icon+count when filters are active.
export function FilterRow({
  hasNearby = false,
  activeCount = 0,
  onOpenFilters,
  className,
}: FilterRowProps) {
  const isFiltered = activeCount > 0;
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar px-4 py-3", className)}>
      <button
        onClick={onOpenFilters}
        aria-label="Φίλτρα"
        className={cn(
          "shrink-0 inline-flex items-center rounded-full transition-colors active:opacity-80",
          isFiltered
            ? "bg-zinc-800 border border-zinc-800"
            : "bg-white border border-zinc-200",
        )}
        style={{
          height: 32,
          paddingLeft: 12,
          paddingRight: isFiltered ? 4 : 14,
          gap: 6,
        }}
      >
        <FilterSliderIcon light={isFiltered} />
        {!isFiltered && (
          <span className="text-xs font-semibold text-zinc-700">Φίλτρα</span>
        )}
        {isFiltered && (
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 24,
              height: 24,
              backgroundColor: "#FFF8F6",
              color: "#000",
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

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
