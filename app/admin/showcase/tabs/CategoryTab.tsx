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
import { TwoStepListPicker, type TwoStepNode } from "@/components/filters/TwoStepListPicker";
import { GroupedCheckboxList, type GroupedListGroup } from "@/components/filters/GroupedCheckboxList";
import { Icon } from "@/components/ui/Icon";

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
      <RegionPickerShowcase />
      <AwardsPickerShowcase />
      <CategoryHeroStatsShowcase />
      <CategoryTopUsersShowcase />
    </>
  );
}

const REGION_DATA: TwoStepNode[] = [
  {
    id: "argosaronikos", label: "Αργοσαρωνικός", count: 29,
    children: [
      { id: "aigina", label: "Αίγινα", count: 12 },
      { id: "spetses", label: "Σπέτσες", count: 9 },
      { id: "poros", label: "Πόρος", count: 5 },
      { id: "ydra", label: "Ύδρα", count: 3 },
    ],
  },
  {
    id: "attiki", label: "Αττική", count: 382,
    children: [
      { id: "ampelokipoi", label: "Αμπελόκηποι", count: 56 },
      { id: "ano-patisia", label: "Άνω Πατήσια", count: 45 },
      { id: "voula", label: "Βούλα", count: 34 },
      { id: "vyronas", label: "Βύρωνας", count: 23 },
      { id: "galatsi", label: "Γαλάτσι", count: 16 },
      { id: "gerakas", label: "Γέρακας", count: 8 },
      { id: "glyka-nera", label: "Γλυκά Νερά", count: 6 },
      { id: "glyfada", label: "Γλυφάδα", count: 34 },
      { id: "dafni", label: "Δάφνη", count: 35 },
      { id: "ellinikos", label: "Ελληνικό", count: 35 },
      { id: "exarcheia", label: "Εξάρχεια", count: 28 },
      { id: "kifisia", label: "Κηφισιά", count: 41 },
      { id: "kolonaki", label: "Κολωνάκι", count: 22 },
    ],
  },
  {
    id: "boreio-aigaio", label: "Βόρειο Αιγαίο", count: 76,
    children: [
      { id: "lesvos", label: "Λέσβος", count: 32 },
      { id: "chios", label: "Χίος", count: 24 },
      { id: "samos", label: "Σάμος", count: 20 },
    ],
  },
  {
    id: "dodekanisa", label: "Δωδεκάνησα", count: 45,
    children: [
      { id: "rodos", label: "Ρόδος", count: 28 },
      { id: "kos", label: "Κως", count: 12 },
      { id: "patmos", label: "Πάτμος", count: 5 },
    ],
  },
  {
    id: "evvoia", label: "Εύβοια", count: 98,
    children: [
      { id: "chalkida", label: "Χαλκίδα", count: 42 },
      { id: "eretria", label: "Ερέτρια", count: 18 },
      { id: "karystos", label: "Κάρυστος", count: 38 },
    ],
  },
  {
    id: "thessalia", label: "Θεσσαλία", count: 78,
    children: [
      { id: "volos", label: "Βόλος", count: 38 },
      { id: "larisa", label: "Λάρισα", count: 22 },
      { id: "trikala", label: "Τρίκαλα", count: 18 },
    ],
  },
  {
    id: "ionio", label: "Ιόνιο", count: 118,
    children: [
      { id: "kerkyra", label: "Κέρκυρα", count: 52 },
      { id: "kefalonia", label: "Κεφαλονιά", count: 36 },
      { id: "zakynthos", label: "Ζάκυνθος", count: 30 },
    ],
  },
  {
    id: "kentriki-makedonia", label: "Κεντρική Μακεδονία", count: 68,
    children: [
      { id: "thessaloniki", label: "Θεσσαλονίκη", count: 48 },
      { id: "chalkidiki", label: "Χαλκιδική", count: 20 },
    ],
  },
  {
    id: "kriti", label: "Κρήτη", count: 238,
    children: [
      { id: "iraklio", label: "Ηράκλειο", count: 88 },
      { id: "chania", label: "Χανιά", count: 76 },
      { id: "rethymno", label: "Ρέθυμνο", count: 42 },
      { id: "lasithi", label: "Λασίθι", count: 32 },
    ],
  },
  {
    id: "kyklades", label: "Κυκλάδες", count: 56,
    children: [
      { id: "santorini", label: "Σαντορίνη", count: 22 },
      { id: "mykonos", label: "Μύκονος", count: 18 },
      { id: "naxos", label: "Νάξος", count: 16 },
    ],
  },
  {
    id: "peloponnisos", label: "Πελοπόννησος", count: 34,
    children: [
      { id: "nafplio", label: "Ναύπλιο", count: 14 },
      { id: "kalamata", label: "Καλαμάτα", count: 12 },
      { id: "patra", label: "Πάτρα", count: 8 },
    ],
  },
];

const TOTAL_REGION_COUNT = REGION_DATA.reduce((sum, r) => sum + r.count, 0);

