"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/hooks/useOverlay";

export function FAB({ className }: { className?: string }) {
  const { openSuggestion, overlay } = useOverlay();

  // Hide when any overlay is open
  if (overlay !== null) return null;

  return (
    // Constrained to the mobile column — mirrors max-w-lg container
    <div
      className="fixed left-0 right-0 max-w-lg mx-auto z-30 pointer-events-none"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 16px)", height: 56 }}
    >
      <button
        onClick={() => openSuggestion()}
        aria-label="Νέα πρόταση"
        className={cn(
          "absolute right-4 bottom-0 pointer-events-auto",
          "w-14 h-14 rounded-full",
          "gradient-coral text-white shadow-fab",
          "flex items-center justify-center",
          "transition-transform duration-150 will-change-transform",
          "active:scale-95",
          className,
        )}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
