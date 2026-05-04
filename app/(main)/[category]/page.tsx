import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/constants/categories";
import { CategoryPageShell } from "@/components/category/CategoryPageShell";
import type { CategorySlug } from "@/types";
import type { CategoryItem } from "@/components/category/CategoryCard";
import type { TopUser, ContributorUser } from "@/components/category/CategoryTopUsers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCategoryFilterConfig } from "@/lib/category-filters";
import { CATEGORY_FILTERS } from "@/constants/filters";
import { safeImageUrl } from "@/lib/image-url";

interface Props {
  params: { category: string };
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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
  food: "item_food(cuisine, type, address, delivery_links)",
  recipes: "item_recipes(level, channel)",
  bars: "item_bars(type, address)",
  hotels: "item_hotels(type, address, price_range)",
  theater: "item_theater(type, address, name_place, director, writer, actors)",
  events: "item_events(event_type, address, name_place, performers)",
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
  };

  switch (category) {
    case "food":
      result.subcategory = ext?.cuisine || ext?.type || tags[0] || "Εστιατόριο";
      result.area = extractArea(ext?.address);
      result.foodType = ext?.type || undefined;
      if (ext?.delivery_links && typeof ext.delivery_links === "object") {
        result.delivery = Object.keys(ext.delivery_links).filter((k) => ext.delivery_links[k]);
      }
      break;
    case "bars":
      result.subcategory = ext?.type || tags[0] || "Bar";
      result.area = extractArea(ext?.address);
      break;
    case "hotels":
      result.subcategory = ext?.type || tags[0] || "Ξενοδοχείο";
      result.hotelType = ext?.type || undefined;
      result.area = extractArea(ext?.address);
      break;
    case "theater":
      result.subcategory = ext?.type || tags[0] || "Θέατρο";
      result.area = extractArea(ext?.address);
      result.director = ext?.director || undefined;
      result.actors = stringifyActors(ext?.actors);
      break;
    case "events":
      result.subcategory = ext?.event_type || tags[0] || "Εκδήλωση";
      result.area = extractArea(ext?.address);
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
    food: "cuisine", recipes: "type", bars: null,
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
      options.type = collectStrings(items, (i) => i.foodType);
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

export default async function CategoryPage({ params }: Props) {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const category = cat.slug as CategorySlug;
  const sb = createAdminClient();

  const select = `*, ${EXT_SELECT[category]}, suggestions(users(display_name))`;
  const { data: rawItems, count: totalCount } = (await (sb.from("items") as any)
    .select(select, { count: "exact" })
    .eq("category", category)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })) as { data: any[] | null; count: number | null };

  const items = (rawItems ?? []).map((item: any) => mapItem(item, category));
  const filterData = computeFilterData(items, category);

  // Filter config from DB; fall back to constant if migration 008 hasn't run yet.
  const dbFilterConfig = await fetchCategoryFilterConfig(sb, category);
  const filterConfig = dbFilterConfig ?? CATEGORY_FILTERS[category];

  let topUser: TopUser | null = null;
  let contributors: ContributorUser[] = [];

  const itemIds = items.map((i) => i.id);
  if (itemIds.length > 0) {
    const { data: sugData } = (await (sb.from("suggestions") as any)
      .select("user_id, users(id, display_name, handle)")
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
      };
    }

    contributors = sorted.slice(1, 5).map((entry) => ({
      id: entry.user.id,
      name: entry.user.display_name,
      handle: entry.user.handle,
      suggestion_count: entry.count,
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
    />
  );
}
