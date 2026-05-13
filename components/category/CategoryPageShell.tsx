"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SubCategoryTabs } from "./SubCategoryTabs";
import { FilterRow } from "./FilterRow";
import { FilterBottomSheet, type FilterValues } from "./FilterBottomSheet";
import { CategoryCard, isPortraitCategory, type CategoryItem } from "./CategoryCard";
import { CategoryTopUsers, type ContributorUser, type TopUser } from "./CategoryTopUsers";
import { CategorySuggestBox } from "./CategorySuggestBox";
import { CarouselLandscape, type LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import { MoviesTonightSection } from "@/components/home/MoviesTonightSection";
import { CATEGORY_FILTERS, type CategoryFilters } from "@/constants/filters";
import type { FilterData } from "@/app/(main)/[category]/page";
import type { CategorySlug } from "@/types";
import { cn } from "@/lib/utils/cn";
import type { RenderedSection } from "@/lib/layout/types";
import { toLandscapeItem as hydratedToLandscape } from "@/lib/collections";

const CategoryMapView = dynamic(
  () => import("./CategoryMapView").then((m) => m.CategoryMapView),
  { ssr: false, loading: () => <div className="flex-1 bg-zinc-100 animate-pulse" /> },
);

/* ── helpers ─────────────────────────────────────────────── */

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

// Maps each category to the filter ID that's "owned" by SubCategoryTabs.
// These filter values must never appear in `filterValues` — tabs are the
// canonical surface. Without this, picking a tab AND having a stale
// cuisine entry in filterValues double-filters or shows ghost chips.
const TABS_OWNED_FILTER: Partial<Record<CategorySlug, string>> = {
  food:    "type",
  movies:  "genre",
  series:  "genre",
  books:   "genre",
  recipes: "type",
  theater: "type",
  events:  "event_type",
};

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
    avatar_url: item.suggester?.avatar_url ?? null,
    suggester: item.suggester ?? null,
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
  filterConfig?: CategoryFilters;
  regionTree?: import("@/components/filters/TwoStepListPicker").TwoStepNode[];
  regionChildToParent?: Record<string, string>;
  regionDescendants?: Record<string, string[]>;
  awardsGroups?: import("@/components/filters/GroupedCheckboxList").GroupedListGroup[];
  tonightAirings?: import("@/lib/movies-tonight").TonightAiring[];
  /**
   * Resolved layout for this category page from page_sections.
   * When set + non-empty, the shell renders sections in the order
   * the admin laid out. When empty (no migration 032 yet, or resolver
   * returned nothing), falls back to the legacy hardcoded JSX so the
   * page never blanks out.
   */
  layoutSections?: RenderedSection[];
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
  regionChildToParent: _regionChildToParent,
  regionDescendants,
  awardsGroups,
  tonightAirings,
  layoutSections,
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

  const activeFilterCount = Object.entries(filterValues).reduce<number>((sum, [key, v]) => {
    if (key === TABS_OWNED_FILTER[category]) return sum;
    if (Array.isArray(v)) return sum + v.length;
    if (v && v !== "all" && v !== "") return sum + 1;
    return sum;
  }, 0);

  const listItems = items;
  const tabsOwnedKey = TABS_OWNED_FILTER[category];

  const filteredItems = useMemo(() => {
    let result = listItems;

    if (activeTab !== "Όλα") {
      result = result.filter((it) => ciEq(it.subcategory, activeTab));
    }

    for (const [filterId, value] of Object.entries(filterValues)) {
      if (filterId === tabsOwnedKey) continue;
      if (!value || (Array.isArray(value) && value.length === 0) || value === "all" || value === "") continue;
      result = result.filter((it) => matchesFilter(it, filterId, value, category, regionDescendants));
    }

    return result;
  }, [listItems, activeTab, filterValues, category, tabsOwnedKey, regionDescendants]);

  const filteredCount = filteredItems.length;
  const hasActiveFilters = activeTab !== "Όλα" || activeFilterCount > 0;
  const displayCount = hasActiveFilters ? filteredCount : totalCount;

  const computeCount = useCallback((vals: FilterValues): number => {
    let result = listItems;
    if (activeTab !== "Όλα") {
      result = result.filter((it) => ciEq(it.subcategory, activeTab));
    }
    for (const [filterId, value] of Object.entries(vals)) {
      if (filterId === tabsOwnedKey) continue;
      if (!value || (Array.isArray(value) && value.length === 0) || value === "all" || value === "") continue;
      result = result.filter((it) => matchesFilter(it, filterId, value, category, regionDescendants));
    }
    return result.length;
  }, [listItems, activeTab, category, tabsOwnedKey, regionDescendants]);

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

  const activeFiltersForMap = Object.entries(filterValues)
    .filter(([key]) => key !== tabsOwnedKey)
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

  /* ── List view ─────────────────────────────────────────── */
  const categoryLabel = CATEGORY_LABELS[category];

  /* ── Widget render bridge ──
   *  Maps a RenderedSection to its JSX equivalent, closing over the
   *  shell-local state (activeTab, filterValues, …). Returning null
   *  hides the section (used by widgets that are conditionally
   *  irrelevant for the current category, e.g. open_map_button on a
   *  non-venue category that somehow got a row).                       */
  const renderSection = (section: RenderedSection): React.ReactNode => {
    if (section.kind === "divider") {
      const config = section.config as { label?: string; spacing?: number };
      const spacing = typeof config.spacing === "number" ? config.spacing : 24;
      return <div key={section.row.id} style={{ height: spacing }} aria-hidden />;
    }

    if (section.kind === "collection") {
      const c = section.collection;
      if (c.type !== "carousel") return null; // 'card' type renders elsewhere; not used on category pages yet
      const carouselItems: LandscapeItem[] = section.items.map((it) => {
        const tags: string[] = ((it.metadata as any)?.tags as string[]) ?? [];
        return {
          id: it.id,
          title: it.title,
          cover_url: it.cover_url ?? null,
          subtitle: tags[0] ?? "",
          avg_rating: it.avg_rating,
          rating_count: it.rating_count,
          is_top_rated: it.avg_rating >= 4.5 && it.rating_count >= 5,
          href: `/${it.category}/${stripSlugPrefix(it.slug)}`,
          avatar_url: it.suggestions?.[0]?.users?.avatar_url ?? null,
          suggester: it.suggestions?.[0]?.users
            ? {
                id: it.suggestions[0]!.users!.id,
                handle: it.suggestions[0]!.users!.handle,
                display_name: it.suggestions[0]!.users!.display_name,
                avatar_url: it.suggestions[0]!.users!.avatar_url,
                level: it.suggestions[0]!.users!.level ?? undefined,
                suggestion_count: it.suggestions[0]!.users!.suggestion_count ?? undefined,
                avg_quality_score: it.suggestions[0]!.users!.avg_quality_score ?? undefined,
              }
            : null,
        };
      });
      return (
        <div key={section.row.id} className="mt-12">
          <CarouselLandscape
            title={c.title}
            items={carouselItems}
            seeAllHref={c.alias ? `/collections/${c.alias}` : undefined}
            portrait={isPortraitCategory(category)}
          />
        </div>
      );
    }

    // section.kind === 'widget'
    switch (section.widgetKey) {
      case "welcome_header":
        return (
          <CategoryWelcomeHeader
            key={section.row.id}
            onBack={() => router.back()}
            hasActiveFilters={hasActiveFilters}
            displayCount={displayCount}
            totalCount={totalCount}
            categoryLabel={categoryLabel}
          />
        );

      case "sub_category_tabs":
        return (
          <SubCategoryTabs
            key={section.row.id}
            tabs={tabs}
            active={activeTab}
            onChange={setActiveTab}
            className="top-24"
          />
        );

      case "movies_tonight":
        if (category !== "movies" || !tonightAirings || tonightAirings.length === 0) return null;
        return (
          <div key={section.row.id} className="pt-4">
            <MoviesTonightSection airings={tonightAirings} />
          </div>
        );

      case "filter_row":
        return (
          <FilterRow
            key={section.row.id}
            hasNearby={filterConfig.hasNearby}
            activeCount={activeFilterCount}
            activeChips={activeFiltersForMap}
            onRemoveChip={handleRemoveFilter}
            onOpenFilters={() => setFiltersOpen(true)}
            className="pt-3 pb-2"
          />
        );

      case "open_map_button":
        if (!hasMap) return null;
        return <OpenMapButton key={section.row.id} onClick={() => setShowMap(true)} />;

      case "items_list":
        return (
          <ItemsList
            key={section.row.id}
            items={filteredItems}
            category={category}
            visibleCount={visibleCount}
            onLoadMore={() => setVisibleCount((c) => c + 10)}
          />
        );

      case "static_carousel": {
        const config = section.config as {
          title?: string;
          source?: string;
          offset?: number;
          limit?: number;
          category?: string;
        };

        // Manual item override — resolver pre-hydrated specific items in
        // the admin's chosen order. Honour even when items cross the
        // current page's category (admin picked them deliberately).
        if (section.items && section.items.length > 0) {
          const manualItems = section.items.map(hydratedToLandscape);
          return (
            <div key={section.row.id} className="mt-12">
              <CarouselLandscape
                title={config.title ?? ""}
                items={manualItems}
                seeAllHref={`/${category}`}
                portrait={isPortraitCategory(category)}
              />
            </div>
          );
        }

        // Auto-source path — slice from the already-fetched items array.
        // config.category cross-category override is honoured only on
        // home; on category pages it's intentionally ignored so the
        // admin doesn't accidentally surface bars on the movies page.
        const offset = typeof config.offset === "number" ? config.offset : 0;
        const limit = typeof config.limit === "number" ? config.limit : 3;
        const slice = items.slice(offset, offset + limit).map((i) => itemToLandscape(i, category));
        if (slice.length === 0) return null;
        return (
          <div key={section.row.id} className="mt-12">
            <CarouselLandscape
              title={config.title ?? ""}
              items={slice}
              seeAllHref={`/${category}`}
              portrait={isPortraitCategory(category)}
            />
          </div>
        );
      }

      case "category_top_users":
        if (!topUser) return null;
        return (
          <div key={section.row.id} className="mt-12">
            <CategoryTopUsers
              categoryLabel={CATEGORY_LABELS[category]}
              topUser={topUser}
              contributors={contributors}
            />
          </div>
        );

      case "suggest_box":
        return (
          <div key={section.row.id} className="mt-12">
            <CategorySuggestBox />
          </div>
        );

      // Widgets registered for `home` context but seeded into a category
      // bucket by accident (or admin forced-placed): silently skip.
      case "greeting":
      case "hero_discover":
      case "hero_suggest":
      case "hero_personalise":
      case "category_tiles":
      case "suggestion_feed":
      case "how_it_works":
      case "register_promo":
      case "ai_chips":
      case "suggested_users":
      case "contribution_cta":
      case "support_section":
      case "footer_mobile":
        return null;

      default:
        // Unknown widget key — log once in dev so we notice missing
        // bridge cases. Never crash the page.
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[CategoryPageShell] No render bridge for widget_key: ${section.widgetKey}`);
        }
        return null;
    }
  };

  /* ── Render ── */

  const useLayout = (layoutSections?.length ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-full">
      {useLayout ? (
        layoutSections!.map((section) => {
          const node = renderSection(section);
          if (node === null || node === undefined || node === false) return null;
          return (
            <div key={section.row.id} data-section-id={section.row.id}>
              {node}
            </div>
          );
        })
      ) : (
        <LegacyCategoryStack
          category={category}
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tonightAirings={tonightAirings}
          hasMap={hasMap}
          filterConfig={filterConfig}
          activeFilterCount={activeFilterCount}
          activeFiltersForMap={activeFiltersForMap}
          handleRemoveFilter={handleRemoveFilter}
          setFiltersOpen={setFiltersOpen}
          setShowMap={setShowMap}
          filteredItems={filteredItems}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          primaryCarousel={primaryCarousel}
          secondaryCarousel={secondaryCarousel}
          topUser={topUser}
          contributors={contributors}
          router={router}
          hasActiveFilters={hasActiveFilters}
          displayCount={displayCount}
          totalCount={totalCount}
          categoryLabel={categoryLabel}
        />
      )}

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
    </div>
  );
}

/* ── Small helpers ──────────────────────────────────────── */

function stripSlugPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

function OpenMapButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center px-4 pt-1 pb-3">
      <button
        onClick={onClick}
        className="flex items-center justify-center gap-2 rounded-full active:scale-[0.97] active:opacity-90 transition-[transform,opacity] duration-150 ease-out"
        style={{
          width: 220,
          height: 44,
          background: "#fff",
          border: "1.5px solid #FE6F5E",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="text-[15px] font-bold" style={{ color: "#27272a", fontFamily: "'Open Sans',sans-serif" }}>
          Άνοιγμα χάρτη
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

function ItemsList({
  items,
  category,
  visibleCount,
  onLoadMore,
}: {
  items: CategoryItem[];
  category: CategorySlug;
  visibleCount: number;
  onLoadMore: () => void;
}) {
  return (
    <>
      <div className={cn(getListClass(category))}>
        {items.length > 0 ? (
          items.slice(0, visibleCount).map((item) => (
            <CategoryCard key={item.id} item={item} category={category} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
      {items.length > visibleCount && (
        <div className="px-4 mt-8">
          <button
            onClick={onLoadMore}
            className="w-full py-3 rounded-full border border-zinc-300 text-sm font-semibold text-zinc-700 active:opacity-70 transition-opacity"
          >
            Δες περισσότερα ({items.length - visibleCount} ακόμα)
          </button>
        </div>
      )}
    </>
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

/* ── Legacy hardcoded stack (fallback when no layoutSections) ── */
/*  Preserved verbatim from pre-migration-032 behavior so the page
 *  never blanks out if the resolver returns []. Once the layout
 *  system is verified in production for a stretch, this can be
 *  deleted in a follow-up cleanup.                                     */
function LegacyCategoryStack(props: {
  category: CategorySlug;
  tabs: string[];
  activeTab: string;
  setActiveTab: (s: string) => void;
  tonightAirings?: import("@/lib/movies-tonight").TonightAiring[];
  hasMap: boolean;
  filterConfig: CategoryFilters;
  activeFilterCount: number;
  activeFiltersForMap: { id: string; label: string }[];
  handleRemoveFilter: (id: string) => void;
  setFiltersOpen: (b: boolean) => void;
  setShowMap: (b: boolean) => void;
  filteredItems: CategoryItem[];
  visibleCount: number;
  setVisibleCount: (n: number | ((c: number) => number)) => void;
  primaryCarousel: LandscapeItem[];
  secondaryCarousel: LandscapeItem[];
  topUser: TopUser | null;
  contributors: ContributorUser[];
  router: ReturnType<typeof useRouter>;
  hasActiveFilters: boolean;
  displayCount: number;
  totalCount: number;
  categoryLabel: string;
}) {
  const {
    category, tabs, activeTab, setActiveTab, tonightAirings, hasMap,
    filterConfig, activeFilterCount, activeFiltersForMap, handleRemoveFilter,
    setFiltersOpen, setShowMap, filteredItems, visibleCount, setVisibleCount,
    primaryCarousel, secondaryCarousel, topUser, contributors, router,
    hasActiveFilters, displayCount, totalCount, categoryLabel,
  } = props;

  return (
    <>
      <CategoryWelcomeHeader
        onBack={() => router.back()}
        hasActiveFilters={hasActiveFilters}
        displayCount={displayCount}
        totalCount={totalCount}
        categoryLabel={categoryLabel}
      />

      <SubCategoryTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        className="top-24"
      />

      <div className="flex-1 pb-10">
        {category === "movies" && tonightAirings && tonightAirings.length > 0 && (
          <div className="pt-4">
            <MoviesTonightSection airings={tonightAirings} />
          </div>
        )}

        <FilterRow
          hasNearby={filterConfig.hasNearby}
          activeCount={activeFilterCount}
          activeChips={activeFiltersForMap}
          onRemoveChip={handleRemoveFilter}
          onOpenFilters={() => setFiltersOpen(true)}
          className="pt-3 pb-2"
        />

        {hasMap && <OpenMapButton onClick={() => setShowMap(true)} />}

        <ItemsList
          items={filteredItems}
          category={category}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount((c) => c + 10)}
        />

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

        {topUser && (
          <div className="mt-12">
            <CategoryTopUsers
              categoryLabel={categoryLabel}
              topUser={topUser}
              contributors={contributors}
            />
          </div>
        )}

        <div className="mt-12">
          <CategorySuggestBox />
        </div>

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
    </>
  );
}

/* ── Sticky collapsing welcome header ─────────────────────── */
function CategoryWelcomeHeader({
  onBack,
  hasActiveFilters,
  displayCount,
  totalCount,
  categoryLabel,
}: {
  onBack: () => void;
  hasActiveFilters: boolean;
  displayCount: number;
  totalCount: number;
  categoryLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="sticky top-0 z-30 transition-all duration-200 ease-out"
      style={{
        background: collapsed ? "#fff" : "#FFF7F2",
        borderBottom: collapsed ? "1px solid #e4e4e7" : "1px solid transparent",
        height: 96,
      }}
    >
      <div
        className="absolute inset-0 flex gap-2 px-3 pt-3 pb-3 transition-opacity duration-200"
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
        }}
      >
        <button
          onClick={onBack}
          aria-label="Πίσω"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full active:bg-coral-100 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          {hasActiveFilters ? (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[34px] font-extrabold leading-none"
                  style={{
                    fontFamily: "'Open Sans',sans-serif",
                    letterSpacing: "-0.6px",
                    color: "#FE6F5E",
                  }}
                >
                  {displayCount.toLocaleString("el-GR")}
                </span>
                <span className="text-[15px] font-bold text-zinc-900 leading-tight">προτάσεις</span>
              </div>
              <div className="mt-2 text-[13px] font-medium text-zinc-600 leading-tight">
                Από τις <span className="font-bold text-zinc-800">{totalCount.toLocaleString("el-GR")}</span> σε <span className="font-bold text-zinc-800">{categoryLabel}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[44px] font-extrabold leading-none"
                  style={{
                    fontFamily: "'Open Sans',sans-serif",
                    letterSpacing: "-0.8px",
                    color: "#FE6F5E",
                  }}
                >
                  {totalCount.toLocaleString("el-GR")}
                </span>
                <span className="text-[15px] font-bold text-zinc-900 leading-tight">προτάσεις</span>
              </div>
              <div className="mt-2 text-[13px] font-medium text-zinc-600 leading-tight">
                να ανακαλύψεις σε <span className="font-bold text-zinc-800">{categoryLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 flex items-center gap-2 px-3 transition-opacity duration-200"
        style={{
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? "auto" : "none",
        }}
      >
        <button
          onClick={onBack}
          aria-label="Πίσω"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <span className="flex-1 text-[16px] font-bold text-zinc-900 truncate">{categoryLabel}</span>
        <span
          className="shrink-0 px-3 h-7 inline-flex items-center justify-center rounded-full"
          style={{
            background: hasActiveFilters ? "#FFF5EC" : "#f4f4f5",
            color: hasActiveFilters ? "#FE6F5E" : "#52525b",
            fontFamily: "'Open Sans',sans-serif",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {displayCount.toLocaleString("el-GR")}
        </span>
      </div>
    </div>
  );
}
