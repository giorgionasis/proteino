import { FiltersManager, type FilterRow, type SettingsRow } from "@/components/admin/FiltersManager";
import { CATEGORIES } from "@/constants/categories";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAdminUserMap, type AdminUserMap } from "@/lib/admin/audit";
import { runExplorerQuery } from "@/lib/admin/explorer-query";
import type { CategorySlug } from "@/types";
import type {
  ExplorerInitial,
  ExplorerSubcategoryRow,
  ExplorerRegionRow,
} from "@/components/admin/CombinatorialExplorer";

export const dynamic = "force-dynamic";

const DEFAULT_TAB = CATEGORIES[0].slug;
const VENUE_CATEGORIES = new Set(["food", "bars", "hotels", "theater", "events"]);

export default async function FiltersPage() {
  const sb = createAdminClient();

  const [filtersRes, settingsRes, subcatsRes, regionsRes] = await Promise.all([
    sb.from("category_filters").select("*").eq("category", DEFAULT_TAB).order("display_order"),
    sb.from("category_filter_settings").select("*").eq("category", DEFAULT_TAB),
    sb.from("subcategories").select("id, category, name").order("category").order("display_order"),
    // Skip regions when the default tab isn't a venue — keeps the
    // initial request leaner and matches the Explorer's own contract.
    VENUE_CATEGORIES.has(DEFAULT_TAB)
      ? sb.from("regions").select("id, name, parent_id")
      : Promise.resolve({ data: [] as ExplorerRegionRow[], error: null }),
  ]);

  const filters = (filtersRes.data ?? []) as FilterRow[];
  const userMap: AdminUserMap = await resolveAdminUserMap(sb, filters as Array<{ modified_by?: string | null }>);
  const settings = ((settingsRes.data ?? []) as SettingsRow[])[0] ?? null;

  const subcategoriesForDefault = ((subcatsRes.data ?? []) as ExplorerSubcategoryRow[])
    .filter((s) => s.category === DEFAULT_TAB);
  const topLevelRegions = ((regionsRes.data ?? []) as ExplorerRegionRow[])
    .filter((r) => !r.parent_id);

  // Pre-run the empty-selection Explorer query so the count card and
  // sample grid land populated on first paint. Fails soft — any error
  // just drops back to the client-side debounced query on mount.
  let initialResult: ExplorerInitial["result"] | undefined;
  try {
    initialResult = await runExplorerQuery(sb, {
      category:    DEFAULT_TAB as CategorySlug,
      filters:     {},
      adminFacets: {},
      minRating:   null,
    });
  } catch {
    initialResult = undefined;
  }

  const initialExplorer: ExplorerInitial = {
    category:       DEFAULT_TAB,
    filters:        filters.filter((f) => f.is_published),
    subcategories:  subcategoriesForDefault,
    topLevelRegions,
    result:         initialResult,
  };

  return (
    <FiltersManager
      initialCategory={DEFAULT_TAB}
      initialFilters={filters}
      initialUserMap={userMap}
      initialSettings={settings}
      initialExplorer={initialExplorer}
    />
  );
}
