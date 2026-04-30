"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/hooks/useOverlay";

export function FAB({ className }: { className?: string }) {
  const { openSuggestion, overlay } = useOverlay();

  // Hide when any overlay is open
  if (overlay !== null) return null;

  return (
    <button
      onClick={openSuggestion}
      aria-label="Νέα πρόταση"
      className={cn(
        // Position: above bottom nav (64px) + gap
        "fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px)+16px)] right-4 z-30",
        // Shape
        "w-14 h-14 rounded-full",
        // Style
        "gradient-coral text-white shadow-fab",
        // Layout
        "flex items-center justify-center",
        // Interaction — GPU-accelerated scale
        "transition-transform duration-150 will-change-transform",
        "active:scale-95",
        className,
      )}
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
  );
}
