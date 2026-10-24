/**
 * Canonical public origin, no trailing slash. www.proteino.gr is the
 * canonical host (chosen at the session-40 cutover plan); set
 * NEXT_PUBLIC_SITE_URL to override per environment.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.proteino.gr").replace(/\/$/, "");
