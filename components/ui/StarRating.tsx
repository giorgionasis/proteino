"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type StarRatingSize = "sm" | "md" | "lg";

interface StarRatingProps {
  value?:        number;           // current value (0-5)
  onChange?:     (v: number) => void;
  readOnly?:     boolean;
  size?:         StarRatingSize;
  showValue?:    boolean;
  className?:    string;
}

const SIZE_PX: Record<StarRatingSize, string> = {
  sm: "text-base",   // 16px
  md: "text-2xl",    // 24px
  lg: "text-3xl",    // 30px
};

// ── Component ──────────────────────────────────────────────────
export function StarRating({
  value    = 0,
  onChange,
  readOnly = false,
  size     = "md",
  showValue = false,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "group"}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half   = !filled && display >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={cn(
              SIZE_PX[size],
              "leading-none transition-all duration-100",
              readOnly ? "cursor-default" : "cursor-pointer active:scale-110",
              filled
                ? "text-coral-600"
                : half
                  ? "text-coral-400"
                  : "text-gray-200",
              !readOnly && !filled && "hover:text-coral-400",
            )}
          >
            ★
          </button>
        );
      })}

      {showValue && value > 0 && (
        <span className="ml-1.5 text-sm font-medium text-gray-600">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
