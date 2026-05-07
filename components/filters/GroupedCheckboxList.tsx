"use client";

import { ReactNode } from "react";
import { FilterPickerShell } from "./FilterPickerShell";

export interface GroupedListGroup {
  id: string;
  label: string;
  // Free-form icon node (emoji, <Icon name="..." />, raw <svg>). Caller
  // wraps as needed; the picker just slots it next to the heading.
  icon?: ReactNode;
  items: { id: string; label: string; count: number }[];
}

interface Props {
  title: string;
  groups: GroupedListGroup[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  resultCount: number;
  onClearAll: () => void;
  onClose?: () => void;
}

// Single-screen filter picker with grouped checkbox lists. Each group has
// its own card with an icon + heading + checkbox rows. Used for awards
// (Oscar / BAFTA / Cannes / etc.) where the option count is small enough
// that a second drill-down step would be overkill.
//
// Selections live in a single flat Set<string> across all groups — items
// must have globally-unique IDs (e.g. "oscar-best-picture", "bafta-best-film").
export function GroupedCheckboxList({
  title,
  groups,
  selected,
  onSelectionChange,
  resultCount,
  onClearAll,
  onClose,
}: Props) {
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  return (
    <FilterPickerShell
      title={title}
      onBack={onClose}
      onClearAll={onClearAll}
      resultCount={resultCount}
    >
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              {g.icon !== undefined && (
                <span className="shrink-0 inline-flex items-center justify-center" style={{ width: 24, height: 24 }}>
                  {g.icon}
                </span>
              )}
              <span className="text-[15px] font-extrabold text-zinc-900 tracking-wide">{g.label}</span>
            </div>
            <div>
              {g.items.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <div className="h-px bg-zinc-100 mx-5" />}
                  <button
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 active:bg-zinc-50 ${
                      i === g.items.length - 1 ? "rounded-b-2xl" : ""
                    }`}
                  >
                    <span className="flex items-baseline gap-1.5 text-left">
                      <span className="text-[15px] font-semibold text-zinc-900">{item.label}</span>
                      <span className="text-[13px] text-zinc-500">({item.count.toLocaleString("el-GR")})</span>
                    </span>
                    <span
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                        selected.has(item.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 bg-white"
                      }`}
                      aria-checked={selected.has(item.id)}
                      role="checkbox"
                    >
                      {selected.has(item.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </FilterPickerShell>
  );
}
