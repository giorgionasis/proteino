"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { CategoryCard, type CategoryItem } from "@/components/category/CategoryCard";
import { FeaturedCard } from "@/components/category/FeaturedCard";
import { SubCategoryTabs } from "@/components/category/SubCategoryTabs";
import { FilterRow } from "@/components/category/FilterRow";
import { FilterBottomSheet } from "@/components/category/FilterBottomSheet";
import { CategoryHeroStats } from "@/components/category/CategoryHeroStats";
import { CategoryTopUsers } from "@/components/category/CategoryTopUsers";

const SAMPLE_MOVIE: CategoryItem = {
  id: "m1",
  slug: "movies/oppenheimer",
  title: "Oppenheimer",
  subcategory: "Δράμα",
  year: 2023,
  avg_rating: 4.74,
  rating_count: 123,
  cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
  director: "Christopher Nolan",
  suggestedBy: { names: ["George"], extra: 12 },
};

const SAMPLE_BOOK: CategoryItem = {
  id: "b1",
  slug: "books/agries-anemones",
  title: "Άγριες ανεμώνες",
  subcategory: "Μυθιστόρημα",
  year: 2024,
  avg_rating: 4.5,
  rating_count: 42,
  cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
  writer: "Sebastian Fitzek",
  suggestedBy: { names: ["Kassi"], extra: 7 },
};

const SAMPLE_HOTEL: CategoryItem = {
  id: "h1",
  slug: "hotels/grande-bretagne",
  title: "Grande Bretagne Athens",
  subcategory: "Ξενοδοχείο",
  area: "Σύνταγμα",
  avg_rating: 4.81,
  rating_count: 188,
  cover_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
  isNew: true,
  suggestedBy: { names: ["Maria"], extra: 4 },
};

const SAMPLE_FOOD: CategoryItem = {
  id: "f1",
  slug: "food/momo",
  title: "Momo",
  subcategory: "Ασιατική",
  area: "Παγκράτι",
  avg_rating: 4.5,
  rating_count: 28,
  cover_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
  delivery: ["efood", "Wolt"],
  foodType: "Sushi",
  suggestedBy: { names: ["Nikos"], extra: 9 },
};

export function CategoryTab() {
  return (
    <>
      <CategoryCardShowcase />
      <FeaturedCardShowcase />
      <SubCategoryTabsShowcase />
      <FilterRowShowcase />
      <FilterBottomSheetShowcase />
      <CategoryHeroStatsShowcase />
      <CategoryTopUsersShowcase />
    </>
  );
}

