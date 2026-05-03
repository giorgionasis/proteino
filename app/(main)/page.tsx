import type { Metadata } from "next";
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
import { createClient } from "@/lib/supabase/server";

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

async function fetchFoodLandscape(sb: SB, limit = 5): Promise<LandscapeItem[]> {
  const { data } = await sb
    .from("items")
    .select("id, title, slug, cover_url, avg_rating, rating_count, item_food(cuisine, type, address)")
    .eq("category", "food")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_food) ? r.item_food[0] : r.item_food;
    return {
      id: r.id,
      title: r.title,
      cover_url: r.cover_url,
      subtitle: ext?.cuisine || ext?.type || "Εστιατόριο",
      location: extractArea(ext?.address),
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
      href: `/food/${stripPrefix(r.slug)}`,
    };
  });
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
      cover_url: r.cover_url,
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
      cover_url: r.cover_url,
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
      cover_url: r.cover_url,
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
    .select("id, title, slug, cover_url, avg_rating, rating_count, item_recipes(channel)")
    .eq("category", "recipes")
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_recipes) ? r.item_recipes[0] : r.item_recipes;
    return {
      id: r.id,
      title: r.title,
      cover_url: r.cover_url,
      subtitle: ext?.channel || undefined,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
      href: `/recipes/${stripPrefix(r.slug)}`,
    };
  });
}

async function fetchTopUsers(sb: SB, limit = 6): Promise<SuggestedUser[]> {
  const { data } = await sb
    .from("users")
    .select("id, display_name, handle, avatar_url, suggestion_count")
    .order("suggestion_count", { ascending: false })
    .gt("suggestion_count", 0)
    .limit(limit);

  return (data ?? []).map((u: any) => ({
    id: u.id,
    name: u.display_name,
    handle: u.handle,
    avatar_url: u.avatar_url,
    suggestion_count: u.suggestion_count,
  }));
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
          cover_url: r.cover_url,
          href: `/${r.category}/${stripPrefix(r.slug)}`,
          category: r.category,
        });
      }
    }),
  );

  return all;
}

// ── Page ──────────────────────────────────────────────────────────

export default async function HomePage() {
  const sb = createClient();

  let isRegistered = false;
  let displayName = "";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        isRegistered = true;
        const u = session.user;
        displayName =
          u.user_metadata?.display_name ??
          u.user_metadata?.full_name ??
          u.email?.split("@")[0] ??
          "";
      }
    } catch { /* network error — render guest view */ }
  }

  const [food, movies, series, books, recipes, topUsers, chips, feedItems] =
    await Promise.all([
      fetchFoodLandscape(sb),
      fetchMovies(sb),
      fetchSeries(sb),
      fetchBooks(sb),
      fetchRecipes(sb),
      fetchTopUsers(sb),
      fetchCategoryChips(sb),
      fetchSuggestionFeedItems(sb),
    ]);

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
    />
  );
}

// ── Guest home ───────────────────────────────────────────────────

interface GuestProps {
  movies: PortraitItem[];
  series: PortraitItem[];
  books: PortraitItem[];
  recipes: LandscapeItem[];
  food: LandscapeItem[];
  feedItems: SuggestionFeedItem[];
}

function GuestHome({ movies, series, books, recipes, food, feedItems }: GuestProps) {
  return (
    <div className="space-y-10">
      <HeroDiscover />
      <HeroSuggest />
      <HeroPersonalise />

      <CategoryTiles />

      <SuggestionFeed items={feedItems} />

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

      <RegisterPromo />
      <SupportSection />
      <FooterMobile />
    </div>
  );
}

// ── Registered home ──────────────────────────────────────────────

interface RegisteredProps {
  displayName: string;
  food: LandscapeItem[];
  movies: PortraitItem[];
  series: PortraitItem[];
  books: PortraitItem[];
  recipes: LandscapeItem[];
  topUsers: SuggestedUser[];
  chips: CategoryChip[];
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
}: RegisteredProps) {
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

      <ContributionCTA username={displayName} />
      <SupportSection />
      <FooterMobile />
    </div>
  );
}
