import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon?:      React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, sub, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex-1 bg-white rounded-sm border border-zinc-200 px-5 py-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        {icon && <span className="text-zinc-400">{icon}</span>}
      </div>
      <div className="text-5xl font-extrabold text-zinc-800 leading-none mb-2">{value}</div>
      {sub && <p className="text-sm font-medium text-zinc-600">{sub}</p>}
    </div>
  );
}

/* ── Compact inline stat (ΠΡΟΤΑΣΕΙΣ / ΑΞΙΟΛΟΓΗΣΕΙΣ row) ──────── */
export function InlineStat({
  label,
  value,
  className,
}: {
  label:      string;
  value:      string | number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="text-xl font-bold text-zinc-800">{value}</span>
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-[0.1px]">{label}</span>
    </div>
  );
}
