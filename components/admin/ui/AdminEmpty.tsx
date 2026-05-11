"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Empty state for admin lists.
 *
 * One icon + one headline + one description + one CTA — anything more
 * is over-design for an admin context. Centered in the panel.
 */
interface AdminEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AdminEmpty({
  icon,
  title,
  description,
  action,
  className,
}: AdminEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-zinc-900">{title}</p>
      {description && (
        <p className="text-sm text-zinc-500 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
