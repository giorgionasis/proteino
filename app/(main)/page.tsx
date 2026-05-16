import type { Metadata } from "next";

// ISR — refresh every 60s. Admin writes also call `revalidatePath('/')`
// for instant updates; this is the upper-bound staleness fallback.
export const revalidate = 60;

import { CarouselLandscape, type LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import { CarouselPortrait, type PortraitItem } from "@/components/recommendation/CarouselPortrait";
import { AIChips, type CategoryChip } from "@/components/home/AIChips";
import { SuggestedUsers, type SuggestedUser } from "@/components/home/SuggestedUsers";
import { ContributionCTA } from "@/components/home/ContributionCTA";
import { FooterMobile } from "@/components/layout/FooterMobile";
import { HeroDiscover } from "@/components/home/guest/HeroDiscover";
import { HeroSuggest } from "@/components/home/guest/HeroSuggest";
import { HeroPersonalise } from "@/components/home/guest/HeroPersonalise";
import { CategoryTiles } from "@/components/home/guest/CategoryTiles";
import { SuggestionFeed, type SuggestionFeedItem } from "@/components/home/guest/SuggestionFeed";
import { HowItWorks } from "@/components/home/guest/HowItWorks";
import { RegisterPromo } from "@/components/home/guest/RegisterPromo";
import { SupportSection } from "@/components/home/SupportSection";
import { CollectionRenderer } from "@/components/recommendation/CollectionRenderer";
import { MoviesTonightSection } from "@/components/home/MoviesTonightSection";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import { fetchHomeCollections, type HydratedCollection } from "@/lib/collections";
import { safeImageUrl } from "@/lib/image-url";
import { fetchTonightAirings, type TonightAiring } from "@/lib/movies-tonight";
import { getRegionMatchSet } from "@/lib/regions";
import { getFollowedSet } from "@/lib/follows";
import { resolvePageLayout } from "@/lib/layout/resolver";
import { renderHomeSection } from "@/lib/layout/home-bridge";

export const metadata: Metadata = { title: "Proteino" };

// ── Data fetching helpers ─────────────────────────────────────────

type SB = ReturnType<typeof createClient>;

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

function extractArea(address: string | null | undefined): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

async function fetchFoodLandscape(
  sb: SB,
  limit = 5,
  regionMatchSet: Set<string> = new Set(),
): Promise<LandscapeItem[]> {
  const fetchLimit = regionMatchSet.size > 0 ? Math.max(limit * 5, 25) : limit;

  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, rating_count, item_food(cuisine, type, address, region_id), suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))")
    .eq("category", "food")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(fetchLimit);

  const rows = (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_food) ? r.item_food[0] : r.item_food;
    const u = (r.suggestions ?? []).find((s: any) => s?.users?.id)?.users ?? null;
    const suggester = u ? {
      id: u.id, handle: u.handle, display_name: u.display_name,
      avatar_url: u.avatar_url,
      level: u.level ?? undefined,
      suggestion_count: u.suggestion_count ?? undefined,
      avg_quality_score: u.avg_quality_score ?? undefined,
    } : null;
    return {
      __regionId: ext?.region_id as string | null | undefined,
      __row: {
        id: r.id,
        title: r.title,
        cover_url: safeImageUrl(r.cover_url),
        subtitle: ext?.cuisine || ext?.type || "Εστιατόριο",
        location: extractArea(ext?.address),
        avg_rating: r.avg_rating,
        rating_count: r.rating_count,
        is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
        href: `/food/${stripPrefix(r.slug)}`,
        avatar_url: suggester?.avatar_url ?? null,
        suggester,
      } as LandscapeItem,
    };
  });

  if (regionMatchSet.size > 0) {
    rows.sort((a, b) => {
      const aIn = a.__regionId && regionMatchSet.has(a.__regionId) ? 1 : 0;
      const bIn = b.__regionId && regionMatchSet.has(b.__regionId) ? 1 : 0;
      return bIn - aIn;
    });
  }

  return rows.slice(0, limit).map((r) => r.__row);
}

async function fetchMovies(sb: SB, limit = 7): Promise<PortraitItem[]> {
  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, metadata, item_movies(release_date, channel)")
    .eq("category", "movies")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_movies) ? r.item_movies[0] : r.item_movies;
    const tags: string[] = (r.metadata as any)?.tags ?? [];
    return {
      id: r.id,
      title: r.title,
      cover_url: safeImageUrl(r.cover_url),
      genre: tags[0],
      year: ext?.release_date ? new Date(ext.release_date).getFullYear() : undefined,
      platform: ext?.channel || undefined,
      avg_rating: r.avg_rating,
      href: `/movies/${stripPrefix(r.slug)}`,
    };
  });
}