function RegionPickerShowcase() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["galatsi", "voula"]));

  const liveCount = (() => {
    if (selected.size === 0) return TOTAL_REGION_COUNT;
    let n = 0;
    for (const p of REGION_DATA) {
      for (const c of p.children) if (selected.has(c.id)) n += c.count;
    }
    return n;
  })();

  return (
    <ShowcaseSection
      name="TwoStepListPicker (Region)"
      filePath="components/filters/TwoStepListPicker.tsx"
      description="Two-step parent → children filter picker. Step 1 lists regions with chevrons; selecting any drills into Step 2 with checkboxes for sub-areas. Selections persist across parents (e.g. select sub-areas in Αττική, go back, drill into Κρήτη, select more). 'Όλη η Αττική' auto-selects all sub-areas of Attica. Step 1 shows 'X επιλεγμένα' badge when a parent has any children selected. Slides horizontally on navigation."
      contextLinks={[{ label: "Live (food)", href: "/food" }]}
    >
      <Variant label="Empty selection" note="Default state — no sub-areas chosen, count shows total">
        <div className="w-[390px] h-[700px] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <TwoStepListPicker
            title="Περιοχή"
            parents={REGION_DATA}
            selected={new Set()}
            onSelectionChange={() => {}}
            resultCount={TOTAL_REGION_COUNT}
            onClearAll={() => {}}
          />
        </div>
      </Variant>

      <Variant label="With selections (interactive)" note="Try drilling into Αττική — pre-selected: Γαλάτσι + Βούλα">
        <div className="w-[390px] h-[700px] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <TwoStepListPicker
            title="Περιοχή"
            parents={REGION_DATA}
            selected={selected}
            onSelectionChange={setSelected}
            resultCount={liveCount}
            onClearAll={() => setSelected(new Set())}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

const AWARDS_DATA: GroupedListGroup[] = [
  {
    id: "oscar",
    label: "ΟΣΚΑΡ",
    icon: <Icon name="oscar-best-picture" size={24} />,
    items: [
      { id: "oscar-best-picture", label: "Καλύτερης Ταινίας", count: 17 },
      { id: "oscar-best-actor", label: "Α' Ανδρικού", count: 3 },
      { id: "oscar-best-actress", label: "Α' Γυναικείου", count: 6 },
      { id: "oscar-best-director", label: "Καλύτερης Σκηνοθεσίας", count: 5 },
      { id: "oscar-best-screenplay", label: "Καλύτερου Σεναρίου", count: 2 },
      { id: "oscar-best-supporting-actor", label: "Β' Ανδρικού", count: 6 },
      { id: "oscar-best-supporting-actress", label: "Β' Γυναικείου", count: 2 },
    ],
  },
  {
    id: "bafta",
    label: "BAFTA",
    icon: <span className="text-[20px]">🎭</span>,
    items: [
      { id: "bafta-best-film", label: "Καλύτερης Ταινίας", count: 17 },
      { id: "bafta-best-actor", label: "Α' Ανδρικού", count: 4 },
      { id: "bafta-best-director", label: "Καλύτερης Σκηνοθεσίας", count: 3 },
    ],
  },
  {
    id: "cannes",
    label: "CANNES",
    icon: <span className="text-[20px]">🌴</span>,
    items: [
      { id: "cannes-palme-dor", label: "Χρυσός Φοίνικας", count: 3 },
      { id: "cannes-best-director", label: "Καλύτερης Σκηνοθεσίας", count: 1 },
    ],
  },
  {
    id: "venice",
    label: "VENICE",
    icon: <span className="text-[20px]">🦁</span>,
    items: [
      { id: "venice-golden-lion", label: "Χρυσό Λιοντάρι", count: 2 },
    ],
  },
  {
    id: "golden-globes",
    label: "GOLDEN GLOBES",
    icon: <span className="text-[20px]">🌐</span>,
    items: [
      { id: "gg-best-drama", label: "Καλύτερης Δραματικής Ταινίας", count: 5 },
      { id: "gg-best-comedy", label: "Καλύτερης Κωμωδίας", count: 2 },
    ],
  },
];

function AwardsPickerShowcase() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["oscar-best-picture", "cannes-palme-dor"]));

  return (
    <ShowcaseSection
      name="GroupedCheckboxList (Awards)"
      filePath="components/filters/GroupedCheckboxList.tsx"
      description="Single-screen filter picker with grouped checkbox lists. Each group has its own card with icon + heading + checkbox rows. Used for awards (Oscar / BAFTA / Cannes / Venice / Golden Globes) where the option count is small enough that a second drill-down would be overkill. Items have globally-unique IDs so the flat selection Set covers all groups."
      contextLinks={[{ label: "Live (movies)", href: "/movies" }]}
    >
      <Variant label="Empty selection">
        <div className="w-[390px] h-[700px] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <GroupedCheckboxList
            title="Βραβεία"
            groups={AWARDS_DATA}
            selected={new Set()}
            onSelectionChange={() => {}}
            resultCount={754}
            onClearAll={() => {}}
          />
        </div>
      </Variant>

      <Variant label="With selections (interactive)" note="Pre-selected: Best Picture + Palme d'Or">
        <div className="w-[390px] h-[700px] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <GroupedCheckboxList
            title="Βραβεία"
            groups={AWARDS_DATA}
            selected={selected}
            onSelectionChange={setSelected}
            resultCount={754}
            onClearAll={() => setSelected(new Set())}
          />
        </div>
      </Variant>
    </ShowcaseSection>
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
