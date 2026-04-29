import { cn } from "@/lib/utils/cn";
import type { SearchPill as SearchPillType } from "@/types";

const PILL_COLORS: Record<SearchPillType["type"], string> = {
  VIBE: "bg-purple-50 text-purple-700 border-purple-200",
  TYPE: "bg-blue-50 text-blue-700 border-blue-200",
  LOC:  "bg-green-50 text-success border-green-200",
};

interface SearchPillProps {
  pill: SearchPillType;
  onRemove?: () => void;
}

export function SearchPill({ pill, onRemove }: SearchPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium border",
        PILL_COLORS[pill.type]
      )}
    >
      <span className="text-[9px] tracking-widest opacity-60">{pill.type}</span>
      {pill.value}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 text-base leading-none">
          ×
        </button>
      )}
    </span>
  );
}
