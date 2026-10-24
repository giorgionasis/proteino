import type { SupabaseClient } from "@supabase/supabase-js";
import { getTitleIndex } from "@/lib/search/fuzzy";
import { foldGreek } from "@/lib/search/title-match";

/**
 * Find the item a new suggestion is about, so it attaches to the existing
 * page instead of creating a duplicate.
 *
 * Exact slug alone missed 758 of 1,894 items: migrated K2 slugs
 * transliterate differently ("ου" → ou, "χ" → x; the app writes oy / ch),
 * and TMDB/Places titles vary in accents and punctuation. So after the
 * slug we compare accent-folded, punctuation-free titles (title and
 * original title, both sides) within the category.
 *
 * Shared by /api/suggestions (publish) and /api/suggestions/check (the
 * pre-publish duplicate screen) — they must agree.
 */
export interface ExistingItem {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

export function normalizeTitle(s: string | null | undefined): string {
  return foldGreek(String(s ?? ""))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function findExistingItem(
  admin: SupabaseClient<any, any, any>,
  category: string,
  fullSlug: string,
  titles: Array<string | null | undefined>,
): Promise<ExistingItem | null> {
  // Recipes are CREATED data (CLAUDE.md decisions): two members can each
  // post their own «Τηγανίτες». Never attach to someone else's recipe —
  // publish gives the new one a suffixed slug.
  if (category === "recipes") return null;

  const { data: bySlug } = await (admin.from("items") as any)
    .select("id, slug, title, is_published")
    .eq("slug", fullSlug)
    .maybeSingle();
  if (bySlug) return bySlug as ExistingItem;

  const wanted = new Set(titles.map(normalizeTitle).filter((t) => t.length >= 2));
  if (wanted.size === 0) return null;

  const index = await getTitleIndex();
  for (const { item } of index) {
    if (item.category !== category) continue;
    if (wanted.has(normalizeTitle(item.title)) || (item.original_title && wanted.has(normalizeTitle(item.original_title)))) {
      return { id: item.id, slug: item.slug, title: item.title, is_published: true };
    }
  }
  return null;
}
