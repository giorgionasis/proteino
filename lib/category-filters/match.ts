import type { CategoryItem } from "@/components/category/CategoryCard";
import type { CategorySlug } from "@/types";

/**
 * Pure filter-application logic shared between the public category
 * pages and the admin Explorer.
 *
 * Each filter_id branch maps to a column on `CategoryItem` (which is
 * itself denormalised from items + the category-specific extension
 * table at fetch time — see `app/(main)/[category]/page.tsx:mapItem`).
 * Keep this file in sync with the columns that `mapItem` produces;
 * adding a new filter on the user-facing surface usually means adding
 * a case here AND a column to `CategoryItem`.
 *
 * Empty value (""/[]) → match-everything by convention. Same for
 * "all" string, which is how some legacy single-select filters
 * encode "no preference".
 */

export function ciEq(a: string | undefined, b: string): boolean {
  if (!a) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function ciIncludes(a: string | undefined, b: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase());
}

export function matchesFilter(
  item: CategoryItem,
  filterId: string,
  value: string | string[],
  category: CategorySlug,
  regionDescendants?: Record<string, string[]>,
): boolean {
  const v = typeof value === "string" ? value : "";
  const arr = Array.isArray(value) ? value : [];

  if (typeof value === "string" && (value === "" || value === "all")) return true;
  if (Array.isArray(value) && value.length === 0) return true;

  switch (filterId) {
    case "genre":
    case "event_type":
      if (arr.length > 0) return arr.some((x) => ciEq(item.subcategory, x));
      return ciEq(item.subcategory, v);

    case "cuisine":
      if (category === "food") {
        if (arr.length > 0) return arr.some((x) => ciEq(item.cuisine, x));
        return ciEq(item.cuisine, v);
      }
      if (arr.length > 0) return arr.some((x) => ciEq(item.subcategory, x));
      return ciEq(item.subcategory, v);

    case "type":
      if (category === "food") {
        if (arr.length > 0) return arr.some((x) => ciEq(item.foodType, x));
        return ciEq(item.foodType, v);
      }
      if (arr.length > 0) return arr.some((x) => ciEq(item.subcategory, x));
      return ciEq(item.subcategory, v);

    case "writer":
      // String[] = OR semantics — match if writer contains any of the selected names.
      if (arr.length > 0) return arr.some((x) => ciIncludes(item.writer, x));
      return ciIncludes(item.writer, v);

    case "publisher":
      if (arr.length > 0) return arr.some((x) => ciIncludes(item.publisher, x));
      return ciIncludes(item.publisher, v);

    case "director":
      if (arr.length > 0) return arr.some((x) => ciIncludes(item.director, x));
      return ciIncludes(item.director, v);

    case "actor":
    case "performer":
      if (arr.length > 0) return arr.some((x) => ciIncludes(item.actors, x));
      return ciIncludes(item.actors, v);

    case "region":
      if (arr.length > 0) {
        if (!item.regionId) return false;
        if (regionDescendants) {
          const itemRegionId = item.regionId;
          for (const selectedId of arr) {
            if (selectedId === itemRegionId) return true;
            const descendants: string[] | undefined = regionDescendants[selectedId];
            if (descendants && descendants.includes(itemRegionId)) return true;
          }
          return false;
        }
        return arr.includes(item.regionId);
      }
      return ciEq(item.area, v);

    case "awards":
      // `item_*.awards` jsonb is admin-entered free-form (see
      // lib/awards.ts header comment) — there's no reliable way to
      // match against specific entries in the AWARDS_TAXONOMY. The
      // pragmatic compromise: when nothing is selected, pass
      // everything; when anything is selected, filter to items that
      // have *some* award on record. Better than the original
      // always-pass while the jsonb is still unstandardized.
      if (arr.length === 0) return true;
      return !!item.hasAwards;

    case "characteristics": {
      // Series-only segmented filter — completed / single_season /
      // true_story. AND semantics: every checked trait must apply.
      if (arr.length === 0) return true;
      return arr.every((trait) => {
        if (trait === "completed") return !!item.endDate;
        if (trait === "single_season") return item.seasons === 1;
        if (trait === "true_story") {
          return item.tags?.some((t) => /αληθιν|true.?story/i.test(t)) ?? false;
        }
        return true;
      });
    }

    case "origin":
      if (arr.length > 0) return arr.some((x) => ciEq(item.origin, x));
      return ciEq(item.origin, v);

    case "diet": {
      // Recipes — AND semantics: vegan + no_milk → must be both.
      if (arr.length === 0) return true;
      if (!item.diet || item.diet.length === 0) return false;
      return arr.every((d) => item.diet!.includes(d));
    }

    case "when": {
      // Theater + events — relative-window segmented filter.
      const sel = v && v !== "" ? v : arr[0];
      if (!sel || sel === "all") return true;
      if (!item.dates || item.dates.length === 0) return false;
      const now = new Date();
      const horizonDays = sel === "this_week" ? 7 : sel === "this_month" ? 30 : null;
      if (horizonDays == null) return true;
      const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
      return item.dates.some((d) => {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return false;
        return dt >= now && dt <= horizon;
      });
    }

    case "price":
      if (arr.length > 0) return arr.some((p) => ciEq(item.priceRange, p));
      return ciEq(item.priceRange, v);

    case "platform":
      if (arr.length > 0) return arr.some((p) => ciIncludes(item.channel, p));
      return ciIncludes(item.channel, v);

    case "delivery":
      if (arr.length > 0) return arr.some((d) => item.delivery?.some((dd) => ciEq(dd, d)) ?? false);
      return item.delivery?.some((d) => ciEq(d, v)) ?? false;

    case "duration":
      if (v === "all" || !item.duration_min) return true;
      if (v === "90") return item.duration_min <= 90;
      if (v === "120") return item.duration_min > 90 && item.duration_min <= 120;
      if (v === "150") return item.duration_min > 120;
      return true;

    case "level": {
      if (arr.length === 0) return true;
      const levelMap: Record<string, string[]> = {
        easy: ["εύκολη", "πολύ εύκολη"],
        medium: ["μέτρια"],
        hard: ["δύσκολη"],
      };
      return arr.some((l) => {
        const mapped = levelMap[l];
        if (mapped) return mapped.some((m) => ciEq(item.level, m));
        return ciIncludes(item.level, l);
      });
    }

    case "property_type": {
      if (arr.length === 0) return true;
      const typeMap: Record<string, string[]> = {
        hotel: ["ξενοδοχείο"],
        apartment: ["διαμερίσματα", "διαμέρισμα"],
        rooms: ["ενοικιαζόμενα δωμάτια", "δωμάτια", "σουίτες"],
        villa: ["βίλες", "βίλα", "εξοχική κατοικία"],
      };
      return arr.some((t) => {
        const mapped = typeMap[t] ?? [t];
        return mapped.some((m) => ciIncludes(item.hotelType, m));
      });
    }

    default:
      return true;
  }
}
