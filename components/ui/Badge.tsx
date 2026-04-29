import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type BadgeVariant =
  | "default"
  | "coral"
  | "success"
  | "danger"
  | "outline"
  | "dark"
  | "ai";

export interface BadgeProps {
  children:   React.ReactNode;
  variant?:   BadgeVariant;
  dot?:       boolean;
  className?: string;
}

// ── Variant map ────────────────────────────────────────────────
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600",
  coral:   "bg-coral-50 text-coral-600",
  success: "bg-green-50 text-success",
  danger:  "bg-red-50   text-danger",
  outline: "border-[0.5px] border-gray-300 text-gray-600",
  dark:    "bg-white/10 text-white",
  // AI badge — coral with subtle pulse border
  ai:      "bg-coral-50 text-coral-600 border-[0.5px] border-coral-500",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  coral:   "bg-coral-600",
  success: "bg-success",
  danger:  "bg-danger",
  outline: "bg-gray-400",
  dark:    "bg-white",
  ai:      "bg-coral-600",
};

// ── Component ──────────────────────────────────────────────────
export function Badge({ children, variant = "default", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-2.5 py-[3px] rounded-pill",
        "text-2xs font-medium tracking-[0.5px] uppercase",
        "whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_CLASSES[variant])}
        />
      )}
      {children}
    </span>
  );
}
