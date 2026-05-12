import type { SupabaseClient } from "@supabase/supabase-js";
import type { TwoStepNode } from "@/components/filters/TwoStepListPicker";

const VENUE_CATEGORIES = new Set(["food", "bars", "hotels", "theater", "events"]);

export interface RegionTree {
  parents: TwoStepNode[];
  /** Map subRegionId → parentRegionId (for filter application). */
  childToParent: Record<string, string>;
  /** Map regionId → all descendant ids (recursive, any depth). When the
   *  user picks a region in the filter, we expand the selection to
   *  include every descendant so 3-level trees (Κρήτη → Ηράκλειο →
   *  Ελούντα) match items tagged at any depth, not just the picked one. */
  descendantsById: Record<string, string[]>;
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
    return { parents: [], childToParent: {}, descendantsById: {} };
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

  // 4. Recursive descendant collection — supports any tree depth. For
  //    each region we resolve every descendant id once; consumers use
  //    this map both for count rollup AND for filter expansion (when
  //    user picks the top-level region, the filter silently includes
  //    every descendant beneath it).
  const descendantsById: Record<string, string[]> = {};
  const collectDescendants = (id: string): string[] => {
    if (descendantsById[id]) return descendantsById[id];
    const direct = childrenByParent.get(id) ?? [];
    const all: string[] = [];
    for (const c of direct) {
      all.push(c.id);
      all.push(...collectDescendants(c.id));
    }
    descendantsById[id] = all;
    return all;
  };
  for (const r of regions) collectDescendants(r.id);

  // 5. Compute "rolled up" count per region: direct items at that node
  //    + items at any descendant.
  const rolledUpCount = (id: string): number => {
    let sum = countsBySubRegion.get(id) ?? 0;
    for (const did of descendantsById[id] ?? []) {
      sum += countsBySubRegion.get(did) ?? 0;
    }
    return sum;
  };

  // 6. Leaf collection — for each top-level region, gather the deepest
  //    descendants (regions with no children of their own). The picker
  //    flattens intermediate prefecture-style levels so users pick the
  //    SPECIFIC neighborhood/place ("Χαλάνδρι", "Κολωνάκι", "Ελούντα")
  //    without having to know which super-region it belongs to. The
  //    intermediate level (Βόρεια Προάστια / Ηράκλειο prefecture) stays
  //    in the regions table so smart search + admin both see the full
  //    hierarchy — the picker is the only surface that flattens.
  //
  //    Edge case: a top-level region with no children at all (e.g. a
  //    bare "Σαντορίνη") becomes its own leaf so it remains pickable.
  const leavesUnder = (rootId: string): { id: string; name: string }[] => {
    const direct = childrenByParent.get(rootId) ?? [];
    if (direct.length === 0) {
      const r = byId.get(rootId);
      return r ? [{ id: r.id, name: r.name }] : [];
    }
    const out: { id: string; name: string }[] = [];
    const queue: string[] = direct.map((c) => c.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      const kids = childrenByParent.get(id) ?? [];
      if (kids.length === 0) {
        const r = byId.get(id);
        if (r) out.push({ id: r.id, name: r.name });
      } else {
        for (const c of kids) queue.push(c.id);
      }
    }
    return out;
  };

  const childToParent: Record<string, string> = {};
  const parents: TwoStepNode[] = [];

  for (const r of regions) {
    if (r.parent_id) continue; // top-level only
    const leaves = leavesUnder(r.id)
      .map((leaf) => ({
        id: leaf.id,
        label: leaf.name,
        count: rolledUpCount(leaf.id),
      }))
      .filter((leaf) => leaf.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, "el"));

    const totalCount = rolledUpCount(r.id);
    if (totalCount === 0) continue;

    for (const leaf of leaves) childToParent[leaf.id] = r.id;

    parents.push({
      id: r.id,
      label: r.name,
      count: totalCount,
      children: leaves,
    });
  }

  // Sort parents by count desc — biggest regions first matches user intuition
  // (Αττική should be near the top, niche regions further down).
  parents.sort((a, b) => b.count - a.count);

  return { parents, childToParent, descendantsById };
}

/**
 * Given a region id (the one stored on `users.region_id`), return the
 * set of region ids that should count as "in this user's area" — the
 * region itself plus every descendant in the tree.
 *
 * Used for soft-sorting venue feeds so a Thessaloniki user sees
 * Thessaloniki items first without filtering Athens out. Empty set
 * when the user has no region set (caller short-circuits the sort).
 *
 * Cheap query — regions is a small table (~hundreds of rows).
 */
export async function getRegionMatchSet(
  sb: SupabaseClient<any>,
  regionId: string | null | undefined,
): Promise<Set<string>> {
  if (!regionId) return new Set();

  const { data: regionsRaw } = await sb
    .from("regions")
    .select("id, parent_id");

  const all: { id: string; parent_id: string | null }[] = (regionsRaw ?? []) as any[];
  const childrenByParent = new Map<string, string[]>();
  for (const r of all) {
    if (!r.parent_id) continue;
    const arr = childrenByParent.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenByParent.set(r.parent_id, arr);
  }

  const out = new Set<string>([regionId]);
  const queue = [regionId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const kids = childrenByParent.get(id) ?? [];
    for (const k of kids) {
      if (!out.has(k)) {
        out.add(k);
        queue.push(k);
      }
    }
  }
  return out;
}
