"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { SubCategoryTabs } from "./SubCategoryTabs";
import { FilterRow } from "./FilterRow";
import { FilterBottomSheet, type FilterValues } from "./FilterBottomSheet";
import { CategoryCard, isPortraitCategory, type CategoryItem } from "./CategoryCard";
import { CategoryHeroStats } from "./CategoryHeroStats";
import { CategoryTopUsers, type ContributorUser, type TopUser } from "./CategoryTopUsers";
import { CategorySuggestBox } from "./CategorySuggestBox";
import { CarouselLandscape, type LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import { CATEGORY_FILTERS, type CategoryFilters } from "@/constants/filters";
import type { FilterData } from "@/app/(main)/[category]/page";
import type { CategorySlug } from "@/types";
import { cn } from "@/lib/utils/cn";

const CategoryMapView = dynamic(
  () => import("./CategoryMapView").then((m) => m.CategoryMapView),
  { ssr: false, loading: () => <div className="flex-1 bg-zinc-100 animate-pulse" /> },
);

/* ── helpers ─────────────────────────────────────────────── */

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return n.toString();
}

const CATEGORY_LABELS: Record<CategorySlug, string> = {
  movies:  "Ταινίες",
  series:  "Σειρές",
  books:   "Βιβλία",
  food:    "Φαγητό",
  recipes: "Συνταγές",
  bars:    "Μπαρ & Καφέ",
  hotels:  "Ξενοδοχεία",
  theater: "Θέατρο",
  events:  "Εκδηλώσεις",
};

const HAS_MAP: CategorySlug[] = ["food", "bars", "hotels", "theater", "events"];
const HAS_HERO_STATS: CategorySlug[] = ["food", "bars", "hotels", "theater", "events"];

const SECTION_TITLES: Record<CategorySlug, [string, string]> = {
  food:    ["Δημοφιλή Μαγαζιά",          "Κορυφαίες Επιλογές"],
  bars:    ["Δημοφιλή Μπαρ & Καφέ",      "Κορυφαίες Επιλογές"],
  hotels:  ["Κορυφαία Ξενοδοχεία",        "Νέες Προσθήκες"],
  movies:  ["Βραβευμένες Ταινίες",        "Δημοφιλείς Επιλογές"],
  series:  ["Δημοφιλείς Σειρές",          "Must Watch"],
  books:   ["Βιβλία 2026",                "Για Λάτρεις της Λογοτεχνίας"],
  recipes: ["Εύκολες Συνταγές",           "Δημοφιλή Πιάτα"],
  theater: ["Τρέχουσες Παραστάσεις",      "Κορυφαίες Επιλογές"],
  events:  ["Επερχόμενες Εκδηλώσεις",    "Κορυφαίες Επιλογές"],
};

function getListClass(_category: CategorySlug): string {
  // Single-column list across all categories. Portrait items render via
  // RowCard (poster left + info right); landscape items via LandscapeCard
  // at full width. Decision: session 14 — UI consistency.
  return "flex flex-col gap-5 px-4 pt-2";
}

function itemToLandscape(item: CategoryItem, category: CategorySlug): LandscapeItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subcategory,
    location: item.area,
    avg_rating: item.avg_rating,
    rating_count: item.rating_count,
    cover_url: item.cover_url,
    is_top_rated: item.avg_rating >= 4.5 && item.rating_count >= 5,
    href: `/${category}/${item.slug ?? item.id}`,
  };
}

/* ── Filtering logic ─────────────────────────────────────── */

function ciEq(a: string | undefined, b: string): boolean {
  if (!a) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function ciIncludes(a: string | undefined, b: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase());
}

