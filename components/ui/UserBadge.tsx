"use client";

import { Icon } from "@/components/ui/Icon";
import { badgeIconForLevel } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

type BadgeKind = "Verified" | "Gold" | "Expert" | "Platinum";

const LABEL: Record<BadgeKind, string> = {
  Verified: "Verified",
  Gold:     "Gold",
  Expert:   "Expert",
  Platinum: "Platinum",
};

interface UserBadgeProps {
  /** Pass either an explicit kind (legacy) or `level` and we'll derive it. */
  kind?: BadgeKind;
  level?: number;
  /** Hide the label text, render the icon only. */
  iconOnly?: boolean;
  /** Icon size in px. Default 14 (matches inline-with-name use). */
  size?: number;
  /** Smaller text variant. Default "sm". */
  variant?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Single source of truth for the user-level badge across the app.
 * Renders the illustrated badge SVG from /icons/badges/ + (optional) text label.
 *
 * Replaces the legacy colored text-pill (`<BadgeChip>`) and inline shield
 * SVG (`<VerifiedBadge>`) variants that were duplicated across all 9
 * detail components.
 */
export function UserBadge({
  kind: kindProp,
  level,
  iconOnly,
  size = 14,
  variant = "sm",
  className,
}: UserBadgeProps) {
  // Derive kind from level if not explicitly passed.
  const iconName = kindProp
    ? `badge-${kindProp.toLowerCase()}` as ReturnType<typeof badgeIconForLevel>
    : badgeIconForLevel(level ?? 0);

  // Pretty-print the label from the iconName ("badge-verified" → "Verified").
  const label = kindProp ?? (
    iconName === "badge-platinum" ? "Platinum" :
    iconName === "badge-expert"   ? "Expert"   :
    iconName === "badge-gold"     ? "Gold"     : "Verified"
  ) as BadgeKind;

  const textCls = cn(
    "font-semibold text-zinc-800",
    variant === "xs" && "text-[11px]",
    variant === "sm" && "text-[12px]",
    variant === "md" && "text-[14px]",
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon name={iconName} size={size} alt={iconOnly ? LABEL[label] : ""} />
      {!iconOnly && <span className={textCls}>{LABEL[label]}</span>}
    </span>
  );
}
