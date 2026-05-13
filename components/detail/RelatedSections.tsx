/**
 * Renders the "More from {axis}" carousels on item detail pages.
 *
 * Sections come from lib/related-sections.ts (admin-configurable rules,
 * auto-hidden when min_items isn't met). Each section renders as a
 * CarouselPortrait (movies/series/books) or CarouselLandscape (everything
 * else) based on the current item's category.
 *
 * Returns null when sections is empty — never renders a heading or
 * placeholder for a category whose admin hasn't configured any rules
 * (or whose siblings haven't met the threshold for any rule).
 */

import { CarouselPortrait, type PortraitItem } from "@/components/recommendation/CarouselPortrait";
import { CarouselLandscape, type LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import type { CategorySlug } from "@/types";
import type { RelatedSection } from "@/lib/related-sections";

const PORTRAIT_CATEGORIES = new Set<CategorySlug>(["movies", "series", "books"]);

interface Props {
  sections: RelatedSection[];
  category: CategorySlug;
}

export function RelatedSections({ sections, category }: Props) {
  if (sections.length === 0) return null;
  const isPortrait = PORTRAIT_CATEGORIES.has(category);

  return (
    <div className="space-y-12 mt-12">
      {sections.map((section) =>
        isPortrait
          ? <CarouselPortrait
              key={section.ruleId}
              title={section.title}
              items={section.items.map(toPortrait)}
              seeAllHref={`/${category}`}
            />
          : <CarouselLandscape
              key={section.ruleId}
              title={section.title}
              items={section.items.map(toLandscape)}
              seeAllHref={`/${category}`}
            />
      )}
    </div>
  );
}

/* ─── Item shape adapters ─────────────────────────────────────────── */

function toPortrait(it: RelatedSection["items"][number]): PortraitItem {
  return {
    id: it.id,
    title: it.title,
    cover_url: it.cover_url,
    avg_rating: it.avg_rating,
    href: `/${it.category}/${it.slug}`,
  };
}

function toLandscape(it: RelatedSection["items"][number]): LandscapeItem {
  return {
    id: it.id,
    title: it.title,
    cover_url: it.cover_url,
    avg_rating: it.avg_rating,
    rating_count: it.rating_count,
    is_top_rated: it.avg_rating >= 4.5 && it.rating_count >= 5,
    href: `/${it.category}/${it.slug}`,
  };
}
