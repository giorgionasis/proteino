import { Fragment, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import type { IconName } from "@/lib/icons";

export interface PlatformLink {
  /** Stable key — e.g. "efood" or "netflix". */
  key: string;
  /** Brand logo from the icon registry. */
  brandIcon: IconName;
  /** Width hint for the brand logo SVG (heights are uniform 32px). */
  brandIconWidth?: number;
  /** Label shown to the right of the logo. Required only when there's a subtitle. */
  label?: string;
  /** Sub-label below the main label (e.g. "Συνδρομή", "Από 3.99"). */
  subtitle?: string;
  /** Outbound URL — clicking the pill opens this. */
  href: string;
}

interface PlatformLinksCardProps {
  /** Bold dark-coral title at the top. */
  title: string;
  links: PlatformLink[];
  /** CTA pill label (e.g. "Παραγγελία" for delivery, "Προβολή" for video). */
  ctaLabel: string;
  /** Optional icon shown inside the pill (default: arrow ›). */
  ctaIcon?: ReactNode;
}

const PlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
  </svg>
);

const ArrowIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Coral-tinted card listing 1-N branded action rows. Used for:
 *   - Food "Delivery" (efood / BOX → "Παραγγελία ›")
 *   - Movies/Series "Που θα την δεις" (Netflix / YouTube / Disney → "▶ Προβολή")
 *
 * Each row: brand logo + (label + optional subtitle) + outlined pill CTA.
 * Hairline divider between rows. Title on top in dark coral bold.
 */
export function PlatformLinksCard({
  title,
  links,
  ctaLabel,
  ctaIcon,
}: PlatformLinksCardProps) {
  if (links.length === 0) return null;
  const icon = ctaIcon ?? (ctaLabel.toLowerCase().includes("προβολ") ? PlayIcon : ArrowIcon);

  return (
    <div className="rounded-[16px] p-6 space-y-2" style={{ backgroundColor: "#FFF2F1" }}>
      <p className="text-[16px] font-bold" style={{ color: "#4A0800" }}>
        {title}
      </p>
      <div className="divide-y divide-zinc-200/60">
        {links.map((link) => (
          <div key={link.key} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon name={link.brandIcon} width={link.brandIconWidth ?? 94} height={32} alt={link.label ?? link.key} />
              {(link.label || link.subtitle) && (
                <div className="min-w-0">
                  {link.label && (
                    <p className="text-[18px] font-bold text-zinc-900 leading-tight">{link.label}</p>
                  )}
                  {link.subtitle && (
                    <p className="text-[13px] font-medium text-zinc-500 leading-tight mt-0.5">{link.subtitle}</p>
                  )}
                </div>
              )}
            </div>
            <OutlinedPill href={link.href}>
              <span className="inline-flex items-center gap-2">
                {icon}
                {ctaLabel}
              </span>
            </OutlinedPill>
          </div>
        ))}
      </div>
    </div>
  );
}
