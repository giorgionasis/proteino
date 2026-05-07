"use client";

import { useMemo, useState } from "react";
import { FilterPickerShell } from "./FilterPickerShell";

export interface TwoStepNode {
  id: string;
  label: string;
  count: number;
  children: { id: string; label: string; count: number }[];
}

interface Props {
  title: string;
  parents: TwoStepNode[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  selectAllLabelTemplate?: (parentName: string) => string;
  resultCount: number;
  onClearAll: () => void;
  onClose?: () => void;
}

// Generic two-step parent → children picker. Step 1 shows parents with
// chevrons + "X επιλεγμένα" indicator when any of their children are
// selected. Step 2 shows the parent's children with checkboxes plus an
// "Όλη η {parent}" select-all-children option.
//
// Selections are kept across parent navigation: tapping back from step 2
// returns to step 1 with all child selections intact.
//
// Selection state is keyed on child IDs only — the parent ID is never in
// the set. The "all of parent X" state is derived: parent is fully selected
// iff every child of X is in the set.
export function TwoStepListPicker({
  title,
  parents,
  selected,
  onSelectionChange,
  selectAllLabelTemplate = (name) => `Όλη η ${name}`,
  resultCount,
  onClearAll,
  onClose,
}: Props) {
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of parents) {
      map.set(p.id, new Set(p.children.map((c) => c.id)));
    }
    return map;
  }, [parents]);

  const selectedCountPerParent = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of parents) {
      let n = 0;
      for (const c of p.children) if (selected.has(c.id)) n++;
      out[p.id] = n;
    }
    return out;
  }, [parents, selected]);

  function toggleChild(childId: string) {
    const next = new Set(selected);
    if (next.has(childId)) next.delete(childId);
    else next.add(childId);
    onSelectionChange(next);
  }

  function toggleAllOfParent(parentId: string) {
    const childIds = childrenByParent.get(parentId);
    if (!childIds) return;
    const allSelected = Array.from(childIds).every((id) => selected.has(id));
    const next = new Set(selected);
    childIds.forEach((id) => {
      if (allSelected) next.delete(id);
      else next.add(id);
    });
    onSelectionChange(next);
  }

  const activeParent = parents.find((p) => p.id === activeParentId) ?? null;
  const isStep2 = activeParent !== null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isStep2 ? "-translate-x-1/4 opacity-50" : "translate-x-0 opacity-100"
        }`}
        aria-hidden={isStep2}
      >
        <FilterPickerShell
          title={title}
          onBack={onClose}
          onClearAll={onClearAll}
          resultCount={resultCount}
        >
          <div className="bg-white rounded-2xl">
            {parents.map((p, idx) => {
              const sel = selectedCountPerParent[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveParentId(p.id)}
                  className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <span className="flex items-baseline gap-1.5 text-left">
                    <span className="text-[16px] font-semibold text-zinc-900">{p.label}</span>
                    <span className="text-[14px] text-zinc-500">({p.count.toLocaleString("el-GR")})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {sel > 0 && (
                      <span className="text-[12px] font-medium text-coral-600 bg-coral-50 px-2 py-0.5 rounded-full" style={{ color: "#FE6F5E", backgroundColor: "#FFF5EC" }}>
                        {sel} επιλεγμένα
                      </span>
                    )}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </button>
              );
            }).reduce<React.ReactNode[]>((acc, el, i) => {
              if (i > 0) acc.push(<div key={`d${i}`} className="h-px bg-zinc-100 mx-5" />);
              acc.push(el);
              return acc;
            }, [])}
          </div>
        </FilterPickerShell>
      </div>

      <div
        className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isStep2 ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isStep2}
      >
        {activeParent && (
          <FilterPickerShell
            title={activeParent.label}
            onBack={() => setActiveParentId(null)}
            onClearAll={onClearAll}
            resultCount={resultCount}
          >
            <div className="bg-white rounded-2xl">
              {(() => {
                const allChecked = activeParent.children.every((c) => selected.has(c.id));
                const rows: React.ReactNode[] = [];

                rows.push(
                  <ChildRow
                    key="__all__"
                    label={selectAllLabelTemplate(activeParent.label)}
                    count={activeParent.count}
                    checked={allChecked}
                    onToggle={() => toggleAllOfParent(activeParent.id)}
                    isFirst
                  />,
                );

                activeParent.children.forEach((c, i) => {
                  rows.push(<div key={`d${i}`} className="h-px bg-zinc-100 mx-5" />);
                  rows.push(
                    <ChildRow
                      key={c.id}
                      label={c.label}
                      count={c.count}
                      checked={selected.has(c.id)}
                      onToggle={() => toggleChild(c.id)}
                      isLast={i === activeParent.children.length - 1}
                    />,
                  );
                });

                return rows;
              })()}
            </div>
          </FilterPickerShell>
        )}
      </div>
    </div>
  );
}

function ChildRow({
  label, count, checked, onToggle, isFirst, isLast,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 ${isFirst ? "rounded-t-2xl" : ""} ${isLast ? "rounded-b-2xl" : ""}`}
    >
      <span className="flex items-baseline gap-1.5 text-left">
        <span className="text-[16px] font-semibold text-zinc-900">{label}</span>
        <span className="text-[14px] text-zinc-500">({count.toLocaleString("el-GR")})</span>
      </span>
      <span
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 bg-white"
        }`}
        aria-checked={checked}
        role="checkbox"
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
    </button>
  );
}
