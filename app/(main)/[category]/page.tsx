import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ISR — refresh every 60s. Admin writes also call `revalidatePath` on
// the affected category for instant updates; this caps staleness.
export const revalidate = 60;

import { CATEGORIES } from "@/constants/categories";
import { CategoryPageShell } from "@/components/category/CategoryPageShell";
import type { CategorySlug } from "@/types";
import type { CategoryItem } from "@/components/category/CategoryCard";
import type { TopUser, ContributorUser } from "@/components/category/CategoryTopUsers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCategoryFilterConfig } from "@/lib/category-filters";
import { CATEGORY_FILTERS } from "@/constants/filters";
import { safeImageUrl } from "@/lib/image-url";
import { fetchRegionTreeForCategory, getRegionMatchSet } from "@/lib/regions";
import { getFollowedSet } from "@/lib/follows";
import { createClient } from "@/lib/supabase/server";
import { fetchTonightAirings } from "@/lib/movies-tonight";
import { getAwardsTaxonomy } from "@/lib/awards";
import { resolvePageLayout } from "@/lib/layout/resolver";

interface Props {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) return {};
  return { title: `${cat.labelEl} — Proteino` };
}

export interface FilterData {
  tabs: string[];
  options: Record<string, string[]>;
}

const EXT_SELECT: Record<CategorySlug, string> = {
  books: "item_books(writer, publication, publication_year, language, pages)",
  movies: "item_movies(director, release_date, channel, duration_min, actors)",
  series: "item_series(director, channel, seasons, actors)",
  food: "item_food(cuisine, type, address, region_id, lat, lng, delivery_links)",
  recipes: "item_recipes(level, channel)",
  bars: "item_bars(type, address, region_id, lat, lng)",
  hotels: "item_hotels(type, address, region_id, lat, lng, price_range)",
  theater: "item_theater(type, address, region_id, lat, lng, name_place, director, writer, actors)",
  events: "item_events(event_type, address, region_id, lat, lng, name_place, performers)",
};

const GENERIC_TAGS: Record<string, string[]> = {
  series: ["τηλεοπτικές σειρές"],
  recipes: ["συνταγές"],
};

function extractArea(address: string | null | undefined): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

function buildSuggestedBy(suggestions: any[] | null): { names: string[]; extra: number } {
  if (!suggestions?.length) return { names: [], extra: 0 };
  const names = suggestions
    .map((s: any) => s.users?.display_name)
    .filter(Boolean)
    .slice(0, 2) as string[];
  return { names, extra: Math.max(0, suggestions.length - names.length) };
}

