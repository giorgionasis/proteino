import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type SpinnerSize    = "sm" | "md" | "lg";
export type SpinnerVariant = "coral" | "white" | "gray";

interface SpinnerProps {
  size?:      SpinnerSize;
  variant?:   SpinnerVariant;
  centered?:  boolean;
  className?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[2.5px]",
};

const COLOR_CLASSES: Record<SpinnerVariant, string> = {
  coral: "border-coral-200 border-t-coral-600",
  white: "border-white/30  border-t-white",
  gray:  "border-gray-200  border-t-gray-500",
};

// ── Component ──────────────────────────────────────────────────
export function Spinner({
  size     = "md",
  variant  = "coral",
  centered = false,
  className,
}: SpinnerProps) {
  const spinner = (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full animate-spin-slow",
        SIZE_CLASSES[size],
        COLOR_CLASSES[variant],
        className,
      )}
    />
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full py-8">
        {spinner}
      </div>
    );
  }

  return spinner;
}
