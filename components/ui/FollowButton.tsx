"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
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

  const iconName = active ? "followed" : "follow";

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
        <Icon name={iconName} size={20} />
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
      <Icon name={iconName} size={size === "lg" ? 18 : 16} />
      {active ? "Ακολουθείς" : "Ακολούθησε"}
    </button>
  );
}
