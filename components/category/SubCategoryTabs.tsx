"use client";

import { cn } from "@/lib/utils/cn";

interface SubCategoryTabsProps {
  tabs:      string[];
  active:    string;
  onChange:  (tab: string) => void;
  className?: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SubCategoryTabs({ tabs, active, onChange, className }: SubCategoryTabsProps) {
  const all = ["Όλα", ...tabs];

  return (
    <div
      className={cn(
        "flex overflow-x-auto no-scrollbar",
        "bg-white border-b border-zinc-200",
        "sticky z-20",
        className,
      )}
    >
      {all.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={cn(
              "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap",
              "border-b-2 transition-colors duration-150",
              isActive
                ? "border-coral-600 text-zinc-900 font-semibold"
                : "border-transparent text-zinc-400 active:text-zinc-700",
            )}
          >
            {capitalize(tab)}
          </button>
        );
      })}
    </div>
  );
}
