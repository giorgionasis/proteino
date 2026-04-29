import { cn } from "@/lib/utils/cn";

// ── Base ───────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("skeleton rounded-md", className)}
    />
  );
}

// ── Pre-built shapes ───────────────────────────────────────────
export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3.5 rounded",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14" }[size];
  return <Skeleton className={cn("rounded-full", sizeClass)} />;
}

// ── Card skeleton — matches Item card layout ───────────────────
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-card border-[0.5px] border-gray-200 overflow-hidden", className)}>
      <Skeleton className="w-full h-44" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3   w-1/3 rounded" />
      </div>
    </div>
  );
}

// ── Suggestion card skeleton ───────────────────────────────────
export function SkeletonSuggestion({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 p-3 bg-white rounded-card border-[0.5px] border-gray-200", className)}>
      <Skeleton className="w-16 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3   w-1/4 rounded" />
        <Skeleton className="h-3   w-1/2 rounded" />
      </div>
    </div>
  );
}
