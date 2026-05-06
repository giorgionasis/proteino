"use client";

import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OutlinedPillProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Hide the trailing arrow if the affordance doesn't need it. */
  noArrow?: boolean;
  /** Pill width — "auto" sizes to content, "full" stretches to container. */
  width?: "auto" | "full";
  /** Pill height. Default 48 matches the screenshots. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Outlined pill button used by every promo / affordance card on detail pages
 * (Booking availability, Public book ad, Delivery, Theater ticket CTA).
 * White-ish fill, zinc border, dark text + trailing arrow.
 *
 * Renders as <a> when href is provided, otherwise <button>.
 */
export function OutlinedPill({
  children,
  href,
  onClick,
  noArrow,
  width = "auto",
  size = "md",
  className,
}: OutlinedPillProps) {
  const base = cn(
    "inline-flex items-center justify-center gap-2 rounded-full",
    "border border-zinc-400 bg-white",
    "text-zinc-800 font-semibold tracking-tight",
    "active:bg-zinc-50 transition-colors",
    width === "full" && "w-full",
    size === "md" ? "h-12 px-5 text-[15px]" : "h-14 px-6 text-[17px]",
    className,
  );

  const inner = (
    <>
      <span className="truncate">{children}</span>
      {!noArrow && <ArrowRight size={size === "md" ? 16 : 18} strokeWidth={2.25} className="shrink-0" />}
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      {inner}
    </button>
  );
}