async function fetchSeries(sb: SB, limit = 5): Promise<PortraitItem[]> {
  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, metadata, item_series(seasons, channel)")
    .eq("category", "series")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_series) ? r.item_series[0] : r.item_series;
    const tags: string[] = (r.metadata as any)?.tags ?? [];
    return {
      id: r.id,
      title: r.title,
      cover_url: safeImageUrl(r.cover_url),
      genre: tags[0],
      seasons: ext?.seasons ?? undefined,
      platform: ext?.channel || undefined,
      avg_rating: r.avg_rating,
      href: `/series/${stripPrefix(r.slug)}`,
    };
  });
}

async function fetchBooks(sb: SB, limit = 5): Promise<PortraitItem[]> {
  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, metadata, item_books(publication_year, writer)")
    .eq("category", "books")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_books) ? r.item_books[0] : r.item_books;
    const tags: string[] = (r.metadata as any)?.tags ?? [];
    return {
      id: r.id,
      title: r.title,
      cover_url: safeImageUrl(r.cover_url),
      genre: tags[0],
      year: ext?.publication_year ?? undefined,
      avg_rating: r.avg_rating,
      href: `/books/${stripPrefix(r.slug)}`,
    };
  });
}

async function fetchRecipes(sb: SB, limit = 5): Promise<LandscapeItem[]> {
  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, rating_count, item_recipes(channel), suggestions(users!suggestions_user_id_fkey(id, handle, display_name, avatar_url, level, suggestion_count, avg_quality_score))")
    .eq("category", "recipes")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_recipes) ? r.item_recipes[0] : r.item_recipes;
    const u = (r.suggestions ?? []).find((s: any) => s?.users?.id)?.users ?? null;
    const suggester = u ? {
      id: u.id, handle: u.handle, display_name: u.display_name,
      avatar_url: u.avatar_url,
      level: u.level ?? undefined,
      suggestion_count: u.suggestion_count ?? undefined,
      avg_quality_score: u.avg_quality_score ?? undefined,
    } : null;
    return {
      id: r.id,
      title: r.title,
      cover_url: safeImageUrl(r.cover_url),
      subtitle: ext?.channel || undefined,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
      href: `/recipes/${stripPrefix(r.slug)}`,
      avatar_url: suggester?.avatar_url ?? null,
      suggester,
    };
  });
}

async function fetchTopUsers(sb: SB, limit = 6, viewerId: string | null = null): Promise<SuggestedUser[]> {
  // Exclude the viewer — showing a user themselves in a "people you might
  // want to follow" carousel is nonsensical (and clicking Follow on
  // yourself does nothing). Over-fetch by 1 to keep the result count
  // stable when the viewer would otherwise have been included.
  let q = sb
    .from("users")
    .select("id, display_name, handle, avatar_url, suggestion_count")
    .order("suggestion_count", { ascending: false })
    .gt("suggestion_count", 0)
    .limit(viewerId ? limit + 1 : limit);
  if (viewerId) q = q.neq("id", viewerId);

  const { data } = await q;
  const users = (data ?? []).slice(0, limit).map((u: any) => ({
    id: u.id as string,
    name: u.display_name as string,
    handle: u.handle as string,
    avatar_url: u.avatar_url as string | null,
    suggestion_count: u.suggestion_count as number | undefined,
  }));

  // Hydrate the viewer's existing follow state for each card so the
  // FollowButton renders with the correct initial state and the toggle
  // hits the right transition direction.
  const followed = await getFollowedSet(sb, viewerId, users.map((u) => u.id));
  return users.map((u) => ({ ...u, is_following: followed.has(u.id) }));
}

async function fetchCategoryChips(sb: SB): Promise<CategoryChip[]> {
  const cats = [
    { slug: "movies",  label: "ΤΑΙΝΙΕΣ" },
    { slug: "series",  label: "ΣΕΙΡΕΣ" },
    { slug: "books",   label: "ΒΙΒΛΙΑ" },
    { slug: "recipes", label: "ΣΥΝΤΑΓΕΣ" },
    { slug: "food",    label: "ΦΑΓΗΤΟ" },
    { slug: "bars",    label: "ΜΠΑΡ & ΚΑΦΕ" },
  ] as const;

  const chips: CategoryChip[] = await Promise.all(
    cats.map(async (c) => {
      const { count } = await sb
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("category", c.slug)
        .eq("is_published", true);
      return { label: c.label, count: count ?? 0, href: `/${c.slug}` };
    }),
  );

  return chips.sort((a, b) => b.count - a.count).slice(0, 4);
}

