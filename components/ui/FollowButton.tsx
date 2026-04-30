"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface FollowButtonProps {
  following?:  boolean;
  onToggle?:   (next: boolean) => void;
  className?:  string;
  size?:       "sm" | "md";
}

export function FollowButton({
  following  = false,
  onToggle,
  className,
  size = "md",
}: FollowButtonProps) {
  const [active, setActive] = useState(following);

  const toggle = () => {
    const next = !active;
    setActive(next);
    onToggle?.(next);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        "border transition-all duration-150 select-none active:scale-[0.97]",
        size === "sm" && "h-8 px-4 text-sm",
        size === "md" && "h-9 px-5 text-sm",
        active
          ? "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
          : "bg-coral-600 text-white border-coral-600 hover:bg-coral-700",
        className,
      )}
    >
      {active ? "Ακολουθείς" : "Ακολούθησε"}
    </button>
  );
}
