"use client";

import { cn } from "@/lib/utils/cn";

export interface PropertyType {
  id:    string;
  name:  string;
  icon?: React.ReactNode;
}

interface PropertyTypeSelectorProps {
  types:     PropertyType[];
  selected:  string[];
  onChange:  (selected: string[]) => void;
  className?: string;
}

export function PropertyTypeSelector({ types, selected, onChange, className }: PropertyTypeSelectorProps) {
  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {chunk(types, 2).map((row, ri) => (
        <div key={ri} className="flex gap-5">
          {row.map((t) => {
            const isActive = selected.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "relative flex flex-col items-start rounded-lg transition-colors",
                  "w-[165px] h-[125px]",
                  isActive
                    ? "bg-[#F2F2F7] border-2 border-zinc-800"
                    : "bg-white border border-zinc-400",
                )}
              >
                {/* Checkbox */}
                <div className="absolute top-0 right-0">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center",
                  )}>
                    {isActive ? (
                      <CheckedIcon />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-[4px] border border-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div className="mt-5 ml-4 w-[34px] h-[32px] flex items-center justify-center">
                  {t.icon ?? <PlaceholderIcon />}
                </div>

                {/* Label */}
                <span className={cn(
                  "absolute bottom-5 left-4 text-base font-semibold",
                  isActive ? "text-zinc-800" : "text-zinc-700",
                )}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CheckedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect width="18" height="18" rx="4" fill="#27272A" />
      <path d="M5 9L8 12L13 6" stroke="#FAFAFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="2" y="10" width="28" height="20" rx="2" stroke="#3F3F46" strokeWidth="1.5" fill="none" />
      <path d="M8 10V6a8 8 0 0116 0v4" stroke="#3F3F46" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
