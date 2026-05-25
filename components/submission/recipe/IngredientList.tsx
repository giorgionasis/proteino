"use client";

import { useRef } from "react";
import { UnitSelect } from "./UnitSelect";
import { cn } from "@/lib/utils/cn";

export interface Ingredient {
  qty: string;
  unit: string;
  name: string;
  link?: string;
}

interface Props {
  value: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  /** Admin-overridable unit list (from /api/recipes/options). When
   *  empty, the dropdown falls back to the canonical static catalogue. */
  units?: string[];
  /** Common ingredient suggestions for autocomplete (datalist). */
  commonIngredients?: string[];
}

/**
 * Stacked ingredient editor — each row is `qty` (number-friendly text)
 * + `unit` (closed-list dropdown via <UnitSelect>) + `name` (text with
 * datalist autocomplete from /api/recipes/options).
 *
 * Empty rows are kept while the user is editing — only filtered out on
 * publish (the wizard's onPublish handler drops `name`-empty entries).
 * Pressing Enter on the name input adds a new row and focuses it.
 *
 * The shape matches what admin SuggestionEditor already writes to
 * item_recipes.ingredients (jsonb array of {qty, unit, name, link?}).
 */
export function IngredientList({ value, onChange, units, commonIngredients }: Props) {
  const lastNameRef = useRef<HTMLInputElement | null>(null);

  const setRow = (idx: number, patch: Partial<Ingredient>) => {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...value, { qty: "", unit: "", name: "" }]);
    // Focus the new name field on next paint.
    requestAnimationFrame(() => {
      lastNameRef.current?.focus();
    });
  };

  const removeRow = (idx: number) => {
    if (value.length === 1) {
      // Keep at least one row so the editor always has something
      // visible — clearing instead of unmounting.
      onChange([{ qty: "", unit: "", name: "" }]);
      return;
    }
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <datalist id="recipe-common-ingredients">
        {(commonIngredients ?? []).map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {value.map((ing, i) => {
        const isLast = i === value.length - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-xs font-medium text-zinc-400 text-right tabular-nums">
              {i + 1}.
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={ing.qty}
              onChange={(e) => setRow(i, { qty: e.target.value })}
              placeholder="Ποσότ."
              className="w-16 h-9 px-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
            />
            <UnitSelect
              value={ing.unit}
              onChange={(unit) => setRow(i, { unit })}
              options={units}
              className="w-28 shrink-0"
            />
            <input
              ref={isLast ? lastNameRef : undefined}
              type="text"
              value={ing.name}
              onChange={(e) => setRow(i, { name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (ing.name.trim()) addRow();
                }
              }}
              placeholder="Υλικό"
              list="recipe-common-ingredients"
              className="flex-1 h-9 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Διαγραφή υλικού"
              className={cn(
                "shrink-0 w-9 h-9 flex items-center justify-center rounded-lg",
                "text-zinc-400 hover:text-red-500 hover:bg-zinc-50",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-coral-600 active:text-coral-700"
      >
        + Πρόσθεσε υλικό
      </button>
    </div>
  );
}
