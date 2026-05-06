import { Fragment } from "react";

interface Metric {
  label: string;
  value: string;
}

interface DurationCardProps {
  /** Section heading (UPPERCASE per design — pass already-uppercased). */
  title?: string;
  metrics: Metric[];
}

/**
 * Recipe duration card. Lavender bg, optional uppercase title, then a row of
 * label/value metric columns separated by hairline dividers.
 *
 * Pattern: ΣΥΝΟΛΟ / ΠΡΟΕΤΟΙΜΑΣΙΑ / ΨΗΣΙΜΟ → "1ω 50'" / "30'" / "1ω 20'".
 * Generic enough to use for other 2-3-column metric strips later.
 */
export function DurationCard({ title = "ΔΙΑΡΚΕΙΑ", metrics }: DurationCardProps) {
  if (metrics.length === 0) return null;
  return (
    <div className="rounded-[12px] px-5 py-6 space-y-5" style={{ backgroundColor: "#F2F2F7" }}>
      {title && (
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
          {title}
        </p>
      )}
      <div className="flex items-center justify-between">
        {metrics.map((m, i) => (
          <Fragment key={m.label}>
            {i > 0 && <div className="w-px h-12 bg-zinc-300" />}
            <div className="flex flex-col items-start gap-2 flex-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {m.label}
              </span>
              <span className="text-[20px] font-bold text-zinc-900 leading-none">
                {m.value}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
