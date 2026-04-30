import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "default"
  | "coral"
  | "success"
  | "danger"
  | "warning"
  | "outline"
  | "dark"
  | "ai"
  | "gold";

export interface BadgeProps {
  children:   React.ReactNode;
  variant?:   BadgeVariant;
  dot?:       boolean;
  size?:      "sm" | "md";
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-600",
  coral:   "bg-coral-50 text-coral-600",
  success: "bg-emerald-50 text-success",
  danger:  "bg-red-50 text-danger",
  warning: "bg-orange-50 text-warning",
  outline: "border border-zinc-200 text-zinc-600",
  dark:    "bg-white/10 text-white",
  ai:      "bg-coral-50 text-coral-600 border border-coral-600/20",
  gold:    "bg-amber-50 text-amber-700",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-zinc-400",
  coral:   "bg-coral-600",
  success: "bg-success",
  danger:  "bg-danger",
  warning: "bg-warning",
  outline: "bg-zinc-400",
  dark:    "bg-white",
  ai:      "bg-coral-600",
  gold:    "bg-amber-500",
};

export function Badge({
  children,
  variant   = "default",
  dot       = false,
  size      = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full whitespace-nowrap",
        size === "sm" && "px-2.5 py-[3px] text-xs font-semibold tracking-[0.5px] uppercase",
        size === "md" && "px-3 py-1 text-sm font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {dot && (
        <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_CLASSES[variant])} />
      )}
      {children}
    </span>
  );
}

/* ── Review / Achievement badges (Verified / Expert / Gold) ─── */
export type ReviewBadgeType = "verified" | "expert" | "gold";

const REVIEW_BADGE: Record<ReviewBadgeType, { label: string; bg: string; text: string; border: string }> = {
  verified: { label: "Verified Member", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  expert:   { label: "Expert",          bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200"    },
  gold:     { label: "Gold",            bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
};

export function ReviewBadge({ type, className }: { type: ReviewBadgeType; className?: string }) {
  const cfg = REVIEW_BADGE[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border",
        cfg.bg, cfg.text, cfg.border,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
