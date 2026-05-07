"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { RatingCard } from "@/components/detail/RatingCard";
import { BookingAvailabilityCard } from "@/components/detail/BookingAvailabilityCard";
import { ActivityCard } from "@/components/detail/ActivityCard";
import { PublicBookAd } from "@/components/detail/PublicBookAd";
import { AuthorCard } from "@/components/detail/AuthorCard";
import { AmenitiesRow } from "@/components/detail/AmenitiesRow";
import { NutritionRow } from "@/components/detail/NutritionRow";
import { DurationCard } from "@/components/detail/DurationCard";
import { PlatformLinksCard } from "@/components/detail/PlatformLinksCard";
import { ReviewCardFooter } from "@/components/detail/ReviewCardFooter";
import { OwnSuggestionActions } from "@/components/detail/OwnSuggestionActions";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { DeliverySelector } from "@/components/detail/DeliverySelector";
import { PlatformSelector } from "@/components/detail/PlatformSelector";
import { ItemGalleryViewer } from "@/components/detail/ItemGalleryViewer";
import { ExtraRatingsRow } from "@/components/detail/ExtraRatingsRow";
import { Icon } from "@/components/ui/Icon";

export function DetailModulesTab() {
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

      <ShowcaseSection
        name="ReviewCardFooter"
        filePath="components/detail/ReviewCardFooter.tsx"
        description="Vote up/down + αναφορά footer used by all 9 detail pages on every review card. Counts come from the reviews table; per-user vote state passed as myVote so the active thumb gets coral fill. Optimistic delta in the hook."
        contextLinks={[{ label: "Live (book detail)", href: "/books/agries-anemones" }]}
      >
        <Variant label="Default — no vote yet">
          <div className="w-[310px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <ReviewCardFooter reviewId="demo-1" likes={17} dislikes={3} />
          </div>
        </Variant>
        <Variant label="My vote = up (👍 coral)">
          <div className="w-[310px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <ReviewCardFooter reviewId="demo-2" likes={18} dislikes={3} myVote={1} />
          </div>
        </Variant>
        <Variant label="My vote = down (👎 coral)">
          <div className="w-[310px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <ReviewCardFooter reviewId="demo-3" likes={5} dislikes={2} myVote={-1} />
          </div>
        </Variant>
        <Variant label="No votes yet">
          <div className="w-[310px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <ReviewCardFooter reviewId="demo-4" likes={0} dislikes={0} />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="OwnSuggestionActions"
        filePath="components/detail/OwnSuggestionActions.tsx"
        description="Replaces the rate-this-item card on the detail page when the current user is the suggester. Coral 'Επεξεργασία' button + outlined trash icon. Wires EditSuggestionModal + ConfirmDeleteDialog from the profile surface."
        contextLinks={[{ label: "Live (when viewing your own suggestion)", href: "/profile" }]}
      >
        <Variant label="Default — own suggestion">
          <div className="w-[342px]">
            <OwnSuggestionActions
              suggestion={{ id: "demo", reflection: "Καταπληκτική ταινία.", rating: 5 }}
              itemTitle="Inception"
            />
          </div>
        </Variant>
        <Variant label="Custom question">
          <div className="w-[342px]">
            <OwnSuggestionActions
              suggestion={{ id: "demo-2", reflection: null, rating: 4 }}
              itemTitle="Anora"
              question="Θες να ξανασκεφτείς την πρόταση σου;"
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="UserAvatarWithPopup"
        filePath="components/detail/UserAvatarWithPopup.tsx"
        description="Tappable avatar that opens a ProfilePopup with the user's quick stats. Used on review cards, top-user blocks, and ExtraRatingsRow. Falls back to deterministic colored initials when avatar_url is null."
        contextLinks={[{ label: "Live (any review-card avatar)", href: "/books/agries-anemones" }]}
      >
        <Variant label="With popup — click to open">
          <UserAvatarWithPopup
            user={{
              id: "u1",
              handle: "george",
              display_name: "George Nasis",
              avatar_url: null,
              level: 12,
              suggestion_count: 47,
              avg_quality_score: 4.71,
            }}
            size={50}
          />
        </Variant>
        <Variant label="Smaller (36px — used by ExtraRatingsRow)">
          <UserAvatarWithPopup
            user={{ id: "u2", handle: "maria", display_name: "Maria K.", level: 4 }}
            size={36}
          />
        </Variant>
        <Variant label="With image">
          <UserAvatarWithPopup
            user={{
              id: "u3",
              handle: "kassi",
              display_name: "Kassi",
              avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
              level: 8,
            }}
            size={64}
          />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="DeliverySelector"
        filePath="components/detail/DeliverySelector.tsx"
        description="Vertical-card selector for delivery services on food pages. 100×112 cards with icon + name + checkbox indicator (top-right). Single-select toggle (click again to deselect)."
        contextLinks={[{ label: "Live (food detail)", href: "/food" }]}
      >
        <Variant label="3 services">
          <div className="w-[400px]">
            <DeliverySelector
              services={[
                { id: "efood", name: "efood", icon: <Icon name="efood" width={64} height={20} alt="efood" /> },
                { id: "wolt", name: "Wolt" },
                { id: "box", name: "Box", icon: <Icon name="box" width={64} height={20} alt="box" /> },
              ]}
            />
          </div>
        </Variant>
        <Variant label="With pre-selected">
          <div className="w-[400px]">
            <DeliverySelector
              services={[
                { id: "efood", name: "efood" },
                { id: "wolt", name: "Wolt" },
              ]}
              selected="efood"
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="PlatformSelector"
        filePath="components/detail/PlatformSelector.tsx"
        description="Same shape as DeliverySelector, but for streaming platforms (Netflix / Disney / Prime / YouTube etc.) on movie/series detail pages. Single-select toggle."
        contextLinks={[{ label: "Live (movie detail · pending wiring)", href: "/movies" }]}
      >
        <Variant label="4 platforms">
          <div className="w-[400px]">
            <PlatformSelector
              platforms={[
                { id: "netflix", name: "Netflix", icon: <Icon name="netflix" size={28} /> },
                { id: "disney", name: "Disney+", icon: <Icon name="disney" size={28} /> },
                { id: "prime", name: "Prime", icon: <Icon name="prime" size={28} /> },
                { id: "youtube", name: "YouTube", icon: <Icon name="youtube" size={28} /> },
              ]}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ItemGalleryViewer"
        filePath="components/detail/ItemGalleryViewer.tsx"
        description="Read-only gallery on venue detail pages. Renders items.images jsonb as a 160×200 horizontal scroll strip. Optional tab grouping (Δωμάτια / Κοινόχρηστοι / Εξωτερικά for hotels). Tap an image → keyboard-navigable fullscreen lightbox."
        contextLinks={[{ label: "Live (hotel detail)", href: "/hotels" }]}
      >
        <Variant label="Flat list (no tabs)">
          <div className="w-[640px] -mx-6">
            <ItemGalleryViewer
              images={[
                { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400" },
                { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400" },
                { url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400" },
                { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="With tabs (hotel)">
          <div className="w-[640px] -mx-6">
            <ItemGalleryViewer
              tabs={["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"]}
              images={[
                { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400", tab: "Δωμάτια" },
                { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400", tab: "Δωμάτια" },
                { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", tab: "Κοινόχρηστοι" },
                { url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400", tab: "Εξωτερικά" },
              ]}
            />
          </div>
        </Variant>
        <Variant label="Empty (no render)">
          <div className="text-xs text-zinc-400 italic text-center">(no images → no render)</div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ExtraRatingsRow"
        filePath="components/detail/ExtraRatingsRow.tsx"
        description="'Άλλες βαθμολογίες' row below the review carousel — compact rows (avatar + name + 5 stars + relative date) for users who rated but didn't write a review. Common on K2-migrated items. Hidden when ratings.length === 0."
        contextLinks={[{ label: "Live (some legacy detail pages)", href: "/movies" }]}
      >
        <Variant label="3 entries">
          <div className="w-full max-w-[600px] -mx-6">
            <ExtraRatingsRow
              ratings={[
                {
                  user: { id: "u1", display_name: "George Nasis", handle: "george", avatar_url: null, level: 12 },
                  score: 5,
                  created_at: new Date().toISOString(),
                },
                {
                  user: { id: "u2", display_name: "Maria K.", handle: "mariak", avatar_url: null, level: 3 },
                  score: 4,
                  created_at: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                  user: { id: "u3", display_name: "Νίκος Π.", handle: "nikosp", avatar_url: null, level: 7 },
                  score: 3,
                  created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
                },
              ]}
            />
          </div>
        </Variant>
        <Variant label="Empty (no render)">
          <div className="text-xs text-zinc-400 italic text-center">(no ratings → no render)</div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}
