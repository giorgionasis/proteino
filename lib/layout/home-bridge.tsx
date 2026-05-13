/**
 * Home page widget render bridge.
 *
 * Maps a RenderedSection (from resolvePageLayout) to its JSX for the
 * home page. Lives outside app/(main)/page.tsx because Next.js disallows
 * extra exports from page.tsx; the home preview route imports it too.
 *
 * The bridge takes the data buckets fetched server-side by the home
 * page (food / movies / series / books / recipes etc.) and routes each
 * widget to the appropriate component.
 */

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
import type { HydratedCollection, HydratedItem } from "@/lib/collections";
import type { TonightAiring } from "@/lib/movies-tonight";
import type { RenderedSection } from "./types";

export interface HomeRenderContext {
  isRegistered: boolean;
  displayName: string;
  food: LandscapeItem[];
  movies: PortraitItem[];
  series: PortraitItem[];
  books: PortraitItem[];
  recipes: LandscapeItem[];
  topUsers: SuggestedUser[];
  chips: CategoryChip[];
  feedItems: SuggestionFeedItem[];
  tonight: TonightAiring[];
}

const PORTRAIT_CATEGORIES = new Set(["movies", "series", "books"]);

export function renderHomeSection(section: RenderedSection, ctx: HomeRenderContext): React.ReactNode {
  if (section.kind === "divider") {
    const config = section.config as { spacing?: number };
    return <div key={section.row.id} style={{ height: config.spacing ?? 24 }} aria-hidden />;
  }

  if (section.kind === "collection") {
    return (
      <CollectionRenderer
        key={section.row.id}
        data={{
          collection: {
            ...section.collection,
            is_published: true,
            target_audience: section.row.audience,
            valid_from: section.row.valid_from,
            valid_until: section.row.valid_until,
          } as HydratedCollection["collection"],
          items: section.items as HydratedItem[],
          total: section.items.length,
        }}
      />
    );
  }

  // widget
  switch (section.widgetKey) {
    case "greeting":
      return <GreetingBlock key={section.row.id} displayName={ctx.displayName} />;

    case "hero_discover":     return <HeroDiscover key={section.row.id} />;
    case "hero_suggest":      return <HeroSuggest key={section.row.id} />;
    case "hero_personalise":  return <HeroPersonalise key={section.row.id} />;
    case "category_tiles":    return <CategoryTiles key={section.row.id} />;
    case "how_it_works":      return <HowItWorks key={section.row.id} />;
    case "register_promo":    return <RegisterPromo key={section.row.id} />;
    case "support_section":   return <SupportSection key={section.row.id} />;
    case "footer_mobile":     return <FooterMobile key={section.row.id} />;

    case "movies_tonight":
      if (!ctx.tonight || ctx.tonight.length === 0) return null;
      return <MoviesTonightSection key={section.row.id} airings={ctx.tonight} />;

    case "suggestion_feed":
      return <SuggestionFeed key={section.row.id} items={ctx.feedItems} />;

    case "ai_chips":
      return <AIChips key={section.row.id} chips={ctx.chips} />;

    case "suggested_users":
      return <SuggestedUsers key={section.row.id} users={ctx.topUsers} />;

    case "contribution_cta":
      return <ContributionCTA key={section.row.id} username={ctx.displayName} />;

    case "static_carousel": {
      const config = section.config as {
        title?: string;
        source?: string;
        category?: string;
        offset?: number;
        limit?: number;
      };
      const cat = config.category ?? "food";
      const offset = typeof config.offset === "number" ? config.offset : 0;
      const limit  = typeof config.limit  === "number" ? config.limit  : 5;
      const isPortrait = PORTRAIT_CATEGORIES.has(cat);

      const sliceBucket = <T,>(bucket: T[]) => bucket.slice(offset, offset + limit);

      if (isPortrait) {
        const bucket =
          cat === "movies" ? ctx.movies :
          cat === "series" ? ctx.series :
          cat === "books"  ? ctx.books  :
          [];
        const items = sliceBucket(bucket);
        if (items.length === 0) return null;
        return (
          <CarouselPortrait
            key={section.row.id}
            title={config.title ?? ""}
            items={items}
            seeAllHref={`/${cat}`}
            showLiveIndicator={cat === "movies"}
          />
        );
      }

      const bucket =
        cat === "food"    ? ctx.food    :
        cat === "recipes" ? ctx.recipes :
        [];
      const items = sliceBucket(bucket);
      if (items.length === 0) return null;
      return (
        <CarouselLandscape
          key={section.row.id}
          title={config.title ?? ""}
          items={items}
          seeAllHref={`/${cat}`}
        />
      );
    }

    // Widgets registered for `category` context but somehow seeded onto
    // home: silently skip.
    case "welcome_header":
    case "sub_category_tabs":
    case "filter_row":
    case "open_map_button":
    case "items_list":
    case "category_top_users":
    case "suggest_box":
      return null;

    default:
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[HomePage] No render bridge for widget_key: ${section.widgetKey}`);
      }
      return null;
  }
}

function GreetingBlock({ displayName }: { displayName: string }) {
  return (
    <section className="px-6 pt-6">
      <div className="flex items-center gap-3">
        <span className="text-[34px] leading-none" aria-hidden>👋</span>
        <p className="text-zinc-800 leading-[120%]">
          <span className="text-[26px] font-normal">Γεια σου, </span>
          <span className="text-[28px] font-bold">{displayName}</span>
        </p>
      </div>
    </section>
  );
}
