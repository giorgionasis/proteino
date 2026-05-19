/**
 * Layout system — shared types.
 *
 * The layout system lets admins reorder, add, and remove sections of
 * the home page and category pages from /admin/layout, instead of every
 * section being hardcoded in JSX.
 *
 * Three layers:
 *
 *   1. DB   — page_sections rows (one per visible section per audience)
 *   2. lib  — resolver fetches rows, hydrates collections, returns an
 *             ordered RenderedSection[] for the requested page
 *   3. UI   — each page shell (CategoryPageShell, HomePage) maps the
 *             array to JSX via a per-page widget→component bridge that
 *             closes over local shell state (activeTab, filterValues …)
 *
 * The registry (lib/layout/widgets.ts) holds METADATA only — labels,
 * compatibility, configSchema for admin forms. Render functions live in
 * each page shell because they need React component imports + closure
 * over shell-local state. Keeping the registry render-free means the
 * admin UI can import it without dragging in client components.
 */

import type { CategorySlug } from "@/types";
import type { HydratedItem } from "@/lib/collections";

/* ─── DB literals (match migration 032 CHECK constraints) ───────────── */

export type LayoutContext  = "home" | "category" | "suggestions";
export type LayoutAudience = "all" | "registered" | "guest";
export type SectionType    = "collection" | "widget" | "divider";

/* ─── DB row shape ──────────────────────────────────────────────────── */

export interface PageSectionRow {
  id: string;
  section_type: SectionType;
  collection_id: string | null;
  widget_key: string | null;
  context: LayoutContext;
  /** NULL for home; required for category. */
  category: string | null;
  display_order: number;
  audience: LayoutAudience;
  config: Record<string, unknown>;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  modified_at: string;
  /** Audit stamp from migration 040. Null when never edited since the
   *  migration was applied, or when the column hasn't been added yet. */
  modified_by?: string | null;
}

/* ─── Resolver output ───────────────────────────────────────────────── */
/*  RenderedSection is what the page shell iterates over to produce JSX.
 *  Discriminated union by `kind` so the consumer doesn't have to recheck
 *  section_type + the corresponding ref every time.                    */

export type RenderedSection =
  | { kind: "collection"; row: PageSectionRow; collection: ResolvedCollection; items: HydratedItem[] }
  | {
      kind: "widget";
      row: PageSectionRow;
      widgetKey: string;
      config: Record<string, unknown>;
      /**
       * Pre-hydrated items, populated by the resolver when the widget has
       * a manual item source (e.g. `static_carousel` with `config.itemIds`).
       * When absent the bridge falls back to slicing from page-level buckets
       * via `config.source` / `config.offset` / `config.limit`.
       */
      items?: HydratedItem[];
    }
  | { kind: "divider";    row: PageSectionRow; config: Record<string, unknown> };

export interface ResolvedCollection {
  id: string;
  type: "card" | "carousel";
  title: string;
  title_specific: string | null;
  alias: string;
  image_url: string | null;
  source_category: string | null;
  tags: string[];
  filters: { field: string; value: string }[];
  item_limit: number;
}

/* ─── Widget registry — metadata only ───────────────────────────────── */

/** A field rendered in the admin widget-config form. */
export type ConfigField =
  | { kind: "text";     key: string; label: string; placeholder?: string; required?: boolean }
  | { kind: "textarea"; key: string; label: string; rows?: number; placeholder?: string }
  | { kind: "number";   key: string; label: string; min?: number; max?: number; defaultValue?: number }
  | { kind: "toggle";   key: string; label: string; defaultValue?: boolean }
  | { kind: "select";   key: string; label: string; options: { value: string; label: string }[]; defaultValue?: string }
  | { kind: "category"; key: string; label: string; defaultValue?: CategorySlug }
  /** Manual item picker — admin searches by title + picks a specific
   *  ordered set of items. Stored as a string[] of item UUIDs in config.
   *  When non-empty, overrides the widget's auto source (e.g. on
   *  `static_carousel`, item IDs win over `source` / `offset` / `limit`).
   *  The accompanying admin UI lives in `SectionConfigDrawer`. */
  | { kind: "item-source"; key: string; label: string; description?: string };

export interface WidgetSpec {
  /** Stable DB key. Never change once a row references it. */
  key: string;
  /** Greek admin label, shown in the section list + picker. */
  label: string;
  /** One-line admin description in the picker modal. */
  description?: string;
  /** Emoji or short symbol shown in the section row icon. */
  icon?: string;
  /** Which page contexts this widget can be placed in. */
  contexts: LayoutContext[];
  /** When set on a category-context widget, restricts to these category
   *  slugs. Unset = compatible with every category. */
  categories?: CategorySlug[];
  /** Per-audience compatibility. Unset = compatible with all. */
  audiences?: LayoutAudience[];
  /** If true, admin can reorder but not delete. Used for structural
   *  chrome the page can't render without (filter_row, items_list). */
  fixed?: boolean;
  /** If true, this widget can only appear once per (context, category,
   *  audience) bucket. Enforced application-side on POST. */
  singleton?: boolean;
  /** Optional admin config form schema. When absent or empty, the
   *  section editor shows just identity + active toggle. */
  configSchema?: ConfigField[];
}

/* ─── Shell contexts — what each page hands to its widget bridge ────── */
/*  These are the closure props each widget render fn receives. Page
 *  shells declare their own shape; the registry is render-agnostic.
 *  Shapes live here so the resolver + the bridge stay in sync.          */

export interface CategoryShellContext {
  category: CategorySlug;
  items: unknown[];          // CategoryItem[] — kept opaque here to avoid the components/category import cycle
  filteredItems: unknown[];
  totalCount: number;
  displayCount: number;
  hasActiveFilters: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: string[];
  filterValues: Record<string, string | string[]>;
  setFilterValues: (v: Record<string, string | string[]>) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  showMap: boolean;
  setShowMap: (open: boolean) => void;
  visibleCount: number;
  setVisibleCount: (n: number | ((c: number) => number)) => void;
  activeFilterCount: number;
  activeFiltersForMap: { id: string; label: string }[];
  onRemoveFilter: (chipId: string) => void;
  /** Server-supplied data needed by various widgets. */
  topUser: unknown;
  contributors: unknown[];
  tonightAirings: unknown[];
  filterConfig: unknown;
  regionTree: unknown;
  regionDescendants: unknown;
  awardsGroups: unknown;
  filterData: unknown;
}

export interface HomeShellContext {
  isRegistered: boolean;
  displayName: string;
  viewerRegionId: string | null;
  food: unknown[];
  movies: unknown[];
  series: unknown[];
  books: unknown[];
  recipes: unknown[];
  topUsers: unknown[];
  chips: unknown[];
  feedItems: unknown[];
  tonight: unknown[];
}
