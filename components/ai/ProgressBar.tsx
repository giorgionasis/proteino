"use client";

import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  animated?: boolean;
}

export function ProgressBar({ progress, className, animated = true }: ProgressBarProps) {
  return (
    <div className={cn("w-full h-1 bg-gray-100 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full gradient-coral rounded-full", animated && "transition-all duration-500")}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
