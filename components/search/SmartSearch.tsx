"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchPill } from "./SearchPill";
import type { SearchPill as SearchPillType } from "@/types";

interface SmartSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  pills: SearchPillType[];
  onRemovePill?: (index: number) => void;
  placeholder?: string;
  className?: string;
}

export function SmartSearch({
  value,
  onChange,
  onClear,
  pills,
  onRemovePill,
  placeholder = "Describe a vibe, place, or feeling...",
  className,
}: SmartSearchProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex items-center">
        <Search
          size={18}
          className="absolute left-3.5 text-gray-400 pointer-events-none"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-input text-sm placeholder:text-gray-400 outline-none focus:border-coral-600 focus:bg-white transition-all"
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute right-3.5 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill, i) => (
            <SearchPill
              key={`${pill.type}-${pill.value}`}
              pill={pill}
              onRemove={onRemovePill ? () => onRemovePill(i) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
