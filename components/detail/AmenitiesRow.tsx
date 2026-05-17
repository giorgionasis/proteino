import { ICON_PATHS, type IconName } from "@/lib/icons";

export interface AmenityItem {
  /** Stable key for React. Usually the amenity slug. */
  key: string;
  /** Icon registry name (e.g. "amenity-hotel"). */
  icon: IconName;
  /** Bottom label (typically 1–2 words). */
  label: string;
  /** Optional content rendered ABOVE the icon (e.g. "★★★" star rating for hotel). */
  secondary?: React.ReactNode;
}

interface AmenitiesRowProps {
  items: AmenityItem[];
  /** Visual height of each icon (px). Width is auto so icons with
   *  different viewBox aspect ratios stay visually aligned at the
   *  same height — fixes the issue where a 32×32 icon looks bigger
   *  than a 45×40 one when both are forced into a 44×44 square. */
  iconSize?: number;
}

/**
 * Hotel-style amenities row. Tight 4-column grid when up to 4 items;
 * horizontal scroll when more. Each cell is icon + label, with optional
 * secondary line above the icon (used for the ★★★ "Ξενοδοχείο" pattern).
 *
 * Icons render with a fixed HEIGHT, width auto (height-pinned approach).
 * This means a mix of square icons (32×32) and wider icons (45×40) all
 * share the same visual height in the row — visually consistent baseline.
 * Using a plain <img> with explicit CSS height instead of the <Icon>
 * primitive gives us this control (Icon sets explicit pixel width too).
 *
 * No background — sits flush on the page bg. Use NutritionRow for the
 * lavender-card nutrition variant.
 */
export function AmenitiesRow({ items, iconSize = 44 }: AmenitiesRowProps) {
  if (items.length === 0) return null;
  const isOverflow = items.length > 4;
  return (
    <div
      className={
        isOverflow
          ? "flex gap-6 overflow-x-auto no-scrollbar pb-1"
          : "grid grid-cols-4 gap-3 pb-1"
      }
    >
      {items.map((it) => (
        <div key={it.key} className="flex-none flex flex-col items-center gap-2 w-[78px]">
          {it.secondary && (
            <div className="text-[14px] font-semibold text-zinc-800 leading-none mb-0.5">
              {it.secondary}
            </div>
          )}
          <div className="flex items-center justify-center" style={{ height: iconSize }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ICON_PATHS[it.icon]}
              alt=""
              style={{ height: iconSize, width: "auto" }}
              draggable={false}
              aria-hidden
            />
          </div>
          <span className="text-[13px] font-semibold text-zinc-800 text-center leading-tight">
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
