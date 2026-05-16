"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { AIChips } from "@/components/home/AIChips";
import { MoviesTonightSection } from "@/components/home/MoviesTonightSection";
import { SuggestedUsers } from "@/components/home/SuggestedUsers";
import { ContributionCTA } from "@/components/home/ContributionCTA";
import { DailyPrompt } from "@/components/home/DailyPrompt";
import { SupportSection } from "@/components/home/SupportSection";
import { CategoryTiles as RegisteredCategoryTiles } from "@/components/home/CategoryTiles";
import { HeroDiscover } from "@/components/home/guest/HeroDiscover";
import { HeroSuggest } from "@/components/home/guest/HeroSuggest";
import { HeroPersonalise } from "@/components/home/guest/HeroPersonalise";
import { HowItWorks } from "@/components/home/guest/HowItWorks";
import { RegisterPromo } from "@/components/home/guest/RegisterPromo";
import { CategoryTiles as GuestCategoryTiles } from "@/components/home/guest/CategoryTiles";
import { SuggestionFeed } from "@/components/home/guest/SuggestionFeed";

export function HomeTab() {
  return (
    <>
      <AIChipsShowcase />
      <MoviesTonightShowcase />
      <SuggestedUsersShowcase />
      <ContributionCTAShowcase />
      <DailyPromptShowcase />
      <SupportSectionShowcase />
      <CategoryTilesShowcase />
      <SuggestionFeedShowcase />
      <HeroDiscoverShowcase />
      <HeroSuggestShowcase />
      <HeroPersonaliseShowcase />
      <HowItWorksShowcase />
      <RegisterPromoShowcase />
      <GuestCategoryTilesShowcase />
    </>
  );
}

