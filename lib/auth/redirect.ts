/**
 * Post-login destination from a `?redirect=` / `?next=` param. Only
 * same-site absolute paths pass: "//host" and "/\host" are protocol-
 * relative escapes, and auth entry pages would loop (/reset-password stays allowed — the
 * recovery callback lands there). Anything else → "/".
 */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/^\/(login|register|forgot-password|verify-code)(\/|\?|$)/.test(raw)) return "/";
  return raw;
}

/** Current `?redirect=` param, sanitised — for client components. */
export function redirectParam(): string {
  if (typeof window === "undefined") return "/";
  return safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
}
