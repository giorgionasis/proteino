import { revalidatePath } from "next/cache";

/**
 * Centralised list of frontend page paths that depend on the
 * admin-managed dataset. Admin write endpoints call
 * `revalidateFrontend()` so the user sees their edits within ~1s of
 * saving — no manual refresh, no waiting for the next deploy or
 * the next ISR tick.
 *
 * `revalidatePath(path, "layout")` invalidates the path AND every
 * page under it. We use it sparingly (only on root-level `/`) to
 * avoid recomputing every category page unnecessarily.
 *
 * Use the targeted variants (`revalidateItem`, `revalidateCategory`)
 * when an endpoint only touches one item — they're cheaper than the
 * full sweep.
 */

const ALL_CATEGORIES = [
  "movies", "series", "books", "food", "recipes",
  "bars", "hotels", "theater", "events",
] as const;

/** Revalidate everything user-facing. Use for global edits (regions,
 *  filters, collections, settings) where pinpointing the affected
 *  pages would be fragile.
 *
 *  Calls into Next.js's per-path cache layer only — does NOT
 *  invalidate static-page bundles. Cheap, safe to call multiple
 *  times per request. */
export function revalidateFrontend(): void {
  // Home (both guest + registered variants share this path)
  revalidatePath("/");
  // Notifications drawer reads from admin-managed data too
  revalidatePath("/notifications");
  // Every category page
  for (const cat of ALL_CATEGORIES) {
    revalidatePath(`/${cat}`);
  }
}

/** Revalidate everything that depends on a SPECIFIC item — the
 *  detail page, its reviews subpage, AND the category listing it
 *  appears on. Use for endpoints that mutate items / suggestions /
 *  extension fields. */
export function revalidateItem(category: string, slug: string | null): void {
  // Category listing (item may have moved in/out of filters)
  revalidatePath(`/${category}`);
  if (slug) {
    revalidatePath(`/${category}/${slug}`);
    revalidatePath(`/${category}/${slug}/reviews`);
  }
  // Home shows top items — could have changed
  revalidatePath("/");
}

/** Revalidate a single category listing only. Use for endpoints
 *  that touch category-scoped config (filter visibility, collections
 *  ordering) without affecting individual items. */
export function revalidateCategory(category: string): void {
  revalidatePath(`/${category}`);
}

/** Revalidate the home page only. Use for endpoints that touch
 *  home-specific data (collections, movies-tonight) and nothing else. */
export function revalidateHome(): void {
  revalidatePath("/");
}

/** Revalidate a user's profile pages. Use when a user's stats /
 *  bookmarks / suggestions list could change as a side effect of
 *  an admin action (e.g. hiding a suggestion). */
export function revalidateProfile(handle: string): void {
  revalidatePath(`/profile/${handle}`);
  revalidatePath(`/profile/${handle}/bookmarks`);
  revalidatePath(`/profile/${handle}/reviews`);
  revalidatePath(`/profile/${handle}/suggestions`);
}
