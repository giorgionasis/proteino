"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface Platform {
  id:    string;
  name:  string;
  icon?: React.ReactNode;
}

interface PlatformSelectorProps {
  platforms: Platform[];
  selected?: string | null;
  onChange?: (id: string | null) => void;
  className?: string;
}

export function PlatformSelector({ platforms, selected: init, onChange, className }: PlatformSelectorProps) {
  const [selected, setSelected] = useState<string | null>(init ?? null);

  const toggle = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div className={cn("flex gap-5 overflow-x-auto py-0.5 scrollbar-hide", className)}>
      {platforms.map((p) => {
        const isActive = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={cn(
              "relative shrink-0 flex flex-col items-center justify-center gap-2 rounded-lg transition-colors",
              "w-[100px] h-[112px]",
              isActive
                ? "bg-[#F2F2F7] border-2 border-zinc-800"
                : "border border-zinc-400",
            )}
          >
            {/* Tick / empty circle */}
            <div className="absolute top-[6px] right-[6px]">
              {isActive ? (
                <TickIcon />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border border-zinc-400" />
              )}
            </div>
            <div className="w-10 h-10 flex items-center justify-center">
              {p.icon ?? <PlatformPlaceholder name={p.name} />}
            </div>
            <span className={cn(
              "text-base font-semibold",
              isActive ? "text-zinc-800" : "text-zinc-600",
            )}>
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TickIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="9" fill="#FAFAFA" />
      <path d="M5 9L8 12L13 6" stroke="#27272A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformPlaceholder({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600">
      {name[0]}
    </div>
  );
}
