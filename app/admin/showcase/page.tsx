"use client";

import { useState } from "react";
import { ShowcaseShell } from "@/components/admin/showcase/ShowcaseShell";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { ReviewCard } from "@/components/detail/ReviewCard";
import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { UserBadge } from "@/components/ui/UserBadge";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { Icon } from "@/components/ui/Icon";
import { AMENITY_ICON_MAP, AMENITY_LABELS } from "@/lib/icons";
import type { IconName } from "@/lib/icons";
import { IconToggleGrid } from "@/components/admin/IconToggleGrid";
import { RatingCard } from "@/components/detail/RatingCard";
import { BookingAvailabilityCard } from "@/components/detail/BookingAvailabilityCard";
import { ActivityCard } from "@/components/detail/ActivityCard";
import { PublicBookAd } from "@/components/detail/PublicBookAd";
import { AuthorCard } from "@/components/detail/AuthorCard";
import { AmenitiesRow } from "@/components/detail/AmenitiesRow";
import { NutritionRow } from "@/components/detail/NutritionRow";
import { DurationCard } from "@/components/detail/DurationCard";
import { PlatformLinksCard } from "@/components/detail/PlatformLinksCard";
import { SuggestionCardPortrait } from "@/components/suggestion/SuggestionCardPortrait";
import { SuggestionCardLandscape } from "@/components/suggestion/SuggestionCardLandscape";
import { CarouselSection } from "@/components/suggestion/CarouselSection";
import { RatingBox } from "@/components/detail/RatingBox";
import { SuggesterCard } from "@/components/detail/SuggesterCard";
import { BookmarkIcon } from "@/components/ui/BookmarkIcon";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";
import { Toast, useToast } from "@/components/ui/Toast";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ImageGallery, type GalleryImage } from "@/components/admin/ImageGallery";
import { PropertyTypeSelector } from "@/components/detail/PropertyTypeSelector";

const SAMPLE_USER = {
  id: "showcase-user",
  display_name: "George Nasis",
  handle: "george",
  avatar_url: null,
  level: 12,
};

const LONG_TEXT =
  "Όταν ξεκίνησα να διαβάζω το πρώτο της βιβλίο, ήδη από τις αρχικές σελίδες κατάλαβα ότι αυτό το κορίτσι έχει ένα λαμπρό μέλλον στη συγγραφή. Καθηλωτική γραφή, ζωντανοί χαρακτήρες, ατμοσφαιρική περιγραφή — αξίζει κάθε λεπτό.";
const SHORT_TEXT = "Τέλειο. Πρέπει να το δεις.";

export default function ShowcasePage() {
  return (
    <ShowcaseShell>
      {{
        Foundations: <FoundationsTab />,
        Cards: <CardsTab />,
        "Detail modules": <DetailModulesTab />,
        Modal: <ModalTab />,
        Toasts: <ToastsTab />,
        Notifications: <NotificationsTab />,
        Admin: <AdminTab />,
        Patterns: <PatternsTab />,
      }}
    </ShowcaseShell>
  );
}

// ─── FOUNDATIONS ──────────────────────────────────────────────────────────

