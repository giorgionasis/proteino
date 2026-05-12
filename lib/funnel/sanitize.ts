/**
 * PII sanitiser for submission text snapshots.
 *
 * Rules:
 *  - Email-shaped strings → ***@***.***
 *  - Phone-shaped strings (≥ 8 digits, optional country prefix) → ***
 *  - URLs are preserved (they're typically Wikipedia/TMDB/Booking, not PII)
 *  - Hard cap at 500 chars after masking
 *
 * Lives client-side because we don't want raw PII hitting the wire at
 * all. Server stores whatever the client sent, capped via LEFT(...).
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

// Phone matcher: optional + or 00 prefix, then 8+ digits with optional
// separators (spaces, dashes, parens). Deliberately conservative — we
// don't want to mask year numbers like "1995".
const PHONE_RE = /(?:\+|00)?[\d](?:[\d\s().-]?[\d]){7,}/g;

export function sanitizeFunnelText(text: string): string {
  if (!text) return "";
  const masked = text
    .replace(EMAIL_RE, "***@***.***")
    .replace(PHONE_RE, (m) => {
      // Don't mask short digit runs that snuck through (e.g. "1995")
      const digits = m.replace(/\D/g, "");
      return digits.length >= 8 ? "***" : m;
    });
  return masked.length > 500 ? masked.slice(0, 500) + "…" : masked;
}