function matchesFilter(
  item: CategoryItem,
  filterId: string,
  value: string | string[],
  category: CategorySlug,
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
      if (arr.length > 0) return item.regionId ? arr.includes(item.regionId) : false;
      return ciEq(item.area, v);

    case "awards":
      // Awards picker selections live as string[] of award category IDs
      // (e.g. "oscar-best-picture"). Storage on item_movies.awards is not
      // standardized yet, so this filter is a no-op for now — selections
      // persist in the picker but don't filter the list. Wire when awards
      // jsonb shape is normalized.
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

/* ── Main shell ─────────────────────────────────────────── */

interface CategoryPageShellProps {
  category: CategorySlug;
  items: CategoryItem[];
  totalCount: number;
  topUser: TopUser | null;
  contributors: ContributorUser[];
  filterData: FilterData;
  /** DB-driven filter config; falls back to constant when undefined. */
  filterConfig?: CategoryFilters;
  /** Region hierarchy with item counts (food/bars/hotels/events). */
  regionTree?: import("@/components/filters/TwoStepListPicker").TwoStepNode[];
  /** Map of sub-region id → parent region id, used by region filter app. */
  regionChildToParent?: Record<string, string>;
  /** Awards taxonomy with counts (movies/series). */
  awardsGroups?: import("@/components/filters/GroupedCheckboxList").GroupedListGroup[];
}

export function CategoryPageShell({
  category,
  items,
  totalCount,
  topUser,
  contributors,
  filterData,
  filterConfig: filterConfigProp,
  regionTree,
  regionChildToParent,
  awardsGroups,
}: CategoryPageShellProps) {
  const router = useRouter();
  const [activeTab, setActiveTab]       = useState("Όλα");
  const [showMap, setShowMap]           = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => { setVisibleCount(10); }, [activeTab, filterValues]);

  const tabs         = filterData.tabs;
  const filterConfig = filterConfigProp ?? CATEGORY_FILTERS[category];
  const hasMap       = HAS_MAP.includes(category);
  const hasHeroStats = HAS_HERO_STATS.includes(category);

  const activeFilterCount = Object.values(filterValues).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v && v !== "all"
  ).length;

  const listItems = items;

  const filteredItems = useMemo(() => {
    let result = listItems;

    if (activeTab !== "Όλα") {
      result = result.filter((it) => ciEq(it.subcategory, activeTab));
    }

    for (const [filterId, value] of Object.entries(filterValues)) {
      if (!value || (Array.isArray(value) && value.length === 0) || value === "all" || value === "") continue;
      result = result.filter((it) => matchesFilter(it, filterId, value, category));
    }

    return result;
  }, [listItems, activeTab, filterValues, category]);

  const filteredCount = filteredItems.length;
  const hasActiveFilters = activeTab !== "Όλα" || activeFilterCount > 0;
  const displayCount = hasActiveFilters ? filteredCount : totalCount;

  const computeCount = useCallback((vals: FilterValues): number => {
    let result = listItems;
    if (activeTab !== "Όλα") {
      result = result.filter((it) => ciEq(it.subcategory, activeTab));
    }
    for (const [filterId, value] of Object.entries(vals)) {
      if (!value || (Array.isArray(value) && value.length === 0) || value === "all" || value === "") continue;
      result = result.filter((it) => matchesFilter(it, filterId, value, category));
    }
    return result.length;
  }, [listItems, activeTab, category]);

  // Build a lookup table from sub-region UUID → human label, so the
  // active-filter chips don't show raw UUIDs ("e428a25e-c0ef-…") for
  // region selections.
  const regionLabelById = (() => {
    const m = new Map<string, string>();
    if (regionTree) {
      for (const p of regionTree) {
        for (const c of p.children) m.set(c.id, c.label);
        m.set(p.id, p.label);
      }
    }
    return m;
  })();
  const awardLabelById = (() => {
    const m = new Map<string, string>();
    if (awardsGroups) {
      for (const g of awardsGroups) {
        for (const it of g.items) m.set(it.id, `${g.label} · ${it.label}`);
      }
    }
    return m;
  })();

  function chipLabelFor(filterId: string, value: string): string {
    if (filterId === "region") return regionLabelById.get(value) ?? value;
    if (filterId === "awards") return awardLabelById.get(value) ?? value;
    return value;
  }

  // Build active-filter chips. For region: when ALL children of a parent
  // are selected, collapse them into a single parent-name chip
  // (`regionParent:<parentId>`); otherwise keep individual sub-area chips.
  // Region chips ALWAYS come first in the output so they're the leftmost
  // in the map's bottom carousel — when the user taps 'Search this area'
  // they see the leftmost chips disappear (clear visual proof of the
  // action removing region filters specifically).
  const activeFiltersForMap = Object.entries(filterValues)
    .sort(([a], [b]) => (a === "region" ? -1 : b === "region" ? 1 : 0))
    .flatMap(([key, val]) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        if (key === "region" && regionTree) {
          const selected = new Set(val);
          const out: { id: string; label: string }[] = [];
          const consumed = new Set<string>();
          for (const p of regionTree) {
            const childIds = p.children.map((c) => c.id);
            const allSelected = childIds.length > 0 && childIds.every((id) => selected.has(id));
            if (allSelected) {
              out.push({ id: `regionParent:${p.id}`, label: p.label });
              for (const id of childIds) consumed.add(id);
            }
          }
          for (const v of val) {
            if (consumed.has(v)) continue;
            out.push({ id: `${key}:${v}`, label: chipLabelFor(key, v) });
          }
          return out;
        }
        return val.map((v) => ({ id: `${key}:${v}`, label: chipLabelFor(key, v) }));
      }
      if (val === "all" || val === "") return [];
      return [{ id: key, label: chipLabelFor(key, val) }];
    });

  const handleRemoveFilter = (chipId: string) => {
    const next = { ...filterValues };

    // Aggregated parent-region chip: remove all child sub-area IDs at once.
    if (chipId.startsWith("regionParent:")) {
      const parentId = chipId.slice("regionParent:".length);
      const parent = regionTree?.find((p) => p.id === parentId);
      if (parent) {
        const childIds = new Set(parent.children.map((c) => c.id));
        const arr = next.region;
        if (Array.isArray(arr)) {
          next.region = arr.filter((v) => !childIds.has(v));
          if ((next.region as string[]).length === 0) delete next.region;
        }
      }
      setFilterValues(next);
      return;
    }

    if (chipId.includes(":")) {
      const [key, val] = chipId.split(":");
      const arr = next[key];
      if (Array.isArray(arr)) {
        next[key] = arr.filter((v) => v !== val);
        if ((next[key] as string[]).length === 0) delete next[key];
      } else {
        delete next[key];
      }
    } else {
      delete next[chipId];
    }
    setFilterValues(next);
  };

  const primaryCarousel: LandscapeItem[]   = items.slice(0, 3).map((i) => itemToLandscape(i, category));
  const secondaryCarousel: LandscapeItem[] = items.slice(3, 6).map((i) => itemToLandscape(i, category));

  /* ── Map full-screen view ── */
  if (showMap && hasMap) {
    return (
      <>
        <CategoryMapView
          category={category}
          items={filteredItems}
          onSwitchToList={() => setShowMap(false)}
          activeFilters={activeFiltersForMap}
          onRemoveFilter={handleRemoveFilter}
          onOpenFilters={() => setFiltersOpen(true)}
          hasRegionFilter={Array.isArray(filterValues.region) && filterValues.region.length > 0}
          onClearRegionFilter={() => {
            const next = { ...filterValues };
            delete next.region;
            setFilterValues(next);
          }}
        />
        <FilterBottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          category={category}
          values={filterValues}
          onChange={setFilterValues}
          resultCount={filteredCount}
          dataOptions={filterData.options}
          filterConfig={filterConfig}
          regionTree={regionTree}
          awardsGroups={awardsGroups}
          onComputeCount={computeCount}
        />
      </>
    );
  }

  /* ── List view (default) ── */
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <InnerHeader
        title={CATEGORY_LABELS[category]}
        onBack={() => router.back()}
        rightSlot={
          <span className="text-sm font-semibold text-zinc-500">{formatCount(displayCount)}</span>
        }
      />

      {/* Sticky sub-category tabs */}
      <SubCategoryTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        className="top-14"
      />

      {/* Scrollable content */}
      <div className="flex-1 pb-10">
        {/* Filter row */}
        <FilterRow
          quickFilters={filterConfig.quickFilters}
          hasNearby={filterConfig.hasNearby}
          activeCount={activeFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          className="pt-2 pb-1"
        />

        {/* Hero stats (count + map toggle) */}
        {hasHeroStats && (
          <CategoryHeroStats
            count={displayCount}
            categoryLabel={CATEGORY_LABELS[category]}
            onToggleMap={() => setShowMap(true)}
            hasMap={hasMap}
          />
        )}

        {/* Items list */}
        <div className={cn(getListClass(category))}>
          {filteredItems.length > 0 ? (
            filteredItems.slice(0, visibleCount).map((item) => (
              <CategoryCard key={item.id} item={item} category={category} />
            ))
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Load more */}
        {filteredItems.length > visibleCount && (
          <div className="px-4 mt-8">
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              className="w-full py-3 rounded-full border border-zinc-300 text-sm font-semibold text-zinc-700 active:opacity-70 transition-opacity"
            >
              Δες περισσότερα ({filteredItems.length - visibleCount} ακόμα)
            </button>
          </div>
        )}

        {/* Primary carousel */}
        {primaryCarousel.length > 0 && (
          <div className="mt-12">
            <CarouselLandscape
              title={SECTION_TITLES[category][0]}
              items={primaryCarousel}
              seeAllHref={`/${category}`}
              portrait={isPortraitCategory(category)}
            />
          </div>
        )}

        {/* Top users */}
        {topUser && (
          <div className="mt-12">
            <CategoryTopUsers
              categoryLabel={CATEGORY_LABELS[category]}
              topUser={topUser}
              contributors={contributors}
            />
          </div>
        )}

        {/* Suggest box */}
        <div className="mt-12">
          <CategorySuggestBox />
        </div>

        {/* Secondary carousel */}
        {secondaryCarousel.length > 0 && (
          <div className="mt-4">
            <CarouselLandscape
              title={SECTION_TITLES[category][1]}
              items={secondaryCarousel}
              seeAllHref={`/${category}`}
              portrait={isPortraitCategory(category)}
            />
          </div>
        )}
      </div>

      {/* Filter bottom sheet */}
      <FilterBottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        category={category}
        values={filterValues}
        onChange={setFilterValues}
        resultCount={filteredCount}
        dataOptions={filterData.options}
        regionTree={regionTree}
        awardsGroups={awardsGroups}
        onComputeCount={computeCount}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
      <span className="text-4xl">🔍</span>
      <p className="text-sm font-semibold text-zinc-800">Δεν βρέθηκαν αποτελέσματα</p>
      <p className="text-xs text-zinc-500">Δοκίμασε να αλλάξεις τα φίλτρα σου ή πρόσθεσε κάτι νέο.</p>
    </div>
  );
}
