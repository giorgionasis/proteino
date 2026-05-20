import { CATEGORIES, type Category } from "@/constants/categories";
import type { CategorySlug } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolver for admin-editable category metadata.
 *
 * The code constant `CATEGORIES` (constants/categories.ts) is the
 * source of truth for slugs + capability flags (hasMap / hasTrailer /
 * …) — these are deeply coupled to routes and conditional component
 * imports, so they can't safely be DB-edited.
 *
 * The `category_meta` table (migration 041) owns the *display* layer:
 * Greek label, icon, display_order, is_nav_published. Admin edits
 * those without touching code. (Named `category_meta` rather than
 * `categories` because the legacy `categories` table from migration
 * 001 already exists with an incompatible CMS-catalog shape.)
 *
 * `getCategoriesResolved()` merges the DB rows over the constant. The
 * merge is null-safe — a missing migration, empty seed, or DB outage
 * all fall back to the in-code defaults rather than blanking the UI.
 *
 * Server-only — uses the admin client. Client components should
 * receive resolved categories as a prop from a server parent.
 */

export interface ResolvedCategory extends Category {
  /** True when the DB row exists AND `is_nav_published = true`. The
   *  constant has no equivalent — un-edited categories default to
   *  `true`. */
  isNavPublished: boolean;
}

export async function getCategoriesResolved(): Promise<ResolvedCategory[]> {
  const fallback: ResolvedCategory[] = CATEGORIES.map((c, i) => ({
    ...c,
    // Stable fallback order matches the constant's array order.
    isNavPublished: true,
    // We don't mutate display_order on Category itself — the in-code
    // order is implicit. The resolver returns sorted output.
    ...({ __order: i } as any),
  }));

  const sb = createAdminClient();
  // `category_meta` not in generated Database types yet (migration
  // 041). Cast skips the typed builder; the resolver tolerates schema
  // drift by null-checking each property below.
  const { data, error } = await (sb.from("category_meta") as any)
    .select("slug, display_label_el, icon, display_order, is_nav_published");

  if (error || !Array.isArray(data) || data.length === 0) {
    // Migration not applied or empty seed — return constants in their
    // array order, all marked nav-published.
    return fallback.map(({ __order, ...rest }: any) => rest);
  }

  const bySlug = new Map<string, any>();
  for (const row of data) {
    bySlug.set((row as any).slug, row);
  }

  const merged: (ResolvedCategory & { __order: number })[] = CATEGORIES.map((c, i) => {
    const row = bySlug.get(c.slug);
    if (!row) {
      return { ...c, isNavPublished: true, __order: 1000 + i };
    }
    return {
      ...c,
      labelEl: row.display_label_el || c.labelEl,
      icon:    row.icon            || c.icon,
      isNavPublished: row.is_nav_published !== false,
      __order: typeof row.display_order === "number" ? row.display_order : 1000 + i,
    };
  });

  merged.sort((a, b) => a.__order - b.__order);
  return merged.map(({ __order, ...rest }) => rest);
}

/** Single-slug resolver. Same merge logic, returns null when the slug
 *  doesn't exist in `CATEGORIES` (route guard). */
export async function getCategoryResolved(slug: CategorySlug): Promise<ResolvedCategory | null> {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return null;

  const sb = createAdminClient();
  const { data } = await (sb.from("category_meta") as any)
    .select("display_label_el, icon, is_nav_published")
    .eq("slug", slug)
    .maybeSingle();

  const row: any = data ?? null;
  return {
    ...cat,
    labelEl: row?.display_label_el || cat.labelEl,
    icon:    row?.icon             || cat.icon,
    isNavPublished: row ? row.is_nav_published !== false : true,
  };
}

/** Convenience — only categories admin has marked as nav-published.
 *  Used by the home tiles + category nav. Order is preserved. */
export async function getNavPublishedCategories(): Promise<ResolvedCategory[]> {
  const all = await getCategoriesResolved();
  return all.filter((c) => c.isNavPublished);
}
