"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ActiveChip {
  id: string;
  label: string;
}

interface FilterRowProps {
  hasNearby?:      boolean;
  activeCount?:    number;
  /** Active filter chips rendered inline after the buttons. Tap X →
   *  fade-out animation then onRemoveChip is called. */
  activeChips?:    ActiveChip[];
  onRemoveChip?:   (id: string) => void;
  onOpenFilters:   () => void;
  className?:      string;
}

// Streamlined per design: Φίλτρα button + (optional) "Κοντά μου" + active
// chips inline (saves vertical space vs a separate chip row below).
//
// Quick-filter chips (Περιοχή/Είδος/etc.) removed — duplicated bottom
// sheet without value. The bottom sheet is a single tap away.
//
// Φίλτρα button states:
//   no filters  → text + icon "Φίλτρα" (white pill)
//   filtered    → compact icon + count badge (dark pill)
export function FilterRow({
  hasNearby = false,
  activeCount = 0,
  activeChips = [],
  onRemoveChip,
  onOpenFilters,
  className,
}: FilterRowProps) {
  const isFiltered = activeCount > 0;
  const [removingChipIds, setRemovingChipIds] = useState<Set<string>>(new Set());

  const handleRemoveChip = (id: string) => {
    if (removingChipIds.has(id)) return;
    setRemovingChipIds((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
    window.setTimeout(() => {
      onRemoveChip?.(id);
      setRemovingChipIds((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(id);
        return next;
      });
    }, 350);
  };

  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar px-4", className)}>
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
          height: 34,
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
              width: 26,
              height: 26,
              backgroundColor: "#FFF8F6",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
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
            "shrink-0 inline-flex items-center gap-1.5 px-3 rounded-full",
            "text-xs font-medium border border-zinc-200 bg-white text-zinc-700",
            "whitespace-nowrap transition-colors active:bg-zinc-50",
          )}
          style={{ height: 34 }}
        >
          <MapPin size={11} className="text-zinc-500" />
          Κοντά μου
        </button>
      )}

      {/* Active filter chips inline — tap X to remove with fade-out */}
      {activeChips.map((chip) => {
        const removing = removingChipIds.has(chip.id);
        return (
          <button
            key={chip.id}
            onClick={() => !removing && handleRemoveChip(chip.id)}
            disabled={removing}
            className="shrink-0 flex items-center gap-1.5 rounded-full active:opacity-80 select-none"
            style={{
              background: "#E4E4E7",
              paddingLeft: 12,
              paddingRight: 6,
              height: 34,
              opacity: removing ? 0 : 1,
              transform: removing ? "translateX(-12px) scale(0.92)" : "translateX(0) scale(1)",
              transition: "opacity 350ms ease, transform 350ms ease, padding 350ms ease, margin 350ms ease",
              marginLeft: removing ? -8 : 0,
              marginRight: removing ? -8 : 0,
            }}
          >
            <span
              className="whitespace-nowrap"
              style={{
                fontFamily: "'Open Sans',sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: "#3F3F46",
                lineHeight: "20px",
              }}
            >
              {chip.label}
            </span>
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 18, height: 18, background: "#FAFAFA" }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M5.17 5.17L10.83 10.83M10.83 5.17L5.17 10.83" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FilterSliderIcon({ light }: { light: boolean }) {
  const color = light ? "#FAFAFA" : "#3F3F46";
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0.68" y="0.59" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.4" />
      <rect x="0.68" y="6.33" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.4" />
      <rect x="0.68" y="12.07" width="16.64" height="5.34" rx="2.67" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}
