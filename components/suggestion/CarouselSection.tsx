import type { ReactNode } from "react";

interface CarouselSectionProps {
  /** Section heading — typically UPPERCASE per design (pass already cased). */
  title: string;
  /** Cards (already mapped to <SuggestionCardPortrait/> or <SuggestionCardLandscape/>). */
  children: ReactNode;
}

/**
 * Section wrapper for a horizontal-scroll carousel of suggestion cards.
 *
 * Title row: bullet · UPPERCASE title · horizontal hairline filling the rest.
 * Below: horizontal scroll, 16px gap, edge-to-edge with first/last padding.
 */
export function CarouselSection({ title, children }: CarouselSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-6">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" aria-hidden />
        <h2 className="text-[14px] font-semibold tracking-[0.05em] text-zinc-900 uppercase whitespace-nowrap">
          {title}
        </h2>
        <div className="flex-1 h-px bg-zinc-300" />
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pl-6 pr-6 pb-2">
        {children}
        <div className="shrink-0 w-2" />
      </div>
    </section>
  );
}