function stringifyActors(actors: any): string | undefined {
  if (!actors) return undefined;
  if (typeof actors === "string") return actors;
  if (Array.isArray(actors)) {
    return actors
      .map((a: any) => (typeof a === "string" ? a : a?.name ?? a?.label ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return JSON.stringify(actors);
}

function mapItem(item: any, category: CategorySlug): CategoryItem {
  const meta = item.metadata ?? {};
  const allTags: string[] = meta.tags ?? [];
  const genericSet = new Set(GENERIC_TAGS[category] ?? []);
  const tags = allTags.filter((t) => !genericSet.has(t));

  const extKey: Record<CategorySlug, string> = {
    food: "item_food", movies: "item_movies", series: "item_series",
    books: "item_books", recipes: "item_recipes", bars: "item_bars",
    hotels: "item_hotels", theater: "item_theater", events: "item_events",
  };
  const raw = item[extKey[category]];
  const ext: any = Array.isArray(raw) ? raw[0] : raw;

  // Pluck the first suggestion's user — populates the avatar overlay
  // on landscape carousel cards and the click-through popup.
  const suggesterUser = (item.suggestions ?? []).find((s: any) => s?.users?.id)?.users ?? null;
  const suggester = suggesterUser
    ? {
        id: suggesterUser.id,
        handle: suggesterUser.handle,
        display_name: suggesterUser.display_name,
        avatar_url: suggesterUser.avatar_url,
        level: suggesterUser.level ?? undefined,
        suggestion_count: suggesterUser.suggestion_count ?? undefined,
        avg_quality_score: suggesterUser.avg_quality_score ?? undefined,
      }
    : null;

  const result: CategoryItem = {
    id: item.id,
    slug: stripPrefix(item.slug),
    title: item.title,
    subcategory: tags[0] ?? "",
    avg_rating: item.avg_rating ?? 0,
    rating_count: item.rating_count ?? 0,
    cover_url: safeImageUrl(item.cover_url),
    suggestedBy: buildSuggestedBy(item.suggestions),
    tags,
    suggester,
  };

  // Surface lat/lng for venue categories — used by map view.
  if (typeof ext?.lat === "number" && typeof ext?.lng === "number") {
    result.lat = ext.lat;
    result.lng = ext.lng;
  }

  switch (category) {
    case "food":
      // Tabs render establishment type (ταβέρνα, μεζεδοπωλείο,
      // ψαροταβέρνα) — that's how Greek users browse food. Cuisine
      // moves to a bottom-sheet multi-select filter.
      result.subcategory = ext?.type || ext?.cuisine || tags[0] || "Εστιατόριο";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.foodType = ext?.type || undefined;
      result.cuisine = ext?.cuisine || undefined;
      if (ext?.delivery_links && typeof ext.delivery_links === "object") {
        result.delivery = Object.keys(ext.delivery_links).filter((k) => ext.delivery_links[k]);
      }
      break;
    case "bars":
      result.subcategory = ext?.type || tags[0] || "Bar";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      break;
    case "hotels":
      result.subcategory = ext?.type || tags[0] || "Ξενοδοχείο";
      result.hotelType = ext?.type || undefined;
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      break;
    case "theater":
      result.subcategory = ext?.type || tags[0] || "Θέατρο";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.director = ext?.director || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "events":
      result.subcategory = ext?.event_type || tags[0] || "Εκδήλωση";
      result.area = extractArea(ext?.address);
      result.regionId = ext?.region_id || undefined;
      result.actors = stringifyActors(ext?.performers);
      break;
    case "movies":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.director = ext?.director || undefined;
      result.duration_min = ext?.duration_min || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "series":
      result.year = ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined;
      result.platform = ext?.channel || undefined;
      result.channel = ext?.channel || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "books":
      result.year = ext?.publication_year ?? undefined;
      result.writer = ext?.writer || undefined;
      result.publisher = ext?.publication || undefined;
      break;
    case "recipes":
      result.subcategory = tags[0] || ext?.level || "Συνταγή";
      result.level = ext?.level || undefined;
      break;
  }

  return result;
}

function collectStrings(items: CategoryItem[], getter: (item: CategoryItem) => string | undefined): string[] {
  const m = new Map<string, number>();
  for (const item of items) {
    const v = getter(item);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

function computeFilterData(items: CategoryItem[], category: CategorySlug): FilterData {
  const tabCounts = new Map<string, number>();
  for (const item of items) {
    const key = item.subcategory;
    if (key) tabCounts.set(key, (tabCounts.get(key) ?? 0) + 1);
  }
  const tabs = Array.from(tabCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label]) => label);

  const options: Record<string, string[]> = {};

  const genreFilterId: Record<CategorySlug, string | null> = {
    movies: "genre", series: "genre", books: "genre",
    food: "type", recipes: "type", bars: null,
    theater: "type", events: "event_type", hotels: null,
  };
  const gid = genreFilterId[category];
  if (gid) options[gid] = tabs;

  switch (category) {
    case "books":
      options.writer = collectStrings(items, (i) => i.writer);
      options.publisher = collectStrings(items, (i) => i.publisher);
      break;
    case "movies":
      options.director = collectStrings(items, (i) => i.director);
      break;
    case "food":
      // type is now the tabs-owned dimension (already populated via
      // `genreFilterId.food = "type"` above). cuisine becomes the
      // bottom-sheet multi-select filter.
      options.cuisine = collectStrings(items, (i) => i.cuisine);
      options.region = collectStrings(items, (i) => i.area);
      break;
    case "bars":
      options.region = collectStrings(items, (i) => i.area);
      break;
    case "hotels":
      options.region = collectStrings(items, (i) => i.area);
      break;
    case "events":
      options.region = collectStrings(items, (i) => i.area);
      break;
    case "theater":
      break;
    case "series":
      break;
    case "recipes":
      break;
  }

  return { tabs, options };
}

export default async function CategoryPage(props: Props) {
  const params = await props.params;
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const category = cat.slug as CategorySlug;
  const sb = createAdminClient();

  const select = `*, ${EXT_SELECT[category]}, suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))`;
  const { data: rawItems, count: totalCount } = (await (sb.from("items") as any)
    .select(select, { count: "exact" })
    .eq("category", category)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })) as { data: any[] | null; count: number | null };

  const items = (rawItems ?? []).map((item: any) => mapItem(item, category));

  // Single user-scoped client used for both auth (viewerAudience) and
  // the venue region-soft-sort below. Reading the cookie here also
  // makes the page dynamic for authed users — fine since the layout
  // resolver and the venue sort both vary per user anyway.
  const userClient = await createClient();
  const { data: { user: viewer } } = await userClient.auth.getUser();
  const isRegistered = !!viewer;

  // Region-aware soft sort — for venue categories, items whose region
  // matches (or is a descendant of) the viewer's saved region_id
  // float to the top. Pure ordering; nothing is filtered out so a
  // Thessaloniki user who scrolls still finds Athens venues.
  const VENUE = new Set(["food", "bars", "hotels", "theater", "events"]);
  if (VENUE.has(category) && viewer) {
    const { data: viewerRow } = await userClient
      .from("users")
      .select("region_id")
      .eq("id", viewer.id)
      .maybeSingle();
    const viewerRegion = (viewerRow as { region_id?: string | null } | null)?.region_id ?? null;
    const matchSet = await getRegionMatchSet(sb, viewerRegion);
    if (matchSet.size > 0) {
      items.sort((a, b) => {
        const aIn = a.regionId && matchSet.has(a.regionId) ? 1 : 0;
        const bIn = b.regionId && matchSet.has(b.regionId) ? 1 : 0;
        return bIn - aIn; // in-region first; stable within each group
      });
    }
  }

  const filterData = computeFilterData(items, category);

  // Filter config from DB; fall back to constant if migration 008 hasn't run yet.
  const dbFilterConfig = await fetchCategoryFilterConfig(sb, category);
  const filterConfig = dbFilterConfig ?? CATEGORY_FILTERS[category];

  // Region tree for venue categories (food/bars/hotels/events). Empty for others.
  const regionTreeData = await fetchRegionTreeForCategory(sb, category);

  // Awards taxonomy: counts are placeholder zero for now (storage isn't
  // standardized — see lib/awards.ts). Picker UI is wired; counts will be
  // populated in a follow-up round.
  const awardsGroups = (category === "movies" || category === "series") ? getAwardsTaxonomy() : undefined;

  // Tonight's TV airings — movies only. Returns empty array on other
  // categories so the shell branches off naturally.
  const tonightAirings = category === "movies" ? await fetchTonightAirings(sb) : [];

  // Resolved layout from page_sections (migration 032). When empty —
  // because the migration hasn't been applied or the seed is missing —
  // CategoryPageShell falls back to its legacy hardcoded JSX so the
  // page never blanks out.
  const layoutSections = await resolvePageLayout(sb, {
    context: "category",
    category,
    viewerAudience: isRegistered ? "registered" : "guest",
  });

  let topUser: TopUser | null = null;
  let contributors: ContributorUser[] = [];

  const itemIds = items.map((i) => i.id);
  if (itemIds.length > 0) {
    const { data: sugData } = (await (sb.from("suggestions") as any)
      .select("user_id, users!suggestions_user_id_fkey(id, display_name, handle)")
      .in("item_id", itemIds.slice(0, 100))) as { data: any[] | null };

    const userMap = new Map<string, { user: any; count: number }>();
    for (const s of sugData ?? []) {
      const u = s.users;
      if (!u) continue;
      const existing = userMap.get(u.id);
      if (existing) existing.count++;
      else userMap.set(u.id, { user: u, count: 1 });
    }

    const sorted = Array.from(userMap.values()).sort((a, b) => b.count - a.count);

    // Hydrate the viewer's follow state for everyone in the top-5 (the
    // featured top user + the 4-contributor grid) in one batched query
    // so each card renders with the correct initial Follow state.
    const candidateIds = sorted.slice(0, 5).map((e) => e.user.id);
    const followed = await getFollowedSet(sb, viewer?.id ?? null, candidateIds);

    if (sorted.length > 0) {
      const top = sorted[0];
      topUser = {
        id: top.user.id,
        name: top.user.display_name,
        handle: top.user.handle,
        rank: 1,
        total_users: sorted.length,
        suggestion_count: top.count,
        avg_rating: 0,
        badge: top.count >= 10 ? "PLATINUM" : top.count >= 5 ? "GOLD" : "SILVER",
        is_following: followed.has(top.user.id),
      };
    }

    contributors = sorted.slice(1, 5).map((entry) => ({
      id: entry.user.id,
      name: entry.user.display_name,
      handle: entry.user.handle,
      suggestion_count: entry.count,
      is_following: followed.has(entry.user.id),
    }));
  }

  return (
    <CategoryPageShell
      category={category}
      items={items}
      totalCount={totalCount ?? items.length}
      topUser={topUser}
      contributors={contributors}
      filterData={filterData}
      filterConfig={filterConfig}
      regionTree={regionTreeData.parents}
      regionChildToParent={regionTreeData.childToParent}
      regionDescendants={regionTreeData.descendantsById}
      awardsGroups={awardsGroups}
      tonightAirings={tonightAirings}
      layoutSections={layoutSections}
    />
  );
}
