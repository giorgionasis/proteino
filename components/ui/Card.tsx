import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type CardVariant = "default" | "elevated" | "flat" | "outlined";

export interface CardProps {
  children:   React.ReactNode;
  className?: string;
  variant?:   CardVariant;
  pressable?: boolean;
  onClick?:   () => void;
  as?:        React.ElementType;
}

// ── Component ──────────────────────────────────────────────────
export function Card({
  children,
  className,
  variant   = "default",
  pressable = false,
  onClick,
  as: Tag   = "div",
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={cn(
        // Base
        "bg-white rounded-card overflow-hidden",

        // Variants
        variant === "default"  && "border-[0.5px] border-gray-200",
        variant === "elevated" && "shadow-card",
        variant === "flat"     && "bg-gray-50",
        variant === "outlined" && "border-[0.5px] border-coral-500",

        // Pressable
        pressable && [
          "cursor-pointer select-none",
          "transition-transform duration-100",
          "active:scale-[0.98]",
        ],

        className,
      )}
    >
      {children}
    </Tag>
  );
}

// ── Sub-components ─────────────────────────────────────────────
export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pt-4 pb-2", className)}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pb-4", className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-3 border-t border-[0.5px] border-gray-100", className)}>
      {children}
    </div>
  );
}