async function fetchSuggestionFeedItems(sb: SB): Promise<SuggestionFeedItem[]> {
  const categories = ["books", "movies", "recipes", "series", "food", "bars", "events", "theater", "hotels"] as const;
  const all: SuggestionFeedItem[] = [];

  await Promise.all(
    categories.map(async (cat) => {
      const { data } = await sb
        .from("items")
        .select("id, title, slug, cover_url, avg_rating, rating_count, category, metadata")
        .eq("category", cat)
        .eq("is_published", true)
        .order("suggestion_count", { ascending: false })
        .limit(5);

      for (const r of (data ?? []) as any[]) {
        const tags: string[] = r.metadata?.tags ?? [];
        all.push({
          id: r.id,
          title: r.title,
          subtitle: tags[0] ?? r.category,
          avg_rating: r.avg_rating,
          rating_count: r.rating_count,
          is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
          cover_url: safeImageUrl(r.cover_url),
          href: `/${r.category}/${stripPrefix(r.slug)}`,
          category: r.category,
        });
      }
    }),
  );

  return all;
}

/**
 * Total published-suggestion count for the guest hero number badge.
 * Cached for 1 hour — guest landing page doesn't need second-level
 * accuracy and the count is global (not per-viewer). Uses the admin
 * client because `unstable_cache` forbids cookie access in its scope
 * and the cookie-aware client reads cookies in its constructor.
 */
const fetchPublishedSuggestionCount = unstable_cache(
  async (): Promise<number> => {
    const sb = createAdminClient();
    const { count } = await sb
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);
    return count ?? 0;
  },
  ["published-suggestion-count"],
  { revalidate: 3600 },
);

// ── Page ──────────────────────────────────────────────────────────

export default async function HomePage() {
  const sb = createClient();

  let isRegistered = false;
  let displayName = "";
  let viewerRegionId: string | null = null;
  let viewerId: string | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        isRegistered = true;
        const u = session.user;
        viewerId = u.id;
        displayName =
          u.user_metadata?.display_name ??
          u.user_metadata?.full_name ??
          u.email?.split("@")[0] ??
          "";
        const { data: viewerRow } = await sb
          .from("users")
          .select("region_id")
          .eq("id", u.id)
          .maybeSingle();
        viewerRegionId = (viewerRow as { region_id?: string | null } | null)?.region_id ?? null;
      }
    } catch { /* network error — render guest view */ }
  }

  const regionMatchSet = await getRegionMatchSet(sb, viewerRegionId);

  const [food, movies, series, books, recipes, topUsers, chips, feedItems, collections, tonight, layoutSections, suggestionCount] =
    await Promise.all([
      // Bigger fetch limits so static_carousel widgets with custom limits
      // still have material to slice. Each fetcher returns at most the
      // requested count; over-fetch is cheap (avg_rating-ordered top N).
      fetchFoodLandscape(sb, 15, regionMatchSet),
      fetchMovies(sb, 15),
      fetchSeries(sb, 15),
      fetchBooks(sb, 15),
      fetchRecipes(sb, 15),
      fetchTopUsers(sb, 6, viewerId),
      fetchCategoryChips(sb),
      fetchSuggestionFeedItems(sb),
      fetchHomeCollections(sb, isRegistered),
      fetchTonightAirings(sb),
      resolvePageLayout(sb, {
        context: "home",
        category: null,
        viewerAudience: isRegistered ? "registered" : "guest",
      }),
      fetchPublishedSuggestionCount(),
    ]);

  // Layout-driven path. Legacy hardcoded path falls back when the
  // resolver returns nothing (un-applied migration or empty seed).
  if (layoutSections.length > 0) {
    return (
      <div className="space-y-10">
        {layoutSections.map((section) =>
          renderHomeSection(section, {
            isRegistered,
            displayName,
            food, movies, series, books, recipes,
            topUsers, chips, feedItems, tonight,
            suggestionCount,
          })
        )}
      </div>
    );
  }

  if (isRegistered) {
    return (
      <RegisteredHome
        displayName={displayName}
        food={food}
        movies={movies}
        series={series}
        books={books}
        recipes={recipes}
        topUsers={topUsers}
        chips={chips}
        collections={collections}
        tonight={tonight}
      />
    );
  }

  return (
    <GuestHome
      movies={movies}
      series={series}
      books={books}
      recipes={recipes}
      food={food}
      feedItems={feedItems}
      collections={collections}
      tonight={tonight}
      suggestionCount={suggestionCount}
    />
  );
}

