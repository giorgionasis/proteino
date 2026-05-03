"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface FollowButtonProps {
  following?:  boolean;
  onToggle?:   (next: boolean) => void;
  className?:  string;
  size?:       "sm" | "md" | "lg";
  variant?:    "default" | "dark";
}

export function FollowButton({
  following  = false,
  onToggle,
  className,
  size = "md",
  variant = "default",
}: FollowButtonProps) {
  const [active, setActive] = useState(following);

  const toggle = () => {
    const next = !active;
    setActive(next);
    onToggle?.(next);
  };

  if (variant === "dark") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "inline-flex items-center justify-center gap-2.5 rounded-full font-semibold",
          "transition-all duration-150 select-none active:scale-[0.97]",
          "px-7 py-5 text-lg",
          active
            ? "bg-[#E5FFF9] text-[#033C2E]"
            : "bg-zinc-800 text-zinc-50",
          className,
        )}
      >
        {!active && <AddUserIcon size={16} color="#FAFAFA" />}
        {active ? "Ακολουθείς" : "Ακολούθησε"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[20px] font-semibold",
        "transition-all duration-150 select-none active:scale-[0.97]",
        size === "sm" && "h-8 px-4 text-sm",
        size === "md" && "h-10 px-5 text-sm",
        size === "lg" && "h-11 px-6 text-base",
        active
          ? "bg-[#E5FFF9] text-[#033C2E]"
          : "bg-zinc-100 text-zinc-700",
        className,
      )}
    >
      {!active && <AddUserIcon size={14} color="#3F3F46" />}
      {active ? "Ακολουθείς" : "Ακολούθησε"}
    </button>
  );
}

function AddUserIcon({ size = 14, color = "#3F3F46" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9.5 7C9.5 8.38 8.38 9.5 7 9.5C5.62 9.5 4.5 8.38 4.5 7C4.5 5.62 5.62 4.5 7 4.5C8.38 4.5 9.5 5.62 9.5 7Z" stroke={color} strokeWidth="1.2" />
      <path d="M2 12C2 10.34 4.24 9 7 9C9.76 9 12 10.34 12 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 2V5M9.5 3.5H12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
