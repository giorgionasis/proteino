import type { CategorySlug } from "@/types";

/**
 * Vibe pattern catalog — promoted from admin-only Explorer facets to
 * public category-page filters.
 *
 * Each option maps to an array of regex patterns (case-insensitive)
 * tested against `metadata.tags` on the item. OR semantics across the
 * patterns within an option; OR semantics across selected options
 * (user picks "rooftop OR jazz" → matches any item tagged with
 * either). This mirrors the admin tag-pattern facet semantics so
 * Explorer counts and public-page filter counts stay aligned.
 *
 * Add a new vibe by:
 *   1. Pick an option_id (lowercase, underscore-separated)
 *   2. Add `{ id, label, patterns }` entry under the category
 *   3. Update the seed SQL (`043-public-vibes-filters.sql`) to add
 *      the option to the `options` jsonb of the category's `vibes`
 *      category_filters row
 *   4. Or admin can add the option via /admin/content/filters → Edit
 *      options on the vibes row. Patterns are static (lookup here);
 *      the option label/id is editable in the row.
 *
 * `MOVIE_*` / `BARS_*` arrays in admin-facets.ts are the source of
 * truth for the regex patterns themselves — copied here so the public
 * side doesn't import the admin-only module. Keep in sync if patterns
 * are tweaked.
 */
export const VIBE_PATTERNS: Record<CategorySlug, Record<string, string[]>> = {
  movies: {},
  series: {},
  books: {},
  recipes: {},
  food: {
    vegan_friendly: ["vegan", "βίγκαν", "vegetarian", "χορτοφαγ"],
    family:         ["οικογενει", "family"],
    romantic:       ["ρομαντικ", "romantic", "date.?night"],
    brunch:         ["brunch"],
    view:           ["θέα", "view"],
    terrace:        ["βεράντ", "terrace", "patio", "κήπο"],
  },
  bars: {
    rooftop:        ["rooftop", "ταράτσ"],
    cocktail:       ["cocktail"],
    wine:           ["wine", "κρασ"],
    jazz:           ["jazz"],
    live_music:     ["live.?music", "ζωντανή.?μουσική", "live\\b"],
    late_night:     ["late.?night", "νυχτεριν"],
    pet_friendly:   ["pet.?friendly", "κατοικίδιο", "σκύλο"],
  },
  hotels: {
    pet_friendly:   ["pet.?friendly", "κατοικίδιο"],
    family:         ["οικογενει", "family"],
    romantic:       ["ρομαντικ", "romantic", "honeymoon", "γαμήλι"],
    beachfront:     ["beachfront", "παραλία", "θαλάσσ"],
    boutique:       ["boutique"],
    eco:            ["eco", "οικολογικ", "sustainable"],
  },
  theater: {},
  events: {},
};

/** Test an item's tags against the patterns for a single option in a
 *  category's vibe set. Returns true on any pattern hit (OR semantics).
 *  Used by lib/category-filters/match.ts:matchesFilter case "vibes". */
export function tagsMatchVibeOption(tags: string[] | undefined, category: CategorySlug, optionId: string): boolean {
  if (!tags || tags.length === 0) return false;
  const patterns = VIBE_PATTERNS[category]?.[optionId];
  if (!patterns) return false;
  const lower = tags.map((t) => t.toLowerCase());
  return patterns.some((p) => {
    try {
      const rx = new RegExp(p, "i");
      return lower.some((t) => rx.test(t));
    } catch {
      return lower.some((t) => t.includes(p.toLowerCase()));
    }
  });
}
