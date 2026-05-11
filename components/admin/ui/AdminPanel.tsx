"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Bordered card surface for admin lists / tables / forms.
 *
 * One bordered box per page section — gives the eye a clear
 * "container" so it can group rows mentally. Nested AdminPanels are
 * a smell — flatten instead.
 *
 * Subheader slot (`toolbar`) sits above the divider; row content
 * underneath. Use for filter pills, search boxes, "X items" counts,
 * inline forms.
 */
interface AdminPanelProps {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes the inner padding so list rows can fill edge-to-edge. */
  flush?: boolean;
}

export function AdminPanel({ toolbar, children, className, flush }: AdminPanelProps) {
  return (
    <section
      className={cn(
        "bg-white border border-zinc-200 rounded-xl overflow-hidden",
        className,
      )}
    >
      {toolbar && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50/40">
          {toolbar}
        </div>
      )}
      <div className={cn(flush ? "" : "p-4")}>{children}</div>
    </section>
  );
}
