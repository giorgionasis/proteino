import Link from "next/link";
import type { ReactNode } from "react";

interface ContextLink {
  label: string;
  href: string;
}

interface ShowcaseSectionProps {
  /** Component name as you'd import it. */
  name: string;
  /** Path inside the repo for the source file. Shown as monospace metadata. */
  filePath?: string;
  /** One-line "what this is for" description. */
  description?: string;
  /** "View in context" links to real pages where this component is used. */
  contextLinks?: ContextLink[];
  /** Variants — typically wrapped in <Variant>. */
  children: ReactNode;
}

/**
 * Container for a single component in the showcase. Renders header (name +
 * description + file path + context links) and a grid of variants below.
 */
export function ShowcaseSection({
  name,
  filePath,
  description,
  contextLinks,
  children,
}: ShowcaseSectionProps) {
  return (
    <section className="rounded-xl bg-white border border-zinc-200 p-6">
      <header className="mb-5 pb-5 border-b border-zinc-100">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-bold text-zinc-900">{name}</h2>
          {filePath && (
            <code className="text-[11px] text-zinc-500 font-mono">{filePath}</code>
          )}
        </div>
        {description && (
          <p className="mt-2 text-sm text-zinc-600 leading-snug">{description}</p>
        )}
        {contextLinks && contextLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {contextLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-zinc-100 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
              >
                ↗ {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {children}
      </div>
    </section>
  );
}

interface VariantProps {
  /** Short label describing the variant ("with text", "rating-only", etc.) */
  label: string;
  /** Optional second line — explains when to use this variant. */
  note?: string;
  /** The component instance. */
  children: ReactNode;
  /** When true, give the preview a darker background (helps light components stand out). */
  dark?: boolean;
}

/**
 * Single variant cell. Label on top, component preview below in a contained
 * area so its own dimensions don't blow out the grid.
 */
export function Variant({ label, note, children, dark = false }: VariantProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        {note && <p className="text-[11px] text-zinc-500 mt-0.5">{note}</p>}
      </div>
      <div
        className={`rounded-lg border border-zinc-200 p-4 min-h-[120px] flex items-center justify-center overflow-auto ${
          dark ? "bg-zinc-800" : "bg-zinc-50"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
