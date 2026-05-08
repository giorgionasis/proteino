"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { CategorySlug } from "@/types";
import type { FilterDefinition } from "@/constants/filters";
import { CATEGORY_FILTERS } from "@/constants/filters";
import { TwoStepListPicker, type TwoStepNode } from "@/components/filters/TwoStepListPicker";
import { GroupedCheckboxList, type GroupedListGroup } from "@/components/filters/GroupedCheckboxList";

export type FilterValues = Record<string, string | string[]>;

interface Props {
  open: boolean;
  onClose: () => void;
  category: CategorySlug;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  resultCount: number;
  dataOptions?: Record<string, string[]>;
  /** Hierarchical region tree per category (food/bars/hotels/events). */
  regionTree?: TwoStepNode[];
  /** Awards taxonomy with counts (movies/series). */
  awardsGroups?: GroupedListGroup[];
  onComputeCount?: (vals: FilterValues) => number;
}

type SubPicker = "region" | "awards" | null;

export function FilterBottomSheet({ open, onClose, category, values, onChange, resultCount, dataOptions, regionTree, awardsGroups, onComputeCount }: Props) {
  const [localValues, setLocalValues] = useState<FilterValues>(values);
  const config = CATEGORY_FILTERS[category];
  const [activeSort, setActiveSort] = useState(config.sortOptions[1] ?? config.sortOptions[0]);
  const [subPicker, setSubPicker] = useState<SubPicker>(null);

  const liveCount = useMemo(
    () => onComputeCount ? onComputeCount(localValues) : resultCount,
    [localValues, onComputeCount, resultCount],
  );

  useEffect(() => {
    if (open) {
      setLocalValues(values);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, values]);

  // X close + Escape both apply the current selections then close. The
  // count CTA at the bottom does the same — we removed the "discard
  // changes" exit because users were confused (they saw the count
  // updating live and assumed it had been applied; explicit cancel is
  // rarely what they want here).
  const handleCloseAndApply = useCallback(() => {
    onChange(localValues);
    onClose();
  }, [onChange, localValues, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") handleCloseAndApply(); },
    [handleCloseAndApply],
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  function setFilter(id: string, value: string | string[]) {
    setLocalValues((prev) => ({ ...prev, [id]: value }));
  }

  function toggleArrayValue(id: string, optionId: string) {
    setLocalValues((prev) => {
      const current = (prev[id] as string[]) ?? [];
      const next = current.includes(optionId)
        ? current.filter((v) => v !== optionId)
        : [...current, optionId];
      return { ...prev, [id]: next };
    });
  }

  function handleApply() {
    onChange(localValues);
    onClose();
  }

  function handleClear() {
    setLocalValues({});
  }

  return (
    <div
      aria-modal={open}
      aria-hidden={!open}
      role="dialog"
      aria-label="Φίλτρα"
      // z-60 so we cover map chrome (z-30) and the pin bottom card (z-50).
      className="fixed inset-y-0 left-0 right-0 max-w-[390px] mx-auto z-[60] bg-white flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
      style={{ transform: open ? "translateY(0)" : "translateY(100%)" }}
    >
      <div className="shrink-0" style={{ height: "env(safe-area-inset-top, 0px)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-zinc-200">
        <div className="w-12" />
        <span className="font-bold text-base text-zinc-700" style={{ fontFamily: "'Open Sans', sans-serif" }}>
          Φίλτρα
        </span>
        <button
          onClick={handleCloseAndApply}
          className="w-12 h-12 flex items-center justify-center"
          aria-label="Κλείσιμο"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-5 pt-6 pb-2">
          <SortSection options={config.sortOptions} active={activeSort} onChange={setActiveSort} />
        </div>

        <div className="mx-5 border-b border-zinc-200 my-6" />

        <div className="px-5 space-y-10 pb-8">
          {config.bottomSheet.map((filter) => (
            <FilterSection
              key={filter.id}
              filter={filter}
              category={category}
              value={localValues[filter.id]}
              onChangeValue={(v) => setFilter(filter.id, v)}
              onToggle={(optionId) => toggleArrayValue(filter.id, optionId)}
              dataOptions={dataOptions?.[filter.id]}
              onOpenSubPicker={(p) => setSubPicker(p)}
              regionTree={regionTree}
              awardsGroups={awardsGroups}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={handleClear} className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-zinc-800" style={{ fontFamily: "'Open Sans', sans-serif" }}>
              Καθαρισμός όλων
            </span>
            <div className="w-[122px] h-px bg-black" />
          </button>
          <button
            onClick={handleApply}
            className="h-14 px-8 rounded-full flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ backgroundColor: "#27272A" }}
          >
            <span className="font-bold text-base text-white" style={{ fontFamily: "'Open Sans', sans-serif" }}>
              {liveCount} προτάσεις
            </span>
          </button>
        </div>
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      {/* Full-screen sub-pickers (region / awards). Rendered on top when open. */}
      {subPicker === "region" && regionTree && (
        <div className="absolute inset-0 z-10 bg-zinc-100">
          <TwoStepListPicker
            title="Περιοχή"
            parents={regionTree}
            selected={new Set((localValues.region as string[]) ?? [])}
            onSelectionChange={(s) => setFilter("region", Array.from(s))}
            resultCount={liveCount}
            onClearAll={() => setFilter("region", [])}
            onClose={() => setSubPicker(null)}
          />
        </div>
      )}
      {subPicker === "awards" && awardsGroups && (
        <div className="absolute inset-0 z-10 bg-zinc-100">
          <GroupedCheckboxList
            title="Βραβεία"
            groups={awardsGroups}
            selected={new Set((localValues.awards as string[]) ?? [])}
            onSelectionChange={(s) => setFilter("awards", Array.from(s))}
            resultCount={liveCount}
            onClearAll={() => setFilter("awards", [])}
            onClose={() => setSubPicker(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Sort Section ────────────────────────────────────────── */

function SortSection({ options, active, onChange }: {
  options: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="font-bold text-base text-zinc-800 mb-3" style={{ fontFamily: "'Open Sans', sans-serif" }}>
        Ταξινόμηση
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {options.map((opt) => {
          const isActive = opt === active;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="shrink-0 h-11 px-5 rounded-full flex items-center justify-center transition-colors"
              style={isActive
                ? { backgroundColor: "#3F3F46", color: "#FAFAFA" }
                : { border: "1px solid #D4D4D8", color: "#52525B", backgroundColor: "#fff" }
              }
            >
              <span
                className="text-base whitespace-nowrap"
                style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: isActive ? 700 : 600 }}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Filter Section Router ───────────────────────────────── */

function FilterSection({ filter, category, value, onChangeValue, onToggle, dataOptions, onOpenSubPicker, regionTree, awardsGroups }: {
  filter: FilterDefinition;
  category: CategorySlug;
  value: string | string[] | undefined;
  onChangeValue: (v: string | string[]) => void;
  onToggle: (optionId: string) => void;
  dataOptions?: string[];
  onOpenSubPicker?: (p: SubPicker) => void;
  regionTree?: TwoStepNode[];
  awardsGroups?: GroupedListGroup[];
}) {
  switch (filter.widget) {
    case "dropdown":
      return <DropdownFilter filter={filter} value={(value as string) ?? ""} onChange={(v) => onChangeValue(v)} dataOptions={dataOptions} />;
    case "multi-dropdown":
      return <MultiDropdownFilter filter={filter} selected={(value as string[]) ?? []} onChange={(arr) => onChangeValue(arr)} dataOptions={dataOptions} />;
    case "search-dropdown":
      return <SearchDropdownFilter filter={filter} value={(value as string) ?? ""} onChange={(v) => onChangeValue(v)} suggestions={dataOptions} />;
    case "segmented":
      return <SegmentedFilter filter={filter} value={(value as string) ?? "all"} onChange={(v) => onChangeValue(v)} />;
    case "platform-cards":
      return <PlatformCardsFilter filter={filter} selected={(value as string[]) ?? []} onToggle={onToggle} />;
    case "icon-cards":
      return <IconCardsFilter filter={filter} selected={(value as string[]) ?? []} onToggle={onToggle} />;
    case "checkboxes":
      return <CheckboxesFilter filter={filter} selected={(value as string[]) ?? []} onToggle={onToggle} />;
    case "price-range":
      return <PriceRangeFilter filter={filter} value={(value as string) ?? ""} onChange={(v) => onChangeValue(v)} />;
    case "origin-cards":
      return <OriginCardsFilter filter={filter} value={(value as string) ?? ""} onChange={(v) => onChangeValue(v)} />;
    case "region-picker":
      return (
        <DrilldownRow
          label={filter.label}
          summary={summarizeRegionSelection((value as string[]) ?? [], regionTree)}
          onOpen={() => onOpenSubPicker?.("region")}
        />
      );
    case "awards-picker":
      return (
        <DrilldownRow
          label={filter.label}
          summary={summarizeAwardsSelection((value as string[]) ?? [], awardsGroups)}
          onOpen={() => onOpenSubPicker?.("awards")}
        />
      );
    default:
      return null;
  }
}

function summarizeRegionSelection(selectedIds: string[], tree?: TwoStepNode[]): string {
  if (!tree || selectedIds.length === 0) return "Όλες";
  if (selectedIds.length === 1) {
    for (const p of tree) {
      const child = p.children.find((c) => c.id === selectedIds[0]);
      if (child) return child.label;
    }
  }
  return `${selectedIds.length} επιλεγμένες`;
}

function summarizeAwardsSelection(selectedIds: string[], groups?: GroupedListGroup[]): string {
  if (!groups || selectedIds.length === 0) return "Όλα";
  if (selectedIds.length === 1) {
    for (const g of groups) {
      const item = g.items.find((it) => it.id === selectedIds[0]);
      if (item) return `${g.label} · ${item.label}`;
    }
  }
  return `${selectedIds.length} επιλεγμένα`;
}

function DrilldownRow({ label, summary, onOpen }: { label: string; summary: string; onOpen: () => void }) {
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {label}
      </p>
      <button
        onClick={onOpen}
        className="w-full h-[50px] rounded-xl border border-zinc-400 flex items-center justify-between px-4 active:bg-zinc-50 transition-colors"
        style={{ maxWidth: 340 }}
      >
        <span
          className="text-base truncate text-left"
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: summary === "Όλες" || summary === "Όλα" ? 600 : 700,
            color: summary === "Όλες" || summary === "Όλα" ? "#71717A" : "#27272A",
          }}
        >
          {summary}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

/* ── Dropdown Filter ───────────────────────────────────────── */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function DropdownFilter({ filter, value, onChange, dataOptions }: {
  filter: FilterDefinition;
  value: string;
  onChange: (v: string) => void;
  dataOptions?: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  const options: string[] = filter.options
    ? filter.options.map((o) => o.label)
    : dataOptions ?? [];

  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full h-[50px] rounded-xl border border-zinc-400 flex items-center justify-between px-4 active:bg-zinc-50 transition-colors"
        style={{ maxWidth: 340 }}
      >
        <span
          className="text-base truncate"
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: value ? 700 : 600,
            color: value ? "#27272A" : "#71717A",
          }}
        >
          {value ? capitalize(value) : "Όλες"}
        </span>
        <ChevronIcon rotated={expanded} />
      </button>

      {expanded && options.length > 0 && (
        <div className="mt-2 border border-zinc-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto" style={{ maxWidth: 340 }}>
          <button
            onClick={() => { onChange(""); setExpanded(false); }}
            className="w-full text-left px-4 py-3 text-base transition-colors active:bg-zinc-50"
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontWeight: !value ? 700 : 400,
              color: !value ? "#FE6F5E" : "#27272A",
              borderBottom: "1px solid #E4E4E7",
            }}
          >
            Όλες
          </button>
          {options.map((opt) => {
            const isActive = value.toLowerCase() === opt.toLowerCase();
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setExpanded(false); }}
                className="w-full text-left px-4 py-3 text-base transition-colors active:bg-zinc-50"
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#FE6F5E" : "#27272A",
                  borderBottom: "1px solid #E4E4E7",
                }}
              >
                {capitalize(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Multi-select Dropdown Filter ──────────────────────────── */

function MultiDropdownFilter({ filter, selected, onChange, dataOptions }: {
  filter: FilterDefinition;
  selected: string[];
  onChange: (arr: string[]) => void;
  dataOptions?: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  const options: string[] = filter.options
    ? filter.options.map((o) => o.label)
    : dataOptions ?? [];

  function toggle(opt: string) {
    const lower = opt.toLowerCase();
    const already = selected.find((s) => s.toLowerCase() === lower);
    if (already) {
      onChange(selected.filter((s) => s.toLowerCase() !== lower));
    } else {
      onChange([...selected, opt]);
    }
  }

  function summarize(): string {
    if (selected.length === 0) return "Όλες";
    if (selected.length === 1) return capitalize(selected[0]);
    if (selected.length === 2) return `${capitalize(selected[0])}, ${capitalize(selected[1])}`;
    return `${selected.length} επιλεγμένα`;
  }

  const summary = summarize();
  const hasSelection = selected.length > 0;

  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full h-[50px] rounded-xl border border-zinc-400 flex items-center justify-between px-4 active:bg-zinc-50 transition-colors"
        style={{ maxWidth: 340 }}
      >
        <span
          className="text-base truncate"
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: hasSelection ? 700 : 600,
            color: hasSelection ? "#27272A" : "#71717A",
          }}
        >
          {summary}
        </span>
        <ChevronIcon rotated={expanded} />
      </button>

      {expanded && options.length > 0 && (
        <div className="mt-2 border border-zinc-200 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto bg-white" style={{ maxWidth: 340 }}>
          {options.map((opt, i) => {
            const isActive = selected.some((s) => s.toLowerCase() === opt.toLowerCase());
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 active:bg-zinc-50 transition-colors"
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: isActive ? 700 : 500,
                  color: "#27272A",
                  borderBottom: i < options.length - 1 ? "1px solid #E4E4E7" : "none",
                  fontSize: 15,
                }}
              >
                <span className="truncate flex-1 text-left">{capitalize(opt)}</span>
                <span
                  className="shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: isActive ? "2px solid #18181B" : "2px solid #d4d4d8",
                    background: isActive ? "#18181B" : "white",
                  }}
                  aria-checked={isActive}
                  role="checkbox"
                >
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Search Dropdown Filter (with autocomplete) ────────── */

function SearchDropdownFilter({ filter, value, onChange, suggestions }: {
  filter: FilterDefinition;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? (suggestions ?? [])
        .filter((s) => s.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 10)
    : (suggestions ?? []).slice(0, 10);

  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full h-[50px] rounded-xl border border-zinc-400 flex items-center justify-between px-4 active:bg-zinc-50 transition-colors"
          style={{ maxWidth: 340 }}
        >
          <span
            className="text-base truncate"
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontWeight: value ? 700 : 600,
              color: value ? "#27272A" : "#71717A",
            }}
          >
            {value ? capitalize(value) : filter.placeholder || "Αναζήτηση..."}
          </span>
          <ChevronIcon rotated={false} />
        </button>
      ) : (
        <div className="border border-zinc-400 rounded-xl overflow-hidden" style={{ maxWidth: 340 }}>
          <div className="flex items-center gap-2 px-4 h-[50px] border-b border-zinc-200">
            <SearchIcon />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={filter.placeholder || "Αναζήτηση..."}
              className="flex-1 text-base bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400"
              style={{ fontFamily: "'Open Sans', sans-serif" }}
            />
            {(search || value) && (
              <button onClick={() => { setSearch(""); onChange(""); }} className="p-1">
                <CloseIcon />
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((suggestion) => {
                const isActive = value.toLowerCase() === suggestion.toLowerCase();
                return (
                  <button
                    key={suggestion}
                    onClick={() => { onChange(suggestion); setExpanded(false); setSearch(""); }}
                    className="w-full text-left px-4 py-3 text-base active:bg-zinc-50"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? "#FE6F5E" : "#27272A",
                      borderBottom: "1px solid #E4E4E7",
                    }}
                  >
                    {capitalize(suggestion)}
                  </button>
                );
              })
            ) : search ? (
              <button
                onClick={() => { onChange(search); setExpanded(false); setSearch(""); }}
                className="w-full text-left px-4 py-3 text-base active:bg-zinc-50"
                style={{ fontFamily: "'Open Sans', sans-serif", color: "#27272A", borderBottom: "1px solid #E4E4E7" }}
              >
                &ldquo;{search}&rdquo;
              </button>
            ) : null}
          </div>
          <button
            onClick={() => { setExpanded(false); setSearch(""); }}
            className="w-full text-center py-2 text-sm text-zinc-500 active:bg-zinc-50"
          >
            Κλείσιμο
          </button>
        </div>
      )}

      {value && !expanded && (
        <button
          onClick={() => onChange("")}
          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 text-sm text-zinc-700 active:bg-zinc-200"
        >
          {capitalize(value)}
          <CloseChipIcon />
        </button>
      )}
    </div>
  );
}

/* ── Segmented Filter ────────────────────────────────────── */

function SegmentedFilter({ filter, value, onChange }: {
  filter: FilterDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = filter.options ?? [];
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="flex rounded-xl overflow-hidden" style={{ maxWidth: 340, height: 67, border: "1px solid #A1A1AA" }}>
        {options.map((opt, i) => {
          const isActive = opt.id === value;
          const isFirst = i === 0;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className="flex-1 flex items-center justify-center text-center transition-colors"
              style={{
                backgroundColor: isActive ? "#3F3F46" : "#fff",
                color: isActive ? "#FAFAFA" : "#3F3F46",
                borderLeft: !isFirst ? "1px solid #A1A1AA" : undefined,
              }}
            >
              <span
                className="text-[15px] leading-5 whitespace-pre-line"
                style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600 }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Platform Cards Filter ───────────────────────────────── */

function PlatformCardsFilter({ filter, selected, onToggle }: {
  filter: FilterDefinition;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const options = filter.options ?? [];
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="flex gap-5 overflow-x-auto no-scrollbar">
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className="relative shrink-0 w-[100px] h-[112px] rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors"
              style={{
                borderColor: isActive ? "#FE6F5E" : "#A1A1AA",
                borderWidth: isActive ? 2 : 1,
              }}
            >
              <div className="absolute top-2 right-2">
                <RadioIcon checked={isActive} />
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">
                {opt.label.charAt(0)}
              </div>
              <span className="text-base text-zinc-600" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600 }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Icon Cards Filter (Hotels) ──────────────────────────── */

function IconCardsFilter({ filter, selected, onToggle }: {
  filter: FilterDefinition;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const options = filter.options ?? [];
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="grid grid-cols-2 gap-5" style={{ maxWidth: 350 }}>
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className="relative h-[125px] rounded-xl border flex flex-col items-start justify-end p-4 transition-colors"
              style={{
                borderColor: isActive ? "#FE6F5E" : "#A1A1AA",
                borderWidth: isActive ? 2 : 1,
              }}
            >
              <div className="absolute top-3 right-3">
                <CheckboxIcon checked={isActive} />
              </div>
              <div className="w-8 h-8 mb-2 opacity-40">
                <PropertyIcon />
              </div>
              <span className="text-base text-zinc-700" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600 }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Checkboxes Filter ───────────────────────────────────── */

function CheckboxesFilter({ filter, selected, onToggle }: {
  filter: FilterDefinition;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const options = filter.options ?? [];
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="space-y-0">
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className="w-full flex items-center justify-between py-3"
              style={{ maxWidth: 365 }}
            >
              <span className="text-base text-zinc-800" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400 }}>
                {opt.label}
              </span>
              <CheckboxIcon checked={isActive} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Price Range Filter ──────────────────────────────────── */

function PriceRangeFilter({ filter, value, onChange }: {
  filter: FilterDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = (value || "").split("-");
  const minVal = parts[0] ?? "";
  const maxVal = parts[1] ?? "";

  function update(min: string, max: string) {
    if (!min && !max) onChange("");
    else onChange(`${min}-${max}`);
  }

  return (
    <div>
      <p className="font-bold text-lg text-zinc-700 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="flex items-center gap-4" style={{ maxWidth: 340 }}>
        <div className="flex-1 h-[58px] rounded-lg border border-zinc-400 px-3 flex flex-col justify-center">
          <span className="text-xs text-zinc-500" style={{ fontFamily: "'Open Sans', sans-serif" }}>Ελάχιστο</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-zinc-800">€</span>
            <input
              type="number"
              inputMode="numeric"
              value={minVal}
              onChange={(e) => update(e.target.value, maxVal)}
              placeholder="—"
              className="w-full text-lg font-semibold text-zinc-800 bg-transparent outline-none placeholder:text-zinc-400"
              style={{ fontFamily: "'Open Sans', sans-serif" }}
            />
          </div>
        </div>
        <div className="w-4 h-px bg-black shrink-0" />
        <div className="flex-1 h-[58px] rounded-lg border border-zinc-400 px-3 flex flex-col justify-center">
          <span className="text-xs text-zinc-500" style={{ fontFamily: "'Open Sans', sans-serif" }}>Μέγιστο</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-zinc-800">€</span>
            <input
              type="number"
              inputMode="numeric"
              value={maxVal}
              onChange={(e) => update(minVal, e.target.value)}
              placeholder="—"
              className="w-full text-lg font-semibold text-zinc-800 bg-transparent outline-none placeholder:text-zinc-400"
              style={{ fontFamily: "'Open Sans', sans-serif" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Origin Cards Filter (Recipes) ───────────────────────── */

function OriginCardsFilter({ filter, value, onChange }: {
  filter: FilterDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const mockChefs = [
    { id: "akis", label: "Άκης", color: "#c4a580" },
    { id: "mamalakis", label: "Μαμαλάκης", color: "#a5b5c4" },
    { id: "kontizas", label: "Κοντιζάς", color: "#b5a5c4" },
  ];
  return (
    <div>
      <p className="font-bold text-lg text-zinc-800 mb-4" style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: "20px" }}>
        {filter.label}
      </p>
      <div className="flex gap-5 overflow-x-auto no-scrollbar">
        {mockChefs.map((chef) => {
          const isActive = value === chef.id;
          return (
            <button
              key={chef.id}
              onClick={() => onChange(isActive ? "" : chef.id)}
              className="shrink-0 flex flex-col items-center gap-2"
            >
              <div
                className="w-20 h-20 rounded-full transition-all"
                style={{
                  backgroundColor: chef.color,
                  border: isActive ? "3px solid #FE6F5E" : "3px solid transparent",
                }}
              />
              <span
                className="text-sm text-zinc-700"
                style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: isActive ? 700 : 600 }}
              >
                {chef.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 2L14 14M14 2L2 14" stroke="#27272A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="#D4D4D8" />
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#3F3F46" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden
      style={{ transform: rotated ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
    >
      <path d="M7 10l5 5 5-5" stroke="#1C1B1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RadioIcon({ checked }: { checked: boolean }) {
  return (
    <div
      className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
      style={{ borderColor: checked ? "#FE6F5E" : "#A1A1AA" }}
    >
      {checked && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FE6F5E" }} />}
    </div>
  );
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#FE6F5E" />
        <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="#A1A1AA" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="4" y="10" width="24" height="18" rx="2" stroke="#3F3F46" strokeWidth="1.5" />
      <path d="M4 16h24" stroke="#3F3F46" strokeWidth="1.5" />
      <path d="M12 4l4 6M20 4l-4 6" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
