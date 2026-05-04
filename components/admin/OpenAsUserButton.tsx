"use client";

/**
 * "Open as user" — a small button that opens the public-facing URL of
 * the entity admin is editing. Closes the verification round-trip:
 * admins can confirm what they just saved actually renders correctly.
 *
 * Pass `href` (the public URL). Optional `label` overrides the default.
 */

interface Props {
  href: string;
  label?: string;
  className?: string;
}

export function OpenAsUserButton({ href, label = "Open as user", className = "" }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Δες τη δημοσιευμένη εκδοχή σε νέα καρτέλα"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      {label}
    </a>
  );
}
