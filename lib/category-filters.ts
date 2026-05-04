/**
 * Category filters — DB-driven configuration.
 *
 * Replaces the old `constants/filters.ts` source-of-truth. Admin manages
 * which filters appear, in what order, as chips vs in the bottom sheet.
 *
 * Frontend (CategoryPageShell) reads via `fetchCategoryFilterConfig`.
 */

import type {
  CategoryFilters,
  FilterDefinition,
  QuickFilterDef,
  FilterWidgetType,
} from "@/constants/filters";

type SupabaseLike = { from: (table: string) => any };

const DEFAULT_SORT = ["Πιο Πρόσφατα", "Δημοφιλή", "Βαθμολογία"];

interface CategoryFilterRow {
  id: string;
  filter_id: string;
  label: string;
  widget: string;
  placeholder: string | null;
  options: { id: string; label: string }[];
  is_quick: boolean;
  display_order: number;
  is_published: boolean;
}

interface CategorySettingsRow {
  category: string;
  has_nearby: boolean;
  sort_options: string[];
}

/**
 * Fetch the active filter config for a category from DB.
 *
 * Returns `null` if no rows are found — caller should fall back to
 * the constant (avoids breaking the page during migration).
 */
export async function fetchCategoryFilterConfig(
  sb: SupabaseLike,
  category: string
): Promise<CategoryFilters | null> {
  const [filtersRes, settingsRes] = await Promise.all([
    sb
      .from("category_filters")
      .select("*")
      .eq("category", category)
      .eq("is_published", true)
      .order("display_order"),
    sb
      .from("category_filter_settings")
      .select("*")
      .eq("category", category)
      .maybeSingle(),
  ]);

  const filters = (filtersRes.data ?? []) as CategoryFilterRow[];
  const settings = settingsRes.data as CategorySettingsRow | null;

  if (filters.length === 0 && !settings) return null;

  const quickFilters: QuickFilterDef[] = filters
    .filter((f) => f.is_quick)
    .map((f) => ({ id: f.filter_id, label: f.label }));

  const bottomSheet: FilterDefinition[] = filters.map((f) => ({
    id: f.filter_id,
    label: f.label,
    widget: f.widget as FilterWidgetType,
    placeholder: f.placeholder ?? undefined,
    options: Array.isArray(f.options) && f.options.length > 0 ? f.options : undefined,
  }));

  return {
    quickFilters,
    hasNearby: settings?.has_nearby ?? false,
    bottomSheet,
    sortOptions: Array.isArray(settings?.sort_options) && settings.sort_options.length > 0
      ? settings.sort_options
      : DEFAULT_SORT,
  };
}
