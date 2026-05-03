"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface WantToSeeButtonProps {
  active?:    boolean;
  label?:     string;
  onToggle?:  (next: boolean) => void;
  className?: string;
}

export function WantToSeeButton({
  active: initialActive = false,
  label = "Θέλω να τη δω",
  onToggle,
  className,
}: WantToSeeButtonProps) {
  const [active, setActive] = useState(initialActive);

  const toggle = () => {
    const next = !active;
    setActive(next);
    onToggle?.(next);
  };

  return (
    <button
      onClick={toggle}
      className={cn("flex flex-col items-center gap-4", className)}
    >
      <div
        className={cn(
          "w-[50px] h-[50px] rounded-full flex items-center justify-center transition-colors",
          active
            ? "bg-[#98D2FE]"
            : "bg-white border border-zinc-300",
        )}
      >
        <BookmarkIcon active={active} />
      </div>
      <span className="text-lg font-semibold text-zinc-600 leading-[130%]">{label}</span>
    </button>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
      <path
        d="M1 2.5C1 1.67 1.67 1 2.5 1H9.5C10.33 1 11 1.67 11 2.5V15L6 12L1 15V2.5Z"
        stroke={active ? "#003054" : "#71717A"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "#003054" : "none"}
      />
    </svg>
  );
}
