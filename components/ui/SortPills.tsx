"use client";

import { cn } from "@/lib/utils/cn";

export interface SortOption {
  key:   string;
  label: string;
}

interface SortPillsProps {
  options:   SortOption[];
  active:    string;
  onChange:  (key: string) => void;
  className?: string;
}

export function SortPills({ options, active, onChange, className }: SortPillsProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-base font-bold text-zinc-700 px-6">Ταξινόμηση ανά</p>
      <div className="flex gap-2 overflow-x-auto px-6 pb-0.5 scrollbar-hide">
        {options.map((opt) => {
          const isActive = active === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                "shrink-0 rounded-[50px] px-5 py-[17px] text-base font-semibold",
                "transition-colors active:opacity-80",
                isActive
                  ? "bg-[#52525B] text-[#FAFAFA]"
                  : "bg-white text-zinc-700 border border-zinc-300",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
