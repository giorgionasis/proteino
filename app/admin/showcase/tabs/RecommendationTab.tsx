"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { Carousel } from "@/components/recommendation/Carousel";
import { CarouselPortrait } from "@/components/recommendation/CarouselPortrait";
import { CarouselLandscape } from "@/components/recommendation/CarouselLandscape";
import { BecauseYouLiked } from "@/components/recommendation/BecauseYouLiked";
import type { Item } from "@/types";

const ITEM_BASE: Omit<Item, "id" | "category" | "title" | "slug" | "cover_url" | "avg_rating"> = {
  description_seo: null,
  rating_count: 100,
  suggestion_count: 12,
  is_published: true,
  embedding: null,
  created_at: "2025-01-01",
  modified_at: "2025-01-01",
};

const ITEMS: Item[] = [
  {
    ...ITEM_BASE,
    id: "1",
    category: "movies",
    title: "Oppenheimer",
    slug: "movies/oppenheimer",
    cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
    avg_rating: 4.74,
  },
  {
    ...ITEM_BASE,
    id: "2",
    category: "series",
    title: "Ozark",
    slug: "series/ozark",
    cover_url: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400",
    avg_rating: 4.6,
  },
  {
    ...ITEM_BASE,
    id: "3",
    category: "books",
    title: "Άγριες ανεμώνες",
    slug: "books/agries-anemones",
    cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
    avg_rating: 4.5,
  },
];

export function RecommendationTab() {
  return (
    <>
      <CarouselShowcase />
      <CarouselPortraitShowcase />
      <CarouselLandscapeShowcase />
      <BecauseYouLikedShowcase />
      <CollectionRendererShowcase />
    </>
  );
}

