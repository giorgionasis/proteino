"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface FullScreenOverlayProps {
  open:       boolean;
  onClose:    () => void;
  children:   React.ReactNode;
  className?: string;
}

export function FullScreenOverlay({
  open,
  onClose,
  children,
  className,
}: FullScreenOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Prevent scroll on the content behind while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-modal={open}
      aria-hidden={!open}
      className={cn(
        "fixed inset-y-0 left-0 right-0 max-w-[390px] mx-auto z-50",
        "bg-white",
        // Slide-up animation driven by open state
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "will-change-transform",
        open ? "translate-y-0" : "translate-y-full",
        // Allow scroll inside but contain overscroll (no pull-to-refresh bleed)
        "overflow-y-auto overscroll-contain",
        className,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
}