// ── Guest home (legacy fallback) ───────────────────────────────────

interface GuestProps {
  movies: PortraitItem[];
  series: PortraitItem[];
  books: PortraitItem[];
  recipes: LandscapeItem[];
  food: LandscapeItem[];
  feedItems: SuggestionFeedItem[];
  collections: HydratedCollection[];
  tonight: TonightAiring[];
  suggestionCount: number;
}

function GuestHome({ movies, series, books, recipes, food, feedItems, collections, tonight, suggestionCount }: GuestProps) {
  const hasCurated = collections.length > 0;

  return (
    <div className="space-y-10">
      <HeroDiscover suggestionCount={suggestionCount} />
      <HeroSuggest />
      <HeroPersonalise />

      <CategoryTiles />

      <MoviesTonightSection airings={tonight} />

      <SuggestionFeed items={feedItems} />

      {hasCurated ? (
        <>
          {collections.map((c) => <CollectionRenderer key={c.collection.id} data={c} />)}
          <HowItWorks />
        </>
      ) : (
        <>
          <CarouselPortrait
            title="Ταινίες"
            items={movies}
            seeAllHref="/movies"
            showLiveIndicator
          />

          <CarouselLandscape
            title="Νέες Συνταγές"
            items={recipes}
            seeAllHref="/recipes"
          />

          <HowItWorks />

          <CarouselLandscape
            title="Δημοφιλή Μαγαζιά"
            items={food}
            seeAllHref="/food"
          />
          <CarouselPortrait
            title="Ολοκληρωμένες Σειρές"
            items={series}
            seeAllHref="/series"
          />
          <CarouselPortrait
            title="Top Βιβλία"
            items={books}
            seeAllHref="/books"
          />
        </>
      )}

      <RegisterPromo />
      <SupportSection />
      <FooterMobile />
    </div>
  );
}

// ── Registered home (legacy fallback) ──────────────────────────────

interface RegisteredProps {
  displayName: string;
  food: LandscapeItem[];
  movies: PortraitItem[];
  series: PortraitItem[];
  books: PortraitItem[];
  recipes: LandscapeItem[];
  topUsers: SuggestedUser[];
  chips: CategoryChip[];
  collections: HydratedCollection[];
  tonight: TonightAiring[];
}

function RegisteredHome({
  displayName,
  food,
  movies,
  series,
  books,
  recipes,
  topUsers,
  chips,
  collections,
  tonight,
}: RegisteredProps) {
  const hasCurated = collections.length > 0;

  return (
    <div className="space-y-10">
      <section className="px-6 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-[34px] leading-none" aria-hidden>👋</span>
          <p className="text-zinc-800 leading-[120%]">
            <span className="text-[26px] font-normal">Γεια σου, </span>
            <span className="text-[28px] font-bold">{displayName}</span>
          </p>
        </div>
      </section>

      <MoviesTonightSection airings={tonight} />

      {hasCurated ? (
        <>
          <CarouselLandscape
            title="Ξεχωρίσαμε για σένα"
            items={food}
            seeAllHref="/food"
          />
          <AIChips chips={chips} />

          {collections.map((c) => <CollectionRenderer key={c.collection.id} data={c} />)}

          <SuggestedUsers users={topUsers} />
        </>
      ) : (
        <>
          <CarouselLandscape
            title="Ξεχωρίσαμε για σένα"
            items={food}
            seeAllHref="/food"
          />

          <AIChips chips={chips} />

          <CarouselPortrait
            title="Ταινίες"
            items={movies}
            seeAllHref="/movies"
            showLiveIndicator
          />

          <CarouselLandscape
            title="Δημοφιλή Γλυκά"
            items={recipes}
            seeAllHref="/recipes"
          />

          <SuggestedUsers users={topUsers} />

          <CarouselLandscape
            title="Δημοφιλή Μαγαζιά"
            items={food}
            seeAllHref="/food"
          />

          <CarouselPortrait
            title="Ολοκληρωμένες Σειρές"
            items={series}
            seeAllHref="/series"
          />

          <CarouselPortrait
            title="Top Βιβλία"
            items={books}
            seeAllHref="/books"
          />
        </>
      )}

      <ContributionCTA username={displayName} />
      <SupportSection />
      <FooterMobile />
    </div>
  );
}
