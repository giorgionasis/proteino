import { cn } from "@/lib/utils/cn";

interface CategoryStatCardProps {
  label:       string;
  count:       number;
  imageUrl?:   string | null;
  bgColor?:    string;
  className?:  string;
}

export function CategoryStatCard({ label, count, imageUrl, bgColor, className }: CategoryStatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-6 p-3 border border-zinc-200 rounded-lg",
        className,
      )}
      style={{ width: 161 }}
    >
      <p className="text-lg font-bold text-zinc-800 leading-[130%]">{label}</p>
      <div className="flex items-center gap-2">
        <div
          className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0"
          style={{
            backgroundColor: bgColor ?? "#d4d4d8",
            boxShadow: "4px 4px 8px -2px rgba(0, 0, 0, 0.15)",
          }}
        >
          {imageUrl && (
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-zinc-800 leading-[130%]">{count}</p>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide leading-[130%]">
            ΠΡΟΤΑΣΕΙΣ
          </p>
        </div>
      </div>
    </div>
  );
}