function CategoryCardShowcase() {
  return (
    <ShowcaseSection
      name="CategoryCard"
      filePath="components/category/CategoryCard.tsx"
      description="The 1-col list card on every category page. Internally swaps to RowCard for portrait categories (movies/series/books — small poster left + info right) and LandscapeCard for landscape categories (food/bars/hotels/theater/events/recipes — full-width 16:10 image)."
      contextLinks={[
        { label: "Live (movies)", href: "/movies" },
        { label: "Live (food)", href: "/food" },
      ]}
    >
      <Variant label="Movie · RowCard variant">
        <div className="w-[360px]">
          <CategoryCard item={SAMPLE_MOVIE} category="movies" />
        </div>
      </Variant>
      <Variant label="Book · RowCard with writer byline">
        <div className="w-[360px]">
          <CategoryCard item={SAMPLE_BOOK} category="books" />
        </div>
      </Variant>
      <Variant label="Hotel · LandscapeCard with Top rated badge">
        <div className="w-[360px]">
          <CategoryCard item={SAMPLE_HOTEL} category="hotels" />
        </div>
      </Variant>
      <Variant label="Food · LandscapeCard with delivery chips">
        <div className="w-[360px]">
          <CategoryCard item={SAMPLE_FOOD} category="food" />
        </div>
      </Variant>
      <Variant label="No image (placeholder bg)">
        <div className="w-[360px]">
          <CategoryCard
            item={{ ...SAMPLE_MOVIE, cover_url: null, title: "Untitled" }}
            category="movies"
          />
        </div>
      </Variant>
      <Variant label="Series with channel byline">
        <div className="w-[360px]">
          <CategoryCard
            item={{
              ...SAMPLE_MOVIE,
              id: "s1",
              slug: "series/ozark",
              title: "Ozark",
              channel: "Netflix",
              year: 2017,
              cover_url: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400",
            }}
            category="series"
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FeaturedCardShowcase() {
  return (
    <ShowcaseSection
      name="FeaturedCard"
      filePath="components/category/FeaturedCard.tsx"
      description="Big hero card on category pages — gradient bg keyed to category, ΠΡΟΤΕΙΝΕΤΑΙ badge, title + meta + rating. Renders before the first list of items."
      contextLinks={[{ label: "Live (movies)", href: "/movies" }]}
    >
      <Variant label="Movie">
        <div className="w-[400px]">
          <FeaturedCard
            item={{
              id: "f1",
              title: "Oppenheimer",
              subcategory: "Δράμα",
              year: 2023,
              avg_rating: 4.74,
              cover_url: null,
            }}
            category="movies"
          />
        </div>
      </Variant>
      <Variant label="Hotel · custom badge">
        <div className="w-[400px]">
          <FeaturedCard
            item={{
              id: "h1",
              title: "Grande Bretagne Athens",
              subcategory: "Πολυτελές ξενοδοχείο",
              area: "Σύνταγμα",
              avg_rating: 4.81,
              cover_url: null,
              badge: "ΕΠΙΛΟΓΗ ΣΥΝΤΑΚΤΩΝ",
            }}
            category="hotels"
          />
        </div>
      </Variant>
      <Variant label="Recipe">
        <div className="w-[400px]">
          <FeaturedCard
            item={{
              id: "r1",
              title: "Red Velvet",
              subcategory: "Επιδόρπιο",
              avg_rating: 4.6,
              cover_url: null,
            }}
            category="recipes"
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SubCategoryTabsShowcase() {
  const [tab1, setTab1] = useState("Όλα");
  const [tab2, setTab2] = useState("Δράμα");
  return (
    <ShowcaseSection
      name="SubCategoryTabs"
      filePath="components/category/SubCategoryTabs.tsx"
      description="Sticky horizontal-scroll tabs at the top of every category page. Sub-category dimension differs per category (Genre / Cuisine / Type / City). Always prepends an 'Όλα' option."
      contextLinks={[{ label: "Live (movies)", href: "/movies" }]}
    >
      <Variant label="Όλα active">
        <div className="w-[400px]">
          <SubCategoryTabs
            tabs={["Δράμα", "Κωμωδία", "Θρίλερ", "Sci-Fi", "Animation"]}
            active={tab1}
            onChange={setTab1}
          />
        </div>
      </Variant>
      <Variant label="Specific genre active (scrolls)">
        <div className="w-[400px]">
          <SubCategoryTabs
            tabs={["Δράμα", "Κωμωδία", "Θρίλερ", "Sci-Fi", "Animation", "Ντοκιμαντέρ", "Horror"]}
            active={tab2}
            onChange={setTab2}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FilterRowShowcase() {
  return (
    <ShowcaseSection
      name="FilterRow"
      filePath="components/category/FilterRow.tsx"
      description="Quick-filter chip strip below the SubCategoryTabs. ⊞ Filters button (with active count badge) opens the bottom sheet; optional 📍 Κοντά μου for food/bars; rest are dropdown chips."
      contextLinks={[{ label: "Live (food)", href: "/food" }]}
    >
      <Variant label="Default — no active filters">
        <div className="w-[400px] bg-white border-b border-zinc-100">
          <FilterRow
            quickFilters={[
              { id: "platform", label: "Platform" },
              { id: "year", label: "Εποχή" },
            ]}
            onOpenFilters={() => {}}
          />
        </div>
      </Variant>
      <Variant label="With active count + nearby">
        <div className="w-[400px] bg-white border-b border-zinc-100">
          <FilterRow
            quickFilters={[
              { id: "region", label: "Περιοχή" },
              { id: "price", label: "Τιμή" },
            ]}
            hasNearby
            activeCount={3}
            onOpenFilters={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Hotel quick filters">
        <div className="w-[400px] bg-white border-b border-zinc-100">
          <FilterRow
            quickFilters={[
              { id: "price-night", label: "Τιμή/νύχτα" },
              { id: "stars", label: "Αστέρια" },
            ]}
            onOpenFilters={() => {}}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FilterBottomSheetShowcase() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  return (
    <ShowcaseSection
      name="FilterBottomSheet"
      filePath="components/category/FilterBottomSheet.tsx"
      description="Full-screen filter panel — slide-up from bottom. Sort row + per-filter widgets (dropdown / search-dropdown / segmented / platform-cards / icon-cards / checkboxes / price-range / origin-cards). Live result count on the apply button."
      contextLinks={[{ label: "Live (any category · ⊞ Filters)", href: "/movies" }]}
    >
      <Variant label="Open for movies">
        <button
          onClick={() => setOpen1(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open filters · movies
        </button>
        <FilterBottomSheet
          open={open1}
          onClose={() => setOpen1(false)}
          category="movies"
          values={{}}
          onChange={() => {}}
          resultCount={342}
        />
      </Variant>
      <Variant label="Open for hotels (icon-cards + price-range)">
        <button
          onClick={() => setOpen2(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open filters · hotels
        </button>
        <FilterBottomSheet
          open={open2}
          onClose={() => setOpen2(false)}
          category="hotels"
          values={{}}
          onChange={() => {}}
          resultCount={87}
        />
      </Variant>
    </ShowcaseSection>
  );
}

function CategoryHeroStatsShowcase() {
  return (
    <ShowcaseSection
      name="CategoryHeroStats"
      filePath="components/category/CategoryHeroStats.tsx"
      description="Top of category page: big formatted item count + descriptor + (for venues) Χάρτης / Λίστα toggle pair."
      contextLinks={[{ label: "Live (food)", href: "/food" }]}
    >
      <Variant label="No map (movies)">
        <div className="w-[400px] bg-white">
          <CategoryHeroStats
            count={342}
            categoryLabel="Ταινίες"
            hasMap={false}
            onToggleMap={() => {}}
          />
        </div>
      </Variant>
      <Variant label="With map toggle (food)">
        <div className="w-[400px] bg-white">
          <CategoryHeroStats
            count={234}
            categoryLabel="Εστιατόρια"
            hasMap
            onToggleMap={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Large count (>1000)">
        <div className="w-[400px] bg-white">
          <CategoryHeroStats
            count={1953}
            categoryLabel="Βιβλία"
            hasMap={false}
            onToggleMap={() => {}}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CategoryTopUsersShowcase() {
  return (
    <ShowcaseSection
      name="CategoryTopUsers"
      filePath="components/category/CategoryTopUsers.tsx"
      description="Top contributors block at the bottom of category pages. Single #1 hero (with avatar + 3-stat row + Follow CTA) + 2-col grid of next contributors + leaderboard CTA at the end."
      contextLinks={[{ label: "Live (movies)", href: "/movies" }]}
    >
      <Variant label="Full layout (3 contributors)">
        <div className="w-[400px] bg-white">
          <CategoryTopUsers
            categoryLabel="Ταινίες"
            topUser={{
              id: "u1",
              name: "George Nasis",
              handle: "george",
              rank: 1,
              total_users: 627,
              suggestion_count: 47,
              avg_rating: 4.71,
              badge: "EXPERT",
            }}
            contributors={[
              { id: "u2", name: "Maria K.", handle: "mariak", suggestion_count: 32 },
              { id: "u3", name: "Νίκος Π.", handle: "nikosp", suggestion_count: 28 },
              { id: "u4", name: "Kassi", handle: "kassi", suggestion_count: 19 },
              { id: "u5", name: "Anny T.", handle: "annyt", suggestion_count: 14 },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
