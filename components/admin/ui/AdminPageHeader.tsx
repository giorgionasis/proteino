"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Standard admin page header.
 *
 * Slot 1 (left): page title + optional subtitle/count line below.
 * Slot 2 (right): primary action button — kept as a render slot so each
 * page can wire its own onClick / disabled / busy state without us
 * re-implementing button props.
 *
 * Visual rhythm: 20px gap to the next section, no border-bottom (the
 * page card below carries the visual weight). Two-line layout keeps
 * meta text away from the title so the eye finds the title in one
 * scan.
 */
interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  primary?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  meta,
  primary,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-6 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold text-zinc-950 leading-tight tracking-tight">
          {title}
        </h1>
        {(subtitle || meta) && (
          <p className="text-sm text-zinc-500 mt-1.5">
            {subtitle}
            {subtitle && meta && <span className="mx-2 text-zinc-300">·</span>}
            {meta && <span className="text-zinc-400">{meta}</span>}
          </p>
        )}
      </div>
      {primary && <div className="shrink-0">{primary}</div>}
    </header>
  );
}
