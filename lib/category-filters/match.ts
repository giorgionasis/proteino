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
      return ciIncludes(item.writer, v);

    case "publisher":
      return ciIncludes(item.publisher, v);

    case "director":
      return ciIncludes(item.director, v);

    case "actor":
    case "performer":
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
      // Awards picker is grouped + complex — current behaviour is
      // "selection is irrelevant to filtering, just shows the option
      // in the UI". Preserved from the original implementation.
      if (arr.length > 0) return true;
      return true;

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
