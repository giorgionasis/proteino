/**
 * Centralised contact information. Single source of truth so changing
 * the support inbox is a one-line edit.
 */

export const SUPPORT_EMAIL = "support@proteino.gr";

/**
 * Build a `mailto:` URL with optional subject. Used by the support
 * page, support section on home, and the "didn't find what you were
 * looking for" CTA in the help center.
 */
export function supportMailto(subject?: string): string {
  if (!subject) return `mailto:${SUPPORT_EMAIL}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
