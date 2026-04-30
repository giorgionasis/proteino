"use client";

import { cn } from "@/lib/utils/cn";

export interface FilterChipProps {
  label:      string;
  active?:    boolean;
  icon?:      React.ReactNode;
  onPress?:   () => void;
  className?: string;
}

export function FilterChip({ label, active = false, icon, onPress, className }: FilterChipProps) {
  return (
    <button
      onClick={onPress}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full",
        "text-sm font-semibold whitespace-nowrap",
        "border transition-all duration-150 select-none active:scale-[0.96]",
        active
          ? "bg-coral-600 text-white border-coral-600"
          : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300",
        className,
      )}
    >
      {icon && <span className="shrink-0 -ml-0.5">{icon}</span>}
      {label}
    </button>
  );
}

/* ── Horizontal scrollable chip row ────────────────────────── */
export function FilterChipRow({
  children,
  className,
}: {
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar px-4", className)}>
      {children}
    </div>
  );
}
