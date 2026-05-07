import type { SupabaseClient } from "@supabase/supabase-js";
import type { TwoStepNode } from "@/components/filters/TwoStepListPicker";

const VENUE_CATEGORIES = new Set(["food", "bars", "hotels", "theater", "events"]);

export interface RegionTree {
  parents: TwoStepNode[];
  /** Map subRegionId → parentRegionId (for filter application). */
  childToParent: Record<string, string>;
}

/**
 * Build the parent-region → sub-area hierarchy with item counts for the
 * given category, ready to feed into <TwoStepListPicker>.
 *
 * Source of truth: the `regions` table (two-level tree via parent_id) joined
 * with the venue extension table's region_id. Empty branches (no items in
 * this category) are dropped.
 *
 * Returns empty data for non-venue categories.
 */
export async function fetchRegionTreeForCategory(
  sb: SupabaseClient<any>,
  category: string,
): Promise<RegionTree> {
  if (!VENUE_CATEGORIES.has(category)) {
    return { parents: [], childToParent: {} };
  }

  // 1. All regions (small table, ~hundreds of rows) — get the full tree once.
  const { data: regionsRaw } = await sb
    .from("regions")
    .select("id, name, parent_id, display_order")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const regions: { id: string; name: string; parent_id: string | null }[] = (regionsRaw ?? []) as any[];
  const byId = new Map<string, { id: string; name: string; parent_id: string | null }>(
    regions.map((r) => [r.id, r]),
  );

  // 2. Item region_ids from the extension table for this category.
  const extTable = `item_${category}`;
  const { data: extRows } = await (sb.from(extTable) as any)
    .select("region_id, item_id, items!inner(is_published)");

  // Count by direct region_id. We DON'T roll up children into parents at this
  // step — we'll do that explicitly when building the tree below.
  const countsBySubRegion = new Map<string, number>();
  for (const r of (extRows ?? []) as any[]) {
    if (!r.region_id) continue;
    if (r.items?.is_published === false) continue;
    countsBySubRegion.set(r.region_id, (countsBySubRegion.get(r.region_id) ?? 0) + 1);
  }

  // 3. Build the hierarchy. Regions with parent_id = null are top-level.
  const childrenByParent = new Map<string, { id: string; name: string }[]>();
  for (const r of regions) {
    if (r.parent_id) {
      const list = childrenByParent.get(r.parent_id) ?? [];
      list.push({ id: r.id, name: r.name });
      childrenByParent.set(r.parent_id, list);
    }
  }

  const childToParent: Record<string, string> = {};
  const parents: TwoStepNode[] = [];

  for (const r of regions) {
    if (r.parent_id) continue; // skip non-top-level
    const childRegions = childrenByParent.get(r.id) ?? [];

    // Per-child count is direct items in that sub-area. Parent count is the
    // sum of all children's counts (i.e. all items in that wider region).
    const children = childRegions
      .map((c) => ({
        id: c.id,
        label: c.name,
        count: countsBySubRegion.get(c.id) ?? 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, "el"));

    // Some items might be tagged directly to a parent region (no specific
    // sub-area). Include those in the parent count too.
    const directParentCount = countsBySubRegion.get(r.id) ?? 0;
    const totalCount = children.reduce((sum, c) => sum + c.count, 0) + directParentCount;

    if (totalCount === 0) continue;

    for (const c of children) childToParent[c.id] = r.id;

    parents.push({
      id: r.id,
      label: r.name,
      count: totalCount,
      children,
    });
  }

  // Sort parents by count desc — biggest regions first matches user intuition
  // (Αττική should be near the top, niche regions further down).
  parents.sort((a, b) => b.count - a.count);

  return { parents, childToParent };
}
