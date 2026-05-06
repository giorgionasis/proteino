import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icons";

export interface NutritionFlag {
  icon: IconName;
  label: string;
}

interface NutritionRowProps {
  items: NutritionFlag[];
}

/**
 * Recipe nutrition row — shown under the user reflection on /recipes pages.
 * Lavender-tinted card with up to 3 illustrated icons (vegan / no-milk /
 * sugar-free). Bigger icons + bigger label than the AmenitiesRow.
 */
export function NutritionRow({ items }: NutritionRowProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[12px] px-4 py-6" style={{ backgroundColor: "#F2F2F7" }}>
      <div className="flex items-center justify-around gap-3">
        {items.map((f) => (
          <div key={f.icon} className="flex flex-col items-center gap-3 flex-1">
            <Icon name={f.icon} size={56} />
            <span className="text-[15px] font-semibold text-zinc-800 text-center leading-tight">
              {f.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
