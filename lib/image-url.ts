/**
 * Image URL safety helper.
 *
 * `next/image` requires either an absolute URL (http://, https://) or a
 * leading-slash path. Anything else throws an unhandled runtime error.
 * Legacy data (e.g., `k2-legacy/movies/1498/poster.jpg`) violates this.
 *
 * `safeImageUrl()` returns a string `next/image` will accept, or `null` if
 * the input can't be salvaged. Use the `null` return as the signal to render
 * a placeholder instead.
 */

export function safeImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const u = input.trim();
  if (!u) return null;

  // Already absolute → fine
  if (u.startsWith("http://") || u.startsWith("https://")) return u;

  // Already absolute-from-root → fine
  if (u.startsWith("/")) return u;

  // data: URLs work in <img> but not next/image; reject for next/image
  if (u.startsWith("data:")) return null;

  // Legacy K2 paths and any other relative path: assume they live under
  // /public at the same path. If they don't exist, the <img> 404s
  // visually but doesn't crash the page.
  return "/" + u;
}

/**
 * True if a URL is acceptable as `next/image` `src`.
 * Use to decide between rendering <Image /> vs a placeholder.
 */
export function isValidImageUrl(input: string | null | undefined): boolean {
  return safeImageUrl(input) !== null;
}
