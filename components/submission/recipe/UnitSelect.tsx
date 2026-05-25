"use client";

import { useEffect, useState } from "react";
import { RECIPE_UNIT_LABELS, RECIPE_UNITS, RECIPE_UNIT_GROUP_LABELS } from "@/lib/recipes/units";
import { cn } from "@/lib/utils/cn";

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Optional admin-overridable units list (from /api/recipes/options).
   *  When omitted, falls back to the canonical static catalogue. */
  options?: string[];
  className?: string;
}

/**
 * Closed-list unit dropdown for recipe ingredients. Saves the LABEL
 * string directly into `ingredients[].unit` — matches the storage
 * shape the admin SuggestionEditor has used since day one.
 *
 * When the `options` prop is omitted (or empty), we use the canonical
 * catalogue from lib/recipes/units.ts grouped into <optgroup> headers
 * (Συνήθεις / Όγκος / Βάρος / Μέτρηση / Ειδικά). When admin-provided
 * options ARE present (loaded from extra_field_options via
 * /api/recipes/options), we render them as a flat list because the
 * server doesn't carry group hints — admin's order of intent wins.
 */
export function UnitSelect({ value, onChange, options, className }: Props) {
  // Renders nothing on the initial server pass to avoid hydration
  // mismatch (the dropdown's option set depends on async-fetched data
  // when options is undefined — we want a deterministic empty state
  // until the first effect runs). On client we resolve immediately.
  const list = options && options.length > 0 ? options : RECIPE_UNIT_LABELS;
  const isGrouped = !options || options.length === 0;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 px-2 text-sm bg-white border border-zinc-200 rounded-lg",
        "text-zinc-800 focus:outline-none focus:border-zinc-400",
        className,
      )}
    >
      <option value="">—</option>
      {isGrouped ? (
        (Object.keys(RECIPE_UNIT_GROUP_LABELS) as Array<keyof typeof RECIPE_UNIT_GROUP_LABELS>).map(
          (group) => {
            const items = RECIPE_UNITS.filter((u) => u.group === group);
            if (items.length === 0) return null;
            return (
              <optgroup key={group} label={RECIPE_UNIT_GROUP_LABELS[group]}>
                {items.map((u) => (
                  <option key={u.key} value={u.label} title={u.full}>
                    {u.label}
                  </option>
                ))}
              </optgroup>
            );
          },
        )
      ) : (
        list.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))
      )}
    </select>
  );
}

/** Fetches the unit + ingredient + level catalogues from
 *  /api/recipes/options once on mount. Returns the static fallback
 *  while loading so the wizard can render immediately. */
export function useRecipeOptions(): {
  units: string[];
  common_ingredients: string[];
  levels: string[];
  loading: boolean;
} {
  const [data, setData] = useState<{
    units: string[];
    common_ingredients: string[];
    levels: string[];
  }>({
    units: RECIPE_UNIT_LABELS,
    common_ingredients: [],
    levels: ["Easy", "Medium", "Hard"],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetch("/api/recipes/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancel || !j) return;
        setData({
          units: Array.isArray(j.units) && j.units.length ? j.units : RECIPE_UNIT_LABELS,
          common_ingredients: Array.isArray(j.common_ingredients) ? j.common_ingredients : [],
          levels: Array.isArray(j.levels) && j.levels.length ? j.levels : ["Easy", "Medium", "Hard"],
        });
      })
      .catch(() => {
        // Stay on the fallback — the wizard still works.
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return { ...data, loading };
}
