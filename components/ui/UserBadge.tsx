"use client";

import { Icon } from "@/components/ui/Icon";
import {
  badgeIconForLevel,
  badgeIconForSuggestions,
  badgeLabelForSuggestions,
  type IconName,
} from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

type BadgeKind = "Verified" | "Gold" | "Expert" | "Platinum";

const LABEL: Record<BadgeKind, string> = {
  Verified: "Verified",
  Gold:     "Gold",
  Expert:   "Expert",
  Platinum: "Platinum",
};

interface UserBadgeProps {
  /** Explicit kind override (legacy / fixtures). */
  kind?: BadgeKind;
  /** Live suggestion count — preferred input. Derives the tier via
   *  `badgeIconForSuggestions`. Returns null below 3 suggestions, in
   *  which case the component renders nothing. */
  suggestionCount?: number;
  /** Legacy fallback. `users.level` is currently `1` across the
   *  migrated corpus so passing this alone always yields "Verified".
   *  Prefer `suggestionCount` when available. */
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
 * Renders the illustrated badge SVG from /icons/badges/ + optional label.
 *
 * Resolution order: explicit `kind` → `suggestionCount` (preferred) →
 * `level` (legacy fallback). When `suggestionCount` is given and falls
 * below the verified threshold (< 3), the component renders nothing —
 * brand-new users genuinely have no badge to display.
 */
export function UserBadge({
  kind: kindProp,
  suggestionCount,
  level,
  iconOnly,
  size = 14,
  variant = "sm",
  className,
}: UserBadgeProps) {
  let iconName: IconName | null;
  let label: BadgeKind;

  if (kindProp) {
    iconName = `badge-${kindProp.toLowerCase()}` as IconName;
    label    = kindProp;
  } else if (typeof suggestionCount === "number") {
    iconName = badgeIconForSuggestions(suggestionCount);
    const lab = badgeLabelForSuggestions(suggestionCount);
    if (!iconName || !lab) return null;
    label = lab;
  } else {
    iconName = badgeIconForLevel(level ?? 0);
    label = (
      iconName === "badge-platinum" ? "Platinum" :
      iconName === "badge-expert"   ? "Expert"   :
      iconName === "badge-gold"     ? "Gold"     : "Verified"
    ) as BadgeKind;
  }

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
