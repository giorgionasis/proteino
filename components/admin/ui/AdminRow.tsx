"use client";

import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Generic admin list row — title left, meta below, actions revealed
 * on hover/focus on the right edge.
 *
 * Three slots:
 *   - leading  : optional 16-24px element before the title (chevron,
 *                avatar, status dot)
 *   - title/meta: primary text + secondary muted text below
 *   - actions  : revealed on group-hover OR keyboard focus-within;
 *                kept off-screen visually but present in the DOM so
 *                screen readers + keyboard users still reach them
 *
 * Tree variant: pass `depth` and the row gets indented 18px per level.
 * Pass `inset` to draw a coral-50 left rail for visual grouping when
 * the row is part of a sub-tree (used by RegionsManager).
 */

interface AdminRowProps {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** When the row is currently in edit mode, force-show the inline
   *  editor by passing it here — replaces title rendering entirely. */
  editing?: ReactNode;
  /** Tree indent (in levels). Each level adds 18px of left padding. */
  depth?: number;
  /** When true, leftmost edge gets a 2px coral accent — used for
   *  selected / active rows. */
  active?: boolean;
  /** Disable hover styling — for static read-only rows. */
  passive?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AdminRow({
  leading,
  title,
  meta,
  actions,
  editing,
  depth = 0,
  active,
  passive,
  className,
  onClick,
}: AdminRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 pr-3 py-2 border-b border-zinc-100 last:border-0 transition-colors",
        !passive && "hover:bg-zinc-50/80 focus-within:bg-zinc-50/80",
        active && "bg-coral-50/60",
        onClick && !passive && "cursor-pointer",
        className,
      )}
      style={{ paddingLeft: 12 + depth * 18 }}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-coral-600" aria-hidden />}

      {leading && (
        <span className="shrink-0 flex items-center justify-center w-4 h-4 text-zinc-400">
          {leading}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {editing ? (
          editing
        ) : (
          <>
            <div className="text-sm text-zinc-900 truncate flex items-center gap-2">
              {title}
            </div>
            {meta && (
              <div className="text-xs text-zinc-400 truncate mt-0.5">{meta}</div>
            )}
          </>
        )}
      </div>

      {actions && (
        <div
          className={cn(
            "shrink-0 flex items-center gap-1 transition-opacity",
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/* ── Action button — paired with AdminRow ────────────────────────── */

interface AdminActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "neutral" | "danger" | "primary";
  label?: string;
}

export const AdminActionButton = forwardRef<HTMLButtonElement, AdminActionButtonProps>(
  function AdminActionButton({ tone = "neutral", label, className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        title={label}
        aria-label={label}
        className={cn(
          "h-7 min-w-7 px-1.5 inline-flex items-center justify-center gap-1",
          "rounded-md text-xs font-medium",
          "transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
          tone === "neutral" && "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60",
          tone === "danger"  && "text-zinc-400 hover:text-red-600 hover:bg-red-50",
          tone === "primary" && "text-coral-600 hover:bg-coral-100",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

/* ── Action select (hover-revealed dropdown) ─────────────────────── */
/* Used for "Move under…" pickers etc. Looks like an action button but */
/* renders a native <select> for zero dependencies + perfect keyboard. */

interface AdminActionSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function AdminActionSelect({ label, className, children, ...props }: AdminActionSelectProps) {
  return (
    <span className="relative inline-flex">
      <select
        title={label}
        aria-label={label}
        className={cn(
          "h-7 pl-2 pr-6 rounded-md text-xs font-medium",
          "text-zinc-500 hover:text-zinc-900 bg-transparent hover:bg-zinc-200/60",
          "border border-transparent hover:border-zinc-200",
          "appearance-none cursor-pointer disabled:opacity-30",
          "focus:outline-none focus:border-zinc-300",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" viewBox="0 0 12 12" fill="none">
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
