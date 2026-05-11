"use client";

import { useEffect, useRef, useState } from "react";
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

  // Cascading scale-pop on tap — when user picks N stars, animate
  // stars 1..N with a 50ms left-to-right stagger so the rating feels
  // like an *act* rather than a state flip. Tracks the value with a
  // mount-version key so each new selection re-fires the animation,
  // even when the user re-taps the same value.
  const [popVersion, setPopVersion] = useState(0);
  const lastValue = useRef(value);
  useEffect(() => {
    if (lastValue.current !== value) {
      setPopVersion((v) => v + 1);
      lastValue.current = value;
    }
  }, [value]);

  const handlePick = (star: number) => {
    setPopVersion((v) => v + 1);
    onChange?.(star);
  };

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "group"}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half   = !filled && display >= star - 0.5;
        // Animate any star that's <= the picked value, staggered.
        const pop    = !readOnly && filled && popVersion > 0;

        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => handlePick(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={cn(
              SIZE_PX[size],
              "leading-none transition-colors duration-150",
              readOnly ? "cursor-default" : "cursor-pointer",
              filled
                ? "text-coral-600"
                : half
                  ? "text-coral-400"
                  : "text-gray-200",
              !readOnly && !filled && "hover:text-coral-400",
            )}
          >
            <span
              key={`${star}-${popVersion}`}
              className={cn("inline-block", pop && "animate-star-fill")}
              style={{ animationDelay: pop ? `${(star - 1) * 50}ms` : undefined }}
            >
              ★
            </span>
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
