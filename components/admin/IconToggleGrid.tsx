"use client";

import { Icon } from "@/components/ui/Icon";
import { type IconOption } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

interface IconToggleGridProps {
  options: IconOption[];
  /** Object map of key→boolean. Stored on `ext.facilities` / `ext.nutrition`. */
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  /** Optional section heading rendered above the grid. */
  title?: string;
  /** Tailwind grid-cols class. Default 4. */
  cols?: number;
  /** Icon size. Default 36 (compact admin density). */
  iconSize?: number;
}

/**
 * Visual checkbox grid used in admin forms (hotel amenities, recipe
 * nutrition, etc). Each option is a clickable card with icon + label;
 * selected state shows a coral-tinted border + bg.
 *
 * The state shape (`Record<string, boolean>`) matches what frontend
 * detail pages expect on `ext.facilities` / `ext.nutrition`, so admin
 * saves flow through to the rendered detail page with no transformation.
 */
export function IconToggleGrid({
  options,
  value,
  onChange,
  title,
  cols = 4,
  iconSize = 36,
}: IconToggleGridProps) {
  const toggle = (key: string) => {
    const next = { ...value, [key]: !value[key] };
    if (!next[key]) delete next[key];
    onChange(next);
  };

  const gridClass =
    cols === 2 ? "grid-cols-2" :
    cols === 3 ? "grid-cols-3" :
    cols === 4 ? "grid-cols-4" :
    cols === 5 ? "grid-cols-5" :
    cols === 6 ? "grid-cols-6" : "grid-cols-4";

  return (
    <div>
      {title && (
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          {title}
        </label>
      )}
      <div className={cn("grid gap-2", gridClass)}>
        {options.map((opt) => {
          const active = !!value[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                active
                  ? "border-coral-600 bg-coral-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
              )}
              aria-pressed={active}
            >
              <Icon name={opt.icon} size={iconSize} />
              <span className={cn(
                "text-[11px] font-semibold text-center leading-tight",
                active ? "text-coral-700" : "text-zinc-700",
              )}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
