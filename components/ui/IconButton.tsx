"use client";

import { cn } from "@/lib/utils/cn";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?:     React.Ref<HTMLButtonElement>;
  size?:    "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "coral";
  badge?:   boolean | number;
}

const SIZE = {
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-11 h-11",
} as const;

const VARIANT = {
  default: "bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300",
  ghost:   "bg-transparent hover:bg-zinc-100 active:bg-zinc-200",
  coral:   "bg-coral-600 hover:bg-coral-700 active:bg-coral-800 text-white",
} as const;

function IconButton({ ref, size = "md", variant = "default", badge, children, className, ...props }: IconButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        "transition-colors duration-100 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-600",
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {children}
      {badge && (
        <span
          aria-hidden
          className={cn(
            "absolute top-0 right-0 flex items-center justify-center",
            "min-w-[14px] h-[14px] rounded-full bg-badge-red border-2 border-white",
            typeof badge === "number" && "px-[3px] text-[9px] font-bold text-white",
          )}
        >
          {typeof badge === "number" && badge}
        </span>
      )}
    </button>
  );
}

export { IconButton };
