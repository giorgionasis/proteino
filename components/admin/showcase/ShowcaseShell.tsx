"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  "Foundations",
  "Cards",
  "Detail modules",
  "Modal",
  "Toasts",
  "Notifications",
  "Admin",
  "Patterns",
] as const;
export type ShowcaseTab = typeof TABS[number];

interface ShowcaseShellProps {
  children: Record<ShowcaseTab, ReactNode>;
  defaultTab?: ShowcaseTab;
}

/**
 * Top-level showcase shell. Tabbed nav across the 5 grouping categories.
 * Server passes the rendered content for each tab as a record; we pick the
 * active one client-side so switching is instant (no route change).
 */
export function ShowcaseShell({ children, defaultTab = "Cards" }: ShowcaseShellProps) {
  const [active, setActive] = useState<ShowcaseTab>(defaultTab);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Design system</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Internal component library. Variants + live "view in context" links.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-8 px-8 py-3 bg-zinc-50/95 backdrop-blur border-b border-zinc-200">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = tab === active;
            return (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-12">{children[active]}</div>
    </div>
  );
}