function FoundationsTab() {
  return (
    <>
      <ShowcaseSection
        name="UserBadge"
        filePath="components/ui/UserBadge.tsx"
        description="Tier badge for users — derived from level OR explicit kind. Used in review cards, profiles, suggester block."
      >
        <Variant label="Verified (level 1–9)">
          <UserBadge kind="Verified" />
        </Variant>
        <Variant label="Expert (level 10–24)">
          <UserBadge kind="Expert" />
        </Variant>
        <Variant label="Gold (level 25–49)">
          <UserBadge kind="Gold" />
        </Variant>
        <Variant label="Platinum (level 50+)">
          <UserBadge kind="Platinum" />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="OutlinedPill"
        filePath="components/ui/OutlinedPill.tsx"
        description="White-fill pill with outline + arrow. Used for delivery, availability, theater ticket, Public ad CTAs."
      >
        <Variant label="Default">
          <OutlinedPill href="#">Δες το →</OutlinedPill>
        </Variant>
        <Variant label="Long label">
          <OutlinedPill href="#">Παρήγγειλε από το efood</OutlinedPill>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="Icon"
        filePath="components/ui/Icon.tsx"
        description="62 SVGs in 8 categories. Single rendering primitive — explicit width/height."
      >
        <Variant label="Brands (16 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["netflix", "imdb", "rotten-tomatoes", "metacritic", "google", "booking", "efood", "youtube"] as const).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Amenities (19 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["amenity-wifi", "amenity-parking", "amenity-pool", "amenity-breakfast", "amenity-sea-view", "amenity-pet", "amenity-hotel"] as IconName[]).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Awards & badges">
          <div className="flex flex-wrap items-center gap-3">
            {(["oscar-best-picture", "oscar-best-actor", "badge-verified", "badge-gold", "badge-platinum"] as const).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Nutrition (5 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["vegan", "no-milk", "sugar-free", "ingredients", "steps"] as const).map((n) => (
              <Icon key={n} name={n} size={28} />
            ))}
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="AllReviewsButton"
        filePath="components/detail/AllReviewsButton.tsx"
        description="Outlined CTA below the review carousel — links to /<category>/<id>/reviews."
      >
        <Variant label="0 reviews — hidden">
          <div className="text-xs text-zinc-400 italic">(no render)</div>
        </Variant>
        <Variant label="1 review">
          <div className="w-full max-w-[342px]">
            <AllReviewsButton itemSlug="books/agries-anemones" count={1} />
          </div>
        </Variant>
        <Variant label="Many">
          <div className="w-full max-w-[342px]">
            <AllReviewsButton itemSlug="books/agries-anemones" count={67} />
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}

// ─── CARDS ────────────────────────────────────────────────────────────────

function CardsTab() {
  return (
    <>
      <ShowcaseSection
        name="ReviewCard"
        filePath="components/detail/ReviewCard.tsx"
        description="Single review. Used in the detail-page carousel (variant=carousel) and the /reviews list (variant=list). Truncates at 4 lines + Περισσότερα expand. Hides the text block when reflection is empty (rating-only)."
        contextLinks={[
          { label: "Detail page (after a review exists)", href: "/books/agries-anemones" },
          { label: "All reviews list", href: "/books/agries-anemones/reviews" },
        ]}
      >
        <Variant label="Carousel · with text">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v1"
              rating={5}
              text={SHORT_TEXT}
              date="χθες"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Expert"
              likes={17}
              dislikes={3}
            />
          </div>
        </Variant>
        <Variant label="Carousel · long text + Περισσότερα">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v2"
              rating={4}
              text={LONG_TEXT}
              date="2 ημέρες πριν"
              name="Kassi"
              userData={{ display_name: "Kassi", avatar_url: null }}
              badge="Verified"
              likes={5}
              dislikes={0}
            />
          </div>
        </Variant>
        <Variant label="Carousel · rating-only (no text)">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v3"
              rating={3}
              text=""
              date="πριν 1 εβδομάδα"
              name="Anny T."
              userData={{ display_name: "Anny T.", avatar_url: null }}
              badge="Gold"
              likes={0}
              dislikes={0}
            />
          </div>
        </Variant>
        <Variant label="List variant (full width)">
          <div className="w-full max-w-[600px]">
            <ReviewCard
              variant="list"
              id="v4"
              rating={5}
              text={LONG_TEXT}
              date="σήμερα"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Platinum"
              likes={42}
              dislikes={1}
            />
          </div>
        </Variant>
        <Variant label="With user-vote active (👍 coral)" note="myVote=1 → like icon filled & coral">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v5"
              rating={5}
              text={SHORT_TEXT}
              date="πριν 1 ώρα"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Expert"
              likes={1}
              dislikes={0}
              myVote={1}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="SuggestionCardPortrait"
        filePath="components/suggestion/SuggestionCardPortrait.tsx"
        description="2:3 cover. Used for movies, series, books. Bottom info area is composed — header / title / subtitle / rating — so each category passes its own vocabulary."
        contextLinks={[
          { label: "Live (movie)", href: "/movies/inception" },
          { label: "Live (series)", href: "/series/californication" },
          { label: "Live (book)", href: "/books/agries-anemones" },
        ]}
      >
        <Variant label="Movie · genre subtitle">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            href="#"
            title="Oppenheimer"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Series · NETFLIX header + seasons">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400"
            href="#"
            header={
              <span className="inline-flex items-center gap-2">
                <Icon name="netflix-wordmark" width={56} height={14} alt="Netflix" />
                <span className="text-[14px] font-medium text-zinc-500">3 Σεζόν</span>
              </span>
            }
            title="Ozark"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Book · year subtitle (no header)">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"
            href="#"
            title="Ακοή"
            subtitle="2023"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Top rated overlay">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            href="#"
            title="Oppenheimer"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
            topRated
          />
        </Variant>
        <Variant label="Long title (clamps to 2 lines)">
          <SuggestionCardPortrait
            imageUrl={null}
            href="#"
            title="Ένας πολύ μεγάλος τίτλος βιβλίου που πρέπει να κόψει σε δύο γραμμές"
            subtitle="2023"
            rating={{ score: 4.5, count: 8 }}
          />
        </Variant>
        <Variant label="No image (placeholder bg)">
          <SuggestionCardPortrait imageUrl={null} href="#" title="Χωρίς εικόνα" subtitle="Δράμα" rating={{ score: 4.0, count: 12 }} />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="SuggestionCardLandscape"
        filePath="components/suggestion/SuggestionCardLandscape.tsx"
        description="16:10 image. Used for food, bars, hotels, theater, events, recipes. Image can carry Top rated badge + suggester avatar overlapping bottom-left. Below: optional byline (recipe chef), title, subtitle, rating."
        contextLinks={[
          { label: "Live (hotel)", href: "/hotels" },
          { label: "Live (recipe)", href: "/recipes" },
          { label: "Live (theater)", href: "/theater" },
        ]}
      >
        <Variant label="Hotel · Top rated + suggester avatar">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
            href="#"
            title="Ξενώνας Καλλίνικος"
            subtitle="Ξενοδοχείο • Λουτρά Πόζαρ"
            rating={{ score: 4.74, count: 123 }}
            topRated
            suggesterAvatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
          />
        </Variant>
        <Variant label="Theater · same pattern">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1503095396549-807759245b35?w=600"
            href="#"
            title="Ο τυχαίος θάνατος ενός αναρχικού"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
            topRated
            suggesterAvatarUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
          />
        </Variant>
        <Variant label="Recipe · chef byline (no image overlay)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600"
            href="#"
            byline={
              <span className="inline-flex items-center gap-2 text-[14px] font-medium text-zinc-700">
                <span className="w-7 h-7 rounded-full overflow-hidden bg-zinc-300 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=80" alt="" className="w-full h-full object-cover" />
                </span>
                του Πετρετζίκη
              </span>
            }
            title="Red Velvet"
            subtitle="Γλυκά • Κέικ"
            rating={{ score: 4.74, count: 123 }}
            topRated
          />
        </Variant>
        <Variant label="Plain (no overlays, no byline)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
            href="#"
            title="Momo"
            subtitle="Ασιατική • Παγκράτι"
            rating={{ score: 4.5, count: 42 }}
          />
        </Variant>
        <Variant label="Top rated only (no suggester)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
            href="#"
            title="Buena Vista"
            subtitle="Cocktail Bar • Πετράλωνα"
            rating={{ score: 4.81, count: 16 }}
            topRated
          />
        </Variant>
        <Variant label="No image">
          <SuggestionCardLandscape
            imageUrl={null}
            href="#"
            title="Χωρίς εικόνα"
            subtitle="Subtitle line"
            rating={{ score: 3.5, count: 4 }}
          />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="CarouselSection"
        filePath="components/suggestion/CarouselSection.tsx"
        description="Section wrapper for a horizontal-scroll carousel: bullet · UPPERCASE title · hairline filler. Used to group portrait OR landscape suggestion cards under a heading."
        contextLinks={[{ label: "Live (home)", href: "/" }]}
      >
        <Variant label="Portrait carousel (3 cards)">
          <div className="-mx-4 w-[640px]">
            <CarouselSection title="Ολοκληρωμένες σειρές">
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400"
                href="#"
                header={
                  <span className="inline-flex items-center gap-2">
                    <Icon name="netflix-wordmark" width={48} height={12} alt="Netflix" />
                    <span className="text-[13px] font-medium text-zinc-500">3 Σεζόν</span>
                  </span>
                }
                title="Ozark"
                subtitle="Δράμα"
                rating={{ score: 4.74, count: 123 }}
              />
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
                href="#"
                title="Oppenheimer"
                subtitle="Δράμα"
                rating={{ score: 4.74, count: 123 }}
              />
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"
                href="#"
                title="Ακοή"
                subtitle="2023"
                rating={{ score: 4.5, count: 8 }}
              />
            </CarouselSection>
          </div>
        </Variant>
        <Variant label="Landscape carousel (2 cards)">
          <div className="-mx-4 w-[640px]">
            <CarouselSection title="Νέες συνταγές">
              <SuggestionCardLandscape
                imageUrl="https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600"
                href="#"
                byline={<span className="text-[13px] font-medium text-zinc-700">του Πετρετζίκη</span>}
                title="Red Velvet"
                subtitle="Γλυκά • Κέικ"
                rating={{ score: 4.74, count: 123 }}
                topRated
              />
              <SuggestionCardLandscape
                imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
                href="#"
                title="Momo"
                subtitle="Ασιατική"
                rating={{ score: 4.5, count: 42 }}
              />
            </CarouselSection>
          </div>
        </Variant>
      </ShowcaseSection>
      <RatingBoxShowcase />
      <SuggesterCardShowcase />
      <BookmarkIconShowcase />
      {/* AuthorCard moved to Detail modules tab — it's now a real reusable component. */}
    </>
  );
}

// ─── DETAIL MODULES ───────────────────────────────────────────────────────

function DetailModulesTab() {
  return (
    <>
      <ShowcaseSection
        name="RatingCard (Google / Booking)"
        filePath="components/detail/RatingCard.tsx"
        description="External rating from Google or Booking. Used side-by-side on hotels. Optional href makes it a clickable card with arrow chip."
        contextLinks={[{ label: "Live in HotelDetail", href: "/hotels" }]}
      >
        <Variant label="Google · linked">
          <div className="w-[180px]">
            <RatingCard brand="google" score="5" scale="/5" count={188} href="https://maps.google.com" />
          </div>
        </Variant>
        <Variant label="Booking · linked">
          <div className="w-[180px]">
            <RatingCard brand="booking" score="9.9" scale="/10" count={91} href="https://booking.com" />
          </div>
        </Variant>
        <Variant label="Side-by-side (real layout)">
          <div className="grid grid-cols-2 gap-3 w-[400px]">
            <RatingCard brand="google" score="5" scale="/5" count={188} href="https://maps.google.com" />
            <RatingCard brand="booking" score="9.9" scale="/10" count={91} href="https://booking.com" />
          </div>
        </Variant>
        <Variant label="No href (no arrow chip)">
          <div className="w-[180px]">
            <RatingCard brand="google" score="4.7" scale="/5" count={42} />
          </div>
        </Variant>
        <Variant label="No count">
          <div className="w-[180px]">
            <RatingCard brand="booking" score="8.5" scale="/10" />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="BookingAvailabilityCard"
        filePath="components/detail/BookingAvailabilityCard.tsx"
        description="Lavender CTA card for hotels. Affiliate placement — drives clicks to Booking.com search results."
        contextLinks={[{ label: "Live in HotelDetail", href: "/hotels" }]}
      >
        <Variant label="Default (search by item title)">
          <div className="w-[342px]">
            <BookingAvailabilityCard itemTitle="Grande Bretagne Athens" />
          </div>
        </Variant>
        <Variant label="Custom href override">
          <div className="w-[342px]">
            <BookingAvailabilityCard
              itemTitle="Test"
              href="https://www.booking.com/hotel/gr/grande-bretagne.html"
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ActivityCard"
        filePath="components/detail/ActivityCard.tsx"
        description="Image-bg card with title + subtitle + distance overlay. Used in the Κοντινές Δραστηριότητες carousel on hotels."
        contextLinks={[{ label: "Live in HotelDetail (with nearby activities)", href: "/hotels" }]}
      >
        <Variant label="Carousel size · with image">
          <ActivityCard
            title="Σκι"
            subtitle="Καιμάκτσαλαν"
            distance="8.2 χλμ"
            imageUrl="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=640"
            href="https://maps.google.com"
          />
        </Variant>
        <Variant label="Carousel size · second example">
          <ActivityCard
            title="Πεζοπορία"
            subtitle="Κουνουπίτσα Καταρράκτης"
            distance="5.1 χλμ"
            imageUrl="https://images.unsplash.com/photo-1448375240586-882707db888b?w=640"
            href="https://maps.google.com"
          />
        </Variant>
        <Variant label="Carousel · without image (placeholder)">
          <ActivityCard title="Αναψυχή" subtitle="Λουτρά Πόζαρ" distance="3.2 χλμ" href="#" />
        </Variant>
        <Variant label="Compact size variant">
          <ActivityCard
            title="Σκι"
            subtitle="Καιμάκτσαλαν"
            distance="8.2 χλμ"
            imageUrl="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=640"
            href="#"
            size="compact"
          />
        </Variant>
        <Variant label="No href (no arrow)">
          <ActivityCard
            title="Σκι"
            subtitle="Καιμάκτσαλαν"
            distance="8.2 χλμ"
            imageUrl="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=640"
          />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="PublicBookAd"
        filePath="components/detail/PublicBookAd.tsx"
        description="Cross-promo card: theater play → Public.gr book version. Lavender bg, large Public wordmark, book preview, coral outlined CTA."
        contextLinks={[{ label: "Live on a theater play with a book", href: "/theater" }]}
      >
        <Variant label="Full (cover + author + pages + link)">
          <div className="w-[420px]">
            <PublicBookAd
              bookTitle="Ο τυχαίος θάνατος ενός αναρχικού"
              author="Ντάριο Φο"
              pages={144}
              coverUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300"
              href="https://www.public.gr"
            />
          </div>
        </Variant>
        <Variant label="Without cover image">
          <div className="w-[420px]">
            <PublicBookAd
              bookTitle="Ο τυχαίος θάνατος ενός αναρχικού"
              author="Ντάριο Φο"
              pages={144}
              href="https://www.public.gr"
            />
          </div>
        </Variant>
        <Variant label="Title only (no author / pages / link)">
          <div className="w-[420px]">
            <PublicBookAd bookTitle="Ο τυχαίος θάνατος ενός αναρχικού" />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="AuthorCard"
        filePath="components/detail/AuthorCard.tsx"
        description="Author profile block at the bottom of book pages, after reviews. Lavender bg, expandable bio."
        contextLinks={[{ label: "Live on /books/agries-anemones", href: "/books/agries-anemones" }]}
      >
        <Variant label="Full (photo + age + book count + bio)">
          <div className="w-[420px]">
            <AuthorCard
              name="Sebastian Fitzek"
              photoUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
              age={52}
              bookCount={17}
              bio="Ο Sebastian Fitzek γεννήθηκε το 1971 και είναι ο πιο επιτυχημένος συγγραφέας ψυχολογικών θρίλερ στη Γερμανία. Το πρώτο του μυθιστόρημα, Η θεραπεία κυκλοφόρησε το 2006 και αποτέλεσε αμέσως bestseller. Έκτοτε έχει γράψει 17 βιβλία τα οποία έχουν μεταφραστεί σε 24 γλώσσες."
            />
          </div>
        </Variant>
        <Variant label="No bio">
          <div className="w-[420px]">
            <AuthorCard
              name="Sebastian Fitzek"
              photoUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
              age={52}
              bookCount={17}
            />
          </div>
        </Variant>
        <Variant label="No photo (initial fallback)">
          <div className="w-[420px]">
            <AuthorCard name="Ευαγγελία Γιάννου" age={48} bookCount={3} bio="Ελληνίδα συγγραφέας από τα Ιωάννινα." />
          </div>
        </Variant>
        <Variant label="Minimal (name only)">
          <div className="w-[420px]">
            <AuthorCard name="Ντάριο Φο" />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="AmenitiesRow"
        filePath="components/detail/AmenitiesRow.tsx"
        description="Hotel amenities row — flush on the page bg. 4-col grid up to 4 items, h-scroll when more. Each cell supports an optional secondary line above the icon (e.g. ★★★ for hotel star rating)."
        contextLinks={[{ label: "Live in HotelDetail", href: "/hotels" }]}
      >
        <Variant label="4 items (grid)">
          <div className="w-[420px]">
            <AmenitiesRow
              items={[
                { key: "hotel", icon: "amenity-hotel", label: "Ξενοδοχείο", secondary: <span className="text-[14px] tracking-tight">★★★</span> },
                { key: "suites", icon: "amenity-suites", label: "5\nΣουίτες" },
                { key: "breakfast", icon: "amenity-breakfast", label: "Άριστο\nΠρωινό" },
                { key: "free-parking", icon: "amenity-parking", label: "Free\nParking" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="2 items only">
          <div className="w-[420px]">
            <AmenitiesRow
              items={[
                { key: "wifi", icon: "amenity-wifi", label: "Wi-Fi" },
                { key: "pool", icon: "amenity-pool", label: "Πισίνα" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="6 items (horizontal scroll)">
          <div className="w-[420px]">
            <AmenitiesRow
              items={[
                { key: "wifi", icon: "amenity-wifi", label: "Wi-Fi" },
                { key: "pool", icon: "amenity-pool", label: "Πισίνα" },
                { key: "breakfast", icon: "amenity-breakfast", label: "Πρωινό" },
                { key: "parking", icon: "amenity-parking", label: "Parking" },
                { key: "sea", icon: "amenity-sea-view", label: "Θέα" },
                { key: "pet", icon: "amenity-pet", label: "Pets" },
              ]}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="NutritionRow"
        filePath="components/detail/NutritionRow.tsx"
        description="Recipe-specific. Lavender bg, big illustrated icons. Up to 3 dietary flags."
        contextLinks={[{ label: "Live on a recipe", href: "/recipes" }]}
      >
        <Variant label="All 3 flags">
          <div className="w-[420px]">
            <NutritionRow
              items={[
                { icon: "no-milk", label: "Χωρίς γάλα" },
                { icon: "vegan", label: "Vegan" },
                { icon: "sugar-free", label: "Χωρίς ζάχαρη" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="Single flag">
          <div className="w-[420px]">
            <NutritionRow items={[{ icon: "vegan", label: "Vegan" }]} />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="DurationCard"
        filePath="components/detail/DurationCard.tsx"
        description="Recipe duration — uppercase title, then label/value columns separated by hairlines. Generic enough for other 2-3-column metric strips."
        contextLinks={[{ label: "Live on a recipe", href: "/recipes" }]}
      >
        <Variant label="3 metrics (recipe default)">
          <div className="w-[420px]">
            <DurationCard
              metrics={[
                { label: "ΣΥΝΟΛΟ", value: "1ω 50'" },
                { label: "ΠΡΟΕΤΟΙΜΑΣΙΑ", value: "30'" },
                { label: "ΨΗΣΙΜΟ", value: "1ω 20'" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="2 metrics, custom title">
          <div className="w-[420px]">
            <DurationCard
              title="ΑΠΟΔΟΣΗ"
              metrics={[
                { label: "ΜΕΡΙΔΕΣ", value: "4-6" },
                { label: "ΘΕΡΜΙΔΕΣ", value: "320 kcal" },
              ]}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="PlatformLinksCard"
        filePath="components/detail/PlatformLinksCard.tsx"
        description="Coral-tinted card with title + N branded action rows (logo + label/subtitle + outlined pill CTA). Used for Food delivery AND Movies/Series watch platforms."
        contextLinks={[
          { label: "Live on a food page (Delivery)", href: "/food" },
          { label: "Pending wiring on Movies (Που θα την δεις)", href: "/movies" },
        ]}
      >
        <Variant label="Delivery (efood + BOX)">
          <div className="w-[420px]">
            <PlatformLinksCard
              title="Delivery"
              ctaLabel="Παραγγελία"
              links={[
                { key: "efood", brandIcon: "efood", brandIconWidth: 94, href: "https://www.e-food.gr" },
                { key: "box", brandIcon: "box", brandIconWidth: 104, href: "https://box.gr" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="Watch platforms (Netflix / YouTube / Disney)">
          <div className="w-[420px]">
            <PlatformLinksCard
              title="Που θα την δεις"
              ctaLabel="Προβολή"
              links={[
                { key: "netflix", brandIcon: "netflix", brandIconWidth: 36, label: "Netflix", subtitle: "Συνδρομή", href: "https://netflix.com" },
                { key: "youtube", brandIcon: "youtube", brandIconWidth: 36, label: "YouTube", subtitle: "Από 3.99", href: "https://youtube.com" },
                { key: "disney", brandIcon: "disney", brandIconWidth: 36, label: "Disney Tv", subtitle: "Από 3.99", href: "https://disneyplus.com" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="Single row">
          <div className="w-[420px]">
            <PlatformLinksCard
              title="Delivery"
              ctaLabel="Παραγγελία"
              links={[{ key: "efood", brandIcon: "efood", brandIconWidth: 94, href: "https://www.e-food.gr" }]}
            />
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────

function AdminTab() {
  const sampleAmenities = (Object.keys(AMENITY_ICON_MAP) as Array<keyof typeof AMENITY_ICON_MAP>)
    .slice(0, 6)
    .map((key) => ({
      key,
      icon: AMENITY_ICON_MAP[key],
      label: AMENITY_LABELS[key] ?? String(key),
    }));

  return (
    <>
      <ShowcaseSection
        name="IconToggleGrid"
        filePath="components/admin/IconToggleGrid.tsx"
        description="Visual checkbox grid (icon + label + active=coral border). Used by hotel facilities, recipe nutrition, food amenities admin forms."
        contextLinks={[
          { label: "In an admin form", href: "/admin/suggestions" },
        ]}
      >
        <Variant label="Default — none selected">
          <div className="w-full max-w-[420px]">
            <IconToggleGrid
              options={sampleAmenities}
              value={{}}
              onChange={() => {}}
            />
          </div>
        </Variant>
        <Variant label="Some selected" note="2 toggled on">
          <div className="w-full max-w-[420px]">
            <IconToggleGrid
              options={sampleAmenities}
              value={{ [sampleAmenities[0].key]: true, [sampleAmenities[2].key]: true }}
              onChange={() => {}}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <PropertyTypeSelectorShowcase />
      <ImageUploaderShowcase />
      <ImageGalleryShowcase />
      <LocationPickerShowcase />
    </>
  );
}

// ─── Admin sub-section showcases (need their own client state) ────────────

function PropertyTypeSelectorShowcase() {
  const [single, setSingle] = useState<string[]>(["apartment"]);
  const [multi, setMulti] = useState<string[]>([]);
  const TYPES = [
    { id: "hotel",     name: "Ξενοδοχείο" },
    { id: "apartment", name: "Διαμέρισμα" },
    { id: "villa",     name: "Βίλα" },
    { id: "camping",   name: "Camping" },
    { id: "house",     name: "Σπίτι" },
  ];
  return (
    <ShowcaseSection
      name="PropertyTypeSelector"
      filePath="components/detail/PropertyTypeSelector.tsx"
      description="Visual checkbox grid for hotel property types (2-col, 165×125 cells). Active = zinc-800 border + checked icon. Used in HotelExtraFields admin form."
      contextLinks={[{ label: "Live (admin · hotel suggestion)", href: "/admin/suggestions" }]}
    >
      <Variant label="Single selected (apartment)">
        <div className="w-[360px]">
          <PropertyTypeSelector types={TYPES.slice(0, 4)} selected={single} onChange={setSingle} />
        </div>
      </Variant>
      <Variant label="Multi-select (none → click to toggle)">
        <div className="w-[360px]">
          <PropertyTypeSelector types={TYPES.slice(0, 4)} selected={multi} onChange={setMulti} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ImageUploaderShowcase() {
  const [empty, setEmpty] = useState("");
  const [filled, setFilled] = useState("https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600");
  return (
    <ShowcaseSection
      name="ImageUploader"
      filePath="components/admin/ImageUploader.tsx"
      description="Drag-drop + click-to-upload + (optional) URL paste. Uploads to Supabase Storage with the given prefix. Returns the public URL via onChange."
      contextLinks={[{ label: "Live (admin · collection editor)", href: "/admin/content/collections" }]}
    >
      <Variant label="Empty (default 'Add image' state)">
        <div className="w-[260px]">
          <ImageUploader prefix="showcase" value={empty} onChange={setEmpty} aspectRatio="4/3" />
        </div>
      </Variant>
      <Variant label="With image (click to replace, ✕ to clear)">
        <div className="w-[260px]">
          <ImageUploader prefix="showcase" value={filled} onChange={setFilled} aspectRatio="4/3" />
        </div>
      </Variant>
      <Variant label="Square aspect + URL paste enabled">
        <div className="w-[200px]">
          <ImageUploader prefix="showcase" value="" onChange={() => {}} aspectRatio="square" allowUrlPaste />
        </div>
      </Variant>
      <Variant label="16:9 aspect">
        <div className="w-[320px]">
          <ImageUploader prefix="showcase" value="" onChange={() => {}} aspectRatio="16/9" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ImageGalleryShowcase() {
  const [tabsImages, setTabsImages] = useState<GalleryImage[]>([
    { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", tab: "Κοινόχρηστοι" },
    { url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400", tab: "Εξωτερικά" },
  ]);
  const [empty, setEmpty] = useState<GalleryImage[]>([]);
  return (
    <ShowcaseSection
      name="ImageGallery"
      filePath="components/admin/ImageGallery.tsx"
      description="Multi-image editor with tab grouping (e.g. Δωμάτια / Κοινόχρηστοι / Εξωτερικά for hotels). Drag-reorder, alt text, delete. First image in the active tab is the default."
      contextLinks={[{ label: "Live (admin · hotel suggestion · Media)", href: "/admin/suggestions" }]}
    >
      <Variant label="Hotel tabs · 5 images across 3 tabs">
        <div className="w-[640px]">
          <ImageGallery
            prefix="showcase-hotel"
            tabs={["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"]}
            images={tabsImages}
            onChange={setTabsImages}
          />
        </div>
      </Variant>
      <Variant label="Empty state · click 'Add image' to start">
        <div className="w-[640px]">
          <ImageGallery
            prefix="showcase-empty"
            tabs={["Rooms", "Shared", "Outside"]}
            images={empty}
            onChange={setEmpty}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function LocationPickerShowcase() {
  return (
    <ShowcaseSection
      name="LocationPicker (AddressMapSection)"
      filePath="components/admin/SuggestionEditor.tsx (inline, ~line 1977)"
      description="Address input · Lat/Lng inputs · Drag-drop on map · Region/Area selects. Wired in venue extension forms (food/bars/hotels/theater). Currently inline in SuggestionEditor — future work: extract to standalone."
      contextLinks={[
        { label: "Live (admin · food/hotel/bars suggestion)", href: "/admin/suggestions" },
      ]}
    >
      <Variant label="Pending — interactive demo requires SuggestionEditor context">
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Live preview στο link πιο πάνω. Extraction σε standalone reusable αν θες, σε επόμενη επανάληψη.
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── PATTERNS ─────────────────────────────────────────────────────────────

function PatternsTab() {
  return (
    <>
      <PlaceholderSection
        name="Empty state"
        filePath="multiple (inline)"
        note="Used on /reviews when no reviews exist, on profile bookmarks page, on category list when filters return 0. Needs a single shared primitive."
      />
      <PlaceholderSection
        name="Skeleton loader"
        filePath="components/ui/Skeleton.tsx"
        note="Shimmer placeholder. Currently used only on item gallery — needs broader rollout."
      />
    </>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────

function ModalTab() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);
  const [open5, setOpen5] = useState(false);

  return (
    <>
      <ShowcaseSection
        name="Modal (primitive)"
        filePath="components/ui/Modal.tsx"
        description="Bottom-sheet style modal with backdrop, slide-up animation, Esc to close. Sizes: sm / md / lg / full. Optional title + drag handle."
      >
        <Variant label="Default (md size, with title + handle)">
          <button
            onClick={() => setOpen1(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open modal
          </button>
          <Modal open={open1} onClose={() => setOpen1(false)} title="Παράδειγμα Modal" size="md">
            <div className="p-6 space-y-4">
              <p className="text-zinc-700 text-sm leading-[150%]">
                Αυτό είναι ένα παράδειγμα modal. Πατάς Esc ή το backdrop για να κλείσει.
              </p>
              <button
                onClick={() => setOpen1(false)}
                className="w-full h-12 rounded-[12px] bg-zinc-900 text-white font-semibold"
              >
                ΟΚ
              </button>
            </div>
          </Modal>
        </Variant>
        <Variant label="Small size">
          <button
            onClick={() => setOpen2(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open small
          </button>
          <Modal open={open2} onClose={() => setOpen2(false)} title="Σύντομο" size="sm">
            <div className="p-6 text-sm text-zinc-700">Σύντομη ερώτηση εδώ.</div>
          </Modal>
        </Variant>
        <Variant label="Full screen (no handle)">
          <button
            onClick={() => setOpen3(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open full
          </button>
          <Modal open={open3} onClose={() => setOpen3(false)} size="full" showHandle={false}>
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Full-screen modal</h2>
              <p className="text-zinc-700">Καλύπτει σχεδόν όλη την οθόνη — για forms ή flows.</p>
              <button
                onClick={() => setOpen3(false)}
                className="px-4 h-10 rounded-full bg-zinc-100 text-zinc-700 text-sm font-semibold"
              >
                Κλείσιμο
              </button>
            </div>
          </Modal>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ConfirmDeleteDialog"
        filePath="components/profile/ConfirmDeleteDialog.tsx"
        description="Destructive-confirm dialog. Coral-danger primary button, body scroll locked, Esc dismisses."
        contextLinks={[{ label: "Live (profile suggestions)", href: "/profile" }]}
      >
        <Variant label="Open the dialog">
          <button
            onClick={() => setOpen4(true)}
            className="px-4 h-10 rounded-full bg-red-600 text-white text-sm font-semibold"
          >
            Delete suggestion
          </button>
          {open4 && (
            <ConfirmDeleteDialog
              title="Διαγραφή πρότασης"
              itemTitle="Inception"
              message="Είσαι σίγουρος; Δεν μπορεί να αναιρεθεί."
              confirmLabel="Διαγραφή"
              pending={false}
              onCancel={() => setOpen4(false)}
              onConfirm={() => setOpen4(false)}
            />
          )}
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="DeleteSuccessDialog"
        filePath="components/profile/DeleteSuccessDialog.tsx"
        description="Confirmation dialog after a destructive action — coral-tinted circle + trash icon. Auto-dismisses after 1.8s by default."
        contextLinks={[{ label: "Live (after deleting a suggestion)", href: "/profile" }]}
      >
        <Variant label="Show success">
          <button
            onClick={() => setOpen5(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Show success
          </button>
          {open5 && (
            <DeleteSuccessDialog
              message="Η πρόταση διαγράφηκε."
              autoCloseMs={2500}
              onClose={() => setOpen5(false)}
            />
          )}
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ReportFlowModal"
        filePath="components/report/ReportFlowModal.tsx"
        description="3-step modal for reporting a comment or suggestion: reason → description → confirmation. Wired in detail-page review cards + comment threads."
        contextLinks={[
          { label: "Live (review card αναφορά link)", href: "/books/agries-anemones" },
        ]}
      >
        <Variant label="Pending — interactive demo requires real targetId" note="See live link →">
          <div className="text-xs text-zinc-400 italic text-center">
            Ζωντανό demo στο link πιο πάνω
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="EditSuggestionModal"
        filePath="components/profile/EditSuggestionModal.tsx"
        description="Edit own suggestion (rating + reflection). Owner-only. Opens from profile suggestions row menu."
        contextLinks={[{ label: "Live (own suggestion · Edit menu)", href: "/profile" }]}
      >
        <Variant label="Pending — needs real suggestionId" note="See live link →">
          <div className="text-xs text-zinc-400 italic text-center">
            Ζωντανό demo στο link πιο πάνω
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}

// ─── TOASTS ───────────────────────────────────────────────────────────────

function ToastsTab() {
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [openError, setOpenError] = useState(false);
  const { toast, show } = useToast();

  return (
    <>
      <ShowcaseSection
        name="Toast (primitive)"
        filePath="components/ui/Toast.tsx"
        description="Single-line confirmation toast. Three tones (success / info / error). Three positions (top / bottom / inline). Default auto-dismisses after 1.8s."
      >
        <Variant label="Success (default)">
          <button
            onClick={() => setOpenSuccess(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Show success
          </button>
          <Toast
            message="Αντιγράφηκε στο πρόχειρο"
            tone="success"
            open={openSuccess}
            onClose={() => setOpenSuccess(false)}
          />
        </Variant>
        <Variant label="Info">
          <button
            onClick={() => setOpenInfo(true)}
            className="px-4 h-10 rounded-full bg-zinc-700 text-white text-sm font-semibold"
          >
            Show info
          </button>
          <Toast message="Συγχρονισμός σε εξέλιξη..." tone="info" open={openInfo} onClose={() => setOpenInfo(false)} />
        </Variant>
        <Variant label="Error">
          <button
            onClick={() => setOpenError(true)}
            className="px-4 h-10 rounded-full bg-red-600 text-white text-sm font-semibold"
          >
            Show error
          </button>
          <Toast message="Σφάλμα δικτύου. Δοκίμασε ξανά." tone="error" open={openError} onClose={() => setOpenError(false)} />
        </Variant>
        <Variant label="Inline (always visible — for embed)">
          <Toast message="Inline notice" tone="success" open={true} autoCloseMs={0} position="inline" />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="useToast() hook"
        filePath="components/ui/Toast.tsx (named export)"
        description={`Tiny helper for the show + auto-dismiss pattern. Returns { toast, show }. Drop {toast} once at the bottom of your component, call show("...") wherever needed.`}
      >
        <Variant label="Live demo (clicks fire toasts)">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => show("Αντιγράφηκε ✓")}
                className="px-3 h-9 rounded-full bg-zinc-900 text-white text-xs font-semibold"
              >
                Copy
              </button>
              <button
                onClick={() => show("Δεν βρέθηκε", { tone: "error" })}
                className="px-3 h-9 rounded-full bg-red-600 text-white text-xs font-semibold"
              >
                Trigger error
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">Πάτα ένα κουμπί — toast στο bottom κέντρο.</p>
          </div>
          {toast}
        </Variant>
      </ShowcaseSection>
    </>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────

function NotificationsTab() {
  return (
    <>
      <ShowcaseSection
        name="NotificationCard — by type"
        filePath="components/notifications/NotificationCard.tsx"
        description="In-app notifications list. 6 types: movie_airing / rating / comment / follow / achievement / suggestion_published. Coral tint + dot for unread."
        contextLinks={[{ label: "Live page", href: "/notifications" }]}
      >
        <Variant label="movie_airing — bookmarked movie tonight">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="movie_airing"
              date="μόλις τώρα"
              unread
              imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=120"
              content={
                <>
                  <strong className="font-bold">📺 Oppenheimer</strong> παίζει στο{" "}
                  <strong className="font-bold">Mega</strong> σήμερα στις 22:00.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="rating — someone rated my suggestion">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="rating"
              date="πριν 12 λεπτά"
              unread
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={
                <>
                  <strong className="font-bold">Maria K.</strong> αξιολόγησε με 5 αστέρια την πρότασή σου{" "}
                  <strong className="font-bold">Inception</strong>
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="comment — someone commented on my suggestion">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="comment"
              date="πριν 2 ώρες"
              unread
              imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
              content={
                <>
                  <strong className="font-bold">George Nasis</strong> σχολίασε στην πρότασή σου{" "}
                  <strong className="font-bold">Anora</strong>
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="follow — new follower">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="follow"
              date="χθες"
              imageUrl="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120"
              content={
                <>
                  <strong className="font-bold">Nikos P.</strong> σε ακολούθησε.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="achievement — earned a badge">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="achievement"
              date="πριν 3 μέρες"
              content={
                <>
                  🏆 Κέρδισες τη διάκριση{" "}
                  <strong className="font-bold">Επαληθευμένος χρήστης</strong>!
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="suggestion_published — own suggestion went live">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="suggestion_published"
              date="Φεβ 24"
              imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120"
              content={
                <>
                  Η πρότασή σου <strong className="font-bold">Άγριες ανεμώνες</strong> έχει δημοσιευτεί.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="Read state (no coral tint, no dot)">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="rating"
              date="πριν 1 εβδομάδα"
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={
                <>
                  <strong className="font-bold">Maria K.</strong> αξιολόγησε με 4 αστέρια την πρότασή σου
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="Stack (mixed types, real list pattern)">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200 divide-y divide-zinc-100">
            <NotificationCard
              type="rating"
              date="μόλις τώρα"
              unread
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={<><strong className="font-bold">Maria K.</strong> αξιολόγησε με 5 αστέρια την πρότασή σου</>}
            />
            <NotificationCard
              type="comment"
              date="πριν 1 ώρα"
              unread
              content={<><strong className="font-bold">George N.</strong> σχολίασε στην πρότασή σου</>}
            />
            <NotificationCard
              type="follow"
              date="χθες"
              content={<><strong className="font-bold">Nikos P.</strong> σε ακολούθησε.</>}
            />
            <NotificationCard
              type="achievement"
              date="πριν 3 μέρες"
              content={<>🏆 Κέρδισες τη διάκριση <strong className="font-bold">Έμπειρος χρήστης</strong>!</>}
            />
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}

// ─── interactive sub-sections (need their own client state) ───────────────

function RatingBoxShowcase() {
  const [r1, setR1] = useState(0);
  const [t1, setT1] = useState("");
  const [r2, setR2] = useState(0);
  const [t2, setT2] = useState("");
  const [r3, setR3] = useState(0);
  const [t3, setT3] = useState("");
  return (
    <ShowcaseSection
      name="RatingBox"
      filePath="components/detail/RatingBox.tsx"
      description="Detail-page rating block: gradient backdrop, big avg, optional Top Rated copy + 3-gold-stars header, 5-bar histogram, and the inline rate-this-item form (stars + optional reflection + save). Pure UI — caller owns state."
      contextLinks={[
        { label: "Live (book detail)", href: "/books/agries-anemones" },
        { label: "Live (food detail with Top Rated)", href: "/food/menta" },
      ]}
    >
      <Variant label="Top Rated · full distribution + form">
        <div className="w-[342px]">
          <RatingBox
            avgRating={4.71}
            ratingDistribution={[
              { stars: 5, pct: 80 },
              { stars: 4, pct: 10 },
              { stars: 3, pct: 0 },
              { stars: 2, pct: 6 },
              { stars: 1, pct: 4 },
            ]}
            isTopRated
            topRatedNoun="Η ταινία"
            question="Με πόσα αστέρια θα βαθμολογούσες τη ταινία;"
            userRating={r1}
            onChangeRating={setR1}
            userText={t1}
            onChangeText={setT1}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Below Top Rated threshold · histogram still visible">
        <div className="w-[342px]">
          <RatingBox
            avgRating={3.97}
            ratingDistribution={[
              { stars: 5, pct: 20 },
              { stars: 4, pct: 50 },
              { stars: 3, pct: 20 },
              { stars: 2, pct: 7 },
              { stars: 1, pct: 3 },
            ]}
            isTopRated={false}
            topRatedNoun="Το βιβλίο"
            question="Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;"
            userRating={r2}
            onChangeRating={setR2}
            userText={t2}
            onChangeText={setT2}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="No reviews yet · histogram hidden, only avg + form">
        <div className="w-[342px]">
          <RatingBox
            avgRating={0}
            ratingDistribution={[
              { stars: 5, pct: 0 },
              { stars: 4, pct: 0 },
              { stars: 3, pct: 0 },
              { stars: 2, pct: 0 },
              { stars: 1, pct: 0 },
            ]}
            isTopRated={false}
            topRatedNoun="Το εστιατόριο"
            question="Με πόσα αστέρια θα βαθμολογούσες το εστιατόριο;"
            userRating={r3}
            onChangeRating={setR3}
            userText={t3}
            onChangeText={setT3}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Display only · form hidden (user has own suggestion shown elsewhere)">
        <div className="w-[342px]">
          <RatingBox
            avgRating={4.5}
            ratingDistribution={[
              { stars: 5, pct: 60 },
              { stars: 4, pct: 30 },
              { stars: 3, pct: 7 },
              { stars: 2, pct: 2 },
              { stars: 1, pct: 1 },
            ]}
            isTopRated
            topRatedNoun="Η συνταγή"
            hideForm
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SuggesterCardShowcase() {
  return (
    <ShowcaseSection
      name="SuggesterCard"
      filePath="components/detail/SuggesterCard.tsx"
      description="Featured suggester block above the rating box — the original submitter's reflection. NOT a review (no stars, no thumbs, no αναφορά). Truncates around 240 chars + Περισσότερα expand."
      contextLinks={[{ label: "Live above rating box", href: "/books/agries-anemones" }]}
    >
      <Variant label="With long reflection · Περισσότερα expand">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ id: "g", display_name: "George Nasis", handle: "george", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", level: 12 }}
            badge="Verified"
            date="Φεβ 24"
            reflection="Όταν ξεκίνησα να διαβάζω το πρώτο της βιβλίο, ήδη από τις αρχικές σελίδες κατάλαβα ότι αυτό το κορίτσι έχει ένα λαμπρό μέλλον στη συγγραφή. Δε διαψεύστηκα. Η νέα της ιστορία είναι εξίσου καθηλωτική με την προηγούμενη και αξίζει να τη διαβάσετε."
          />
        </div>
      </Variant>
      <Variant label="Short reflection (no Περισσότερα)">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Anny T.", avatar_url: null }}
            badge="Verified"
            date="πριν 1 εβδομάδα"
            reflection="Καταπληκτικό βιβλίο. Δε σταμάτησα να το διαβάζω από την πρώτη σελίδα μέχρι την τελευταία."
          />
        </div>
      </Variant>
      <Variant label="Expert badge">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Kassi", avatar_url: null }}
            badge="Expert"
            date="πριν 2 μήνες"
            reflection="Έρχεται μια στιγμή που κλείνεις το βιβλίο που κρατάς στα χέρια σου, μένεις ν' αναρωτιέσαι τι ακριβώς διάβασες. Καταπληκτική γραφή."
          />
        </div>
      </Variant>
      <Variant label="No avatar (initial fallback)">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Νίκος Π.", avatar_url: null }}
            badge="Gold"
            date="χθες"
            reflection="Πραγματικά εξαιρετική πρόταση."
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function BookmarkIconShowcase() {
  return (
    <ShowcaseSection
      name="BookmarkIcon"
      filePath="components/ui/BookmarkIcon.tsx"
      description="Outlined bookmark ribbon with optional + sign for the unsaved state. Used in the detail-page header bookmark button."
      contextLinks={[{ label: "Live (detail header)", href: "/books/agries-anemones" }]}
    >
      <Variant label="Unsaved (default — with + sign)">
        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
          <BookmarkIcon />
        </div>
      </Variant>
      <Variant label="Saved (filled, no +)">
        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white">
          <BookmarkIcon filled />
        </div>
      </Variant>
      <Variant label="Bigger size override">
        <div className="text-zinc-700">
          <BookmarkIcon size={36} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function PlaceholderSection({ name, filePath, note }: { name: string; filePath?: string; note?: string }) {
  return (
    <ShowcaseSection name={name} filePath={filePath} description={note}>
      <Variant label="Pending — Phase 3">
        <div className="text-xs text-zinc-400 italic text-center">
          Στείλε screenshot και κάνω extract σε reusable component
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