function CarouselShowcase() {
  return (
    <ShowcaseSection
      name="Carousel (legacy)"
      filePath="components/recommendation/Carousel.tsx"
      description="Older generic horizontal-scroll carousel — accepts raw Item[] from the DB. Simple title + 'Δες όλα' link header. Still used in some home sections; CarouselPortrait/CarouselLandscape are richer replacements."
      contextLinks={[{ label: "Live (home guest)", href: "/" }]}
    >
      <Variant label="3 items">
        <div className="w-[640px] -mx-4">
          <Carousel title="Δημοφιλέστερα τώρα" items={ITEMS} />
        </div>
      </Variant>
      <Variant label="With see-all link">
        <div className="w-[640px] -mx-4">
          <Carousel title="Νέες προτάσεις" items={ITEMS} seeAllHref="/movies" />
        </div>
      </Variant>
      <Variant label="Empty list (renders nothing)">
        <div className="w-[640px] text-xs text-zinc-400 italic text-center">
          (no render — items.length === 0)
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CarouselPortraitShowcase() {
  return (
    <ShowcaseSection
      name="CarouselPortrait"
      filePath="components/recommendation/CarouselPortrait.tsx"
      description="Portrait-poster carousel for movies/series/books. Big 200×300 posters + per-item header (platform badge + seasons), title, genre/year. Live indicator dot + see-all link in header."
      contextLinks={[{ label: "Live (home)", href: "/" }]}
    >
      <Variant label="With platform badges + see-all">
        <div className="w-[640px] -mx-4">
          <CarouselPortrait
            title="Tailored for You"
            seeAllHref="/movies"
            items={[
              {
                id: "p1",
                title: "Ozark",
                cover_url: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400",
                platform: "Netflix",
                seasons: 4,
                genre: "Δράμα",
                avg_rating: 4.6,
                href: "/series/ozark",
              },
              {
                id: "p2",
                title: "Oppenheimer",
                cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
                year: 2023,
                genre: "Δράμα",
                avg_rating: 4.74,
                href: "/movies/oppenheimer",
              },
              {
                id: "p3",
                title: "Άγριες ανεμώνες",
                cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
                year: 2024,
                avg_rating: 4.5,
                href: "/books/agries-anemones",
              },
            ]}
          />
        </div>
      </Variant>
      <Variant label="With live indicator (animate)">
        <div className="w-[640px] -mx-4">
          <CarouselPortrait
            title="Επειδή σου άρεσε Inception"
            showLiveIndicator
            items={[
              {
                id: "p1",
                title: "Tenet",
                cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
                year: 2020,
                genre: "Sci-Fi",
                avg_rating: 4.4,
                href: "/movies/tenet",
              },
              {
                id: "p2",
                title: "Interstellar",
                cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
                year: 2014,
                genre: "Sci-Fi",
                avg_rating: 4.8,
                href: "/movies/interstellar",
              },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CarouselLandscapeShowcase() {
  return (
    <ShowcaseSection
      name="CarouselLandscape"
      filePath="components/recommendation/CarouselLandscape.tsx"
      description="Landscape carousel for venues + recipes — 300×200 image with optional Top rated badge + suggester avatar overlay. Sub-line is 'subtitle · location' format. Optional `portrait` flag toggles to 160×240 mini-poster for compact spots."
      contextLinks={[{ label: "Live (home)", href: "/" }]}
    >
      <Variant label="Hotel landscape (with avatar + Top rated)">
        <div className="w-[640px] -mx-4">
          <CarouselLandscape
            title="Νέα στην πλατφόρμα"
            seeAllHref="/hotels"
            items={[
              {
                id: "h1",
                title: "Grande Bretagne",
                cover_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
                subtitle: "Ξενοδοχείο",
                location: "Σύνταγμα",
                avg_rating: 4.81,
                rating_count: 188,
                avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120",
                is_top_rated: true,
                href: "/hotels/grande-bretagne",
              },
              {
                id: "h2",
                title: "Momo",
                cover_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
                subtitle: "Ασιατική",
                location: "Παγκράτι",
                avg_rating: 4.5,
                rating_count: 28,
                href: "/food/momo",
              },
            ]}
          />
        </div>
      </Variant>
      <Variant label="Portrait flag (mini posters)">
        <div className="w-[640px] -mx-4">
          <CarouselLandscape
            title="Επιλογές της εβδομάδας"
            portrait
            items={[
              {
                id: "p1",
                title: "Oppenheimer",
                cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
                subtitle: "Δράμα",
                avg_rating: 4.74,
                rating_count: 123,
                is_top_rated: true,
                href: "/movies/oppenheimer",
              },
              {
                id: "p2",
                title: "Tenet",
                cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
                subtitle: "Sci-Fi",
                avg_rating: 4.4,
                rating_count: 67,
                href: "/movies/tenet",
              },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function BecauseYouLikedShowcase() {
  return (
    <ShowcaseSection
      name="BecauseYouLiked"
      filePath="components/recommendation/BecauseYouLiked.tsx"
      description={`Themed carousel anchored to a specific item — small 'ΕΠΕΙΔΗ ΣΟΥ ΑΡΕΣΕ' label + bold title + horizontal scroll of recommendations. Used as one of the home-feed personalization sections.`}
      contextLinks={[{ label: "Live (home registered)", href: "/" }]}
    >
      <Variant label="3 recommendations from a movie">
        <div className="w-[640px] -mx-4">
          <BecauseYouLiked because={ITEMS[0]} recommendations={ITEMS.slice(1).concat(ITEMS)} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CollectionRendererShowcase() {
  return (
    <ShowcaseSection
      name="CollectionRenderer"
      filePath="components/recommendation/CollectionRenderer.tsx"
      description="Server-side renderer that picks the right visual for a HydratedCollection: Card collection → CollectionCard pill (link to filtered list); Carousel collection → CarouselPortrait or CarouselLandscape based on source category. Empty collections render nothing."
      contextLinks={[
        { label: "Live (home, when admin curates)", href: "/" },
        { label: "Admin manage", href: "/admin/content/collections" },
      ]}
    >
      <Variant label="Server component — see live link" note="Requires HydratedCollection from lib/collections.ts">
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Πραγματικό demo στο link — απαιτεί supabase fetch.
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