function AIChipsShowcase() {
  return (
    <ShowcaseSection
      name="AIChips"
      filePath="components/home/AIChips.tsx"
      description="Personalized 2-col tile grid on registered home — 'Εξατομικευμένα για σένα'. Each tile = 44px thumbnail + label + count. Driven by per-user activity (sci-fi you haven't seen / cuisines near you / etc.)."
      contextLinks={[{ label: "Live (registered home)", href: "/" }]}
    >
      <Variant label="4 chips (real layout)">
        <div className="w-[400px] bg-white -mx-6">
          <AIChips
            chips={[
              {
                label: "Sci-fi που δεν έχεις δει",
                count: 23,
                href: "/movies",
                placeholder_color: "#3730a3",
              },
              {
                label: "Νέα στη Θεσσαλονίκη",
                count: 12,
                href: "/food",
                placeholder_color: "#9a3412",
              },
              {
                label: "Top rated βιβλία",
                count: 18,
                href: "/books",
                placeholder_color: "#064e3b",
              },
              {
                label: "Συνταγές με ψάρι",
                count: 7,
                href: "/recipes",
                placeholder_color: "#14532d",
              },
            ]}
          />
        </div>
      </Variant>
      <Variant label="With cover thumbnails">
        <div className="w-[400px] bg-white -mx-6">
          <AIChips
            chips={[
              {
                label: "Επειδή σου άρεσε Inception",
                count: 8,
                href: "/movies",
                cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=160",
              },
              {
                label: "Νέα στη γειτονιά σου",
                count: 4,
                href: "/bars",
                cover_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160",
              },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function MoviesTonightShowcase() {
  return (
    <ShowcaseSection
      name="MoviesTonightSection"
      filePath="components/home/MoviesTonightSection.tsx"
      description="'Απόψε στην TV' — horizontal-scroll cards of curated movies airing tonight. Time + channel badge top-right, rating row below the title. Returns null when there are 0 airings (never an empty section)."
      contextLinks={[{ label: "Live (registered home, when admin curates)", href: "/" }]}
    >
      <Variant label="3 airings tonight">
        <div className="w-[640px] bg-white -mx-6">
          <MoviesTonightSection
            airings={[
              {
                id: "a1",
                channel: "Mega",
                air_date: "2026-05-07",
                air_time: "22:00:00",
                movie: {
                  id: "m1",
                  title: "Oppenheimer",
                  slug: "movies/oppenheimer",
                  cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
                  avg_rating: 4.74,
                  year: 2023,
                },
              },
              {
                id: "a2",
                channel: "ANT1",
                air_date: "2026-05-07",
                air_time: "21:00:00",
                movie: {
                  id: "m2",
                  title: "Interstellar",
                  slug: "movies/interstellar",
                  cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
                  avg_rating: 4.8,
                  year: 2014,
                },
              },
              {
                id: "a3",
                channel: "STAR",
                air_date: "2026-05-07",
                air_time: "23:30:00",
                movie: {
                  id: "m3",
                  title: "Tenet",
                  slug: "movies/tenet",
                  cover_url: null,
                  avg_rating: 4.4,
                  year: 2020,
                },
              },
            ]}
          />
        </div>
      </Variant>
      <Variant label="Empty (no render)">
        <div className="text-xs text-zinc-400 italic text-center">
          (no airings → no render)
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SuggestedUsersShowcase() {
  return (
    <ShowcaseSection
      name="SuggestedUsers"
      filePath="components/home/SuggestedUsers.tsx"
      description="2-col grid of users with similar tastes — 'Χρήστες με Παρόμοιες Προτιμήσεις'. Each card = avatar (with popup) + name + suggestion count + Follow button. Uses UserAvatarWithPopup so taps open the user's quick-view."
      contextLinks={[{ label: "Live (registered home)", href: "/" }]}
    >
      <Variant label="4 suggested users">
        <div className="w-[400px] bg-white -mx-6">
          <SuggestedUsers
            users={[
              { id: "u1", name: "George Nasis", handle: "george", suggestion_count: 47 },
              { id: "u2", name: "Maria K.", handle: "mariak", suggestion_count: 32 },
              { id: "u3", name: "Νίκος Π.", handle: "nikosp", suggestion_count: 28 },
              { id: "u4", name: "Kassi", handle: "kassi", suggestion_count: 19 },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ContributionCTAShowcase() {
  return (
    <ShowcaseSection
      name="ContributionCTA"
      filePath="components/home/ContributionCTA.tsx"
      description="Big bottom-of-home CTA: pencil icon + avatar + greeting + 'Σειρά σου να συνεισφέρεις!' headline + black 'Προτείνω' button. Opens the suggestion overlay on tap."
      contextLinks={[{ label: "Live (registered home, bottom)", href: "/" }]}
    >
      <Variant label="With username">
        <div className="w-[400px] bg-white -mx-6">
          <ContributionCTA username="George" />
        </div>
      </Variant>
      <Variant label="Long username">
        <div className="w-[400px] bg-white -mx-6">
          <ContributionCTA username="Constantinos Papadopoulos" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function DailyPromptShowcase() {
  return (
    <ShowcaseSection
      name="DailyPrompt"
      filePath="components/home/DailyPrompt.tsx"
      description="Compact dark-card prompt — 'Σειρά σου!' coral label + greeting + coral CTA. Lighter-weight than ContributionCTA, used as the daily nudge banner."
      contextLinks={[{ label: "Live (registered home)", href: "/" }]}
    >
      <Variant label="With username">
        <div className="w-[400px] bg-white -mx-6">
          <DailyPrompt username="George" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SupportSectionShowcase() {
  return (
    <ShowcaseSection
      name="SupportSection"
      filePath="components/home/SupportSection.tsx"
      description="Footer-section on home — 'Είμαστε εδώ για εσένα' + 3 outlined links (Κέντρο βοήθειας / Επικοινωνία / Chat). Same component is reused inside Settings."
      contextLinks={[{ label: "Live (home, bottom)", href: "/" }]}
    >
      <Variant label="Default">
        <div className="w-[400px] bg-white">
          <SupportSection />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CategoryTilesShowcase() {
  return (
    <ShowcaseSection
      name="home/CategoryTiles (registered)"
      filePath="components/home/CategoryTiles.tsx"
      description="3×3 grid of all 9 categories — 90px colored circles + uppercase Greek labels. Tappable to /<category>. Lighter than the guest variant (no animated cluster, no gradient bg)."
      contextLinks={[{ label: "Live (registered home)", href: "/" }]}
    >
      <Variant label="Default 3×3 grid">
        <div className="w-[400px] bg-white">
          <RegisteredCategoryTiles />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SuggestionFeedShowcase() {
  return (
    <ShowcaseSection
      name="guest/SuggestionFeed"
      filePath="components/home/guest/SuggestionFeed.tsx"
      description="Guest home tabbed feed — horizontal category nav (Βιβλία / Ταινίες / ...) + filtered list of cards per category. Cards are 228px landscape with overlay avatar + Top rated badge."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="With items in 'books' tab (default)">
        <div className="w-[400px] bg-white -mx-6">
          <SuggestionFeed
            items={[
              {
                id: "1",
                title: "Άγριες ανεμώνες",
                subtitle: "Μυθιστόρημα",
                avg_rating: 4.74,
                rating_count: 123,
                category: "books",
                href: "/books/agries-anemones",
                is_top_rated: true,
                cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
              },
              {
                id: "2",
                title: "Ακοή",
                subtitle: "Θρίλερ",
                avg_rating: 4.5,
                rating_count: 67,
                category: "books",
                href: "/books/akoi",
                cover_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
              },
              {
                id: "3",
                title: "Inception",
                subtitle: "Sci-Fi",
                avg_rating: 4.8,
                rating_count: 200,
                category: "movies",
                href: "/movies/inception",
              },
            ]}
          />
        </div>
      </Variant>
      <Variant label="Empty (different category active)">
        <div className="w-[400px] bg-white -mx-6">
          <SuggestionFeed items={[]} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function HeroDiscoverShowcase() {
  return (
    <ShowcaseSection
      name="guest/HeroDiscover"
      filePath="components/home/guest/HeroDiscover.tsx"
      description="Top hero on guest home — staggered horizontal-scroll category tiles (9 deep colored rectangles with bottom labels) + 'Προτάσεις Πραγματικές' headline + ΠΡΟΤΑΣΕΙΣ counter + 'Ανακάλυψέ τες' black CTA."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="Full-height hero (733px)" note="Scaled down — see live for real size">
        <div className="w-[400px] bg-white" style={{ transform: "scale(0.55)", transformOrigin: "top left", height: 405 }}>
          <HeroDiscover suggestionCount={1952} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function HeroSuggestShowcase() {
  return (
    <ShowcaseSection
      name="guest/HeroSuggest"
      filePath="components/home/guest/HeroSuggest.tsx"
      description="Second guest hero — warm-gradient bg, 'Η πρότασή σου έχει αξία' headline, testimonial line, big black 'Προτείνω' CTA → /register."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="Hero (scaled down)">
        <div className="w-[400px] bg-white" style={{ transform: "scale(0.55)", transformOrigin: "top left", height: 405 }}>
          <HeroSuggest />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function HeroPersonaliseShowcase() {
  return (
    <ShowcaseSection
      name="guest/HeroPersonalise"
      filePath="components/home/guest/HeroPersonalise.tsx"
      description="Third guest hero — 'Προτάσεις που σου ταιριάζουν' headline + 3 floating chips (food / sci-fi / Star Wars) over a coral glow + 2 CTAs (Μάθε περισσότερα · Εγγραφή)."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="Hero (scaled down)">
        <div className="w-[400px] bg-white" style={{ transform: "scale(0.55)", transformOrigin: "top left", height: 405 }}>
          <HeroPersonalise />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function HowItWorksShowcase() {
  return (
    <ShowcaseSection
      name="guest/HowItWorks"
      filePath="components/home/guest/HowItWorks.tsx"
      description="4-step explainer — numbered dark circles + title + body. Static content (Εγγραφή → Δημιουργία → Έλεγχος → Δημοσίευση)."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="Default 4 steps">
        <div className="w-[400px] bg-white">
          <HowItWorks />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function RegisterPromoShowcase() {
  return (
    <ShowcaseSection
      name="guest/RegisterPromo"
      filePath="components/home/guest/RegisterPromo.tsx"
      description="Bottom-of-guest-home call-to-action — 'Γίνε ένας από εμάς' headline + 12-avatar grid with bottom fade + black 'Εγγραφή' CTA → /register."
      contextLinks={[{ label: "Live (guest home, bottom)", href: "/" }]}
    >
      <Variant label="Default">
        <div className="w-[400px] bg-white">
          <RegisterPromo />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function GuestCategoryTilesShowcase() {
  return (
    <ShowcaseSection
      name="guest/CategoryTiles"
      filePath="components/home/guest/CategoryTiles.tsx"
      description="Variant of the 3×3 category tiles for guests — same layout as registered, but with darker backgrounds and a section header. No icons (placeholder for future cluster image)."
      contextLinks={[{ label: "Live (guest home)", href: "/" }]}
    >
      <Variant label="Default 3×3 grid">
        <div className="w-[400px] bg-white">
          <GuestCategoryTiles />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
