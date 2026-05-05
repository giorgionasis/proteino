"use client";

import { useEffect, useRef, useState } from "react";

export interface RowMenuItem {
  label: string;
  onClick: () => void;
  /** Renders the item in coral-danger styling for delete actions. */
  danger?: boolean;
}

/**
 * Kebab-style overflow menu (⋯) used on profile rows for own content.
 * Opens a small popover anchored to the trigger; clicking outside or
 * pressing Esc closes it. Items handle their own click logic.
 */
export function RowMenu({ items, ariaLabel = "Επιλογές" }: { items: RowMenuItem[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
          <circle cx="12" cy="5"  r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 min-w-[180px] rounded-card bg-white border border-zinc-200 shadow-card overflow-hidden z-30"
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className={
                "w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors active:bg-zinc-50 " +
                (it.danger ? "text-coral-700" : "text-zinc-700")
              }
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
